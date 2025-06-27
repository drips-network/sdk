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
   * The receiver’s weight as a percentage (0–100).
   *
   * This value represents the receiver's intended share of the total split. For example:
   * - A value of `25` means the receiver should get 25% of the total funds being split.
   *
   * Internally, the SDK will scale this percentage by 10,000 to match the Solidity contract’s
   * `_TOTAL_SPLITS_WEIGHT = 1_000_000`. That means:
   * - `1%` becomes `10_000`
   * - `100%` becomes `1_000_000`
   *
   * ⚠️ Due to rounding (e.g., from fractional percentages like 33.34%), the scaled weights may
   * not add up to exactly 1_000_000. To correct this, the SDK will assign any remaining units
   * (from rounding down all receivers) to the receiver with the highest original percentage.
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

export async function mapToOnChainSplitsReceiver(
  adapter: ReadBlockchainAdapter,
  receiver: SdkSplitsReceiver,
): Promise<OnChainSplitsReceiver> {
  const accountId = await resolveReceiverAccountId(adapter, receiver);

  return {
    accountId,
    weight: receiver.weight,
  };
}

export async function mapSdkToMetadataSplitsReceiver(
  adapter: ReadBlockchainAdapter,
  receiver: SdkSplitsReceiver,
): Promise<MetadataSplitsReceiver> {
  const accountId = await resolveReceiverAccountId(adapter, receiver);

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
