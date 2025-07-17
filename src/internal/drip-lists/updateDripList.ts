import {
  TxResponse,
  WriteBlockchainAdapter,
} from '../blockchain/BlockchainAdapter';
import {DripsGraphQLClient} from '../graphql/createGraphQLClient';
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

/**
 * Updates a Drip List.
 *
 * @param adapter - A write-enabled blockchain adapter for transaction execution.
 * @param ipfsMetadataUploaderFn - Function to upload metadata to IPFS.
 * @param config - Configuration specifying what to update in the Drip List.
 * @param graphqlClient - (Optional) A `DripsGraphQLClient`.
 *
 * @returns An object containing the transaction response, new metadata, and IPFS hash.
 *
 * @throws {DripsError} If the Drip List is not found, chain is not supported, no updates are provided, or transaction execution fails.
 */
export async function updateDripList(
  adapter: WriteBlockchainAdapter,
  ipfsMetadataUploaderFn: IpfsMetadataUploaderFn<DripListMetadata>,
  config: DripListUpdateConfig,
  graphqlClient?: DripsGraphQLClient,
): Promise<UpdateDripListResult> {
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
