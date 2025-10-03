import { Address, Hex, Hash } from 'viem';

type BatchedTxOverrides = {
    nonce?: number;
    value?: bigint;
    gasLimit?: bigint;
    gasPrice?: bigint;
    maxFeePerGas?: bigint;
    maxPriorityFeePerGas?: bigint;
};
type BaseTx = {
    readonly to: Address;
    readonly data: Hex;
} & BatchedTxOverrides;
type TxMeta = {
    abiFunctionName?: string;
};
/** A prepared transaction ready for execution by a `WriteBlockchainAdapter`. */
type PreparedTx = BaseTx & TxMeta;
type TxReceipt = {
    hash: Hash;
    to?: Address;
    from: Address;
    blockNumber: bigint;
    gasUsed: bigint;
    status: 'success' | 'reverted';
    logs: unknown[];
};
type TxResponse = {
    hash: Hash;
    wait: (confirmations?: number) => Promise<TxReceipt>;
    meta?: Record<string, unknown>;
};
/** Adapter interface for read-only operations. */
interface ReadBlockchainAdapter {
    call(tx: PreparedTx): Promise<Hex>;
    getChainId(): Promise<number>;
}
/** Adapter interface for read and write operations. */
interface WriteBlockchainAdapter extends ReadBlockchainAdapter {
    getAddress(): Promise<Address>;
    sendTx(tx: PreparedTx): Promise<TxResponse>;
    signMsg(message: string | Uint8Array): Promise<Hex>;
}

export type { BatchedTxOverrides as B, PreparedTx as P, ReadBlockchainAdapter as R, TxResponse as T, WriteBlockchainAdapter as W, TxReceipt as a };
