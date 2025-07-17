import {callerAbi} from '../abis/callerAbi';
import {nftDriverAbi} from '../abis/nftDriverAbi';
import {
  BatchedTxOverrides,
  PreparedTx,
  WriteBlockchainAdapter,
} from '../blockchain/BlockchainAdapter';
import {contractsRegistry} from '../config/contractsRegistry';
import {DripsGraphQLClient} from '../graphql/createGraphQLClient';
import {requireSupportedChain} from '../shared/assertions';
import {buildTx} from '../shared/buildTx';
import {convertToCallerCall} from '../shared/convertToCallerCall';
import {
  DripListMetadata,
  IpfsMetadataUploaderFn,
} from '../shared/createPinataIpfsMetadataUploader';
import {DripsError} from '../shared/DripsError';
import {
  encodeMetadataKeyValue,
  USER_METADATA_KEY,
} from '../shared/encodeMetadataKeyValue';
import {
  mapApiSplitsToSdkSplitsReceivers,
  parseSplitsReceivers,
  SdkSplitsReceiver,
} from '../shared/receiverUtils';
import {buildDripListMetadata} from './buildDripListMetadata';
import {getDripListById} from './getDripListById';

export type DripListUpdateConfig = {
  /** The ID of the Drip List to update. */
  readonly dripListId: bigint;
  /** Optional metadata updates for the Drip List. */
  readonly metadata?: {
    /** Optional new name for the Drip List. */
    readonly name?: string;
    /** Optional new description for the Drip List. */
    readonly description?: string;
    /** Optional new visibility setting for the Drip List. */
    readonly isVisible?: boolean;
  };
  /** Optional new list of receivers. If provided, replaces the current receivers entirely. */
  readonly receivers?: ReadonlyArray<SdkSplitsReceiver>;
  /** Optional transaction overrides for the batched transaction. */
  readonly batchedTxOverrides?: BatchedTxOverrides;
};

export type PrepareDripListUpdateResult = {
  readonly ipfsHash: string;
  readonly preparedTx: PreparedTx;
  readonly metadata: DripListMetadata;
};

/**
 * Prepares the context for updating a Drip List.
 *
 * @param adapter - A write-enabled blockchain adapter for transaction preparation.
 * @param ipfsMetadataUploaderFn - Function to upload metadata to IPFS.
 * @param config - Configuration specifying what to update in the Drip List.
 * @param graphqlClient - (Optional) A `DripsGraphQLClient`.
 *
 * @returns An object containing the prepared transaction, new metadata, and IPFS hash.
 *
 * @throws {DripsError} If the Drip List is not found, chain is not supported, or no updates are provided.
 */
export async function prepareDripListUpdate(
  adapter: WriteBlockchainAdapter,
  ipfsMetadataUploaderFn: IpfsMetadataUploaderFn<DripListMetadata>,
  config: DripListUpdateConfig,
  graphqlClient?: DripsGraphQLClient,
): Promise<PrepareDripListUpdateResult> {
  const operation = prepareDripListUpdate.name;

  const chainId = await adapter.getChainId();
  requireSupportedChain(chainId);

  const {
    dripListId,
    metadata: maybeMetadata,
    receivers: maybeReceivers,
    batchedTxOverrides,
  } = config;

  const dripList = await getDripListById(dripListId, chainId, graphqlClient);
  if (!dripList) {
    throw new DripsError(`Drip list with ID ${dripListId} not found`, {
      meta: {operation},
    });
  }

  if (!maybeReceivers && !maybeMetadata) {
    throw new DripsError(
      'Nothing to update: no receivers or metadata provided',
      {
        meta: {operation},
      },
    );
  }

  const effectiveSplitsReceivers =
    maybeReceivers ?? mapApiSplitsToSdkSplitsReceivers(dripList.splits);

  const {metadata: metadataSplitsReceivers, onChain: onChainSplitsReceivers} =
    await parseSplitsReceivers(adapter, effectiveSplitsReceivers);

  const metadata = buildDripListMetadata({
    dripListId,
    receivers: metadataSplitsReceivers,
    name: maybeMetadata?.name ?? dripList.name,
    isVisible: maybeMetadata?.isVisible ?? dripList.isVisible,
    description: maybeMetadata?.description ?? dripList.description,
  });

  const ipfsHash = await ipfsMetadataUploaderFn(metadata);

  const {nftDriver, caller} = contractsRegistry[chainId];
  const txs: PreparedTx[] = [];

  txs.push(
    buildTx({
      abi: nftDriverAbi,
      functionName: 'emitAccountMetadata',
      args: [
        dripListId,
        [encodeMetadataKeyValue({key: USER_METADATA_KEY, value: ipfsHash})],
      ],
      contract: nftDriver.address,
    }),
  );

  if (maybeReceivers !== undefined) {
    txs.push(
      buildTx({
        abi: nftDriverAbi,
        contract: nftDriver.address,
        functionName: 'setSplits',
        args: [dripListId, onChainSplitsReceivers],
      }),
    );
  }

  const preparedTx = buildTx({
    abi: callerAbi,
    contract: caller.address,
    functionName: 'callBatched',
    args: [txs.map(convertToCallerCall)],
    batchedTxOverrides,
  });

  return {
    preparedTx,
    ipfsHash,
    metadata,
  };
}
