export type AccountAssetConfig = {
	id: string;
	assetId: bigint;
	streamsEntries: {
		id: string;
		accountId: string;
		config: bigint;
	}[];
	balance: bigint;
	amountCollected: bigint;
	lastUpdatedBlockTimestamp: bigint;
};

export type SplitsEntry = {
	id: string;
	accountId: string;
	weight: bigint;
	senderId: string;
};

export type StreamsSetEvent = {
	id: string;
	accountId: string;
	assetId: bigint;
	streamReceiverSeenEvents: {
		id: string;
		receiverAccountId: string;
		config: bigint;
	}[];
	streamsHistoryHash: string;
	balance: bigint;
	blockTimestamp: bigint;
	maxEnd: bigint;
	receiversHash: string;
};

export type CollectedEvent = {
	id: string;
	accountId: string;
	assetId: bigint;
	collected: bigint;
	blockTimestamp: bigint;
};

export type SqueezedStreamsEvent = {
	amount: bigint;
	assetId: bigint;
	blockTimestamp: bigint;
	id: string;
	senderId: string;
	accountId: string;
	streamsHistoryHashes: string[];
};

export type SplitEvent = {
	id: string;
	amount: bigint;
	assetId: bigint;
	blockTimestamp: bigint;
	receiverId: string;
	accountId: string;
};

export type ReceivedStreamsEvent = {
	id: string;
	amount: bigint;
	assetId: bigint;
	blockTimestamp: bigint;
	receivableCycles: bigint;
	accountId: string;
};

export type GivenEvent = {
	id: string;
	amount: bigint;
	assetId: bigint;
	blockTimestamp: bigint;
	receiverAccountId: string;
	accountId: string;
};

export type StreamReceiverSeenEvent = {
	id: string;
	config: bigint;
	senderAccountId: bigint;
	receiverAccountId: bigint;
	streamsSetEvent: {
		id: string;
		assetId: bigint;
		receiversHash: string;
	};
	blockTimestamp: bigint;
};

export type AccountMetadataEntry = {
	id: string;
	key: string;
	value: string;
	accountId: string;
	lastUpdatedBlockTimestamp: bigint;
};

export type NftSubAccount = {
	tokenId: string;
	ownerAddress: string;
	originalOwnerAddress: string;
};

export type StreamsSetEventWithFullReceivers = {
	currentReceivers: {
		id: string;
		receiverAccountId: string;
		config: bigint;
	}[];
} & StreamsSetEvent;

export type RepoAccountStatus = 'CLAIMED' | 'OWNER_UPDATE_REQUESTED' | null;

export type RepoAccount = {
	accountId: string;
	name: string;
	forge: bigint;
	status: RepoAccountStatus;
	ownerAddress: string | null;
	lastUpdatedBlockTimestamp: bigint;
};
