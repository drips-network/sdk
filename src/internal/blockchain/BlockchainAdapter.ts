import type {Address, Hash, Hex} from 'viem';

export type BatchedTxOverrides = {
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
} & BatchedTxOverrides;

type TxMeta = {
  abiFunctionName?: string;
};

/** A prepared transaction ready for execution by a `WriteBlockchainAdapter`. */
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

/** Adapter interface for read-only operations. */
export interface ReadBlockchainAdapter {
  call(tx: PreparedTx): Promise<Hex>;
  getChainId(): Promise<number>;
}

/** Adapter interface for read and write operations. */
export interface WriteBlockchainAdapter extends ReadBlockchainAdapter {
  getAddress(): Promise<Address>;
  sendTx(tx: PreparedTx): Promise<TxResponse>;
  signMsg(message: string | Uint8Array): Promise<Hex>;
}
