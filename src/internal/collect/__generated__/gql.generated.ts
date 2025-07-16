import type * as Types from '../../graphql/__generated__/base-types';

export type GetUserByAddressQueryVariables = Types.Exact<{
  address: Types.Scalars['String']['input'];
  chains?: Types.InputMaybe<Array<Types.SupportedChain> | Types.SupportedChain>;
}>;

export type GetUserByAddressQuery = {
  __typename: 'Query';
  userByAddress: {
    __typename: 'User';
    chainData: Array<{
      __typename: 'UserData';
      withdrawableBalances: Array<{
        __typename: 'WithdrawableBalance';
        tokenAddress: string;
        collectableAmount: string;
        receivableAmount: string;
        splittableAmount: string;
      }>;
    }>;
  };
};
