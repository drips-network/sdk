export type DripsReceiverConfig = {
	/** The UNIX timestamp (in seconds) when dripping should start. When setting a config, it must be greater than or equal to `0`. If set to `0`, the smart contract will use the timestamp when drips are configured. */
	readonly start: bigint;
	/** The duration (in seconds) of dripping. When setting a config, it must be greater than or equal to `0`. If set to `0`, the smart contract will drip until the balance runs out. */
	readonly duration: bigint;
	/** The amount per second being dripped. When setting a config, it must be in the smallest unit (e.g. Wei), greater than `0` and be multiplied by `10 ^ 18` (`DripsHubClient.constants.AMT_PER_SEC_MULTIPLIER`). */
	readonly amountPerSec: bigint;
};

export type DripsMetadata = {
	readonly NAME: string;
	readonly CYCLE_SECS: string;
	readonly SUBGRAPH_URL: string;
	readonly CONTRACT_DRIPS_HUB: string;
	readonly CONTRACT_NFT_DRIVER: string;
	readonly CONTRACT_ADDRESS_DRIVER: string;
	readonly CONTRACT_NFT_DRIVER_LOGIC: string;
	readonly CONTRACT_DRIPS_HUB_LOGIC: string;
	readonly CONTRACT_ADDRESS_DRIVER_LOGIC: string;
	readonly CONTRACT_IMMUTABLE_SPLITS_DRIVER: string;
	readonly CONTRACT_IMMUTABLE_SPLITS_DRIVER_LOGIC: string;
};

export type CycleInfo = {
	cycleDurationSecs: bigint;
	currentCycleSecs: bigint;
	currentCycleStartDate: Date;
	nextCycleStartDate: Date;
};

export type DripsReceiver = { userId: string; config: DripsReceiverConfig };

export type ReceivableDrips = {
	/** The amount which would be received. */
	receivableAmt: bigint;
	/** The number of cycles which would still be receivable after the call. */
	receivableCycles: number;
};

export type SqueezableDrips = {
	/** The squeezed amount. */
	amt: bigint;
	/** The next timestamp that can be squeezed. */
	nextSqueezed: number;
};
