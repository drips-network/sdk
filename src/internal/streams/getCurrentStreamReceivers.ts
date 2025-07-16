import {gql} from 'graphql-request';
import {
  createGraphQLClient,
  DripsGraphQLClient,
} from '../graphql/createGraphQLClient';
import {requireGraphQLSupportedChain} from '../shared/assertions';
import {graphqlChainMap} from '../config/graphqlChainMap';
import type {SupportedChain as ChainName} from '../graphql/__generated__/base-types';
import {filterCurrentChain} from '../shared/filterCurrentChain';
import {Address} from 'viem';
import {OnChainStreamReceiver} from '../shared/validateAndFormatStreamReceivers';
import {GetCurrentStreamsQuery} from './__generated__/gql.generated';

const GET_CURRENT_STREAM_RECEIVERS_QUERY = gql`
  query GetCurrentStreams($userAccountId: ID!, $chains: [SupportedChain!]) {
    userById(accountId: $userAccountId, chains: $chains) {
      chainData {
        chain
        streams {
          outgoing {
            id
            name
            isPaused
            config {
              raw
              amountPerSecond {
                tokenAddress
              }
              dripId
              amountPerSecond {
                amount
              }
              durationSeconds
              startDate
            }
            receiver {
              ... on User {
                account {
                  accountId
                }
              }
              ... on DripList {
                account {
                  accountId
                }
              }
              ... on EcosystemMainAccount {
                account {
                  accountId
                }
              }
            }
          }
        }
      }
    }
  }
`;

export async function getCurrentStreamsAndReceivers(
  accountId: bigint,
  chainId: number,
  erc20: Address,
  graphqlClient?: DripsGraphQLClient,
): Promise<{
  currentStreams: GetCurrentStreamsQuery['userById']['chainData'][number]['streams']['outgoing'];
  currentReceivers: OnChainStreamReceiver[];
}> {
  requireGraphQLSupportedChain(chainId, getCurrentStreamsAndReceivers.name);

  const chain = graphqlChainMap[chainId] as ChainName;
  const variables = {
    userAccountId: accountId.toString(),
    chains: [chain],
  };
  const client = graphqlClient || createGraphQLClient();

  const res = await client.query<GetCurrentStreamsQuery>(
    GET_CURRENT_STREAM_RECEIVERS_QUERY,
    variables,
  );

  const chainData = filterCurrentChain(res.userById.chainData, chain);
  const {outgoing: allStreams} = chainData.streams;

  const matchesToken = (stream: (typeof allStreams)[number]) =>
    stream.config?.amountPerSecond?.tokenAddress?.toLowerCase() ===
    erc20.toLowerCase();

  const isActive = (stream: (typeof allStreams)[number]) => !stream.isPaused;

  const toOnChainReceiver = (stream: (typeof allStreams)[number]) => ({
    accountId: BigInt(stream.receiver?.account?.accountId),
    config: BigInt(stream.config.raw),
  });

  const currentStreams = allStreams.filter(
    stream => matchesToken(stream) && isActive(stream),
  );

  const currentReceivers = currentStreams.map(toOnChainReceiver);

  return {
    currentStreams,
    currentReceivers,
  };
}
