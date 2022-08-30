import type { BigNumberish } from 'ethers';
import type DripsReceiverConfig from './DripsReceiverConfig';

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

export type NetworkProperties = {
	readonly NAME: string;
	readonly CYCLE_SECS: string;
	readonly SUBGRAPH_URL: string;
	readonly CONTRACT_DRIPS_HUB: string;
	readonly CONTRACT_ADDRESS_APP: string;
	readonly CONTRACT_DRIPS_HUB_LOGIC: string;
	readonly CONTRACT_ADDRESS_APP_LOGIC: string;
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
