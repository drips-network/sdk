import {Address} from 'viem';
import {
  getUserWithdrawableBalances,
  UserWithdrawableBalances,
} from '../internal/collect/getUserWithdrawableBalances';
import {DripsGraphQLClient} from '../internal/graphql/createGraphQLClient';

export interface UsersModule {
  getUserWithdrawableBalances(
    address: Address,
    chainId: number,
  ): Promise<UserWithdrawableBalances>;
}

type Deps = {
  readonly graphqlClient: DripsGraphQLClient;
};

export function createUsersModule(deps: Deps): UsersModule {
  const {graphqlClient} = deps;

  return {
    getUserWithdrawableBalances: (
      address: Address,
      chainId: number,
    ): Promise<UserWithdrawableBalances> => {
      return getUserWithdrawableBalances(address, chainId, graphqlClient);
    },
  };
}
