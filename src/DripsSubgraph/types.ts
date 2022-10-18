export type ApiUserAssetConfig = {
	id: string;
	assetId: string;
	dripsEntries: {
		id: string;
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
		id: string;
		userId: string;
		config: bigint;
	}[];
	balance: bigint;
	amountCollected: bigint;
	lastUpdatedBlockTimestamp: bigint;
};

export type ApiSplitsEntry = {
	id: string;
	userId: string;
	weight: string;
};

export type SplitsEntry = {
	id: string;
	userId: string;
	weight: bigint;
};

export type ApiDripsSetEvent = {
	id: string;
	userId: string;
	assetId: string;
	dripsReceiverSeenEvents: {
		id: string;
		receiverUserId: string;
		config: string;
	}[];
	dripsHistoryHash: string;
	balance: string;
	blockTimestamp: string;
	maxEnd: string;
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
};

export type ApiDripsReceiverSeenEvent = {
	id: string;
	config: string;
	senderUserId: string;
	receiverUserId: string;
	dripsSetEvent: {
		id: string;
		assetId: string;
	};
	blockTimestamp: string;
};

export type DripsReceiverSeenEvent = {
	id: string;
	config: bigint;
	senderUserId: bigint;
	receiverUserId: bigint;
	dripsSetEvent: {
		id: string;
		assetId: bigint;
	};
	blockTimestamp: bigint;
};

export type ApiUserMetadataEvent = {
	id: string;
	key: string;
	value: string;
	lastUpdatedBlockTimestamp: string;
};

export type UserMetadata = {
	userId: string;
	key: bigint;
	value: string;
	lastUpdatedBlockTimestamp: bigint;
};
