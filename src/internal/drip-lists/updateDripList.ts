import {
  TxResponse,
  WriteBlockchainAdapter,
} from '../blockchain/BlockchainAdapter';
import {DripsGraphQLClient} from '../graphql/createGraphQLClient';
import {requireWriteAccess} from '../shared/assertions';
import {
  DripListMetadata,
  IpfsMetadataUploaderFn,
} from '../shared/createPinataIpfsMetadataUploader';
import {
  DripListUpdateConfig,
  prepareDripListUpdate,
} from './prepareDripListUpdate';

export type UpdateDripListResult = {
  readonly ipfsHash: string;
  readonly metadata: DripListMetadata;
  readonly txResponse: TxResponse;
};

export async function updateDripList(
  adapter: WriteBlockchainAdapter,
  ipfsMetadataUploaderFn: IpfsMetadataUploaderFn<DripListMetadata>,
  config: DripListUpdateConfig,
  graphqlClient?: DripsGraphQLClient,
): Promise<UpdateDripListResult> {
  requireWriteAccess(adapter, updateDripList.name);

  const {ipfsHash, metadata, preparedTx} = await prepareDripListUpdate(
    adapter,
    ipfsMetadataUploaderFn,
    config,
    graphqlClient,
  );

  const txResponse = await adapter.sendTx(preparedTx);

  return {
    ipfsHash,
    metadata,
    txResponse,
  };
}
