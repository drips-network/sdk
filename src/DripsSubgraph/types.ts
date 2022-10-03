import type { BigNumberish } from 'ethers';

export type SplitEntry = {
	readonly weight: BigNumberish;
	readonly userId: BigNumberish;
};

export type UserAssetConfig = {
	readonly id: string;
	readonly assetId: string;
	readonly balance: BigNumberish;
	readonly amountCollected: BigNumberish;
	readonly dripsEntries: {
		readonly config: BigNumberish;
		readonly userId: string;
	}[];
	readonly lastUpdatedBlockTimestamp: BigNumberish;
};

export type DripsSetEvent = {
	readonly maxEnd: string;
	readonly userId: string;
	readonly assetId: string;
	readonly receiversHash: string;
	readonly dripsHistoryHash: string;
	readonly dripsReceiverSeenEvents: {
		readonly receiverUserId: string;
		readonly config: BigNumberish;
	}[];
	readonly blockTimestamp: BigNumberish;
};
