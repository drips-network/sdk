import {Address} from 'viem';
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
import {resolveReceiverAccountId, SdkReceiver} from '../shared/receiverUtils';
import {buildStreamsMetadata} from '../streams/buildStreamsMetadata';
import {
  encodeMetadataKeyValue,
  USER_METADATA_KEY,
} from '../shared/encodeMetadataKeyValue';

export type ContinuousDonation = {
  /** The ERC20 token address to stream. */
  readonly erc20: Address;
  /** The amount of tokens to stream in the specified `timeUnit` (e.g. "100"). */
  readonly amount: string;
  /** The time unit for the `amount` (e.g. TimeUnit.DAY for daily streaming). */
  readonly timeUnit: TimeUnit;
  /** The number of decimal places for the token (e.g. 18 for ETH, 6 for USDC). */
  readonly tokenDecimals: number;
  /** The receiver of the stream. */
  readonly receiver: SdkReceiver;
  /** Optional name for the donation stream. */
  readonly name?: string;
  /** Optional start time for the stream. Defaults to "now". */
  readonly startAt?: Date;
  /** Optional stream duration in seconds. If omitted, stream runs until funds run out. */
  readonly durationSeconds?: number;
  /** Optional amount of tokens to top up when setting the stream. */
  readonly topUpAmount?: bigint;
  /** Optional transaction overrides for the returned `PreparedTx`. */
  batchedTxOverrides?: BatchedTxOverrides;
};

export type PrepareContinuousDonationResult = {
  readonly ipfsHash: string;
  readonly preparedTx: PreparedTx;
  readonly metadata: StreamsMetadata;
};

/**
 * Prepares the context for a continuous donation stream.
 *
 * @param adapter - Blockchain adapter with write capabilities.
 * @param ipfsMetadataUploaderFn - A function to upload metadata to IPFS.
 * @param donation - Configuration for the donation stream.
 * @param graphqlClient - (Optional) A `DripsGraphQLClient`. If omitted, a default client is created.
 * @returns An object containing the prepared transaction, IPFS hash, and metadata.
 */
export async function prepareContinuousDonation(
  adapter: WriteBlockchainAdapter,
  ipfsMetadataUploaderFn: IpfsMetadataUploaderFn<StreamsMetadata>,
  donation: ContinuousDonation,
  graphqlClient?: DripsGraphQLClient,
): Promise<PrepareContinuousDonationResult> {
  const chainId = await adapter.getChainId();
  requireSupportedChain(chainId);

  const {
    erc20,
    amount,
    startAt,
    timeUnit,
    receiver,
    topUpAmount,
    tokenDecimals,
    durationSeconds,
    batchedTxOverrides,
  } = donation;

  const signerAddress = await adapter.getAddress();
  const signerAccountId = await resolveReceiverAccountId(adapter, {
    type: 'address',
    address: signerAddress,
  });
  const receiverAccountId = await resolveReceiverAccountId(adapter, receiver);
  const {addressDriver, caller} = contractsRegistry[chainId];

  const {currentReceivers: unformattedCurrentReceivers, currentStreams} =
    await getCurrentStreamsAndReceivers(
      signerAccountId,
      chainId,
      erc20,
      graphqlClient,
    );

  const currentReceivers = validateAndFormatStreamReceivers(
    unformattedCurrentReceivers,
  );

  const newStreamDripId = randomBigintUntilUnique(
    currentReceivers.map(r => decodeStreamConfig(r.config).dripId),
    4,
  );

  const amountPerSec = parseStreamRate(amount, timeUnit, tokenDecimals);
  validateStreamRate(amountPerSec);

  const streamConfig: StreamConfig = {
    dripId: newStreamDripId,
    amountPerSec,
    start: BigInt(startAt?.getTime() ?? 0) / 1000n, // Convert to seconds.
    duration: BigInt(durationSeconds ?? 0),
  };

  const newStreamConfig = encodeStreamConfig(streamConfig);

  const newReceivers = validateAndFormatStreamReceivers([
    ...currentReceivers,
    {
      config: newStreamConfig,
      accountId: receiverAccountId,
    },
  ]);

  const setStreamsTx = buildTx({
    abi: addressDriverAbi,
    functionName: 'setStreams',
    contract: addressDriver.address,
    args: [
      erc20,
      currentReceivers,
      topUpAmount ?? 0n,
      newReceivers,
      0,
      0,
      signerAddress,
    ],
  });

  const newMetadata = await buildStreamsMetadata(
    adapter,
    signerAccountId,
    currentStreams,
    {
      ...donation,
      dripId: newStreamDripId,
    },
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

  const preparedTx = buildTx({
    abi: callerAbi,
    contract: caller.address,
    functionName: 'callBatched',
    args: [[setStreamsTx, emitAccountMetadataTx].map(convertToCallerCall)],
    batchedTxOverrides,
  });

  return {
    preparedTx,
    ipfsHash: newIpfsHash,
    metadata: newMetadata,
  };
}

function randomBigintUntilUnique(
  existing: bigint[],
  byteLength: number,
): bigint {
  const randomBigint = (): bigint => {
    const bytes = new Uint8Array(byteLength);
    globalThis.crypto.getRandomValues(bytes);

    let result = 0n;
    for (let i = 0; i < byteLength; i++) {
      result |= BigInt(bytes[i]) << BigInt(i * 8); // Little-endian
    }

    return result;
  };

  let result = randomBigint();
  while (existing.includes(result)) {
    result = randomBigint();
  }

  return result;
}
