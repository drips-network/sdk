import {Address} from 'viem';
import {ReadBlockchainAdapter} from '../blockchain/BlockchainAdapter';
import {calcProjectId} from '../projects/calcProjectId';
import {destructProjectUrl} from '../projects/destructProjectUrl';
import {calcAddressId} from './calcAddressId';
import {DripsError} from './DripsError';
import z from 'zod';
import {subListSplitReceiverSchema} from '../metadata/schemas/immutable-splits-driver/v1';
import {dripListSplitReceiverSchema} from '../metadata/schemas/nft-driver/v2';
import {
  repoDriverSplitReceiverSchema,
  addressDriverSplitReceiverSchema,
} from '../metadata/schemas/repo-driver/v2';
import {DripList} from '../drip-lists/getDripListById';
import {
  AddressReceiver,
  ProjectReceiver,
} from '../graphql/__generated__/base-types';
import {unreachable} from './unreachable';

export const MAX_SPLITS_RECEIVERS = 200;
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
  /**
   * A positive integer between 1 and 1_000_000 (inclusive) representing
   * the receiver’s share of funds. A weight of 1_000_000 means 100%.
   */
  weight: number;
};

export type OnChainSplitsReceiver = {
  accountId: bigint;
  weight: number;
};

export type OnChainStreamReceiver = SdkReceiver & {
  config: bigint;
};

type MetadataDripListReceiver = z.output<typeof dripListSplitReceiverSchema>;

type MetadataProjectReceiver = z.output<typeof repoDriverSplitReceiverSchema>;

type MetadataAddressReceiver = z.output<
  typeof addressDriverSplitReceiverSchema
>;

type SubListMetadataReceiver = z.output<typeof subListSplitReceiverSchema>;

export type MetadataSplitsReceiver =
  | MetadataProjectReceiver
  | MetadataDripListReceiver
  | MetadataAddressReceiver
  | SubListMetadataReceiver;

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
): Promise<{
  onChain: OnChainSplitsReceiver[];
  metadata: MetadataSplitsReceiver[];
}> {
  if (sdkReceivers.length > MAX_SPLITS_RECEIVERS) {
    throw new DripsError(
      `Maximum of ${MAX_SPLITS_RECEIVERS} receivers allowed`,
      {
        meta: {operation: parseSplitsReceivers.name},
      },
    );
  }

  const resolved = await Promise.all(
    sdkReceivers.map(async r => ({
      receiver: r,
      accountId: await resolveReceiverAccountId(adapter, r),
    })),
  );

  // Sort by accountId ascending (strictly increasing)
  resolved.sort((a, b) => (a.accountId > b.accountId ? 1 : -1));

  const onChain: OnChainSplitsReceiver[] = [];
  const metadata: MetadataSplitsReceiver[] = [];

  let totalWeight = 0;
  let prevAccountId: bigint | null = null;

  for (const {receiver, accountId} of resolved) {
    const {weight} = receiver;

    if (weight <= 0 || weight > TOTAL_SPLITS_WEIGHT) {
      throw new DripsError(`Invalid weight: ${weight}`, {
        meta: {operation: parseSplitsReceivers.name, receiver},
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
    metadata.push(await mapSdkToMetadataSplitsReceiver(accountId, receiver));
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
