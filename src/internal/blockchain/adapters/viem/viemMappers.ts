import {
  TransactionReceipt as ViemTxReceipt,
  Hash,
  PublicClient,
  CallParameters,
} from 'viem';
import {DripsError} from '../../../DripsError';
import {PreparedTx, TxResponse, TxReceipt} from '../../BlockchainAdapter';

export function mapToViemCallParameters(tx: PreparedTx): CallParameters {
  const baseRequest = {
    to: tx.to,
    data: tx.data,
    value: tx.value !== undefined ? tx.value : undefined,
    gas: tx.gasLimit !== undefined ? tx.gasLimit : undefined,
    nonce: tx.nonce,
  };

  // EIP-1559 fee parameters
  if (tx.maxFeePerGas !== undefined || tx.maxPriorityFeePerGas !== undefined) {
    if (tx.gasPrice !== undefined) {
      throw new DripsError(
        'Cannot specify both EIP-1559 and legacy gas parameters.',
        {
          meta: {
            gasPrice: tx.gasPrice,
            maxFeePerGas: tx.maxFeePerGas,
            maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
            operation: 'Preparing viem call parameters',
          },
        },
      );
    }
    return {
      ...baseRequest,
      maxFeePerGas: tx.maxFeePerGas !== undefined ? tx.maxFeePerGas : undefined,
      maxPriorityFeePerGas:
        tx.maxPriorityFeePerGas !== undefined
          ? tx.maxPriorityFeePerGas
          : undefined,
    };
  }
  // If not EIP-1559, check for legacy gas price.
  else if (tx.gasPrice !== undefined) {
    return {
      ...baseRequest,
      gasPrice: tx.gasPrice,
    };
  }

  // No gas pricing specified — leave fee fields undefined.
  return baseRequest;
}

export function mapFromViemResponse(
  hash: Hash,
  publicClient: PublicClient,
): TxResponse {
  return {
    hash,
    wait: async (confirmations = 1) => {
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations,
      });

      return mapFromViemReceipt(receipt);
    },
  };
}

function mapFromViemReceipt(viemReceipt: ViemTxReceipt): TxReceipt {
  const {status, gasUsed, transactionHash, blockNumber, logs, from, to} =
    viemReceipt;

  return {
    from,
    logs,
    gasUsed,
    blockNumber,
    to: to === null ? undefined : to,
    hash: transactionHash,
    status,
  };
}
