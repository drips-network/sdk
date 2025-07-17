import {Address, parseUnits} from 'viem';
import {addressDriverAbi} from '../abis/addressDriverAbi';
import {
  BatchedTxOverrides,
  PreparedTx,
  WriteBlockchainAdapter,
} from '../blockchain/BlockchainAdapter';
import {requireSupportedChain} from '../shared/assertions';
import {buildTx} from '../shared/buildTx';
import {contractsRegistry} from '../config/contractsRegistry';
import {resolveReceiverAccountId, SdkReceiver} from '../shared/receiverUtils';

export type OneTimeDonation = {
  readonly receiver: SdkReceiver;
  readonly amount: bigint;
  readonly erc20: Address;
  /**
   * The number of decimal places for the token (e.g. 18 for ETH, 6 for USDC).
   */
  readonly tokenDecimals: number;
  batchedTxOverrides?: BatchedTxOverrides;
};

export async function prepareOneTimeDonation(
  adapter: WriteBlockchainAdapter,
  donation: OneTimeDonation,
): Promise<PreparedTx> {
  const chainId = await adapter.getChainId();
  requireSupportedChain(chainId);
  const {receiver, erc20, amount, batchedTxOverrides, tokenDecimals} = donation;
  const amountWithDecimals = parseUnits(amount.toString(), tokenDecimals);
  const receiverId = await resolveReceiverAccountId(adapter, receiver);

  return buildTx({
    abi: addressDriverAbi,
    functionName: 'give',
    args: [receiverId, erc20, amountWithDecimals],
    contract: contractsRegistry[chainId].addressDriver.address,
    batchedTxOverrides,
  });
}
