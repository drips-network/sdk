import {Address} from 'viem';
import {addressDriverAbi} from '../abis/addressDriverAbi';
import {
  PreparedTx,
  WriteBlockchainAdapter,
} from '../blockchain/BlockchainAdapter';
import {prepareDripListCreation} from '../drip-lists/prepareDripListCreation';
import {requireSupportedChain, requireWriteAccess} from '../shared/assertions';
import {buildTx} from '../shared/buildTx';
import {contractsRegistry} from '../config/contractsRegistry';
import {resolveReceiverAccountId, SdkReceiver} from '../shared/receiverUtils';

export type OneTimeDonation = {
  readonly receiver: SdkReceiver;
  readonly amount: bigint;
  readonly erc20: Address;
};

export async function prepareOneTimeDonation(
  adapter: WriteBlockchainAdapter,
  donation: OneTimeDonation,
): Promise<PreparedTx> {
  const chainId = await adapter.getChainId();
  requireSupportedChain(chainId);
  requireWriteAccess(adapter, prepareDripListCreation.name);
  const {receiver, erc20, amount} = donation;
  const receiverId = await resolveReceiverAccountId(adapter, receiver);

  return buildTx({
    abi: addressDriverAbi,
    functionName: 'give',
    args: [receiverId, erc20, amount],
    contract: contractsRegistry[chainId].addressDriver.address,
  });
}
