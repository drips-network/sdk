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
import {
  resolveDeadlineAccount,
  resolveReceiverAccountId,
  SdkReceiver,
} from '../shared/receiverUtils';
import {DripsError} from '../shared/DripsError';

export type DeadlineConfig = {
  /** The deadline by which funds must be claimed. */
  readonly deadline: Date;
  /** The address to refund unclaimed funds to. */
  readonly refundAddress: Address;
};

export type OneTimeDonation = {
  /** The receiver of the donation. */
  readonly receiver: SdkReceiver;
  /** The amount to donate in human-readable format (e.g., "10.5" for 10.5 USDC) */
  readonly amount: string;
  /** The ERC-20 token address to donate. */
  readonly erc20: Address;
  /**
   * The number of decimal places for the token (e.g. 18 for ETH, 6 for USDC).
   */
  readonly tokenDecimals: number;
  /** Optional transaction overrides for the batched transaction. */
  batchedTxOverrides?: BatchedTxOverrides;
  /** Optional deadline configuration for the donation. */
  readonly deadlineConfig?: DeadlineConfig;
};

export async function prepareOneTimeDonation(
  adapter: WriteBlockchainAdapter,
  donation: OneTimeDonation,
): Promise<PreparedTx> {
  const chainId = await adapter.getChainId();
  requireSupportedChain(chainId);
  const {
    receiver,
    erc20,
    amount,
    batchedTxOverrides,
    tokenDecimals,
    deadlineConfig,
  } = donation;
  const amountInWei = parseUnits(amount, tokenDecimals);

  let receiverId: bigint;

  if (deadlineConfig) {
    if (receiver.type !== 'project') {
      throw new DripsError(
        'Deadline donations only support project receivers',
        {
          meta: {operation: prepareOneTimeDonation.name, receiver},
        },
      );
    }

    if (deadlineConfig.deadline <= new Date()) {
      throw new DripsError('Deadline must be in the future', {
        meta: {operation: prepareOneTimeDonation.name, receiver},
      });
    }

    const {deadlineAccountId} = await resolveDeadlineAccount(
      adapter,
      receiver,
      deadlineConfig,
    );

    receiverId = deadlineAccountId;
  } else {
    receiverId = await resolveReceiverAccountId(adapter, receiver);
  }

  return buildTx({
    abi: addressDriverAbi,
    functionName: 'give',
    args: [receiverId, erc20, amountInWei],
    contract: contractsRegistry[chainId].addressDriver.address,
    batchedTxOverrides,
  });
}
