import {Address} from 'viem';
import {
  PreparedTx,
  ReadBlockchainAdapter,
  TxResponse,
  WriteBlockchainAdapter,
} from '../internal/blockchain/BlockchainAdapter';
import {
  CollectConfig,
  prepareCollection,
} from '../internal/collect/prepareCollection';
import {collect} from '../internal/collect/collect';
import {
  getUserWithdrawableBalances,
  UserWithdrawableBalances,
} from '../internal/collect/getUserWithdrawableBalances';
import {requireWriteAccess} from '../internal/shared/assertions';
import {DripsGraphQLClient} from '../internal/graphql/createGraphQLClient';

export interface FundsModule {
  getUserWithdrawableBalances(
    address: Address,
    chainId: number,
  ): Promise<UserWithdrawableBalances>;
  prepareCollection(config: CollectConfig): Promise<PreparedTx>;
  collect(config: CollectConfig): Promise<TxResponse>;
}

type Deps = {
  readonly adapter: ReadBlockchainAdapter | WriteBlockchainAdapter;
  readonly graphqlClient: DripsGraphQLClient;
};

export function createFundsModule(deps: Deps): FundsModule {
  const {adapter, graphqlClient} = deps;

  return {
    getUserWithdrawableBalances: (
      address: Address,
      chainId: number,
    ): Promise<UserWithdrawableBalances> => {
      return getUserWithdrawableBalances(address, chainId, graphqlClient);
    },

    prepareCollection: (config: CollectConfig) => {
      requireWriteAccess(adapter, collect.name);
      return prepareCollection(adapter, config);
    },

    collect: (config: CollectConfig) => {
      requireWriteAccess(adapter, collect.name);
      return collect(adapter, config);
    },
  };
}
