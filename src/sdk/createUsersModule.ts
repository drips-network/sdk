import {Address} from 'viem';
import {
  getUserWithdrawableBalances,
  UserWithdrawableBalances,
} from '../internal/collect/getUserWithdrawableBalances';
import {DripsGraphQLClient} from '../internal/graphql/createGraphQLClient';

export interface UsersModule {
  getWithdrawableBalances(
    address: Address,
    chainId: number,
  ): Promise<UserWithdrawableBalances | null>;
}

type Deps = {
  readonly graphqlClient: DripsGraphQLClient;
};

export function createUsersModule(deps: Deps): UsersModule {
  const {graphqlClient} = deps;

  return {
    getWithdrawableBalances: (
      address: Address,
      chainId: number,
    ): Promise<UserWithdrawableBalances | null> => {
      return getUserWithdrawableBalances(address, chainId, graphqlClient);
    },
  };
}
