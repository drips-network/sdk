import type * as Types from '../../graphql/__generated__/base-types';

export type GetCurrentStreamsQueryVariables = Types.Exact<{
  userAccountId: Types.Scalars['ID']['input'];
  chains?: Types.InputMaybe<Array<Types.SupportedChain> | Types.SupportedChain>;
}>;

export type GetCurrentStreamsQuery = {
  __typename: 'Query';
  userById: {
    __typename: 'User';
    chainData: Array<{
      __typename: 'UserData';
      chain: Types.SupportedChain;
      streams: {
        __typename: 'UserStreams';
        outgoing: Array<{
          __typename: 'Stream';
          id: string;
          name?: string | null;
          isPaused: boolean;
          config: {
            __typename: 'StreamConfig';
            raw: string;
            dripId: string;
            durationSeconds?: number | null;
            startDate?: any | null;
            amountPerSecond: {
              __typename: 'Amount';
              tokenAddress: string;
              amount: string;
            };
          };
          receiver:
            | {
                __typename: 'DripList';
                account: {__typename: 'NftDriverAccount'; accountId: string};
              }
            | {
                __typename: 'EcosystemMainAccount';
                account: {__typename: 'NftDriverAccount'; accountId: string};
              }
            | {
                __typename: 'User';
                account: {
                  __typename: 'AddressDriverAccount';
                  accountId: string;
                };
              };
        }>;
      };
    }>;
  };
};
