import {Hash, toHex, Address} from 'viem';
import {WriteBlockchainAdapter} from '../blockchain/BlockchainAdapter';
import {buildTx} from '../shared/buildTx';
import {repoDriverAbi} from '../abis/repoDriverAbi';
import {contractsRegistry} from '../config/contractsRegistry';
import {requireSupportedChain} from '../shared/assertions';
import {assertValidOrcidId, normalizeOrcidForContract} from './orcidUtils';
import {calcOrcidAccountId} from '../projects/calcProjectId';
import {calcAddressId} from '../shared/calcAddressId';
import {
  OnChainSplitsReceiver,
  TOTAL_SPLITS_WEIGHT,
} from '../shared/receiverUtils';
import {
  waitForOrcidOwnership,
  WaitForOrcidOwnershipParams,
} from './waitForOrcidOwnership';

export const ORCID_FORGE_ID = 2; // Matches `RepoDriver` Forge enum: GitHub=0, GitLab=1, ORCID=2.

export type ProgressEvent =
  | {readonly step: 'claiming'; readonly txHash?: Hash}
  | {readonly step: 'waiting'; readonly elapsedMs: number}
  | {readonly step: 'configuring'; readonly orcidAccountId: bigint};

export type ClaimOrcidParams = {
  /** The ORCID ID to claim (e.g., '0000-0002-1825-0097'). */
  readonly orcidId: string;
  /** Optional wait parameters for ownership polling. */
  readonly waitOptions?: Omit<WaitForOrcidOwnershipParams, 'orcidId'>;
  /** Optional progress callback invoked at each step with typed event data. */
  readonly onProgress?: (event: ProgressEvent) => void | Promise<void>;
};

export type ClaimOrcidStepResult<T = void> =
  | {success: true; data: T}
  | {success: false; error: Error};

export type ClaimOrcidResult = {
  /** The ORCID account ID. */
  readonly orcidAccountId: bigint;

  /** Step 1: Claim transaction result. */
  readonly claim: ClaimOrcidStepResult<{
    hash: Hash;
    /** Whether transaction was mined successfully. */
    mined: boolean;
  }>;

  /** Step 2: Ownership verification result. */
  readonly ownership: ClaimOrcidStepResult<{
    /** Verified owner address. */
    owner: Address;
    /** Time taken to verify (ms). */
    verificationTimeMs: number;
  }>;

  /** Step 3: Splits configuration result. */
  readonly splits: ClaimOrcidStepResult<{
    hash: Hash;
    /** Whether transaction was mined successfully. */
    mined: boolean;
  }>;

  /** Overall status helper. */
  readonly status: 'complete' | 'partial' | 'failed';
};

export async function claimOrcid(
  adapter: WriteBlockchainAdapter,
  params: ClaimOrcidParams,
): Promise<ClaimOrcidResult> {
  const {orcidId, waitOptions, onProgress} = params;

  assertValidOrcidId(orcidId);

  const chainId = await adapter.getChainId();
  requireSupportedChain(chainId, claimOrcid.name);

  const repoDriverAddress = contractsRegistry[chainId].repoDriver.address;
  const orcidAccountId = await calcOrcidAccountId(adapter, orcidId);

  let claimResult: ClaimOrcidResult['claim'];
  let ownershipResult: ClaimOrcidResult['ownership'];
  let splitsResult: ClaimOrcidResult['splits'];

  // Step 1: Submit claim transaction.
  try {
    const requestUpdateOwnerTx = buildTx({
      abi: repoDriverAbi,
      contract: repoDriverAddress,
      functionName: 'requestUpdateOwner',
      args: [ORCID_FORGE_ID, toHex(normalizeOrcidForContract(orcidId))],
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

    // Early return if claim fails.
    return {
      orcidAccountId,
      claim: claimResult,
      ownership: {success: false, error: new Error('Claim step failed')},
      splits: {success: false, error: new Error('Claim step failed')},
      status: 'failed',
    };
  }

  // Step 2: Wait for ownership confirmation.
  const ownershipStartTime = Date.now();
  try {
    const ownerAddress = await adapter.getAddress();

    await waitForOrcidOwnership(adapter, {
      orcidId,
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

    // Return partial result if ownership fails.
    return {
      orcidAccountId,
      claim: claimResult,
      ownership: ownershipResult,
      splits: {success: false, error: new Error('Ownership step failed')},
      status: 'partial',
    };
  }

  // Step 3: Configure splits to 100% to claimer.
  await onProgress?.({step: 'configuring', orcidAccountId});
  try {
    const claimerAddress = await adapter.getAddress();
    const claimerAccountId = await calcAddressId(adapter, claimerAddress);
    const receivers: OnChainSplitsReceiver[] = [
      {
        accountId: claimerAccountId,
        weight: TOTAL_SPLITS_WEIGHT,
      },
    ];

    const setSplitsTx = buildTx({
      abi: repoDriverAbi,
      contract: repoDriverAddress,
      functionName: 'setSplits',
      args: [orcidAccountId, receivers],
    });

    const setSplitsResponse = await adapter.sendTx(setSplitsTx);
    const receipt = await setSplitsResponse.wait();

    splitsResult = {
      success: true,
      data: {
        hash: setSplitsResponse.hash,
        mined: receipt.status === 'success',
      },
    };
  } catch (error) {
    splitsResult = {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };

    // Return partial result if splits fails.
    return {
      orcidAccountId,
      claim: claimResult,
      ownership: ownershipResult,
      splits: splitsResult,
      status: 'partial',
    };
  }

  // All steps completed successfully.
  return {
    orcidAccountId,
    claim: claimResult,
    ownership: ownershipResult,
    splits: splitsResult,
    status: 'complete',
  };
}
