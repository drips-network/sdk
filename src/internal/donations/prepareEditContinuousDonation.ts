import {Address, parseUnits} from 'viem';
import {
  PreparedTx,
  BatchedTxOverrides,
  WriteBlockchainAdapter,
} from '../blockchain/BlockchainAdapter';
import {requireSupportedChain} from '../shared/assertions';
import {getCurrentStreamsAndReceivers} from '../streams/getCurrentStreamReceivers';
import {
  decodeStreamConfig,
  encodeStreamConfig,
  StreamConfig,
} from '../shared/streamRateUtils';
import {
  parseStreamRate,
  validateStreamRate,
  TimeUnit,
} from '../shared/streamRateUtils';
import {DripsGraphQLClient} from '../graphql/createGraphQLClient';
import {
  IpfsMetadataUploaderFn,
  StreamsMetadata,
} from '../shared/createPinataIpfsMetadataUploader';
import {validateAndFormatStreamReceivers} from '../shared/validateAndFormatStreamReceivers';
import {buildTx} from '../shared/buildTx';
import {addressDriverAbi} from '../abis/addressDriverAbi';
import {contractsRegistry} from '../config/contractsRegistry';
import {callerAbi} from '../abis/callerAbi';
import {convertToCallerCall} from '../shared/convertToCallerCall';
import {resolveReceiverAccountId} from '../shared/receiverUtils';
import {
  buildStreamsMetadata,
  StreamUpdate,
} from '../streams/buildStreamsMetadata';
import {
  encodeMetadataKeyValue,
  USER_METADATA_KEY,
} from '../shared/encodeMetadataKeyValue';
import {decodeStreamId} from '../shared/streamIdUtils';
import {DripsError} from '../shared/DripsError';
import {PrepareContinuousDonationResult} from './prepareContinuousDonation';

export type EditContinuousDonationConfig = {
  /** The unique ID of the stream to edit (e.g. "123-0xabc...-456"). */
  readonly streamId: string;
  /** Optional new name for the stream. */
  readonly name?: string;
  /** Optional new stream rate configuration. */
  readonly newRate?: {
    /** The amount of tokens to stream in the specified `timeUnit` (e.g. "100"). */
    readonly amount: string;
    /** The time unit for the `amount` (e.g. TimeUnit.DAY for daily streaming). */
    readonly timeUnit: TimeUnit;
    /** The number of decimal places for the token (e.g. 18 for ETH, 6 for USDC). */
    readonly tokenDecimals: number;
  };
  /** If true, pauses the stream (stops streaming on-chain while keeping it in metadata). */
  readonly pause?: boolean;
  /** If true, resumes/unpauses a paused stream. */
  readonly unpause?: boolean;
  /** If true, permanently deletes (archives) the stream. */
  readonly delete?: boolean;
  /** Optional amount of tokens to top up when updating the stream. */
  readonly topUpAmount?: string;
  /** Optional token decimals for the top-up amount. */
  readonly tokenDecimals?: number;
  /** Optional transaction overrides for the returned `PreparedTx`. */
  batchedTxOverrides?: BatchedTxOverrides;
};

export async function prepareEditContinuousDonation(
  adapter: WriteBlockchainAdapter,
  ipfsMetadataUploaderFn: IpfsMetadataUploaderFn<StreamsMetadata>,
  config: EditContinuousDonationConfig,
  graphqlClient?: DripsGraphQLClient,
): Promise<PrepareContinuousDonationResult> {
  const operation = prepareEditContinuousDonation.name;

  const chainId = await adapter.getChainId();
  requireSupportedChain(chainId);

  const {
    streamId,
    name,
    newRate,
    pause,
    unpause,
    delete: isDelete,
    topUpAmount,
    tokenDecimals,
    batchedTxOverrides,
  } = config;

  if (
    name === undefined &&
    newRate === undefined &&
    !pause &&
    !unpause &&
    !isDelete &&
    (topUpAmount === undefined || topUpAmount === '0')
  ) {
    throw new DripsError(
      'No edits provided: must specify at least one of name, newRate, pause, unpause, delete, or topUpAmount',
      {meta: {operation, streamId}},
    );
  }

  if (pause && unpause) {
    throw new DripsError('Cannot pause and unpause a stream at the same time', {
      meta: {operation, streamId},
    });
  }

  if (isDelete && (pause || unpause)) {
    throw new DripsError(
      'Cannot delete and pause/unpause a stream at the same time',
      {meta: {operation, streamId}},
    );
  }

  const {senderAccountId, tokenAddress, dripId} = decodeStreamId(streamId);
  const targetDripId = BigInt(dripId);
  const erc20 = tokenAddress as Address;

  const signerAddress = await adapter.getAddress();
  const signerAccountId = await resolveReceiverAccountId(adapter, {
    type: 'address',
    address: signerAddress,
  });

  if (signerAccountId.toString() !== senderAccountId) {
    throw new DripsError(
      `Signer account ID (${signerAccountId}) does not match stream sender account ID (${senderAccountId})`,
      {
        meta: {
          operation,
          streamId,
          signerAccountId: signerAccountId.toString(),
          senderAccountId,
        },
      },
    );
  }

  const {addressDriver, caller} = contractsRegistry[chainId];

  const {
    currentReceivers: unformattedCurrentReceivers,
    currentStreams,
    allStreams,
  } = await getCurrentStreamsAndReceivers(
    signerAccountId,
    chainId,
    erc20,
    graphqlClient,
  );

  const streamList =
    allStreams && allStreams.length > 0 ? allStreams : currentStreams;
  const targetStream = streamList.find(
    s =>
      s.id === streamId ||
      (s.config?.amountPerSecond?.tokenAddress?.toLowerCase() ===
        erc20.toLowerCase() &&
        s.config?.dripId?.toString() === dripId.toString()),
  );

  if (!targetStream) {
    throw new DripsError(`Stream with ID ${streamId} not found`, {
      meta: {operation, streamId},
    });
  }

  if (pause && targetStream.isPaused) {
    throw new DripsError('Stream is already paused', {
      meta: {operation, streamId},
    });
  }

  if (unpause && !targetStream.isPaused) {
    throw new DripsError('Stream is not paused', {
      meta: {operation, streamId},
    });
  }

  const currentReceivers = validateAndFormatStreamReceivers(
    unformattedCurrentReceivers,
  );

  let newReceivers = [...currentReceivers];
  let updatedConfigPacked: bigint | undefined;
  let newAmountPerSec: bigint | undefined;

  if (newRate) {
    newAmountPerSec = parseStreamRate(
      newRate.amount,
      newRate.timeUnit,
      newRate.tokenDecimals,
    );
    validateStreamRate(newAmountPerSec);
  }

  if (isDelete || pause) {
    // Remove the stream receiver from active on-chain receivers
    newReceivers = currentReceivers.filter(
      r => decodeStreamConfig(r.config).dripId !== targetDripId,
    );
  } else if (unpause) {
    // Re-add the paused stream to active on-chain receivers
    const receiverAccountId = BigInt(targetStream.receiver.account.accountId);
    const existingRawConfig = BigInt(targetStream.config.raw);
    const existingConfig = decodeStreamConfig(existingRawConfig);

    const streamConfig: StreamConfig = {
      ...existingConfig,
      amountPerSec: newAmountPerSec ?? existingConfig.amountPerSec,
    };
    updatedConfigPacked = encodeStreamConfig(streamConfig);

    newReceivers = [
      ...currentReceivers.filter(
        r => decodeStreamConfig(r.config).dripId !== targetDripId,
      ),
      {
        accountId: receiverAccountId,
        config: updatedConfigPacked,
      },
    ];
  } else if (newRate) {
    // Update stream rate while active
    const existingRawConfig = BigInt(targetStream.config.raw);
    const existingConfig = decodeStreamConfig(existingRawConfig);

    const streamConfig: StreamConfig = {
      ...existingConfig,
      amountPerSec: newAmountPerSec!,
    };
    updatedConfigPacked = encodeStreamConfig(streamConfig);

    newReceivers = currentReceivers.map(r => {
      if (decodeStreamConfig(r.config).dripId === targetDripId) {
        return {
          ...r,
          config: updatedConfigPacked!,
        };
      }
      return r;
    });
  }

  const formattedNewReceivers = validateAndFormatStreamReceivers(newReceivers);

  const txs: PreparedTx[] = [];

  // Check if receivers changed or if there is a top-up
  const receiversChanged =
    currentReceivers.length !== formattedNewReceivers.length ||
    currentReceivers.some(
      (cr, idx) =>
        cr.accountId !== formattedNewReceivers[idx]?.accountId ||
        cr.config !== formattedNewReceivers[idx]?.config,
    );

  const hasTopUp = topUpAmount !== undefined && topUpAmount !== '0';

  if (receiversChanged || hasTopUp) {
    const decimals = tokenDecimals ?? newRate?.tokenDecimals ?? 18;

    const setStreamsTx = buildTx({
      abi: addressDriverAbi,
      functionName: 'setStreams',
      contract: addressDriver.address,
      args: [
        erc20,
        currentReceivers,
        parseUnits(topUpAmount ?? '0', decimals),
        formattedNewReceivers,
        0,
        0,
        signerAddress,
      ],
    });
    txs.push(setStreamsTx);
  }

  // Build metadata update
  const streamUpdate: StreamUpdate = {
    streamId: targetStream.id,
    name,
    archived: isDelete === true,
    config:
      updatedConfigPacked && newAmountPerSec
        ? {
            raw: updatedConfigPacked.toString(),
            dripId: dripId.toString(),
            amountPerSecond: newAmountPerSec,
            durationSeconds: Number(targetStream.config.durationSeconds || 0),
            startTimestamp: Math.floor(
              new Date(targetStream.config.startDate).getTime() / 1000,
            ),
          }
        : undefined,
  };

  const newMetadata = await buildStreamsMetadata(
    adapter,
    signerAccountId,
    streamList,
    undefined,
    [streamUpdate],
  );

  const newIpfsHash = await ipfsMetadataUploaderFn(newMetadata);

  const emitAccountMetadataTx = buildTx({
    abi: addressDriverAbi,
    functionName: 'emitAccountMetadata',
    args: [
      [encodeMetadataKeyValue({key: USER_METADATA_KEY, value: newIpfsHash})],
    ],
    contract: addressDriver.address,
  });
  txs.push(emitAccountMetadataTx);

  const preparedTx = buildTx({
    abi: callerAbi,
    contract: caller.address,
    functionName: 'callBatched',
    args: [txs.map(convertToCallerCall)],
    batchedTxOverrides,
  });

  return {
    preparedTx,
    ipfsHash: newIpfsHash,
    metadata: newMetadata,
  };
}
