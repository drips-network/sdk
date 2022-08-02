import type { BigNumberish } from 'ethers';
import type DripsReceiverConfig from './DripsReceiverConfig';

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
