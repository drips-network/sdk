import type { BigNumberish } from 'ethers';
import type DripsReceiverConfig from './DripsReceiverConfig';

export type DripsEntry = { readonly id: string; readonly receiverUserId: string; readonly config: BigNumberish };

export type UserAssetConfig = {
	readonly id: string;
	readonly assetId: string;
	readonly balance: BigNumberish;
	readonly sender: { id: string };
	readonly amountCollected: string;
	readonly dripsEntries: DripsEntry[];
	readonly lastUpdatedBlockTimestamp: string;
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
	readonly NAME: string;
	readonly CYCLE_SECS: string;
	readonly SUBGRAPH_URL: string;
	readonly CONTRACT_DRIPS_HUB: string;
	readonly CONTRACT_ADDRESS_APP: string;
	readonly CONTRACT_DRIPS_HUB_LOGIC: string;
	readonly CONTRACT_ADDRESS_APP_LOGIC: string;
};
