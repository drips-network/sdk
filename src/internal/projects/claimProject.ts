import {Address, Hash, toHex} from 'viem';
import {callerAbi} from '../abis/callerAbi';
import {repoDriverAbi} from '../abis/repoDriverAbi';
import {
  BatchedTxOverrides,
  WriteBlockchainAdapter,
} from '../blockchain/BlockchainAdapter';
import {contractsRegistry} from '../config/contractsRegistry';
import {requireSupportedChain} from '../shared/assertions';
import {buildTx} from '../shared/buildTx';
import {convertToCallerCall} from '../shared/convertToCallerCall';
import {
  IpfsMetadataUploaderFn,
  ProjectMetadata,
} from '../shared/createPinataIpfsMetadataUploader';
import {
  encodeMetadataKeyValue,
  USER_METADATA_KEY,
} from '../shared/encodeMetadataKeyValue';
import {
  buildProjectMetadata,
  ProjectMetadataConfig,
} from './buildProjectMetadata';
import {calcProjectId, ProjectName} from './calcProjectId';
import {destructProjectUrl} from './destructProjectUrl';
import {
  GITHUB_FORGE_ID,
  parseProjectSplitsReceivers,
  ProjectSplits,
} from './prepareClaimProject';
import {
  waitForProjectOwnership,
  WaitForProjectOwnershipParams,
} from './waitForProjectOwnership';

export type ProjectClaimProgressEvent =
  | {readonly step: 'claiming'; readonly txHash?: Hash}
  | {readonly step: 'waiting'; readonly elapsedMs: number}
  | {readonly step: 'configuring'; readonly projectId: bigint};

export type ClaimProjectParams = {
  /** The project repository URL (e.g., 'https://github.com/owner/repo'). */
  readonly projectUrl: string;
  /** The splits configuration for project maintainers and dependencies. */
  readonly splits: ProjectSplits;
  /** Metadata configuration for the project (color, avatar, description, visibility). */
  readonly metadata: ProjectMetadataConfig;
  /** Optional transaction overrides for the batched configuration transaction. */
  readonly batchedTxOverrides?: BatchedTxOverrides;
  /** Optional wait parameters for ownership polling. */
  readonly waitOptions?: Omit<WaitForProjectOwnershipParams, 'projectUrl'>;
  /** Optional progress callback invoked at each step with typed event data. */
  readonly onProgress?: (
    event: ProjectClaimProgressEvent,
  ) => void | Promise<void>;
};

export type ClaimProjectStepResult<T = void> =
  | {success: true; data: T}
  | {success: false; error: Error};

export type ClaimProjectResult = {
  /** The project account ID. */
  readonly projectId: bigint;

  /** Step 1: Claim transaction result (`requestUpdateOwner`). */
  readonly claim: ClaimProjectStepResult<{
    hash: Hash;
    /** Whether transaction was mined successfully. */
    mined: boolean;
  }>;

  /** Step 2: Ownership verification result. */
  readonly ownership: ClaimProjectStepResult<{
    /** Verified owner address. */
    owner: Address;
    /** Time taken to verify (ms). */
    verificationTimeMs: number;
  }>;

  /** Step 3: Splits and metadata configuration result (`setSplits` + `emitAccountMetadata`). */
  readonly configure: ClaimProjectStepResult<{
    hash: Hash;
    /** Whether transaction was mined successfully. */
    mined: boolean;
    /** The IPFS CID hash of the uploaded project metadata. */
    ipfsHash: Hash;
    /** The constructed project metadata object. */
    metadata: ProjectMetadata;
  }>;

  /** Overall status helper. */
  readonly status: 'complete' | 'partial' | 'failed';
};

export async function claimProject(
  adapter: WriteBlockchainAdapter,
  ipfsMetadataUploaderFn: IpfsMetadataUploaderFn<ProjectMetadata>,
  params: ClaimProjectParams,
): Promise<ClaimProjectResult> {
  const {
    projectUrl,
    splits,
    metadata: metadataConfig,
    batchedTxOverrides,
    waitOptions,
    onProgress,
  } = params;

  const {forge, ownerName, repoName} = destructProjectUrl(projectUrl);

  const chainId = await adapter.getChainId();
  requireSupportedChain(chainId, claimProject.name);

  const {repoDriver, caller} = contractsRegistry[chainId];
  const projectName: ProjectName = `${ownerName}/${repoName}`;
  const projectId = await calcProjectId(adapter, {forge, name: projectName});

  // Validate and resolve splits before submitting any transactions.
  const {onChain: onChainSplitsReceivers, metadata: metadataSplits} =
    await parseProjectSplitsReceivers(adapter, splits);

  const metadata = buildProjectMetadata({
    projectId,
    source: {
      forge,
      repoName,
      ownerName,
      url: projectUrl,
    },
    metadata: metadataConfig,
    splits: metadataSplits,
  });

  let claimResult: ClaimProjectResult['claim'];
  let ownershipResult: ClaimProjectResult['ownership'];
  let configureResult: ClaimProjectResult['configure'];

  // Step 1: Submit claim transaction (`requestUpdateOwner`).
  try {
    const requestUpdateOwnerTx = buildTx({
      abi: repoDriverAbi,
      contract: repoDriver.address,
      functionName: 'requestUpdateOwner',
      args: [GITHUB_FORGE_ID, toHex(projectName)],
    });

    const claimResponse = await adapter.sendTx(requestUpdateOwnerTx);
    await onProgress?.({step: 'claiming', txHash: claimResponse.hash});
    const receipt = await claimResponse.wait();

    claimResult = {
      success: true,
      data: {
        hash: claimResponse.hash,
        mined: receipt.status === 'success',
      },
    };
  } catch (error) {
    claimResult = {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };

    return {
      projectId,
      claim: claimResult,
      ownership: {success: false, error: new Error('Claim step failed')},
      configure: {success: false, error: new Error('Claim step failed')},
      status: 'failed',
    };
  }

  // Step 2: Wait for ownership confirmation.
  const ownershipStartTime = Date.now();
  try {
    const ownerAddress = await adapter.getAddress();

    await waitForProjectOwnership(adapter, {
      projectUrl,
      expectedOwner: ownerAddress,
      ...waitOptions,
      onProgress: async (elapsedMs: number) => {
        await onProgress?.({step: 'waiting', elapsedMs});
        await waitOptions?.onProgress?.(elapsedMs);
      },
    });

    ownershipResult = {
      success: true,
      data: {
        owner: ownerAddress,
        verificationTimeMs: Date.now() - ownershipStartTime,
      },
    };
  } catch (error) {
    ownershipResult = {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };

    return {
      projectId,
      claim: claimResult,
      ownership: ownershipResult,
      configure: {success: false, error: new Error('Ownership step failed')},
      status: 'partial',
    };
  }

  // Step 3: Upload metadata and configure splits + metadata on-chain via batched Caller call.
  await onProgress?.({step: 'configuring', projectId});
  try {
    const ipfsHash = await ipfsMetadataUploaderFn(metadata);

    const setSplitsTx = buildTx({
      abi: repoDriverAbi,
      contract: repoDriver.address,
      functionName: 'setSplits',
      args: [projectId, onChainSplitsReceivers],
    });

    const emitMetadataTx = buildTx({
      abi: repoDriverAbi,
      contract: repoDriver.address,
      functionName: 'emitAccountMetadata',
      args: [
        projectId,
        [encodeMetadataKeyValue({key: USER_METADATA_KEY, value: ipfsHash})],
      ],
    });

    const configureTx = buildTx({
      abi: callerAbi,
      contract: caller.address,
      functionName: 'callBatched',
      args: [[setSplitsTx, emitMetadataTx].map(convertToCallerCall)],
      batchedTxOverrides,
    });

    const configureResponse = await adapter.sendTx(configureTx);
    const receipt = await configureResponse.wait();

    configureResult = {
      success: true,
      data: {
        hash: configureResponse.hash,
        mined: receipt.status === 'success',
        ipfsHash,
        metadata,
      },
    };
  } catch (error) {
    configureResult = {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };

    return {
      projectId,
      claim: claimResult,
      ownership: ownershipResult,
      configure: configureResult,
      status: 'partial',
    };
  }

  return {
    projectId,
    claim: claimResult,
    ownership: ownershipResult,
    configure: configureResult,
    status: 'complete',
  };
}
