import {
  PreparedTx,
  ReadBlockchainAdapter,
  TxResponse,
  WriteBlockchainAdapter,
} from '../internal/blockchain/BlockchainAdapter';
import {
  ContinuousDonation,
  prepareContinuousDonation,
  PrepareContinuousDonationResult,
} from '../internal/donations/prepareContinuousDonation';
import {
  OneTimeDonation,
  prepareOneTimeDonation,
} from '../internal/donations/prepareOneTimeDonation';
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
  /**
   * Prepares a transaction for making a one-time donation.
   *
   * @param donation - Configuration for the one-time donation.
   *
   * @returns A prepared transaction ready for execution.
   *
   * @throws {DripsError} If the chain is not supported or receiver resolution fails.
   */
  prepareOneTime(donation: OneTimeDonation): Promise<PreparedTx>;

  /**
   * Sends a one-time donation.
   *
   * @param donation - The one-time donation configuration to send.
   *
   * @returns The transaction response from the blockchain.
   *
   * @throws {DripsError} If the chain is not supported, receiver resolution fails, or transaction execution fails.
   */
  sendOneTime(donation: OneTimeDonation): Promise<TxResponse>;

  /**
   * Prepares the context for a continuous donation stream.
   *
   * @param ipfsMetadataUploaderFn - A function to upload metadata to IPFS.
   * @param donation - Configuration for the donation stream.
   *
   * @returns An object containing the prepared transaction, IPFS hash, and metadata.
   */
  prepareContinuous(
    donation: ContinuousDonation,
  ): Promise<PrepareContinuousDonationResult>;

  /**
   * Sends a continuous donation by preparing and executing the transaction.
   *
   * @param ipfsMetadataUploaderFn - Function to upload metadata to IPFS.
   * @param donation - Configuration for the continuous donation stream.
   *
   * @returns An object containing the transaction response, metadata, and IPFS hash.
   *
   * @throws {DripsError} If the chain is not supported, validation fails, or transaction execution fails.
   */
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
    prepareOneTime: (donation: OneTimeDonation) => {
      requireWriteAccess(adapter, sendOneTimeDonation.name);
      requireMetadataUploader(ipfsMetadataUploaderFn, sendOneTimeDonation.name);
      return prepareOneTimeDonation(adapter, donation);
    },

    sendOneTime: (donation: OneTimeDonation) => {
      requireWriteAccess(adapter, sendOneTimeDonation.name);
      requireMetadataUploader(ipfsMetadataUploaderFn, sendOneTimeDonation.name);
      return sendOneTimeDonation(adapter, donation);
    },

    prepareContinuous: (donation: ContinuousDonation) => {
      requireWriteAccess(adapter, sendContinuousDonation.name);
      requireMetadataUploader(
        ipfsMetadataUploaderFn,
        sendContinuousDonation.name,
      );
      return prepareContinuousDonation(
        adapter,
        ipfsMetadataUploaderFn,
        donation,
        graphqlClient,
      );
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
