import {
  BatchedTxOverrides,
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
  EditContinuousDonationConfig,
  prepareEditContinuousDonation,
} from '../internal/donations/prepareEditContinuousDonation';
import {
  OneTimeDonation,
  prepareOneTimeDonation,
} from '../internal/donations/prepareOneTimeDonation';
import {
  sendContinuousDonation,
  SendContinuousDonationResult,
} from '../internal/donations/sendContinuousDonation';
import {sendEditContinuousDonation} from '../internal/donations/sendEditContinuousDonation';
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
   * @param donation - Configuration for the continuous donation stream.
   *
   * @returns An object containing the transaction response, metadata, and IPFS hash.
   *
   * @throws {DripsError} If the chain is not supported, validation fails, or transaction execution fails.
   */
  sendContinuous(
    donation: ContinuousDonation,
  ): Promise<SendContinuousDonationResult>;

  /**
   * Prepares the context for editing an existing continuous donation stream (rate, name, pausing, deleting).
   *
   * @param config - Configuration specifying the stream edits.
   *
   * @returns An object containing the prepared transaction, IPFS hash, and updated metadata.
   *
   * @throws {DripsError} If the stream is not found, chain is not supported, validation fails, or caller is not stream sender.
   */
  prepareEditContinuous(
    config: EditContinuousDonationConfig,
  ): Promise<PrepareContinuousDonationResult>;

  /**
   * Edits an existing continuous donation stream (rate, name, pausing, deleting).
   *
   * @param config - Configuration specifying the stream edits.
   *
   * @returns An object containing the transaction response, updated metadata, and IPFS hash.
   *
   * @throws {DripsError} If the stream is not found, chain is not supported, validation fails, or transaction execution fails.
   */
  sendEditContinuous(
    config: EditContinuousDonationConfig,
  ): Promise<SendContinuousDonationResult>;

  /**
   * Prepares the transaction for pausing an active continuous donation stream.
   *
   * @param streamId - The unique ID of the stream to pause.
   * @param batchedTxOverrides - Optional transaction overrides.
   *
   * @returns An object containing the prepared transaction, IPFS hash, and updated metadata.
   */
  preparePauseContinuous(
    streamId: string,
    batchedTxOverrides?: BatchedTxOverrides,
  ): Promise<PrepareContinuousDonationResult>;

  /**
   * Pauses an active continuous donation stream.
   *
   * @param streamId - The unique ID of the stream to pause.
   * @param batchedTxOverrides - Optional transaction overrides.
   *
   * @returns An object containing the transaction response, updated metadata, and IPFS hash.
   */
  pauseContinuous(
    streamId: string,
    batchedTxOverrides?: BatchedTxOverrides,
  ): Promise<SendContinuousDonationResult>;

  /**
   * Prepares the transaction for deleting (archiving) an existing continuous donation stream.
   *
   * @param streamId - The unique ID of the stream to delete.
   * @param batchedTxOverrides - Optional transaction overrides.
   *
   * @returns An object containing the prepared transaction, IPFS hash, and updated metadata.
   */
  prepareDeleteContinuous(
    streamId: string,
    batchedTxOverrides?: BatchedTxOverrides,
  ): Promise<PrepareContinuousDonationResult>;

  /**
   * Deletes (archives) an existing continuous donation stream.
   *
   * @param streamId - The unique ID of the stream to delete.
   * @param batchedTxOverrides - Optional transaction overrides.
   *
   * @returns An object containing the transaction response, updated metadata, and IPFS hash.
   */
  deleteContinuous(
    streamId: string,
    batchedTxOverrides?: BatchedTxOverrides,
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

    prepareEditContinuous: (config: EditContinuousDonationConfig) => {
      requireWriteAccess(adapter, sendEditContinuousDonation.name);
      requireMetadataUploader(
        ipfsMetadataUploaderFn,
        sendEditContinuousDonation.name,
      );
      return prepareEditContinuousDonation(
        adapter,
        ipfsMetadataUploaderFn,
        config,
        graphqlClient,
      );
    },

    sendEditContinuous: (config: EditContinuousDonationConfig) => {
      requireWriteAccess(adapter, sendEditContinuousDonation.name);
      requireMetadataUploader(
        ipfsMetadataUploaderFn,
        sendEditContinuousDonation.name,
      );
      return sendEditContinuousDonation(
        adapter,
        ipfsMetadataUploaderFn,
        config,
        graphqlClient,
      );
    },

    preparePauseContinuous: (
      streamId: string,
      batchedTxOverrides?: BatchedTxOverrides,
    ) => {
      requireWriteAccess(adapter, sendEditContinuousDonation.name);
      requireMetadataUploader(
        ipfsMetadataUploaderFn,
        sendEditContinuousDonation.name,
      );
      return prepareEditContinuousDonation(
        adapter,
        ipfsMetadataUploaderFn,
        {streamId, pause: true, batchedTxOverrides},
        graphqlClient,
      );
    },

    pauseContinuous: (
      streamId: string,
      batchedTxOverrides?: BatchedTxOverrides,
    ) => {
      requireWriteAccess(adapter, sendEditContinuousDonation.name);
      requireMetadataUploader(
        ipfsMetadataUploaderFn,
        sendEditContinuousDonation.name,
      );
      return sendEditContinuousDonation(
        adapter,
        ipfsMetadataUploaderFn,
        {streamId, pause: true, batchedTxOverrides},
        graphqlClient,
      );
    },

    prepareDeleteContinuous: (
      streamId: string,
      batchedTxOverrides?: BatchedTxOverrides,
    ) => {
      requireWriteAccess(adapter, sendEditContinuousDonation.name);
      requireMetadataUploader(
        ipfsMetadataUploaderFn,
        sendEditContinuousDonation.name,
      );
      return prepareEditContinuousDonation(
        adapter,
        ipfsMetadataUploaderFn,
        {streamId, delete: true, batchedTxOverrides},
        graphqlClient,
      );
    },

    deleteContinuous: (
      streamId: string,
      batchedTxOverrides?: BatchedTxOverrides,
    ) => {
      requireWriteAccess(adapter, sendEditContinuousDonation.name);
      requireMetadataUploader(
        ipfsMetadataUploaderFn,
        sendEditContinuousDonation.name,
      );
      return sendEditContinuousDonation(
        adapter,
        ipfsMetadataUploaderFn,
        {streamId, delete: true, batchedTxOverrides},
        graphqlClient,
      );
    },
  };
}
