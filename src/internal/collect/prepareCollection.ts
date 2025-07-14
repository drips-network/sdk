import {Address, Hex} from 'viem';
import {callerAbi} from '../abis/callerAbi';
import {buildTx} from '../shared/buildTx';
import {convertToCallerCall} from '../shared/convertToCallerCall';
import {
  BatchedTxOverrides,
  PreparedTx,
  WriteBlockchainAdapter,
} from '../blockchain/BlockchainAdapter';
import {requireSupportedChain, requireWriteAccess} from '../shared/assertions';
import {OnChainStreamReceiver} from '../shared/validateAndFormatStreamReceivers';
import {dripsAbi} from '../abis/dripsAbi';
import {contractsRegistry} from '../config/contractsRegistry';
import {parseSplitsReceivers, SdkSplitsReceiver} from '../shared/receiverUtils';
import {DripsError} from '../shared/DripsError';
import {addressDriverAbi} from '../abis/addressDriverAbi';
import {nativeTokenUnwrapperAbi} from '../abis/nativeTokenUnwrapperAbi';

export type StreamsHistory = {
  streamsHash: Hex;
  receivers: OnChainStreamReceiver[];
  updateTime: number;
  maxEnd: number;
};

export type SqueezeArgs = {
  accountId: string;
  tokenAddress: string;
  senderId: bigint;
  historyHash: Hex;
  streamsHistory: StreamsHistory[];
};

export type CollectConfig = {
  readonly accountId: bigint;
  readonly maxCycles: number;
  readonly currentReceivers: SdkSplitsReceiver[];
  readonly tokenAddresses: ReadonlyArray<Address>;
  readonly batchedTxOverrides?: BatchedTxOverrides;
  readonly shouldSkipSplit?: boolean;
  readonly shouldAutoUnwrap?: boolean;
  readonly shouldSkipReceive?: boolean;
  readonly squeezeArgs?: SqueezeArgs[];
  readonly transferToAddress?: Address;
};

export async function prepareCollection(
  adapter: WriteBlockchainAdapter,
  config: CollectConfig,
): Promise<PreparedTx> {
  const chainId = await adapter.getChainId();
  requireSupportedChain(chainId);
  requireWriteAccess(adapter, prepareCollection.name);

  const {
    accountId,
    maxCycles,
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
        args: [accountId, tokenAddress, maxCycles],
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
        contract: addressDriver.address,
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
