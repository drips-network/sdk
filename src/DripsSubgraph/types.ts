import type { BigNumberish } from 'ethers';

export type SplitEntry = {
	readonly weight: BigNumberish;
	readonly receiverUserId: BigNumberish;
};

export type UserAssetConfig = {
	readonly id: string;
	readonly assetId: string;
	readonly balance: BigNumberish;
	readonly amountCollected: BigNumberish;
	readonly dripsEntries: {
		readonly config: BigNumberish;
		readonly receiverUserId: string;
	}[];
	readonly lastUpdatedBlockTimestamp: BigNumberish;
};
