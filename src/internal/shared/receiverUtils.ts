import {Address} from 'viem';
import {ReadBlockchainAdapter} from '../blockchain/BlockchainAdapter';
import {calcProjectId} from '../projects/calcProjectId';
import {destructProjectUrl} from '../projects/destructProjectUrl';
import {calcAddressId} from './calcAddressId';
import {DripsError} from './DripsError';
import {requireSupportedChain} from './assertions';
import z from 'zod';
import {subListSplitReceiverSchema} from '../metadata/schemas/immutable-splits-driver/v1';
import {dripListSplitReceiverSchema} from '../metadata/schemas/nft-driver/v2';
import {
  repoDriverSplitReceiverSchema,
  addressDriverSplitReceiverSchema,
} from '../metadata/schemas/repo-driver/v2';
import {deadlineSplitReceiverSchema} from '../metadata/schemas/repo-driver/v6';
import {calcDeadlineDriverAccountId} from './calcDeadlineDriverAccountId';
import {toDeadlineSeconds} from './toDeadlineSeconds';
import {DripList} from '../drip-lists/getDripListById';
import {
  AddressReceiver,
  ProjectReceiver,
} from '../graphql/__generated__/base-types';
import {unreachable} from './unreachable';
import {DripListDeadlineConfig} from '../drip-lists/prepareDripListCreation';

/** Maximum number of splits receivers of a single account. */
export const MAX_SPLITS_RECEIVERS = 200;
/** The total splits weight of an account. */
export const TOTAL_SPLITS_WEIGHT = 1_000_000;

export type SdkProjectReceiver = {
  type: 'project';
  url: string;
};

export type SdkDripListReceiver = {
  type: 'drip-list';
  accountId: bigint;
};

export type SdkEcosystemMainAccountReceiver = {
  type: 'ecosystem-main-account';
  accountId: bigint;
};

export type SdkSubListReceiver = {
  type: 'sub-list';
  accountId: bigint;
};

export type SdkAddressReceiver = {
  type: 'address';
  address: Address;
};

export type SdkReceiver =
  | SdkProjectReceiver
  | SdkDripListReceiver
  | SdkSubListReceiver
  | SdkAddressReceiver
  | SdkEcosystemMainAccountReceiver;

export type SdkSplitsReceiver = SdkReceiver & {
  weight: number;
};

export type OnChainSplitsReceiver = {
  accountId: bigint;
  weight: number;
};

type MetadataDripListReceiver = z.output<typeof dripListSplitReceiverSchema>;

type MetadataProjectReceiver = z.output<typeof repoDriverSplitReceiverSchema>;

type MetadataAddressReceiver = z.output<
  typeof addressDriverSplitReceiverSchema
>;

type MetadataDeadlineReceiver = z.output<typeof deadlineSplitReceiverSchema>;

type SubListMetadataReceiver = z.output<typeof subListSplitReceiverSchema>;

export type ResolvedDeadlineAccount = {
  readonly deadlineAccountId: bigint;
  readonly repoAccountId: bigint;
  readonly refundAccountId: bigint;
  readonly deadlineSeconds: number;
  readonly source: {
    readonly forge: string;
    readonly ownerName: string;
    readonly repoName: string;
    readonly url: string;
  };
};

export type MetadataSplitsReceiver =
  | MetadataProjectReceiver
  | MetadataDripListReceiver
  | MetadataAddressReceiver
  | MetadataDeadlineReceiver
  | SubListMetadataReceiver;

export type ParseSplitsReceiversOptions = {
  readonly deadlineConfig?: DripListDeadlineConfig;
};

export async function resolveDeadlineAccount(
  adapter: ReadBlockchainAdapter,
  receiver: SdkProjectReceiver,
  deadlineConfig: DripListDeadlineConfig,
): Promise<ResolvedDeadlineAccount> {
  const {url} = receiver;
  const {deadline, refundAddress} = deadlineConfig;

  const {forge, ownerName, repoName} = destructProjectUrl(url);
  const repoAccountId = await calcProjectId(adapter, {
    forge,
    name: `${ownerName}/${repoName}`,
  });

  const refundAccountId = await calcAddressId(adapter, refundAddress);
  const deadlineSeconds = toDeadlineSeconds(deadline);

  const deadlineAccountId = await calcDeadlineDriverAccountId(adapter, {
    repoAccountId,
    recipientAccountId: repoAccountId,
    refundAccountId,
    deadlineSeconds,
  });

  return {
    deadlineAccountId,
    repoAccountId,
    refundAccountId,
    deadlineSeconds,
    source: {forge, ownerName, repoName, url},
  } satisfies ResolvedDeadlineAccount;
}

type ResolvedDeadlineReceiver = {
  readonly receiver: SdkSplitsReceiver;
  readonly account: ResolvedDeadlineAccount;
};

async function parseDeadlineReceivers(
  adapter: ReadBlockchainAdapter,
  sdkReceivers: ReadonlyArray<SdkSplitsReceiver>,
  deadlineConfig: DripListDeadlineConfig,
): Promise<{
  onChain: OnChainSplitsReceiver[];
  metadata: MetadataSplitsReceiver[];
}> {
  if (sdkReceivers.length === 0) {
    return {onChain: [], metadata: []};
  }

  const chainId = await adapter.getChainId();
  requireSupportedChain(chainId);

  const resolved = await Promise.all(
    sdkReceivers.map(async receiver => {
      if (receiver.type !== 'project') {
        unreachable('Only project receivers can be used with deadlines');
      }

      return {
        receiver,
        account: await resolveDeadlineAccount(
          adapter,
          receiver,
          deadlineConfig,
        ),
      } as ResolvedDeadlineReceiver;
    }),
  );

  resolved.sort((a, b) =>
    a.account.deadlineAccountId > b.account.deadlineAccountId ? 1 : -1,
  );

  const onChain: OnChainSplitsReceiver[] = [];
  const metadata: MetadataSplitsReceiver[] = [];

  let previousAccountId: bigint | null = null;

  for (const entry of resolved) {
    const {
      receiver,
      account: {deadlineAccountId, repoAccountId, refundAccountId, source},
    } = entry;
    const {weight} = receiver;

    if (weight <= 0 || weight > TOTAL_SPLITS_WEIGHT) {
      throw new DripsError(`Invalid weight: ${weight}`, {
        meta: {operation: parseDeadlineReceivers.name, receiver},
      });
    }

    if (previousAccountId !== null && deadlineAccountId <= previousAccountId) {
      throw new DripsError(
        `Splits receivers not strictly sorted or deduplicated: ${deadlineAccountId} after ${previousAccountId}`,
        {
          meta: {operation: parseDeadlineReceivers.name},
        },
      );
    }

    previousAccountId = deadlineAccountId;

    onChain.push({accountId: deadlineAccountId, weight});
    metadata.push({
      type: 'deadline',
      weight,
      accountId: deadlineAccountId.toString(),
      claimableProject: {
        accountId: repoAccountId.toString(),
        source,
      },
      recipientAccountId: repoAccountId.toString(),
      refundAccountId: refundAccountId.toString(),
      deadline: deadlineConfig.deadline,
    } as MetadataDeadlineReceiver);
  }

  return {onChain, metadata};
}

export async function resolveReceiverAccountId(
  adapter: ReadBlockchainAdapter,
  receiver: SdkReceiver,
): Promise<bigint> {
  if (receiver.type === 'project') {
    if (!receiver.url) {
      throw new DripsError('Project receiver must have a url', {
        meta: {
          operation: resolveReceiverAccountId.name,
          receiver,
        },
      });
    }
    const {forge, ownerName, repoName} = destructProjectUrl(receiver.url);
    return await calcProjectId(adapter, {
      forge,
      name: `${ownerName}/${repoName}`,
    });
  } else if (receiver.type === 'address') {
    if (!receiver.address) {
      throw new DripsError('Address receiver must have an address', {
        meta: {
          operation: resolveReceiverAccountId.name,
          receiver,
        },
      });
    }
    return await calcAddressId(adapter, receiver.address);
  } else if (
    receiver.type === 'drip-list' ||
    receiver.type === 'sub-list' ||
    receiver.type === 'ecosystem-main-account'
  ) {
    if (!receiver.accountId) {
      throw new DripsError(`${receiver.type} receiver must have an accountId`, {
        meta: {
          operation: resolveReceiverAccountId.name,
          receiver,
        },
      });
    }
    return receiver.accountId;
  }

  throw new DripsError(`Unsupported receiver type: ${(receiver as any).type}`, {
    meta: {
      operation: resolveReceiverAccountId.name,
      receiver,
    },
  });
}

export function mapApiSplitsToSdkSplitsReceivers(
  splits: DripList['splits'],
): SdkSplitsReceiver[] {
  return splits.map(s => {
    const {weight, account} = s;

    if (account.driver === 'REPO') {
      const receiver = s as ProjectReceiver;
      if (!receiver.project?.source.url) {
        throw new DripsError('Missing project URL for REPO receiver', {
          meta: {operation: 'mapApiSplitsToSdkSplitsReceivers', receiver: s},
        });
      }

      return {
        type: 'project',
        url: receiver.project.source.url,
        weight,
      };
    } else if (account.driver === 'NFT') {
      return {
        type: 'drip-list',
        accountId: BigInt(account.accountId),
        weight,
      };
    } else if (account.driver === 'IMMUTABLE_SPLITS') {
      return {
        type: 'sub-list',
        accountId: BigInt(account.accountId),
        weight,
      };
    } else if (account.driver === 'ADDRESS') {
      const receiver = s as AddressReceiver;
      return {
        type: 'address',
        address: receiver.account.address as Address,
        weight,
      };
    }

    throw new DripsError(`Unsupported account driver: ${account.driver}`, {
      meta: {operation: mapApiSplitsToSdkSplitsReceivers.name, receiver: s},
    });
  });
}

async function mapSdkToMetadataSplitsReceiver(
  accountId: bigint,
  receiver: SdkSplitsReceiver,
): Promise<MetadataSplitsReceiver> {
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
    } as MetadataDripListReceiver;
  } else if (receiver.type === 'sub-list') {
    return {
      type: 'subList',
      weight: receiver.weight,
      accountId: accountId.toString(),
    };
  } else if (receiver.type === 'address') {
    return {
      type: 'address',
      weight: receiver.weight,
      accountId: accountId.toString(),
    };
  }

  throw new DripsError(`Unsupported receiver type: ${(receiver as any).type}`, {
    meta: {
      operation: mapSdkToMetadataSplitsReceiver.name,
      receiver,
    },
  });
}

export async function parseSplitsReceivers(
  adapter: ReadBlockchainAdapter,
  sdkReceivers: ReadonlyArray<SdkSplitsReceiver>,
  options?: ParseSplitsReceiversOptions,
): Promise<{
  onChain: OnChainSplitsReceiver[];
  metadata: MetadataSplitsReceiver[];
}> {
  if (sdkReceivers.length === 0) {
    return {onChain: [], metadata: []};
  }

  if (sdkReceivers.length > MAX_SPLITS_RECEIVERS) {
    throw new DripsError(
      `Maximum of ${MAX_SPLITS_RECEIVERS} receivers allowed`,
      {
        meta: {operation: parseSplitsReceivers.name},
      },
    );
  }

  const resolvedEntries: Array<{
    accountId: bigint;
    weight: number;
    metadata: MetadataSplitsReceiver;
  }> = [];

  if (options?.deadlineConfig) {
    const projectReceivers = sdkReceivers.filter(r => r.type === 'project');
    const otherReceivers = sdkReceivers.filter(r => r.type !== 'project');

    const {onChain: deadlineOnChain, metadata: deadlineMetadata} =
      await parseDeadlineReceivers(
        adapter,
        projectReceivers,
        options.deadlineConfig,
      );

    if (deadlineOnChain.length !== deadlineMetadata.length) {
      throw new DripsError('Mismatch resolving deadline receivers.', {
        meta: {operation: parseSplitsReceivers.name},
      });
    }

    deadlineOnChain.forEach((onChainReceiver, index) => {
      resolvedEntries.push({
        accountId: onChainReceiver.accountId,
        weight: onChainReceiver.weight,
        metadata: deadlineMetadata[index],
      });
    });

    const resolvedOthers = await Promise.all(
      otherReceivers.map(async receiver => {
        const accountId = await resolveReceiverAccountId(adapter, receiver);
        const metadata = await mapSdkToMetadataSplitsReceiver(
          accountId,
          receiver,
        );
        return {accountId, weight: receiver.weight, metadata};
      }),
    );

    resolvedEntries.push(...resolvedOthers);
  } else {
    const resolved = await Promise.all(
      sdkReceivers.map(async receiver => {
        const accountId = await resolveReceiverAccountId(adapter, receiver);
        const metadata = await mapSdkToMetadataSplitsReceiver(
          accountId,
          receiver,
        );
        return {accountId, weight: receiver.weight, metadata};
      }),
    );

    resolvedEntries.push(...resolved);
  }

  resolvedEntries.sort((a, b) => (a.accountId > b.accountId ? 1 : -1));

  const onChain: OnChainSplitsReceiver[] = [];
  const metadata: MetadataSplitsReceiver[] = [];

  let totalWeight = 0;
  let prevAccountId: bigint | null = null;

  for (const entry of resolvedEntries) {
    const {accountId, weight, metadata: metadataEntry} = entry;

    if (weight <= 0 || weight > TOTAL_SPLITS_WEIGHT) {
      throw new DripsError(`Invalid weight: ${weight}`, {
        meta: {operation: parseSplitsReceivers.name},
      });
    }

    if (prevAccountId !== null && accountId <= prevAccountId) {
      throw new DripsError(
        `Splits receivers not strictly sorted or deduplicated: ${accountId} after ${prevAccountId}`,
        {
          meta: {operation: parseSplitsReceivers.name},
        },
      );
    }

    totalWeight += weight;
    prevAccountId = accountId;

    onChain.push({accountId, weight});
    metadata.push(metadataEntry);
  }

  if (totalWeight !== TOTAL_SPLITS_WEIGHT) {
    throw new DripsError(
      `Total weight must be exactly ${TOTAL_SPLITS_WEIGHT}, but got ${totalWeight}`,
      {
        meta: {operation: parseSplitsReceivers.name},
      },
    );
  }

  return {onChain, metadata};
}
