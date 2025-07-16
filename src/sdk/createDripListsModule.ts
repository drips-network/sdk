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
import {
  DripListUpdateConfig,
  prepareDripListUpdate,
  PrepareDripListUpdateResult,
} from '../internal/drip-lists/prepareDripListUpdate';
import {
  updateDripList,
  UpdateDripListResult,
} from '../internal/drip-lists/updateDripList';

export interface DripListsModule {
  calculateId(salt: bigint, minter: Address, chainId: number): Promise<bigint>;
  getById(accountId: bigint, chainId: number): Promise<DripList | null>;
  create(dripList: NewDripList): Promise<CreateDripListResult>;
  update(config: DripListUpdateConfig): Promise<UpdateDripListResult>;
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

    create: (dripList: NewDripList) =>
      createDripList(
        adapter as WriteBlockchainAdapter,
        ipfsMetadataUploaderFn,
        dripList,
      ),

    update: (config: DripListUpdateConfig) =>
      updateDripList(
        adapter as WriteBlockchainAdapter,
        ipfsMetadataUploaderFn,
        config,
        graphqlClient,
      ),
  };
}
