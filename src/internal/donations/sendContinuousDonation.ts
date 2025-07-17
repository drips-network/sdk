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
