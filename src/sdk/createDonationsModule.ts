import {
  ReadBlockchainAdapter,
  TxResponse,
  WriteBlockchainAdapter,
} from '../internal/blockchain/BlockchainAdapter';
import {ContinuousDonation} from '../internal/donations/prepareContinuousDonation';
import {OneTimeDonation} from '../internal/donations/prepareOneTimeDonation';
import {
  sendContinuousDonation,
  SendContinuousDonationResult,
} from '../internal/donations/sendContinuousDonation';
import {sendOneTimeDonation} from '../internal/donations/sendOneTimeDonation';
import {DripsGraphQLClient} from '../internal/graphql/createGraphQLClient';
import {
  requireMetadataUploader,
  requireWriteAccess,
} from '../internal/shared/assertions';
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
  readonly adapter: ReadBlockchainAdapter | WriteBlockchainAdapter;
  readonly ipfsMetadataUploaderFn?: IpfsMetadataUploaderFn<Metadata>;
};

export function createDonationsModule(deps: Deps): DonationsModule {
  const {adapter, graphqlClient, ipfsMetadataUploaderFn} = deps;

  return {
    sendOneTime: (donation: OneTimeDonation) => {
      requireWriteAccess(adapter, sendOneTimeDonation.name);
      requireMetadataUploader(ipfsMetadataUploaderFn, sendOneTimeDonation.name);
      return sendOneTimeDonation(adapter, donation);
    },

    sendContinuous: (donation: ContinuousDonation) => {
      requireWriteAccess(adapter, sendContinuousDonation.name);
      requireMetadataUploader(
        ipfsMetadataUploaderFn,
        sendContinuousDonation.name,
      );
      return sendContinuousDonation(
        adapter,
        ipfsMetadataUploaderFn,
        donation,
        graphqlClient,
      );
    },
  };
}
