import {addressDriverAbi} from '../abis/addressDriverAbi';
import {callerAbi} from '../abis/callerAbi';
import {nftDriverAbi} from '../abis/nftDriverAbi';
import {
  BatchedTxOverrides,
  PreparedTx,
  WriteBlockchainAdapter,
} from '../blockchain/BlockchainAdapter';
import {contractsRegistry} from '../config/contractsRegistry';
import {DripsGraphQLClient} from '../graphql/createGraphQLClient';
import {requireSupportedChain, requireWriteAccess} from '../shared/assertions';
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
  mapApiToMetadataSplitsReceiver,
  mapSdkToMetadataSplitsReceiver,
  mapToOnChainSplitsReceiver,
  SdkSplitsReceiver,
} from '../shared/receiverUtils';
import {validateAndFormatSplitsReceivers} from '../shared/validateAndFormatSplitsReceivers';
import {buildDripListMetadata} from './buildDripListMetadata';
import {getDripListById} from './getDripListById';

export type DripListUpdateConfig = {
  readonly dripListId: bigint;
  readonly metadata?: {
    readonly name?: string;
    readonly description?: string;
    readonly isVisible?: boolean;
  };
  readonly receivers?: ReadonlyArray<SdkSplitsReceiver>;
  readonly batchedTxOverrides?: BatchedTxOverrides;
};

export type PrepareDripListUpdateResult = {
  readonly ipfsHash: string;
  readonly preparedTx: PreparedTx;
  readonly metadata: DripListMetadata;
};

export async function prepareDripListUpdate(
  adapter: WriteBlockchainAdapter,
  ipfsMetadataUploaderFn: IpfsMetadataUploaderFn<DripListMetadata>,
  config: DripListUpdateConfig,
  graphqlClient?: DripsGraphQLClient,
): Promise<PrepareDripListUpdateResult> {
  const chainId = await adapter.getChainId();
  requireSupportedChain(chainId);
  requireWriteAccess(adapter, prepareDripListUpdate.name);

  const {
    dripListId,
    metadata: maybeMetadata,
    receivers: maybeReceivers,
    batchedTxOverrides,
  } = config;
  const {nftDriver, caller, addressDriver} = contractsRegistry[chainId];

  const dripList = await getDripListById(dripListId, chainId, graphqlClient);
  if (!dripList) {
    throw new DripsError(`Drip list with ID ${dripListId} not found`, {
      meta: {
        operation: prepareDripListUpdate.name,
      },
    });
  }

  if (!maybeReceivers && !maybeMetadata) {
    throw new DripsError(
      'Nothing to update: no receivers or metadata provided',
      {
        meta: {operation: prepareDripListUpdate.name},
      },
    );
  }

  const metadataReceivers =
    maybeReceivers !== undefined
      ? await Promise.all(
          maybeReceivers.map(r => mapSdkToMetadataSplitsReceiver(adapter, r)),
        )
      : dripList.splits.map(r => mapApiToMetadataSplitsReceiver(r));

  const metadata = buildDripListMetadata({
    dripListId,
    receivers: metadataReceivers,
    name: maybeMetadata?.name ?? dripList.name,
    isVisible: maybeMetadata?.isVisible ?? dripList.isVisible,
    description: maybeMetadata?.description ?? dripList.description,
  });
  const ipfsHash = await ipfsMetadataUploaderFn(metadata);

  const txs: PreparedTx[] = [];

  const emitAccountMetadataTx = buildTx({
    abi: addressDriverAbi,
    functionName: 'emitAccountMetadata',
    args: [[encodeMetadataKeyValue({key: USER_METADATA_KEY, value: ipfsHash})]],
    contract: addressDriver.address,
  });
  txs.push(emitAccountMetadataTx);

  if (maybeReceivers !== undefined) {
    const onChainReceivers = await Promise.all(
      maybeReceivers.map(r => mapToOnChainSplitsReceiver(adapter, r)),
    );
    const formattedReceivers =
      validateAndFormatSplitsReceivers(onChainReceivers);

    const setSplitsTx = buildTx({
      abi: nftDriverAbi,
      contract: nftDriver.address,
      functionName: 'setSplits',
      args: [dripListId, formattedReceivers],
    });
    txs.push(setSplitsTx);
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
