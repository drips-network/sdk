import type { BigNumberish } from 'ethers';
import type { DripsReceiverConfig } from 'src/AddressApp/types';

export type DripsReceiver = {
	readonly receiverUserId: string;
	readonly config: DripsReceiverConfig;
};

export type DripsConfiguration = {
	readonly id: string;
	readonly assetId: string;
	readonly tokenAddress: string;
	readonly balance: BigNumberish;
	readonly amountCollected: BigNumberish;
	readonly dripsReceivers: DripsReceiver[];
	readonly lastUpdatedBlockTimestamp: string;
};

export type Split = {
	weight: BigNumberish;
	receiverUserId: BigNumberish;
};

export type UserAssetConfig = {
	readonly id: string;
	readonly assetId: string;
	readonly balance: BigNumberish;
	readonly amountCollected: BigNumberish;
	readonly dripsEntries: {
		config: BigNumberish;
		receiverUserId: string;
	}[];
	readonly lastUpdatedBlockTimestamp: string;
};
