export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends {[key: string]: unknown}> = {[K in keyof T]: T[K]};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
export type MakeEmpty<T extends {[key: string]: unknown}, K extends keyof T> = {
  [_ in K]?: never;
};
export type Incremental<T> =
  | T
  | {[P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never};
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: {input: string; output: string};
  String: {input: string; output: string};
  Boolean: {input: boolean; output: boolean};
  Int: {input: number; output: number};
  Float: {input: number; output: number};
  /** Date custom scalar type */
  Date: {input: any; output: any};
};

export type Account = {
  accountId: Scalars['ID']['output'];
  driver: Driver;
};

export type AddressDriverAccount = Account & {
  __typename: 'AddressDriverAccount';
  accountId: Scalars['ID']['output'];
  address: Scalars['String']['output'];
  driver: Driver;
};

export type AddressReceiver = Receiver & {
  __typename: 'AddressReceiver';
  account: AddressDriverAccount;
  driver: Driver;
  weight: Scalars['Int']['output'];
};

export type Amount = {
  __typename: 'Amount';
  amount: Scalars['String']['output'];
  tokenAddress: Scalars['String']['output'];
};

export type Avatar = EmojiAvatar | ImageAvatar;

export type ChainAmount = {
  __typename: 'ChainAmount';
  amount: Scalars['String']['output'];
  chain: SupportedChain;
  tokenAddress: Scalars['String']['output'];
};

export type ChainStats = {
  __typename: 'ChainStats';
  chain: SupportedChain;
  claimedProjectsCount: Scalars['Int']['output'];
  dripListsCount: Scalars['Int']['output'];
  receiversCount: Scalars['Int']['output'];
};

export type ClaimedProjectData = {
  __typename: 'ClaimedProjectData';
  avatar: Avatar;
  chain: SupportedChain;
  claimedAt: Scalars['Date']['output'];
  color: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  /** @deprecated Use avatar instead */
  emoji: Scalars['String']['output'];
  lastProcessedIpfsHash?: Maybe<Scalars['String']['output']>;
  latestMetadataIpfsHash: Scalars['String']['output'];
  owner: AddressDriverAccount;
  splits: Splits;
  support: Array<SupportItem>;
  totalEarned: Array<Amount>;
  verificationStatus: ProjectVerificationStatus;
  withdrawableBalances: Array<WithdrawableBalance>;
  withdrawableSubAccountBalances: Array<WithdrawableBalance>;
};

export type DripList = {
  __typename: 'DripList';
  account: NftDriverAccount;
  chain: SupportedChain;
  creator: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  isVisible: Scalars['Boolean']['output'];
  lastProcessedIpfsHash?: Maybe<Scalars['String']['output']>;
  latestMetadataIpfsHash?: Maybe<Scalars['String']['output']>;
  latestVotingRoundId?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  owner: AddressDriverAccount;
  previousOwnerAddress: Scalars['String']['output'];
  splits: Array<SplitsReceiver>;
  support: Array<SupportItem>;
  totalEarned: Array<Amount>;
};

export type DripListReceiver = Receiver & {
  __typename: 'DripListReceiver';
  account: NftDriverAccount;
  dripList: DripList;
  driver: Driver;
  weight: Scalars['Int']['output'];
};

export enum DripListSortField {
  MintedAt = 'mintedAt',
}

export type DripListSortInput = {
  direction?: InputMaybe<SortDirection>;
  field: DripListSortField;
};

export type DripListSupport = {
  __typename: 'DripListSupport';
  account: NftDriverAccount;
  date: Scalars['Date']['output'];
  dripList: DripList;
  totalSplit: Array<Amount>;
  weight: Scalars['Int']['output'];
};

export type DripListWhereInput = {
  accountId?: InputMaybe<Scalars['String']['input']>;
  ownerAddress?: InputMaybe<Scalars['String']['input']>;
};

export enum Driver {
  Address = 'ADDRESS',
  ImmutableSplits = 'IMMUTABLE_SPLITS',
  Nft = 'NFT',
  Repo = 'REPO',
}

export type EcosystemMainAccount = {
  __typename: 'EcosystemMainAccount';
  account: NftDriverAccount;
  avatar: Avatar;
  chain: SupportedChain;
  color: Scalars['String']['output'];
  creator: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  isVisible: Scalars['Boolean']['output'];
  lastProcessedIpfsHash?: Maybe<Scalars['String']['output']>;
  latestMetadataIpfsHash?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  owner: AddressDriverAccount;
  previousOwnerAddress: Scalars['String']['output'];
  splits: Array<SplitsReceiver>;
  support: Array<EcosystemSupportItem>;
  totalEarned: Array<Amount>;
};

export type EcosystemMainAccountReceiver = Receiver & {
  __typename: 'EcosystemMainAccountReceiver';
  account: NftDriverAccount;
  driver: Driver;
  ecosystemMainAccount: EcosystemMainAccount;
  weight: Scalars['Int']['output'];
};

export type EcosystemSupport = {
  __typename: 'EcosystemSupport';
  account: NftDriverAccount;
  date: Scalars['Date']['output'];
  ecosystemMainAccount: EcosystemMainAccount;
  totalSplit: Array<Amount>;
  weight: Scalars['Int']['output'];
};

export type EcosystemSupportItem = OneTimeDonationSupport | StreamSupport;

export type EmojiAvatar = {
  __typename: 'EmojiAvatar';
  emoji: Scalars['String']['output'];
};

export enum Forge {
  GitHub = 'GitHub',
  GitLab = 'GitLab',
}

export type Give = {
  __typename: 'Give';
  chainData: Array<GiveChainData>;
  receiver: Account;
  sender: Account;
};

export type GiveChainData = {
  __typename: 'GiveChainData';
  chain: SupportedChain;
  data?: Maybe<GiveData>;
};

export type GiveData = {
  __typename: 'GiveData';
  amount: Amount;
  blockTimestamp: Scalars['String']['output'];
};

export type GiveWhereInput = {
  receiverAccountId?: InputMaybe<Scalars['String']['input']>;
  senderAccountId?: InputMaybe<Scalars['String']['input']>;
  tokenAddress?: InputMaybe<Scalars['String']['input']>;
};

export type ImageAvatar = {
  __typename: 'ImageAvatar';
  cid: Scalars['String']['output'];
};

export type ImmutableSplitsDriverAccount = Account & {
  __typename: 'ImmutableSplitsDriverAccount';
  accountId: Scalars['ID']['output'];
  driver: Driver;
};

export type LinkedIdentity = OrcidLinkedIdentity;

export type LinkedIdentityReceiver = Receiver & {
  __typename: 'LinkedIdentityReceiver';
  account: RepoDriverAccount;
  driver: Driver;
  linkedIdentity: LinkedIdentity;
  weight: Scalars['Int']['output'];
};

export enum LinkedIdentitySortField {
  CreatedAt = 'createdAt',
}

export type LinkedIdentitySortInput = {
  direction?: InputMaybe<SortDirection>;
  field: LinkedIdentitySortField;
};

export enum LinkedIdentityTypeField {
  Orcid = 'orcid',
}

export type LinkedIdentityWhereInput = {
  accountId?: InputMaybe<Scalars['String']['input']>;
  areSplitsValid?: InputMaybe<Scalars['Boolean']['input']>;
  ownerAddress?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<LinkedIdentityTypeField>;
};

export type MintedTokens = {
  __typename: 'MintedTokens';
  chain: SupportedChain;
  total: Scalars['Int']['output'];
};

export type NftDriverAccount = Account & {
  __typename: 'NftDriverAccount';
  accountId: Scalars['ID']['output'];
  driver: Driver;
};

export type OneTimeDonationSupport = {
  __typename: 'OneTimeDonationSupport';
  account: AddressDriverAccount;
  amount: Amount;
  date: Scalars['Date']['output'];
};

export type OrcidLinkedIdentity = {
  __typename: 'OrcidLinkedIdentity';
  account: RepoDriverAccount;
  areSplitsValid: Scalars['Boolean']['output'];
  chain: SupportedChain;
  isClaimed: Scalars['Boolean']['output'];
  orcid: Scalars['String']['output'];
  orcidMetadata?: Maybe<OrcidMetadata>;
  owner?: Maybe<AddressDriverAccount>;
  support: Array<SupportItem>;
  totalEarned: Array<Amount>;
  withdrawableBalances: Array<WithdrawableBalance>;
};

export type OrcidMetadata = {
  __typename: 'OrcidMetadata';
  familyName?: Maybe<Scalars['String']['output']>;
  givenName?: Maybe<Scalars['String']['output']>;
};

export type Project = {
  __typename: 'Project';
  account: RepoDriverAccount;
  chainData: Array<ProjectData>;
  isVisible: Scalars['Boolean']['output'];
  repoMetadata?: Maybe<RepoMetadata>;
  source: Source;
};

export type ProjectData = ClaimedProjectData | UnClaimedProjectData;

export type ProjectReceiver = Receiver & {
  __typename: 'ProjectReceiver';
  account: RepoDriverAccount;
  driver: Driver;
  project: Project;
  splitsToSubAccount?: Maybe<Scalars['Boolean']['output']>;
  weight: Scalars['Int']['output'];
};

export enum ProjectSortField {
  ClaimedAt = 'claimedAt',
}

export type ProjectSortInput = {
  direction?: InputMaybe<SortDirection>;
  field: ProjectSortField;
};

export type ProjectSupport = {
  __typename: 'ProjectSupport';
  account: RepoDriverAccount;
  date: Scalars['Date']['output'];
  project: Project;
  totalSplit: Array<Amount>;
  weight: Scalars['Int']['output'];
};

export enum ProjectVerificationStatus {
  Claimed = 'Claimed',
  PendingMetadata = 'PendingMetadata',
  Unclaimed = 'Unclaimed',
}

export type ProjectWhereInput = {
  accountId?: InputMaybe<Scalars['String']['input']>;
  ownerAddress?: InputMaybe<Scalars['String']['input']>;
  url?: InputMaybe<Scalars['String']['input']>;
  verificationStatus?: InputMaybe<ProjectVerificationStatus>;
};

export type Query = {
  __typename: 'Query';
  chainStats: Array<ChainStats>;
  dripList?: Maybe<DripList>;
  dripLists: Array<DripList>;
  earnedFunds: Array<ChainAmount>;
  ecosystemMainAccount?: Maybe<EcosystemMainAccount>;
  linkedIdentities: Array<LinkedIdentity>;
  linkedIdentityById?: Maybe<LinkedIdentity>;
  mintedTokensCountByOwnerAddress: MintedTokens;
  orcidLinkedIdentityByOrcid?: Maybe<OrcidLinkedIdentity>;
  projectById?: Maybe<Project>;
  projectByUrl?: Maybe<Project>;
  projects: Array<Project>;
  streams: Array<Stream>;
  userByAddress: User;
  userById: User;
};

export type QueryChainStatsArgs = {
  chains?: InputMaybe<Array<SupportedChain>>;
};

export type QueryDripListArgs = {
  chain: SupportedChain;
  id: Scalars['ID']['input'];
};

export type QueryDripListsArgs = {
  chains?: InputMaybe<Array<SupportedChain>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<DripListSortInput>;
  where?: InputMaybe<DripListWhereInput>;
};

export type QueryEarnedFundsArgs = {
  chains?: InputMaybe<Array<SupportedChain>>;
  projectId: Scalars['String']['input'];
};

export type QueryEcosystemMainAccountArgs = {
  chain: SupportedChain;
  id: Scalars['ID']['input'];
};

export type QueryLinkedIdentitiesArgs = {
  chains?: InputMaybe<Array<SupportedChain>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<LinkedIdentitySortInput>;
  where?: InputMaybe<LinkedIdentityWhereInput>;
};

export type QueryLinkedIdentityByIdArgs = {
  chain: SupportedChain;
  id: Scalars['ID']['input'];
};

export type QueryMintedTokensCountByOwnerAddressArgs = {
  chain: SupportedChain;
  ownerAddress: Scalars['String']['input'];
};

export type QueryOrcidLinkedIdentityByOrcidArgs = {
  chain: SupportedChain;
  orcid: Scalars['String']['input'];
};

export type QueryProjectByIdArgs = {
  chains?: InputMaybe<Array<SupportedChain>>;
  id: Scalars['ID']['input'];
};

export type QueryProjectByUrlArgs = {
  chains?: InputMaybe<Array<SupportedChain>>;
  url: Scalars['String']['input'];
};

export type QueryProjectsArgs = {
  chains?: InputMaybe<Array<SupportedChain>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<ProjectSortInput>;
  where?: InputMaybe<ProjectWhereInput>;
};

export type QueryStreamsArgs = {
  chains?: InputMaybe<Array<SupportedChain>>;
  where?: InputMaybe<StreamWhereInput>;
};

export type QueryUserByAddressArgs = {
  address: Scalars['String']['input'];
  chains?: InputMaybe<Array<SupportedChain>>;
};

export type QueryUserByIdArgs = {
  accountId: Scalars['ID']['input'];
  chains?: InputMaybe<Array<SupportedChain>>;
};

export type Receiver = {
  account: Account;
  driver: Driver;
  weight: Scalars['Int']['output'];
};

export type RepoDriverAccount = Account & {
  __typename: 'RepoDriverAccount';
  accountId: Scalars['ID']['output'];
  driver: Driver;
};

export type RepoMetadata = {
  __typename: 'RepoMetadata';
  defaultBranch: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  forksCount: Scalars['Int']['output'];
  stargazersCount: Scalars['Int']['output'];
};

export enum SortDirection {
  Asc = 'ASC',
  Desc = 'DESC',
}

export type Source = {
  __typename: 'Source';
  forge: Forge;
  ownerName: Scalars['String']['output'];
  repoName: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type Splits = {
  __typename: 'Splits';
  dependencies: Array<SplitsReceiver>;
  maintainers: Array<AddressReceiver>;
};

export type SplitsReceiver =
  | AddressReceiver
  | DripListReceiver
  | EcosystemMainAccountReceiver
  | LinkedIdentityReceiver
  | ProjectReceiver
  | SubListReceiver;

export type Stream = {
  __typename: 'Stream';
  chain: SupportedChain;
  config: StreamConfig;
  createdAt: Scalars['Date']['output'];
  description?: Maybe<Scalars['String']['output']>;
  endsAt?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  isArchived?: Maybe<Scalars['Boolean']['output']>;
  isManaged: Scalars['Boolean']['output'];
  isPaused: Scalars['Boolean']['output'];
  name?: Maybe<Scalars['String']['output']>;
  receiver: StreamReceiver;
  sender: User;
  timeline: Array<TimelineItem>;
};

export type StreamConfig = {
  __typename: 'StreamConfig';
  amountPerSecond: Amount;
  dripId: Scalars['String']['output'];
  durationSeconds?: Maybe<Scalars['Int']['output']>;
  raw: Scalars['String']['output'];
  startDate?: Maybe<Scalars['Date']['output']>;
};

export type StreamReceiver = DripList | EcosystemMainAccount | User;

export type StreamSupport = {
  __typename: 'StreamSupport';
  account: AddressDriverAccount;
  date: Scalars['Date']['output'];
  stream: Stream;
};

export type StreamWhereInput = {
  receiverId?: InputMaybe<Scalars['ID']['input']>;
  senderId?: InputMaybe<Scalars['ID']['input']>;
};

export type SubList = {
  __typename: 'SubList';
  account: ImmutableSplitsDriverAccount;
  chain: SupportedChain;
  lastProcessedIpfsHash?: Maybe<Scalars['String']['output']>;
  latestMetadataIpfsHash?: Maybe<Scalars['String']['output']>;
  parentAccountId: Scalars['String']['output'];
  parentAccountType: Scalars['String']['output'];
  rootAccountId: Scalars['String']['output'];
  rootAccountType: Scalars['String']['output'];
};

export type SubListReceiver = Receiver & {
  __typename: 'SubListReceiver';
  account: ImmutableSplitsDriverAccount;
  driver: Driver;
  subList: SubList;
  weight: Scalars['Int']['output'];
};

export type Support =
  | DripListSupport
  | EcosystemSupport
  | OneTimeDonationSupport
  | ProjectSupport
  | StreamSupport;

export type SupportGroup = {
  __typename: 'SupportGroup';
  items?: Maybe<Array<Support>>;
};

export type SupportItem =
  | DripListSupport
  | EcosystemSupport
  | OneTimeDonationSupport
  | ProjectSupport
  | StreamSupport;

export enum SupportedChain {
  BaseSepolia = 'BASE_SEPOLIA',
  Filecoin = 'FILECOIN',
  Localtestnet = 'LOCALTESTNET',
  Mainnet = 'MAINNET',
  Metis = 'METIS',
  Optimism = 'OPTIMISM',
  OptimismSepolia = 'OPTIMISM_SEPOLIA',
  PolygonAmoy = 'POLYGON_AMOY',
  Sepolia = 'SEPOLIA',
  ZksyncEraSepolia = 'ZKSYNC_ERA_SEPOLIA',
}

export type TimelineItem = {
  __typename: 'TimelineItem';
  currentAmount: Amount;
  deltaPerSecond: Amount;
  timestamp: Scalars['Date']['output'];
  type: TimelineItemType;
};

export enum TimelineItemType {
  End = 'END',
  OutOfFunds = 'OUT_OF_FUNDS',
  Pause = 'PAUSE',
  Start = 'START',
}

export type UnClaimedProjectData = {
  __typename: 'UnClaimedProjectData';
  chain: SupportedChain;
  owner: AddressDriverAccount;
  support: Array<SupportItem>;
  verificationStatus: ProjectVerificationStatus;
  withdrawableBalances: Array<WithdrawableBalance>;
  withdrawableSubAccountBalances: Array<WithdrawableBalance>;
};

export type User = {
  __typename: 'User';
  account: AddressDriverAccount;
  chainData: Array<UserData>;
};

export type UserBalanceTimelineItem = {
  __typename: 'UserBalanceTimelineItem';
  currentAmount: Amount;
  deltaPerSecond: Amount;
  timestamp: Scalars['Date']['output'];
};

export type UserBalances = {
  __typename: 'UserBalances';
  incoming: Array<UserBalanceTimelineItem>;
  outgoing: Array<UserBalanceTimelineItem>;
  tokenAddress: Scalars['String']['output'];
};

export type UserData = {
  __typename: 'UserData';
  balances: Array<UserBalances>;
  chain: SupportedChain;
  dripLists: Array<Maybe<DripList>>;
  latestMetadataIpfsHash?: Maybe<Scalars['String']['output']>;
  linkedIdentities: Array<LinkedIdentity>;
  projects: Array<Maybe<Project>>;
  streams: UserStreams;
  support: Array<SupportItem>;
  withdrawableBalances: Array<WithdrawableBalance>;
};

export type UserStreams = {
  __typename: 'UserStreams';
  incoming: Array<Stream>;
  outgoing: Array<Stream>;
};

export type WithdrawableBalance = {
  __typename: 'WithdrawableBalance';
  collectableAmount: Scalars['String']['output'];
  receivableAmount: Scalars['String']['output'];
  splittableAmount: Scalars['String']['output'];
  tokenAddress: Scalars['String']['output'];
};
