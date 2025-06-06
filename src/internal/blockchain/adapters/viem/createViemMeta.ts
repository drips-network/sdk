import {Address} from 'viem';
import {Account, PublicClient, WalletClient} from 'viem';
import {PreparedTx} from '../../BlockchainAdapter';

type ViemTxMeta = {
  to: Address;
  funcName?: string;
  operation: string;
  chainId?: number;
  account?: Account;
  gas?: {
    gasLimit?: bigint;
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
  };
};

export function createViemMeta(
  tx: PreparedTx,
  context: {
    client: PublicClient | WalletClient;
    account?: Account;
    operationFallback: string;
  },
): ViemTxMeta {
  return {
    to: tx.to,
    funcName: tx.abiFunctionName,
    account: context.account,
    chainId: context.client.chain?.id,
    operation: tx.abiFunctionName ?? context.operationFallback,
    gas: {
      gasLimit: tx.gasLimit,
      maxFeePerGas: tx.maxFeePerGas,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
    },
  };
}
