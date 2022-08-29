import type { BigNumberish } from 'ethers';
import type DripsReceiverConfig from './DripsReceiverConfig';

export type Drip = {
	readonly id: BigNumberish;
	readonly receiverUserId: BigNumberish;
	readonly config: DripsReceiverConfig;
};

export type DripsConfiguration = {
	readonly id: BigNumberish;
	readonly assetId: BigNumberish;
	readonly tokenAddress: string;
	readonly balance: BigNumberish;
	readonly sender: { id: string };
	readonly amountCollected: BigNumberish;
	readonly dripsEntries: Drip[];
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
