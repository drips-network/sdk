import {Address, Hash, Hex} from 'viem';

export type TxOverrides = {
  nonce?: number;
  value?: bigint;
  gasLimit?: bigint;
  gasPrice?: bigint; // For legacy transactions.
  maxFeePerGas?: bigint; // For EIP-1559 transactions.
  maxPriorityFeePerGas?: bigint; // For EIP-1559 transactions.
};

type BaseTx = {
  readonly to: Address;
  readonly data: Hex;
} & TxOverrides;

type TxMeta = {
  abiFunctionName?: string;
};

export type PreparedTx = BaseTx & TxMeta;

export type TxReceipt = {
  hash: Hash;
  to?: Address;
  from: Address;
  blockNumber: bigint;
  gasUsed: bigint;
  status: 'success' | 'reverted';
  logs: unknown[];
};

export type TxResponse = {
  hash: Hash;
  wait: (confirmations?: number) => Promise<TxReceipt>;
  meta?: Record<string, unknown>;
};

export interface ReadBlockchainAdapter {
  call(tx: PreparedTx): Promise<Hex>;
  getChainId(): Promise<number>;
}

export interface WriteBlockchainAdapter extends ReadBlockchainAdapter {
  getAddress(): Promise<Address>;
  sendTx(tx: PreparedTx): Promise<TxResponse>;
  signMsg(message: string | Uint8Array): Promise<Hex>;
}
