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
  EditContinuousDonationConfig,
  prepareEditContinuousDonation,
} from './prepareEditContinuousDonation';

export type SendContinuousDonationResult = {
  readonly txResponse: TxResponse;
  readonly ipfsHash: string;
  readonly metadata: Metadata;
};

export async function sendEditContinuousDonation(
  adapter: WriteBlockchainAdapter,
  ipfsMetadataUploaderFn: IpfsMetadataUploaderFn<StreamsMetadata>,
  config: EditContinuousDonationConfig,
  graphqlClient?: DripsGraphQLClient,
): Promise<SendContinuousDonationResult> {
  const {preparedTx, ipfsHash, metadata} = await prepareEditContinuousDonation(
    adapter,
    ipfsMetadataUploaderFn,
    config,
    graphqlClient,
  );

  const txResponse = await adapter.sendTx(preparedTx);

  return {
    txResponse,
    ipfsHash,
    metadata,
  };
}
