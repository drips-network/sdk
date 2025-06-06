import {
  Abi,
  Address,
  ContractFunctionName,
  encodeFunctionData,
  EncodeFunctionDataParameters,
} from 'viem';
import {PreparedTx, TxOverrides} from '../blockchain/BlockchainAdapter';
import {unreachable} from './unreachable';

export function buildTx<
  AbiType extends Abi | readonly unknown[],
  FnName extends ContractFunctionName<AbiType> | undefined = undefined,
>(
  request: EncodeFunctionDataParameters<AbiType, FnName> & {
    contract: Address;
    txOverrides?: TxOverrides;
  },
): PreparedTx {
  const callData = encodeFunctionData<AbiType, FnName>(request);

  return {
    ...request.txOverrides,
    to: request.contract,
    abiFunctionName:
      request.functionName || unreachable('Missing function name'),
    data: callData,
    value: request.txOverrides?.value || BigInt(0),
  };
}
