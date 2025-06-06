import {graphqlChainMap} from '../config/graphqlChainMap';
import {requireGraphQLSupportedChain} from '../utils/assertions';
import {
  DripsGraphQLClient,
  createGraphQLClient,
} from '../graphql/createGraphQLClient';
import {gql} from 'graphql-request';
import type {
  GetDripListQuery,
  GetDripListQueryVariables,
} from './__generated__/gql.generated';
import type {SupportedChain as ChainName} from '../graphql/__generated__/base-types';

const GET_DRIP_LIST_QUERY = gql`
  query GetDripList($accountId: ID!, $chain: SupportedChain!) {
    dripList(id: $accountId, chain: $chain) {
      account {
        accountId
        driver
      }
      chain
      description
      isVisible
      lastProcessedIpfsHash
      latestMetadataIpfsHash
      latestVotingRoundId
      name
      owner {
        accountId
        driver
        address
      }
      previousOwnerAddress
    }
  }
`;

export type DripList = NonNullable<GetDripListQuery['dripList']>;

export async function getDripListById(
  accountId: bigint,
  chainId: number,
  graphqlClient?: DripsGraphQLClient,
): Promise<DripList | null> {
  requireGraphQLSupportedChain(chainId, getDripListById.name);

  const chain = graphqlChainMap[chainId] as ChainName;

  const variables: GetDripListQueryVariables = {
    chain,
    accountId: accountId.toString(),
  };

  const client = graphqlClient || createGraphQLClient();
  const res = await client.query<GetDripListQuery>(
    GET_DRIP_LIST_QUERY,
    variables,
  );

  return res.dripList ?? null;
}
