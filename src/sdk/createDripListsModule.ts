import {Address} from 'viem';
import {
  ReadBlockchainAdapter,
  WriteBlockchainAdapter,
} from '../internal/blockchain/BlockchainAdapter';
import {
  CreateDripListResult,
  createDripList,
} from '../internal/drip-lists/createDripList';
import {
  DripList,
  getDripListById,
} from '../internal/drip-lists/getDripListById';
import {
  NewDripList,
  prepareDripListCreation,
  PrepareDripListCreationResult,
} from '../internal/drip-lists/prepareDripListCreation';
import {
  IpfsMetadataUploaderFn,
  Metadata,
} from '../internal/shared/createPinataIpfsMetadataUploader';
import {DripsGraphQLClient} from '../internal/graphql/createGraphQLClient';
import {calcDripListId} from '../internal/shared/calcDripListId';
import {
  DripListUpdateConfig,
  prepareDripListUpdate,
  PrepareDripListUpdateResult,
} from '../internal/drip-lists/prepareDripListUpdate';
import {
  updateDripList,
  UpdateDripListResult,
} from '../internal/drip-lists/updateDripList';
import {
  requireMetadataUploader,
  requireWriteAccess,
} from '../internal/shared/assertions';

export interface DripListsModule {
  /**
   * Calculates the Drip List ID (token ID) for a given `minter` and `salt`.
   *
   * This allows the caller to precompute the ID of a Drip List before it is actually minted.
   *
   * @param salt - A salt value used to ensure uniqueness in the token ID derivation.
   * @param minter - The address of the account that would mint the Drip List.
   *
   * @returns The Drip List ID.
   *
   * @throws {DripsError} If the chain is not supported.
   */
  calculateId(salt: bigint, minter: Address): Promise<bigint>;

  /**
   * Fetches a `DripList` by its ID and chain ID.
   *
   * @param id - The Drip List ID.
   * @param chainId - The chain ID.
   *
   * @throws {DripsError} If the chain is not supported.
   *
   * @returns The `DripList`, or `null` if not found.
   */
  getById(id: bigint, chainId: number): Promise<DripList | null>;

  /**
   * Prepares the context for creating a new Drip List.
   *
   * @param ipfsMetadataUploaderFn - Function to upload metadata to IPFS.
   * @param dripList - Configuration for the new Drip List.
   *
   * @returns An object containing the prepared transaction, metadata, IPFS hash, salt, and Drip List ID.
   *
   * @throws {DripsError} If the chain is not supported or if validation fails.
   */
  prepareCreate(dripList: NewDripList): Promise<PrepareDripListCreationResult>;

  /**
   * Creates a new Drip List.
   *
   * @param ipfsMetadataUploaderFn - Function to upload metadata to IPFS.
   * @param dripList - Configuration for the new Drip List.
   *
   * @returns An object containing the transaction response, metadata, IPFS hash, salt, and Drip List ID.
   *
   * @throws {DripsError} If the chain is not supported, validation fails, or transaction execution fails.
   */
  create(dripList: NewDripList): Promise<CreateDripListResult>;

  /**
   * Prepares the context for updating a Drip List.
   *
   * @param ipfsMetadataUploaderFn - Function to upload metadata to IPFS.
   * @param config - Configuration specifying what to update in the Drip List.
   *
   * @returns An object containing the prepared transaction, new metadata, and IPFS hash.
   *
   * @throws {DripsError} If the Drip List is not found, chain is not supported, or no updates are provided.
   */
  prepareUpdate(
    config: DripListUpdateConfig,
  ): Promise<PrepareDripListUpdateResult>;

  /**
   * Updates a Drip List.
   *
   * @param ipfsMetadataUploaderFn - Function to upload metadata to IPFS.
   * @param config - Configuration specifying what to update in the Drip List.
   *
   * @returns An object containing the transaction response, new metadata, and IPFS hash.
   *
   * @throws {DripsError} If the Drip List is not found, chain is not supported, no updates are provided, or transaction execution fails.
   */
  update(config: DripListUpdateConfig): Promise<UpdateDripListResult>;
}

type Deps = {
  readonly graphqlClient: DripsGraphQLClient;
  readonly adapter: ReadBlockchainAdapter | WriteBlockchainAdapter;
  readonly ipfsMetadataUploaderFn?: IpfsMetadataUploaderFn<Metadata>;
};

export function createDripListsModule(deps: Deps): DripListsModule {
  const {adapter, graphqlClient, ipfsMetadataUploaderFn} = deps;

  return {
    calculateId: (salt: bigint, minter: Address) =>
      calcDripListId(adapter, {
        salt,
        minter,
      }),

    getById: (accountId: bigint, chainId: number) =>
      getDripListById(accountId, chainId, graphqlClient),

    prepareCreate: (dripList: NewDripList) => {
      requireWriteAccess(adapter, createDripList.name);
      requireMetadataUploader(ipfsMetadataUploaderFn, createDripList.name);
      return prepareDripListCreation(adapter, ipfsMetadataUploaderFn, dripList);
    },

    create: (dripList: NewDripList) => {
      requireWriteAccess(adapter, createDripList.name);
      requireMetadataUploader(ipfsMetadataUploaderFn, createDripList.name);
      return createDripList(adapter, ipfsMetadataUploaderFn, dripList);
    },

    prepareUpdate: (config: DripListUpdateConfig) => {
      requireWriteAccess(adapter, updateDripList.name);
      requireMetadataUploader(ipfsMetadataUploaderFn, updateDripList.name);
      return prepareDripListUpdate(
        adapter,
        ipfsMetadataUploaderFn,
        config,
        graphqlClient,
      );
    },

    update: (config: DripListUpdateConfig) => {
      requireWriteAccess(adapter, updateDripList.name);
      requireMetadataUploader(ipfsMetadataUploaderFn, updateDripList.name);
      return updateDripList(
        adapter,
        ipfsMetadataUploaderFn,
        config,
        graphqlClient,
      );
    },
  };
}
