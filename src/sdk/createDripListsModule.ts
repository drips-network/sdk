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
  PrepareDripListCreationResult,
} from '../internal/drip-lists/prepareDripListCreation';
import {
  IpfsMetadataUploaderFn,
  Metadata,
} from '../internal/shared/createPinataIpfsMetadataUploader';
import {DripsGraphQLClient} from '../internal/graphql/createGraphQLClient';
import {prepareDripListCreation} from '../internal/drip-lists/prepareDripListCreation';
import {calcDripListId} from '../internal/shared/calcDripListId';

export interface DripListsModule {
  calculateId(salt: bigint, minter: Address, chainId: number): Promise<bigint>;
  getById(accountId: bigint, chainId: number): Promise<DripList | null>;
  prepareCreation(
    dripList: NewDripList,
  ): Promise<PrepareDripListCreationResult>;
  create(dripList: NewDripList): Promise<CreateDripListResult>;
}

type Deps = {
  readonly graphqlClient: DripsGraphQLClient;
  readonly ipfsMetadataUploaderFn: IpfsMetadataUploaderFn<Metadata>;
  readonly adapter: ReadBlockchainAdapter | WriteBlockchainAdapter;
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

    prepareCreation: (dripList: NewDripList) =>
      prepareDripListCreation(
        adapter as WriteBlockchainAdapter,
        ipfsMetadataUploaderFn,
        dripList,
      ),

    create: async (dripList: NewDripList) =>
      createDripList(
        adapter as WriteBlockchainAdapter,
        ipfsMetadataUploaderFn,
        dripList,
      ),
  };
}
