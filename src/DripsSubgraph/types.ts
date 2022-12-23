export type UserAssetConfig = {
	id: string;
	assetId: bigint;
	dripsEntries: {
		id: string;
		userId: string;
		config: bigint;
	}[];
	balance: bigint;
	amountCollected: bigint;
	lastUpdatedBlockTimestamp: bigint;
	amountSplittable: bigint;
	amountPostSplitCollectable: bigint;
};

export type SplitsEntry = {
	id: string;
	userId: string;
	weight: bigint;
	senderId: string;
};

export type DripsSetEvent = {
	id: string;
	userId: string;
	assetId: bigint;
	dripsReceiverSeenEvents: {
		id: string;
		receiverUserId: string;
		config: bigint;
	}[];
	dripsHistoryHash: string;
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

export type SqueezedDripsEvent = {
	amount: bigint;
	assetId: bigint;
	blockTimestamp: bigint;
	id: string;
	senderId: string;
	userId: string;
	dripsHistoryHashes: string[];
};

export type SplitEvent = {
	id: string;
	amount: bigint;
	assetId: bigint;
	blockTimestamp: bigint;
	receiverId: string;
	userId: string;
};

export type ReceivedDripsEvent = {
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

export type DripsReceiverSeenEvent = {
	id: string;
	config: bigint;
	senderUserId: bigint;
	receiverUserId: bigint;
	dripsSetEvent: {
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
