import {Address, Hex} from 'viem';
import {callerAbi} from '../abis/callerAbi';
import {buildTx} from '../shared/buildTx';
import {convertToCallerCall} from '../shared/convertToCallerCall';
import {
  BatchedTxOverrides,
  PreparedTx,
  WriteBlockchainAdapter,
} from '../blockchain/BlockchainAdapter';
import {requireSupportedChain} from '../shared/assertions';
import {OnChainStreamReceiver} from '../shared/validateAndFormatStreamReceivers';
import {dripsAbi} from '../abis/dripsAbi';
import {contractsRegistry} from '../config/contractsRegistry';
import {parseSplitsReceivers, SdkSplitsReceiver} from '../shared/receiverUtils';
import {DripsError} from '../shared/DripsError';
import {addressDriverAbi} from '../abis/addressDriverAbi';
import {nativeTokenUnwrapperAbi} from '../abis/nativeTokenUnwrapperAbi';

/**
 * Represents the historical state of streams for a specific update.
 */
export type StreamsHistory = {
  /** Hash of the streams configuration at this point in history. */
  streamsHash: Hex;
  /** List of stream receivers that were active at this time. */
  receivers: OnChainStreamReceiver[];
  /** Timestamp when this streams configuration was updated. */
  updateTime: number;
  /** Maximum end time for streams in this configuration. */
  maxEnd: number;
};

/**
 * Arguments required for squeezing streams from a specific sender.
 */
export type SqueezeArgs = {
  /** The account ID that will receive the squeezed funds. */
  accountId: string;
  /** The ERC-20 token address for the streams to squeeze. */
  tokenAddress: string;
  /** The account ID of the sender whose streams will be squeezed. */
  senderId: bigint;
  /** Hash of the complete streams history for verification. */
  historyHash: Hex;
  /** Array of historical streams states needed for squeezing. */
  streamsHistory: StreamsHistory[];
};

const MAX_CYCLES = 1000;

export type CollectConfig = {
  /** The account ID that will collect the funds. */
  readonly accountId: bigint;
  /** Current splits receivers configuration for the account. */
  readonly currentReceivers: SdkSplitsReceiver[];
  /** List of ERC-20 token addresses to collect funds for. */
  readonly tokenAddresses: ReadonlyArray<Address>;
  /** Optional transaction overrides for the batched transaction. */
  readonly batchedTxOverrides?: BatchedTxOverrides;
  /** Whether to skip the split operation during collection. */
  readonly shouldSkipSplit?: boolean;
  /** Whether to automatically unwrap wrapped native tokens to native tokens. */
  readonly shouldAutoUnwrap?: boolean;
  /** Whether to skip receiving streams during collection. */
  readonly shouldSkipReceive?: boolean;
  /** Optional arguments for squeezing streams from specific senders. */
  readonly squeezeArgs?: SqueezeArgs[];
  /** Optional address to transfer collected funds to. If not provided, funds go to the signer. */
  readonly transferToAddress?: Address;
};

/**
 * Prepares a transaction for collecting funds from streams and splits.
 *
 * @param adapter - A write-enabled blockchain adapter for transaction preparation.
 * @param config - Configuration for the collection operation.
 *
 * @returns A prepared transaction ready for execution.
 *
 * @throws {DripsError} If the chain is not supported, no tokens are provided, or configuration is invalid.
 */
export async function prepareCollection(
  adapter: WriteBlockchainAdapter,
  config: CollectConfig,
): Promise<PreparedTx> {
  const chainId = await adapter.getChainId();
  requireSupportedChain(chainId);

  const {
    accountId,
    squeezeArgs,
    tokenAddresses,
    shouldSkipSplit,
    shouldSkipReceive,
    shouldAutoUnwrap,
    transferToAddress,
    batchedTxOverrides,
    currentReceivers: rawCurrentReceivers,
  } = config;
  const {drips, caller, addressDriver, nativeTokenUnwrapper} =
    contractsRegistry[chainId];
  const signerAddress = await adapter.getAddress();

  if (tokenAddresses?.length === 0) {
    throw new DripsError('No tokens provided for collection.', {
      meta: {operation: prepareCollection.name, tokenAddresses},
    });
  }

  const txs: PreparedTx[] = [];

  for (const tokenAddress of tokenAddresses) {
    const filteredArgs = (squeezeArgs || []).filter(
      a => a.tokenAddress === tokenAddress,
    );

    for (const args of filteredArgs) {
      const squeezeTx = buildTx({
        abi: dripsAbi,
        functionName: 'squeezeStreams',
        args: [
          accountId,
          tokenAddress,
          args.senderId,
          args.historyHash,
          args.streamsHistory,
        ],
        contract: drips.address,
      });

      txs.push(squeezeTx);
    }

    if (!shouldSkipReceive) {
      const receiveTx = buildTx({
        abi: dripsAbi,
        functionName: 'receiveStreams',
        args: [accountId, tokenAddress, MAX_CYCLES],
        contract: drips.address,
      });

      txs.push(receiveTx);
    }

    if (!shouldSkipSplit) {
      const {onChain: currentReceivers} = await parseSplitsReceivers(
        adapter,
        rawCurrentReceivers,
      );

      const splitTx = buildTx({
        abi: dripsAbi,
        functionName: 'split',
        args: [accountId, tokenAddress, currentReceivers],
        contract: drips.address,
      });

      txs.push(splitTx);
    }

    if (shouldAutoUnwrap) {
      const nativeTokenUnwrapperAddress = nativeTokenUnwrapper.address;

      if (!nativeTokenUnwrapperAddress) {
        throw new DripsError(
          'Native token unwrapper is not configured for this chain but auto unwrap is enabled.',
          {
            meta: {operation: prepareCollection.name, chainId},
          },
        );
      }

      if (transferToAddress && transferToAddress !== signerAddress) {
        throw new DripsError(
          'Signer address and transfer to address must match when auto unwrapping.',
          {
            meta: {
              operation: prepareCollection.name,
              transferToAddress,
              signerAddress,
            },
          },
        );
      }

      // Collect funds to the `NativeTokenUnwrapper` contract address.
      const collectTx = buildTx({
        abi: addressDriverAbi,
        functionName: 'collect',
        args: [tokenAddress, nativeTokenUnwrapperAddress],
        contract: addressDriver.address,
      });

      // Unwrap the collected wrapped token to native and transfer it to signer address.
      const unwrapTx = buildTx({
        abi: nativeTokenUnwrapperAbi,
        functionName: 'unwrap',
        args: [signerAddress],
        contract: nativeTokenUnwrapper.address,
      });

      txs.push(collectTx, unwrapTx); // Order matters.
    } else {
      const collectTx = buildTx({
        abi: addressDriverAbi,
        functionName: 'collect',
        args: [tokenAddress, transferToAddress ?? signerAddress],
        contract: addressDriver.address,
      });

      txs.push(collectTx);
    }
  }

  const preparedTx = buildTx({
    abi: callerAbi,
    contract: caller.address,
    functionName: 'callBatched',
    args: [txs.map(convertToCallerCall)],
    batchedTxOverrides,
  });

  return preparedTx;
}
