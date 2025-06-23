import {Address} from 'viem';
import {
  PreparedTx,
  TxOverrides,
  WriteBlockchainAdapter,
} from '../blockchain/BlockchainAdapter';
import {prepareDripListCreation} from '../drip-lists/prepareDripListCreation';
import {requireSupportedChain, requireWriteAccess} from '../shared/assertions';
import {getCurrentStreamsAndReceivers} from './getCurrentStreamReceivers';
import {
  decodeStreamConfig,
  encodeStreamConfig,
} from '../shared/streamConfigUtils';
import {DripsGraphQLClient} from '../graphql/createGraphQLClient';
import {buildStreamsMetadata} from '../metadata/buildStreamsMetatada';
import {
  IpfsUploaderFn,
  StreamsMetadata,
} from '../metadata/createPinataIpfsUploader';
import {validateAndFormatStreamReceivers} from '../shared/validateAndFormatStreamReceivers';
import {buildTx} from '../shared/buildTx';
import {addressDriverAbi} from '../abis/addressDriverAbi';
import {contractsRegistry} from '../config/contractsRegistry';
import {resolveAddressFromAccountId} from '../shared/resolveAddressFromAccountId';
import {
  encodeMetadataKeyValue,
  USER_METADATA_KEY,
} from '../metadata/encodeMetadataKeyValue';
import {callerAbi} from '../abis/callerAbi';
import {convertToCallerCall} from '../shared/convertToCallerCall';
import {resolveReceiverAccountId, SdkReceiver} from '../shared/receiverUtils';

export type ContinuousDonation = {
  readonly erc20: Address;
  readonly amountPerSec: bigint;
  readonly receiver: SdkReceiver;
  readonly name?: string;
  readonly startAt?: Date;
  readonly durationSeconds?: number;
  readonly topUpAmount?: bigint;
  /** Optional overrides for the transaction. Applies to the *batched* transaction, not the individual transactions within it. */
  txOverrides?: TxOverrides;
};

export type PrepareContinuousDonationResult = {
  readonly ipfsHash: string;
  readonly preparedTx: PreparedTx;
  readonly metadata: StreamsMetadata;
};

export const AMT_PER_SEC_MULTIPLIER = 1_000_000_000n;

export async function prepareContinuousDonation(
  adapter: WriteBlockchainAdapter,
  ipfsUploaderFn: IpfsUploaderFn<StreamsMetadata>,
  donation: ContinuousDonation,
  graphqlClient?: DripsGraphQLClient,
): Promise<PrepareContinuousDonationResult> {
  const chainId = await adapter.getChainId();
  requireSupportedChain(chainId);
  requireWriteAccess(adapter, prepareDripListCreation.name);

  const {
    erc20,
    startAt,
    receiver,
    topUpAmount,
    txOverrides,
    amountPerSec: rawAmountPerSec,
    durationSeconds,
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
    currentReceivers.map(r => decodeStreamConfig(r.config).streamId),
    4,
  );

  const amountPerSec = rawAmountPerSec * AMT_PER_SEC_MULTIPLIER;

  const newStreamConfig = encodeStreamConfig({
    amountPerSec,
    streamId: newStreamDripId,
    duration: BigInt(durationSeconds ?? 0),
    start: BigInt(startAt?.getTime() ?? 0) / 1000n,
  });

  const newReceivers = validateAndFormatStreamReceivers([
    ...currentReceivers,
    {
      config: newStreamConfig,
      accountId: receiverAccountId,
    },
  ]);

  const transferToAddress = resolveAddressFromAccountId(signerAccountId);

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
      transferToAddress,
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
  const newIpfsHash = await ipfsUploaderFn(newMetadata);

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
    txOverrides,
  });

  return {
    preparedTx,
    ipfsHash: newIpfsHash,
    metadata: newMetadata,
  };
}

export function randomBigintUntilUnique(
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
