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

export async function mapToMetadataSplitsReceiver(
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
      operation: mapToMetadataSplitsReceiver.name,
      receiver,
    },
  });
}
