import {Address, Hex} from 'viem';
import {PreparedTx} from '../blockchain/BlockchainAdapter';

type CallerCall = {
  target: Address;
  data: Hex;
  value: bigint;
};

export function convertToCallerCall(tx: PreparedTx): CallerCall {
  return {
    target: tx.to,
    data: tx.data,
    value: BigInt(tx.value || 0),
  };
}
