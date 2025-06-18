import {Address, Hex} from 'viem';
import {addressDriverAbi} from '../abis/addressDriverAbi';
import {
  PreparedTx,
  WriteBlockchainAdapter,
} from '../blockchain/BlockchainAdapter';
import {prepareDripListCreationCtx} from '../drip-lists/prepareDripListCreationCtx';
import {requireSupportedChain, requireWriteAccess} from '../shared/assertions';
import {buildTx} from '../shared/buildTx';
import {contractsRegistry} from '../config/contractsRegistry';
import {resolveAccountId} from '../shared/resolveAccountId';

export type ProjectOneTimeDonationReceiver = {
  readonly type: 'project';
  readonly url: string;
};

export type DripListOneTimeDonationReceiver = {
  readonly type: 'drip-list';
  readonly accountId: bigint;
};

export type AddressOneTimeDonationReceiver = {
  readonly type: 'address';
  readonly address: Address;
};

export type EcosystemMainAccountOneTimeDonationReceiver = {
  readonly type: 'ecosystem-main-account';
  readonly accountId: bigint;
};

export type SubListOneTimeDonationReceiver = {
  readonly type: 'sub-list';
  readonly accountId: bigint;
};

export type OneTimeDonationReceiver = (
  | ProjectOneTimeDonationReceiver
  | DripListOneTimeDonationReceiver
  | AddressOneTimeDonationReceiver
  | EcosystemMainAccountOneTimeDonationReceiver
  | SubListOneTimeDonationReceiver
) & {
  readonly amount: bigint;
};

export type SendOneTimeDonationParams = {
  readonly receiver: OneTimeDonationReceiver;
  readonly amount: bigint;
  readonly erc20: Hex;
};

export async function prepareOneTimeDonationTx(
  adapter: WriteBlockchainAdapter,
  params: SendOneTimeDonationParams,
): Promise<PreparedTx> {
  const chainId = await adapter.getChainId();
  requireSupportedChain(chainId);
  requireWriteAccess(adapter, prepareDripListCreationCtx.name);
  const {receiver, erc20, amount} = params;
  const receiverId = await resolveAccountId(adapter, receiver);

  return buildTx({
    abi: addressDriverAbi,
    functionName: 'give',
    args: [receiverId, erc20, amount],
    contract: contractsRegistry[chainId].addressDriver.address,
  });
}
