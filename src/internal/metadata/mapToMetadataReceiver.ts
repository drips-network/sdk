import z from 'zod';
import {ReadBlockchainAdapter} from '../blockchain/BlockchainAdapter';
import {DripsError} from '../shared/DripsError';
import {destructProjectUrl} from '../projects/destructProjectUrl';
import {SdkSplitsReceiver} from '../shared/mapToOnChainReceiver';
import {dripListSplitReceiverSchema} from './schemas/nft-driver/v2';
import {
  addressDriverSplitReceiverSchema,
  repoDriverSplitReceiverSchema,
} from './schemas/repo-driver/v2';
import {subListSplitReceiverSchema} from './schemas/immutable-splits-driver/v1';
import {resolveAccountId} from '../shared/resolveAccountId';

export type MetadataDripListReceiver = z.output<
  typeof dripListSplitReceiverSchema
>;

export type MetadataProjectReceiver = z.output<
  typeof repoDriverSplitReceiverSchema
>;

export type MetadataAddressReceiver = z.output<
  typeof addressDriverSplitReceiverSchema
>;

export type SubListMetadataReceiver = z.output<
  typeof subListSplitReceiverSchema
>;

export type MetadataSplitsReceiver =
  | MetadataProjectReceiver
  | MetadataDripListReceiver
  | MetadataAddressReceiver
  | SubListMetadataReceiver;

export async function mapToMetadataReceiver(
  adapter: ReadBlockchainAdapter,
  receiver: SdkSplitsReceiver,
): Promise<MetadataSplitsReceiver> {
  const accountId = await resolveAccountId(adapter, receiver);

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
      operation: 'mapToMetadataReceiver',
      receiver,
    },
  });
}
