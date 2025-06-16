import {Address, Hex} from 'viem';
import type {
  TransactionRequest,
  TransactionResponse,
  TransactionReceipt as EthersTransactionReceipt,
} from 'ethers';
import {DripsError} from '../../../DripsError';
import {PreparedTx, TxResponse, TxReceipt} from '../../BlockchainAdapter';

export function mapToEthersTransactionRequest(
  tx: PreparedTx,
): TransactionRequest {
  const baseRequest = {
    to: tx.to,
    data: tx.data,
    value: tx.value !== undefined ? tx.value : undefined,
    gasLimit: tx.gasLimit !== undefined ? tx.gasLimit : undefined,
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
            operation: 'Preparing ethers transaction request',
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

export function mapFromEthersResponse(
  ethersResponse: TransactionResponse,
): TxResponse {
  return {
    hash: ethersResponse.hash as Hex,
    wait: async (confirmations = 1) => {
      const receipt = await ethersResponse.wait(confirmations);
      if (!receipt) {
        throw new DripsError('Transaction receipt not found');
      }

      return mapFromEthersReceipt(receipt);
    },
  };
}

function mapFromEthersReceipt(
  ethersReceipt: EthersTransactionReceipt,
): TxReceipt {
  const {status, gasUsed, hash, blockNumber, logs, from, to} = ethersReceipt;

  return {
    from: from as Address,
    logs: logs as unknown[],
    gasUsed,
    blockNumber: BigInt(blockNumber),
    to: to === null ? undefined : (to as Address),
    hash: hash as Hex,
    status: status === 1 ? 'success' : 'reverted',
  };
}
