import {
  TxResponse,
  WriteBlockchainAdapter,
} from '../blockchain/BlockchainAdapter';
import {DripsGraphQLClient} from '../graphql/createGraphQLClient';
import {
  IpfsMetadataUploaderFn,
  Metadata,
  StreamsMetadata,
} from '../shared/createPinataIpfsMetadataUploader';
import {
  ContinuousDonation,
  prepareContinuousDonation,
} from './prepareContinuousDonation';

export type SendContinuousDonationResult = {
  readonly txResponse: TxResponse;
  readonly ipfsHash: string;
  readonly metadata: Metadata;
};

/**
 * Sends a continuous donation by preparing and executing the transaction.
 *
 * This function combines preparation and execution steps to create a continuous donation
 * stream that sends tokens to a receiver over time. It uploads metadata to IPFS and
 * executes the blockchain transaction.
 *
 * @param adapter - A write-enabled blockchain adapter for transaction execution.
 * @param ipfsMetadataUploaderFn - Function to upload metadata to IPFS.
 * @param donation - Configuration for the continuous donation stream.
 * @param graphqlClient - (Optional) A `DripsGraphQLClient`. If omitted, a default client is created.
 *
 * @returns An object containing the transaction response, metadata, and IPFS hash.
 *
 * @throws {DripsError} If the chain is not supported, validation fails, or transaction execution fails.
 */
export async function sendContinuousDonation(
  adapter: WriteBlockchainAdapter,
  ipfsMetadataUploaderFn: IpfsMetadataUploaderFn<StreamsMetadata>,
  donation: ContinuousDonation,
  graphqlClient?: DripsGraphQLClient,
): Promise<SendContinuousDonationResult> {
  const {preparedTx, ipfsHash, metadata} = await prepareContinuousDonation(
    adapter,
    ipfsMetadataUploaderFn,
    donation,
    graphqlClient,
  );

  const txResponse = await adapter.sendTx(preparedTx);

  return {
    txResponse,
    ipfsHash,
    metadata,
  };
}
