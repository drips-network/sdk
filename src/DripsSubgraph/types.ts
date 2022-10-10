export type SplitEntry = {
	readonly weight: bigint;
	readonly userId: string;
};

export type UserAssetConfig = {
	readonly id: string;
	readonly assetId: string;
	readonly balance: bigint;
	readonly amountCollected: bigint;
	readonly dripsEntries: {
		readonly config: bigint;
		readonly userId: string;
	}[];
	readonly lastUpdatedBlockTimestamp: bigint;
};

export type DripsSetEvent = {
	readonly userId: string;
	readonly maxEnd: string;
	readonly assetId: string;
	readonly balance: bigint;
	readonly receiversHash: string;
	readonly dripsHistoryHash: string;
	readonly dripsReceiverSeenEvents: {
		readonly receiverUserId: string;
		readonly config: bigint;
	}[];
	readonly blockTimestamp: bigint;
};

export type DripsReceiverSeenEvent = {
	readonly senderUserId: string;
};
