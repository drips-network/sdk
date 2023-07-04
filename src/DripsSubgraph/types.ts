export type UserAssetConfig = {
	id: string;
	assetId: bigint;
	streamsEntries: {
		id: string;
		userId: string;
		config: bigint;
	}[];
	balance: bigint;
	amountCollected: bigint;
	lastUpdatedBlockTimestamp: bigint;
};

export type SplitsEntry = {
	id: string;
	userId: string;
	weight: bigint;
	senderId: string;
};

export type StreamsSetEvent = {
	id: string;
	userId: string;
	assetId: bigint;
	streamReceiverSeenEvents: {
		id: string;
		receiverUserId: string;
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
	userId: string;
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
	userId: string;
	streamsHistoryHashes: string[];
};

export type SplitEvent = {
	id: string;
	amount: bigint;
	assetId: bigint;
	blockTimestamp: bigint;
	receiverId: string;
	userId: string;
};

export type ReceivedStreamsEvent = {
	id: string;
	amount: bigint;
	assetId: bigint;
	blockTimestamp: bigint;
	receivableCycles: bigint;
	userId: string;
};

export type GivenEvent = {
	id: string;
	amount: bigint;
	assetId: bigint;
	blockTimestamp: bigint;
	receiverUserId: string;
	userId: string;
};

export type StreamReceiverSeenEvent = {
	id: string;
	config: bigint;
	senderUserId: bigint;
	receiverUserId: bigint;
	streamsSetEvent: {
		id: string;
		assetId: bigint;
		receiversHash: string;
	};
	blockTimestamp: bigint;
};

export type UserMetadataEntry = {
	id: string;
	key: string;
	value: string;
	userId: string;
	lastUpdatedBlockTimestamp: bigint;
};

export type NftSubAccount = {
	tokenId: string;
	ownerAddress: string;
};

export type StreamsSetEventWithFullReceivers = {
	currentReceivers: {
		id: string;
		receiverUserId: string;
		config: bigint;
	}[];
} & StreamsSetEvent;

export type RepoAccountStatus = 'CLAIMED' | 'OWNER_UPDATE_REQUESTED' | null;

export type RepoAccount = {
	userId: string;
	name: string;
	forge: bigint;
	status: RepoAccountStatus;
	ownerAddress: string | null;
	lastUpdatedBlockTimestamp: bigint;
};
