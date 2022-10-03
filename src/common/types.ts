import type { BigNumberish } from 'ethers';

export type DripsReceiverConfig = {
	/** The UNIX timestamp when dripping should start. Must be greater than or equal to `0`. If set to `0`, the smart contract will use the timestamp when drips are configured. */
	readonly start: BigNumberish;
	/** The duration (in seconds) of dripping. Must be greater than or equal to `0`. If set to `0`, the smart contract will drip until the balance runs out. */
	readonly duration: BigNumberish;
	/** The amount per second being dripped (in the smallest unit, e.g. Wei). Must be greater than `0` and be multiplied by `10 ^ 18` (Utils.Constants.AMT_PER_SEC_MULTIPLIER). */
	readonly amountPerSec: BigNumberish;
};

export type ChainDripsMetadata = {
	readonly NAME: string;
	readonly CYCLE_SECS: string;
	readonly SUBGRAPH_URL: string;
	readonly CONTRACT_DRIPS_HUB: string;
	readonly CONTRACT_ADDRESS_DRIVER: string;
	readonly CONTRACT_DRIPS_HUB_LOGIC: string;
	readonly CONTRACT_ADDRESS_DRIVER_LOGIC: string;
};

export type CycleInfo = {
	cycleDurationSecs: bigint;
	currentCycleSecs: bigint;
	currentCycleStartDate: Date;
	nextCycleStartDate: Date;
};
