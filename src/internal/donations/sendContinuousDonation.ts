import {
  TxResponse,
  WriteBlockchainAdapter,
} from '../blockchain/BlockchainAdapter';
import {DripsGraphQLClient} from '../graphql/createGraphQLClient';
import {
  IpfsUploaderFn,
  Metadata,
  StreamsMetadata,
} from '../metadata/createPinataIpfsUploader';
import {requireWriteAccess} from '../shared/assertions';
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
  ipfsUploaderFn: IpfsUploaderFn<StreamsMetadata>,
  donation: ContinuousDonation,
  graphqlClient?: DripsGraphQLClient,
): Promise<SendContinuousDonationResult> {
  requireWriteAccess(adapter, sendContinuousDonation.name);

  const {preparedTx, ipfsHash, metadata} = await prepareContinuousDonation(
    adapter,
    ipfsUploaderFn,
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
