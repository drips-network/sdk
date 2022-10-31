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
};

export type SplitsEntry = {
	id: string;
	userId: string;
	weight: bigint;
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

export type UserMetadata = {
	id: string;
	key: bigint;
	value: string;
	userId: string;
	lastUpdatedBlockTimestamp: bigint;
};

export type NftSubAccount = {
	tokenId: string;
	ownerAddress: string;
};
