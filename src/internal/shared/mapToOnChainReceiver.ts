import {ReadBlockchainAdapter} from '../blockchain/BlockchainAdapter';
import {DripsError} from './DripsError';
import {calcProjectId} from '../projects/calcProjectId';
import {Address} from 'viem';
import {destructProjectUrl} from '../projects/destructProjectUrl';
import {calcAddressId} from './calcAddressId';

export type ProjectReceiver = {
  type: 'project';
  url: string;
  weight: number;
};

export type DripListReceiver = {
  type: 'drip-list';
  accountId: bigint;
  weight: number;
};

export type EcosystemMainAccountReceiver = {
  type: 'ecosystem-main-account';
  accountId: bigint;
  weight: number;
};

export type SubListReceiver = {
  type: 'sub-list';
  accountId: bigint;
  weight: number;
};

export type AddressReceiver = {
  type: 'address';
  address: Address;
  weight: number;
};

export type SdkSplitsReceiver =
  | ProjectReceiver
  | DripListReceiver
  | SubListReceiver
  | AddressReceiver
  | EcosystemMainAccountReceiver;

export type OnChainSplitsReceiver = {
  accountId: bigint;
  weight: number;
};

export async function mapToOnChainReceiver(
  adapter: ReadBlockchainAdapter,
  receiver: SdkSplitsReceiver,
): Promise<OnChainSplitsReceiver> {
  if (receiver.type === 'project') {
    const {url, weight} = receiver;
    const {forge, ownerName, repoName} = destructProjectUrl(url);
    const accountId = await calcProjectId(adapter, {
      forge,
      name: `${ownerName}/${repoName}`,
    });

    return {
      accountId,
      weight,
    };
  } else if (receiver.type === 'drip-list') {
    return {
      accountId: receiver.accountId,
      weight: receiver.weight,
    };
  } else if (receiver.type === 'sub-list') {
    return {
      accountId: receiver.accountId,
      weight: receiver.weight,
    };
  } else if (receiver.type === 'address') {
    return {
      accountId: await calcAddressId(adapter, receiver.address),
      weight: receiver.weight,
    };
  } else if (receiver.type === 'ecosystem-main-account') {
    return {
      accountId: receiver.accountId,
      weight: receiver.weight,
    };
  }

  throw new DripsError(`Unsupported receiver type: ${(receiver as any).type}`, {
    meta: {
      operation: 'mapToOnChainReceiver',
      receiver,
    },
  });
}
