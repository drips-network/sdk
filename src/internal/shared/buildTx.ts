import {
  Abi,
  Address,
  ContractFunctionName,
  encodeFunctionData,
  EncodeFunctionDataParameters,
} from 'viem';
import {PreparedTx, BatchedTxOverrides} from '../blockchain/BlockchainAdapter';
import {unreachable} from './unreachable';

/**
 * Builds a `PreparedTx` that can be executed by a `WriteBlockchainAdapter`.
 *
 * @param request - The transaction request parameters including ABI, function name, arguments, and contract address.
 *
 * @returns A `PreparedTx` ready for execution.
 */
export function buildTx<
  AbiType extends Abi | readonly unknown[],
  FnName extends ContractFunctionName<AbiType> | undefined = undefined,
>(
  request: EncodeFunctionDataParameters<AbiType, FnName> & {
    contract: Address;
    batchedTxOverrides?: BatchedTxOverrides;
  },
): PreparedTx {
  const callData = encodeFunctionData<AbiType, FnName>(request);

  return {
    ...request.batchedTxOverrides,
    to: request.contract,
    abiFunctionName:
      request.functionName || unreachable('Missing function name'),
    data: callData,
    value: request.batchedTxOverrides?.value || BigInt(0),
  };
}
