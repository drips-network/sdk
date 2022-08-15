import type { BigNumberish } from 'ethers';
import type DripsReceiverConfig from './DripsReceiverConfig';

export type DripsEntry = { id: string; receiverUserId: string; config: BigNumberish };

export type UserAssetConfig = {
	id: string;
	assetId: string;
	balance: BigNumberish;
	sender: { id: string };
	amountCollected: string;
	dripsEntries: DripsEntry[];
	lastUpdatedBlockTimestamp: string;
};

export type SplitEntry = {
	weight: string;
	receiverUserId: string;
};

export type DripsReceiver = {
	userId: BigNumberish;
	config: DripsReceiverConfig;
};

export type NetworkProperties = {
	readonly name: string;
	readonly CONTRACT_DRIPS_HUB: string;
	readonly CONTRACT_ADDRESS_APP: string;
	readonly CONTRACT_DRIPS_HUB_LOGIC: string;
};
