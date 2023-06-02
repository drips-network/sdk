import type { PopulatedTransaction } from 'ethers';
import type { DripsHistoryStruct } from '../../contracts/DripsHub';

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
	CHAIN: string;
	DEPLOYMENT_TIME: string;
	COMMIT_HASH: string;
	WALLET: string;
	WALLET_NONCE: string;
	DEPLOYER: string;
	DRIPS_HUB: string;
	DRIPS_HUB_CYCLE_SECONDS: string;
	DRIPS_HUB_LOGIC: string;
	DRIPS_HUB_ADMIN: string;
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

export type DripsReceiver = { userId: string; config: DripsReceiverConfig };

export type Preset = PopulatedTransaction[];

export type UserMetadata = {
	key: string;
	value: string;
};

export type SqueezeArgs = {
	userId: string;
	tokenAddress: string;
	senderId: string;
	historyHash: string;
	dripsHistory: DripsHistoryStruct[];
};

export enum Forge {
	GitHub,
	GitLab
}

export type Address = string;
