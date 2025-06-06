import {Address} from 'viem';
import type {Provider, Signer} from 'ethers';
import {PreparedTx} from '../../BlockchainAdapter';

type EthersTxMeta = {
  to: Address;
  funcName?: string;
  operation: string;
  chainId?: number;
  account?: string;
  gas?: {
    gasLimit?: bigint;
    gasPrice?: bigint;
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
  };
};

export function createEthersMeta(
  tx: PreparedTx,
  context: {
    provider: Provider | Signer;
    account?: string;
    operationFallback: string;
    chainId?: number;
  },
): EthersTxMeta {
  return {
    to: tx.to,
    funcName: tx.abiFunctionName,
    account: context.account,
    chainId: context.chainId,
    operation: tx.abiFunctionName ?? context.operationFallback,
    gas: {
      gasLimit: tx.gasLimit,
      gasPrice: tx.gasPrice,
      maxFeePerGas: tx.maxFeePerGas,
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
    },
  };
}
