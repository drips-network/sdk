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
  /**
   * Fetches withdrawable balances for the connected user on a specific chain.
   *
   * @param chainId - The chain ID for the target network.
   *
   * @throws {DripsError} If the chain is not supported.
   * @returns An object containing the user's withdrawable balances.
   */
  getWithdrawableBalances(chainId: number): Promise<UserWithdrawableBalances>;

  /**
   * Prepares a transaction for collecting funds from streams and splits.
   *
   * @param config - Configuration for the collection operation.
   *
   * @returns A prepared transaction ready for execution.
   *
   * @throws {DripsError} If the chain is not supported, no tokens are provided, or configuration is invalid.
   */
  prepareCollection(config: CollectConfig): Promise<PreparedTx>;

  /**
   * Collects funds for an account.
   *
   * @param config - Configuration for the collection operation.
   *
   * @returns The transaction response from the blockchain.
   *
   * @throws {DripsError} If the chain is not supported, no tokens are provided, configuration is invalid, or transaction execution fails.
   */
  collect(config: CollectConfig): Promise<TxResponse>;
}

type Deps = {
  readonly adapter: ReadBlockchainAdapter | WriteBlockchainAdapter;
  readonly graphqlClient: DripsGraphQLClient;
};

export function createFundsModule(deps: Deps): FundsModule {
  const {adapter, graphqlClient} = deps;

  return {
    getWithdrawableBalances: async (
      chainId: number,
    ): Promise<UserWithdrawableBalances> => {
      requireWriteAccess(adapter, 'getWithdrawableBalances');
      return getUserWithdrawableBalances(
        await adapter.getAddress(),
        chainId,
        graphqlClient,
      );
    },

    prepareCollection: (config: CollectConfig) => {
      requireWriteAccess(adapter, prepareCollection.name);
      return prepareCollection(adapter, config);
    },

    collect: (config: CollectConfig) => {
      requireWriteAccess(adapter, collect.name);
      return collect(adapter, config);
    },
  };
}
