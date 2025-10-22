import type * as Types from '../../graphql/__generated__/base-types';

export type GetDripListQueryVariables = Types.Exact<{
  accountId: Types.Scalars['ID']['input'];
  chain: Types.SupportedChain;
}>;

export type GetDripListQuery = {
  __typename: 'Query';
  dripList?: {
    __typename: 'DripList';
    chain: Types.SupportedChain;
    description?: string | null;
    isVisible: boolean;
    lastProcessedIpfsHash?: string | null;
    latestMetadataIpfsHash?: string | null;
    latestVotingRoundId?: string | null;
    name: string;
    previousOwnerAddress: string;
    account: {
      __typename: 'NftDriverAccount';
      accountId: string;
      driver: Types.Driver;
    };
    owner: {
      __typename: 'AddressDriverAccount';
      accountId: string;
      driver: Types.Driver;
      address: string;
    };
    splits: Array<
      | {
          __typename: 'AddressReceiver';
          weight: number;
          account: {
            __typename: 'AddressDriverAccount';
            accountId: string;
            address: string;
            driver: Types.Driver;
          };
        }
      | {
          __typename: 'DripListReceiver';
          weight: number;
          account: {
            __typename: 'NftDriverAccount';
            accountId: string;
            driver: Types.Driver;
          };
        }
      | {
          __typename: 'EcosystemMainAccountReceiver';
          weight: number;
          account: {
            __typename: 'NftDriverAccount';
            accountId: string;
            driver: Types.Driver;
          };
        }
      | {
          __typename: 'LinkedIdentityReceiver';
          weight: number;
          account: {
            __typename: 'RepoDriverAccount';
            accountId: string;
            driver: Types.Driver;
          };
        }
      | {
          __typename: 'ProjectReceiver';
          weight: number;
          account: {
            __typename: 'RepoDriverAccount';
            accountId: string;
            driver: Types.Driver;
          };
          project: {
            __typename: 'Project';
            source: {
              __typename: 'Source';
              forge: Types.Forge;
              ownerName: string;
              repoName: string;
              url: string;
            };
          };
        }
      | {
          __typename: 'SubListReceiver';
          weight: number;
          account: {
            __typename: 'ImmutableSplitsDriverAccount';
            accountId: string;
            driver: Types.Driver;
          };
        }
    >;
    support: Array<
      | {__typename: 'DripListSupport'}
      | {__typename: 'EcosystemSupport'}
      | {
          __typename: 'OneTimeDonationSupport';
          date: any;
          account: {
            __typename: 'AddressDriverAccount';
            accountId: string;
            address: string;
            driver: Types.Driver;
          };
          amount: {__typename: 'Amount'; amount: string; tokenAddress: string};
        }
      | {__typename: 'ProjectSupport'}
      | {
          __typename: 'StreamSupport';
          account: {
            __typename: 'AddressDriverAccount';
            accountId: string;
            address: string;
            driver: Types.Driver;
          };
          stream: {
            __typename: 'Stream';
            id: string;
            name?: string | null;
            config: {
              __typename: 'StreamConfig';
              dripId: string;
              durationSeconds?: number | null;
              raw: string;
              startDate?: any | null;
              amountPerSecond: {
                __typename: 'Amount';
                amount: string;
                tokenAddress: string;
              };
            };
          };
        }
    >;
  } | null;
};
