import {graphqlChainMap} from '../config/graphqlChainMap';
import {requireGraphQLSupportedChain} from '../shared/assertions';
import {
  DripsGraphQLClient,
  createGraphQLClient,
} from '../graphql/createGraphQLClient';
import {gql} from 'graphql-request';
import type {
  GetUserByAddressQuery,
  GetUserByAddressQueryVariables,
} from './__generated__/gql.generated';
import type {SupportedChain as ChainName} from '../graphql/__generated__/base-types';
import {Address} from 'viem';

const GET_USER_WITHDRAWABLE_BALANCES_QUERY = gql`
  query GetUserByAddress($address: String!, $chains: [SupportedChain!]) {
    userByAddress(address: $address, chains: $chains) {
      chainData {
        withdrawableBalances {
          tokenAddress
          collectableAmount
          receivableAmount
          splittableAmount
        }
      }
    }
  }
`;

export type UserWithdrawableBalances =
  GetUserByAddressQuery['userByAddress']['chainData'];

/**
 * Fetches withdrawable balances for a given user address on a specific chain.
 *
 * @param address - The user's address.
 * @param chainId - The chain ID for the target network.
 * @param graphqlClient - (Optional) A `DripsGraphQLClient`. If omitted, a default client is created.
 *
 * @throws {DripsError} If the chain is not supported.
 * @returns An object containing the user's withdrawable balances.
 */
export async function getUserWithdrawableBalances(
  address: Address,
  chainId: number,
  graphqlClient?: DripsGraphQLClient,
): Promise<UserWithdrawableBalances> {
  requireGraphQLSupportedChain(chainId, getUserWithdrawableBalances.name);

  const chain = graphqlChainMap[chainId] as ChainName;
  const variables: GetUserByAddressQueryVariables = {
    chains: [chain],
    address,
  };
  const client = graphqlClient || createGraphQLClient();

  const res = await client.query<GetUserByAddressQuery>(
    GET_USER_WITHDRAWABLE_BALANCES_QUERY,
    variables,
  );

  return res.userByAddress.chainData;
}
