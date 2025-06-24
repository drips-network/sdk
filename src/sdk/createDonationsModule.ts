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
} from '../internal/metadata/createPinataIpfsMetadataUploader';

export interface DonationsModule {
  prepareOneTimeDonation: (donation: OneTimeDonation) => Promise<PreparedTx>;
  sendOneTime(donation: OneTimeDonation): Promise<TxResponse>;
  prepareContinuous: (
    donation: ContinuousDonation,
  ) => Promise<PrepareContinuousDonationResult>;
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
    prepareOneTimeDonation: (donation: OneTimeDonation) =>
      prepareOneTimeDonation(adapter as WriteBlockchainAdapter, donation),

    sendOneTime: async (donation: OneTimeDonation) =>
      sendOneTimeDonation(adapter as WriteBlockchainAdapter, donation),

    prepareContinuous: (donation: ContinuousDonation) =>
      prepareContinuousDonation(
        adapter as WriteBlockchainAdapter,
        ipfsMetadataUploaderFn,
        donation,
        graphqlClient,
      ),

    sendContinuous: async (donation: ContinuousDonation) =>
      sendContinuousDonation(
        adapter as WriteBlockchainAdapter,
        ipfsMetadataUploaderFn,
        donation,
        graphqlClient,
      ),
  };
}
