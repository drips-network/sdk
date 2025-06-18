import {graphqlChainMap} from '../config/graphqlChainMap';
import {requireGraphQLSupportedChain} from '../shared/assertions';
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
      splits {
        ... on ProjectReceiver {
          __typename
          weight
          account {
            accountId
            driver
          }
          project {
            source {
              forge
              ownerName
              repoName
              url
            }
          }
        }
        ... on DripListReceiver {
          __typename
          weight
          account {
            accountId
            driver
          }
        }
        ... on AddressReceiver {
          __typename
          weight
          account {
            accountId
            address
            driver
          }
        }
        ... on SubListReceiver {
          __typename
          weight
          account {
            accountId
            driver
          }
        }
        ... on EcosystemMainAccountReceiver {
          __typename
          weight
          account {
            accountId
            driver
          }
        }
      }
      support {
        ... on OneTimeDonationSupport {
          __typename
          account {
            accountId
            address
            driver
          }
          amount {
            amount
            tokenAddress
          }
        }
      }
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
