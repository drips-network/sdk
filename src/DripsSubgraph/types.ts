export type ApiUserAssetConfig = {
	id: string;
	assetId: string;
	dripsEntries: {
		userId: string;
		config: string;
	}[];
	balance: string;
	amountCollected: string;
	lastUpdatedBlockTimestamp: string;
};

export type UserAssetConfig = {
	id: string;
	assetId: bigint;
	dripsEntries: {
		userId: bigint;
		config: bigint;
	}[];
	balance: bigint;
	amountCollected: bigint;
	lastUpdatedBlockTimestamp: bigint;
};

export type ApiSplitEntry = {
	userId: string;
	weight: string;
};

export type SplitEntry = {
	userId: bigint;
	weight: bigint;
};

export type ApiDripsSetEvent = {
	userId: string;
	assetId: string;
	dripsReceiverSeenEvents: {
		receiverUserId: string;
		config: string;
	}[];
	dripsHistoryHash: string;
	balance: string;
	blockTimestamp: string;
	maxEnd: string;
};

export type DripsSetEvent = {
	userId: bigint;
	assetId: bigint;
	dripsReceiverSeenEvents: {
		receiverUserId: bigint;
		config: bigint;
	}[];
	dripsHistoryHash: string;
	balance: bigint;
	blockTimestamp: bigint;
	maxEnd: bigint;
};

export type DripsReceiverSeenEvent = {
	senderUserId: string;
};
