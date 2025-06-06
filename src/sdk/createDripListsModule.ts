import {Address} from 'viem';
import {
  ReadBlockchainAdapter,
  WriteBlockchainAdapter,
} from '../internal/blockchain/BlockchainAdapter';
import {
  DripListCreationResult,
  createDripList,
} from '../internal/drip-lists/createDripList';
import {
  DripList,
  getDripListById,
} from '../internal/drip-lists/getDripListById';
import {
  CreateDripListParams,
  DripListCreationContext,
  prepareDripListCreationCtx,
} from '../internal/drip-lists/prepareDripListCreationCtx';
import {calcDripListId} from '../internal/drip-lists/calcDripListId';
import {
  IpfsUploaderFn,
  Metadata,
} from '../internal/metadata/createPinataIpfsUploader';
import {DripsGraphQLClient} from '../internal/graphql/createGraphQLClient';

export interface DripListsModule {
  calculateId(salt: bigint, minter: Address, chainId: number): Promise<bigint>;
  getById(accountId: bigint, chainId: number): Promise<DripList | null>;
  prepareCreationCtx(
    params: CreateDripListParams,
  ): Promise<DripListCreationContext>;
  create(params: CreateDripListParams): Promise<DripListCreationResult>;
}

type Deps = {
  readonly graphqlClient: DripsGraphQLClient;
  readonly ipfsUploaderFn: IpfsUploaderFn<Metadata>;
  readonly adapter: ReadBlockchainAdapter | WriteBlockchainAdapter;
};

export function createDripListsModule(deps: Deps): DripListsModule {
  const {adapter, graphqlClient, ipfsUploaderFn} = deps;

  return {
    calculateId: (salt: bigint, minter: Address) => {
      return calcDripListId(adapter, {
        salt,
        minter,
      });
    },

    getById: (accountId: bigint, chainId: number) => {
      return getDripListById(accountId, chainId, graphqlClient);
    },

    prepareCreationCtx: (params: CreateDripListParams) =>
      prepareDripListCreationCtx(
        adapter as WriteBlockchainAdapter,
        ipfsUploaderFn,
        params,
      ),

    create: async (params: CreateDripListParams) => {
      return createDripList(
        adapter as WriteBlockchainAdapter,
        ipfsUploaderFn,
        params,
      );
    },
  };
}
