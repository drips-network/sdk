import type { CallStruct } from '../../contracts/Caller';

export {
	DripsReceiverStruct,
	SplitsReceiverStruct,
	DripsHistoryStruct,
	DripsHubInterface,
	UserMetadataStruct
} from '../../contracts/DripsHub';
export { NFTDriverInterface } from '../../contracts/NFTDriver';
export { CallStruct, CallerInterface } from '../../contracts/Caller';
export { AddressDriverInterface } from '../../contracts/AddressDriver';
export { ImmutableSplitsDriverInterface } from '../../contracts/ImmutableSplitsDriver';

export type DripsReceiverConfig = {
	/** An arbitrary number used to identify a drip. When setting a config, it must be greater than or equal to `0`. It's a part of the configuration but the protocol doesn't use it. */
	dripId: bigint;

	/** The UNIX timestamp (in seconds) when dripping should start. When setting a config, it must be greater than or equal to `0`. If set to `0`, the contract will use the timestamp when drips are configured. */
	start: bigint;

	/** The duration (in seconds) of dripping. When setting a config, it must be greater than or equal to `0`. If set to `0`, the contract will drip until the balance runs out. */
	duration: bigint;

	/** The amount per second being dripped. When setting a config, it must be in the smallest unit (e.g., Wei), greater than `0` **and be multiplied by `10 ^ 9`** (`constants.AMT_PER_SEC_MULTIPLIER`). */
	amountPerSec: bigint;
};

export type NetworkConfig = {
	readonly CYCLE_SECS: string;
	readonly NETWORK_NAME: string;
	readonly SUBGRAPH_URL: string;
	readonly CONTRACT_CALLER: string;
	readonly CONTRACT_DRIPS_HUB: string;
	readonly CONTRACT_NFT_DRIVER: string;
	readonly CONTRACT_NFT_DRIVER_ID: string;
	readonly CONTRACT_ADDRESS_DRIVER: string;
	readonly CONTRACT_DRIPS_HUB_LOGIC: string;
	readonly CONTRACT_ADDRESS_DRIVER_ID: string;
	readonly CONTRACT_NFT_DRIVER_LOGIC: string;
	readonly CONTRACT_ADDRESS_DRIVER_LOGIC: string;
	readonly CONTRACT_IMMUTABLE_SPLITS_DRIVER: string;
	readonly CONTRACT_IMMUTABLE_SPLITS_DRIVER_ID: string;
	readonly CONTRACT_IMMUTABLE_SPLITS_DRIVER_LOGIC: string;
};

export type CycleInfo = {
	cycleDurationSecs: bigint;
	currentCycleSecs: bigint;
	currentCycleStartDate: Date;
	nextCycleStartDate: Date;
};

export type DripsReceiver = { userId: string; config: DripsReceiverConfig };

export type Preset = CallStruct[];
