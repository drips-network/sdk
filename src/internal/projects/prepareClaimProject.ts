import {Hash, toHex} from 'viem';
import {callerAbi} from '../abis/callerAbi';
import {repoDriverAbi} from '../abis/repoDriverAbi';
import {
  BatchedTxOverrides,
  PreparedTx,
  ReadBlockchainAdapter,
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
import {DripsError} from '../shared/DripsError';
import {
  encodeMetadataKeyValue,
  USER_METADATA_KEY,
} from '../shared/encodeMetadataKeyValue';
import {
  MAX_SPLITS_RECEIVERS,
  OnChainSplitsReceiver,
  resolveReceiverAccountId,
  SdkAddressReceiver,
  SdkDripListReceiver,
  SdkOrcidReceiver,
  SdkProjectReceiver,
  TOTAL_SPLITS_WEIGHT,
} from '../shared/receiverUtils';
import {
  buildProjectMetadata,
  ProjectMetadataConfig,
} from './buildProjectMetadata';
import {calcProjectId, ProjectName} from './calcProjectId';
import {destructProjectUrl} from './destructProjectUrl';

export const GITHUB_FORGE_ID = 0; // Matches `RepoDriver` Forge enum: GitHub=0, GitLab=1, ORCID=2.

export type ProjectMaintainerSplitsReceiver = SdkAddressReceiver & {
  readonly weight: number;
};

export type ProjectDependencySplitsReceiver = (
  | SdkAddressReceiver
  | SdkProjectReceiver
  | SdkDripListReceiver
  | SdkOrcidReceiver
) & {
  readonly weight: number;
};

export type ProjectSplits = {
  /** Maintainer address receivers for the project. */
  readonly maintainers: ReadonlyArray<ProjectMaintainerSplitsReceiver>;
  /** Dependency receivers (addresses, projects, drip lists, or ORCID iDs) for the project. */
  readonly dependencies: ReadonlyArray<ProjectDependencySplitsReceiver>;
};

export type PrepareClaimProjectParams = {
  /** The project repository URL (e.g., 'https://github.com/owner/repo'). */
  readonly projectUrl: string;
  /** The splits configuration for project maintainers and dependencies. */
  readonly splits: ProjectSplits;
  /** Metadata configuration for the project (color, avatar, description, visibility). */
  readonly metadata: ProjectMetadataConfig;
  /** Optional transaction overrides for the batched configuration transaction. */
  readonly batchedTxOverrides?: BatchedTxOverrides;
};

export type PrepareClaimProjectResult = {
  /** The project account ID. */
  readonly projectId: bigint;
  /** The IPFS CID hash of the uploaded project metadata. */
  readonly ipfsHash: Hash;
  /** The constructed project metadata object. */
  readonly metadata: ProjectMetadata;
  /** Transaction to submit claim via `RepoDriver.requestUpdateOwner`. */
  readonly claimTx: PreparedTx;
  /** Batched transaction via `Caller.callBatched` to configure splits and emit metadata on `RepoDriver`. */
  readonly configureTx: PreparedTx;
};

type MaintainerMetadataReceiver =
  ProjectMetadata['splits']['maintainers'][number];
type DependencyMetadataReceiver =
  ProjectMetadata['splits']['dependencies'][number];

function mapDependencyReceiverToMetadata(
  accountId: bigint,
  receiver: ProjectDependencySplitsReceiver,
): DependencyMetadataReceiver {
  if (receiver.type === 'project') {
    const {url, weight} = receiver;
    const {forge, ownerName, repoName} = destructProjectUrl(url);
    return {
      type: 'repoDriver',
      weight,
      accountId: accountId.toString(),
      source: {
        forge,
        url,
        ownerName,
        repoName,
      },
    };
  } else if (receiver.type === 'drip-list') {
    return {
      type: 'dripList',
      weight: receiver.weight,
      accountId: accountId.toString(),
    };
  } else if (receiver.type === 'address') {
    return {
      type: 'address',
      weight: receiver.weight,
      accountId: accountId.toString(),
    };
  } else if (receiver.type === 'orcid') {
    return {
      type: 'orcid',
      weight: receiver.weight,
      accountId: accountId.toString(),
      orcidId: receiver.orcidId,
    };
  }

  throw new DripsError(
    `Unsupported receiver type: ${(receiver as {type: string}).type}`,
    {
      meta: {
        operation: parseProjectSplitsReceivers.name,
        receiver,
      },
    },
  );
}

export async function parseProjectSplitsReceivers(
  adapter: ReadBlockchainAdapter,
  splits: ProjectSplits,
): Promise<{
  onChain: OnChainSplitsReceiver[];
  metadata: ProjectMetadata['splits'];
}> {
  const {maintainers, dependencies} = splits;
  const totalCount = maintainers.length + dependencies.length;

  if (totalCount === 0) {
    return {
      onChain: [],
      metadata: {
        maintainers: [],
        dependencies: [],
      },
    };
  }

  if (totalCount > MAX_SPLITS_RECEIVERS) {
    throw new DripsError(
      `Maximum of ${MAX_SPLITS_RECEIVERS} receivers allowed`,
      {
        meta: {operation: parseProjectSplitsReceivers.name},
      },
    );
  }

  type TaggedResolvedReceiver =
    | {
        readonly sublist: 'maintainers';
        readonly receiver: ProjectMaintainerSplitsReceiver;
        readonly accountId: bigint;
      }
    | {
        readonly sublist: 'dependencies';
        readonly receiver: ProjectDependencySplitsReceiver;
        readonly accountId: bigint;
      };

  const resolvedMaintainers = await Promise.all(
    maintainers.map(
      async (r): Promise<TaggedResolvedReceiver> => ({
        sublist: 'maintainers',
        receiver: r,
        accountId: await resolveReceiverAccountId(adapter, r),
      }),
    ),
  );

  const resolvedDependencies = await Promise.all(
    dependencies.map(
      async (r): Promise<TaggedResolvedReceiver> => ({
        sublist: 'dependencies',
        receiver: r,
        accountId: await resolveReceiverAccountId(adapter, r),
      }),
    ),
  );

  const combined = [...resolvedMaintainers, ...resolvedDependencies];
  combined.sort((a, b) => (a.accountId > b.accountId ? 1 : -1));

  const onChain: OnChainSplitsReceiver[] = [];
  const metadataMaintainers: MaintainerMetadataReceiver[] = [];
  const metadataDependencies: DependencyMetadataReceiver[] = [];

  let totalWeight = 0;
  let prevAccountId: bigint | null = null;

  for (const item of combined) {
    const {receiver, accountId, sublist} = item;
    const {weight} = receiver;

    if (weight <= 0 || weight > TOTAL_SPLITS_WEIGHT) {
      throw new DripsError(`Invalid weight: ${weight}`, {
        meta: {operation: parseProjectSplitsReceivers.name, receiver},
      });
    }

    if (prevAccountId !== null && accountId <= prevAccountId) {
      throw new DripsError(
        `Splits receivers not strictly sorted or deduplicated: ${accountId} after ${prevAccountId}`,
        {
          meta: {operation: parseProjectSplitsReceivers.name},
        },
      );
    }

    totalWeight += weight;
    prevAccountId = accountId;

    onChain.push({accountId, weight});

    if (sublist === 'maintainers') {
      metadataMaintainers.push({
        type: 'address',
        weight,
        accountId: accountId.toString(),
      });
    } else {
      metadataDependencies.push(
        mapDependencyReceiverToMetadata(accountId, receiver),
      );
    }
  }

  if (totalWeight !== TOTAL_SPLITS_WEIGHT) {
    throw new DripsError(
      `Total weight must be exactly ${TOTAL_SPLITS_WEIGHT}, but got ${totalWeight}`,
      {
        meta: {operation: parseProjectSplitsReceivers.name},
      },
    );
  }

  return {
    onChain,
    metadata: {
      maintainers: metadataMaintainers,
      dependencies: metadataDependencies,
    },
  };
}

export async function prepareClaimProject(
  adapter: WriteBlockchainAdapter,
  ipfsMetadataUploaderFn: IpfsMetadataUploaderFn<ProjectMetadata>,
  params: PrepareClaimProjectParams,
): Promise<PrepareClaimProjectResult> {
  const {
    projectUrl,
    splits,
    metadata: metadataConfig,
    batchedTxOverrides,
  } = params;

  const {forge, ownerName, repoName} = destructProjectUrl(projectUrl);

  const chainId = await adapter.getChainId();
  requireSupportedChain(chainId, prepareClaimProject.name);

  const {repoDriver, caller} = contractsRegistry[chainId];
  const projectName: ProjectName = `${ownerName}/${repoName}`;
  const projectId = await calcProjectId(adapter, {forge, name: projectName});

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

  const ipfsHash = await ipfsMetadataUploaderFn(metadata);

  const claimTx = buildTx({
    abi: repoDriverAbi,
    contract: repoDriver.address,
    functionName: 'requestUpdateOwner',
    args: [GITHUB_FORGE_ID, toHex(projectName)],
  });

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

  return {
    projectId,
    ipfsHash,
    metadata,
    claimTx,
    configureTx,
  };
}
