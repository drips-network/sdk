import type { PopulatedTransaction } from 'ethers';
import type { StreamsHistoryStruct } from '../../contracts/Drips';

export {
	StreamReceiverStruct,
	SplitsReceiverStruct,
	StreamsHistoryStruct,
	DripsInterface,
	AccountMetadataStruct
} from '../../contracts/Drips';
export { NFTDriverInterface } from '../../contracts/NFTDriver';
export { CallStruct, CallerInterface } from '../../contracts/Caller';
export { AddressDriverInterface } from '../../contracts/AddressDriver';
export { ImmutableSplitsDriverInterface } from '../../contracts/ImmutableSplitsDriver';

export type StreamConfig = {
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
	CHAIN: string;
	DEPLOYMENT_TIME: string;
	COMMIT_HASH: string;
	WALLET: string;
	DETERMINISTIC_DEPLOYER: string;
	CREATE3_FACTORY: string;
	DRIPS_DEPLOYER: string;
	DRIPS_DEPLOYER_SALT: string;
	DRIPS: string;
	DRIPS_CYCLE_SECONDS: string;
	DRIPS_LOGIC: string;
	DRIPS_ADMIN: string;
	CALLER: string;
	ADDRESS_DRIVER: string;
	ADDRESS_DRIVER_LOGIC: string;
	ADDRESS_DRIVER_ADMIN: string;
	ADDRESS_DRIVER_ID: string;
	NFT_DRIVER: string;
	NFT_DRIVER_LOGIC: string;
	NFT_DRIVER_ADMIN: string;
	NFT_DRIVER_ID: string;
	IMMUTABLE_SPLITS_DRIVER: string;
	IMMUTABLE_SPLITS_DRIVER_LOGIC: string;
	IMMUTABLE_SPLITS_DRIVER_ADMIN: string;
	IMMUTABLE_SPLITS_DRIVER_ID: string;
	REPO_DRIVER: string;
	REPO_DRIVER_LOGIC: string;
	REPO_DRIVER_ADMIN: string;
	REPO_DRIVER_ID: string;
	REPO_DRIVER_ANYAPI_OPERATOR: string;
	REPO_DRIVER_ANYAPI_JOB_ID: string;
	REPO_DRIVER_ANYAPI_DEFAULT_FEE: string;
	SUBGRAPH_URL: string;
};

export type CycleInfo = {
	cycleDurationSecs: bigint;
	currentCycleSecs: bigint;
	currentCycleStartDate: Date;
	nextCycleStartDate: Date;
};

export type StreamReceiver = { accountId: string; config: StreamConfig };

export type Preset = PopulatedTransaction[];

export type AccountMetadata = {
	key: string;
	value: string;
};

export type SqueezeArgs = {
	accountId: string;
	tokenAddress: string;
	senderId: string;
	historyHash: string;
	streamsHistory: StreamsHistoryStruct[];
};

export enum Forge {
	GitHub,
	GitLab
}

export type Address = string;
