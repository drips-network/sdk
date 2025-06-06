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
  } | null;
};
