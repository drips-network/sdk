import {ReadBlockchainAdapter} from '../blockchain/BlockchainAdapter';
import {Address} from 'viem';
import {resolveAccountId} from './resolveAccountId';

export type ProjectSplitsReceiver = {
  type: 'project';
  url: string;
  weight: number;
};

export type DripListSplitsReceiver = {
  type: 'drip-list';
  accountId: bigint;
  weight: number;
};

export type EcosystemMainAccountSplitsReceiver = {
  type: 'ecosystem-main-account';
  accountId: bigint;
  weight: number;
};

export type SubListSplitsReceiver = {
  type: 'sub-list';
  accountId: bigint;
  weight: number;
};

export type AddressSplitsReceiver = {
  type: 'address';
  address: Address;
  weight: number;
};

export type SdkSplitsReceiver =
  | ProjectSplitsReceiver
  | DripListSplitsReceiver
  | SubListSplitsReceiver
  | AddressSplitsReceiver
  | EcosystemMainAccountSplitsReceiver;

export type OnChainSplitsReceiver = {
  accountId: bigint;
  weight: number;
};

export async function mapToOnChainReceiver(
  adapter: ReadBlockchainAdapter,
  receiver: SdkSplitsReceiver,
): Promise<OnChainSplitsReceiver> {
  const accountId = await resolveAccountId(adapter, receiver);

  return {
    accountId,
    weight: receiver.weight,
  };
}
