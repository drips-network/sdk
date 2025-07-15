import {
  PreparedTx,
  ReadBlockchainAdapter,
  TxResponse,
  WriteBlockchainAdapter,
} from '../internal/blockchain/BlockchainAdapter';
import {
  ContinuousDonation,
  PrepareContinuousDonationResult,
  prepareContinuousDonation,
} from '../internal/donations/prepareContinuousDonation';
import {
  prepareOneTimeDonation,
  OneTimeDonation,
} from '../internal/donations/prepareOneTimeDonation';
import {
  sendContinuousDonation,
  SendContinuousDonationResult,
} from '../internal/donations/sendContinuousDonation';
import {sendOneTimeDonation} from '../internal/donations/sendOneTimeDonation';
import {DripsGraphQLClient} from '../internal/graphql/createGraphQLClient';
import {
  IpfsMetadataUploaderFn,
  Metadata,
} from '../internal/shared/createPinataIpfsMetadataUploader';

export interface DonationsModule {
  sendOneTime(donation: OneTimeDonation): Promise<TxResponse>;
  sendContinuous(
    donation: ContinuousDonation,
  ): Promise<SendContinuousDonationResult>;
}

type Deps = {
  readonly graphqlClient: DripsGraphQLClient;
  readonly ipfsMetadataUploaderFn: IpfsMetadataUploaderFn<Metadata>;
  readonly adapter: ReadBlockchainAdapter | WriteBlockchainAdapter;
};

export function createDonationsModule(deps: Deps): DonationsModule {
  const {adapter, graphqlClient, ipfsMetadataUploaderFn} = deps;

  return {
    sendOneTime: (donation: OneTimeDonation) =>
      sendOneTimeDonation(adapter as WriteBlockchainAdapter, donation),

    sendContinuous: (donation: ContinuousDonation) =>
      sendContinuousDonation(
        adapter as WriteBlockchainAdapter,
        ipfsMetadataUploaderFn,
        donation,
        graphqlClient,
      ),
  };
}
