import {
	Preset,
	CycleInfo,
	CallStruct,
	NetworkConfig,
	DripsReceiver,
	DripsReceiverConfig,
	DripsReceiverStruct,
	SplitsReceiverStruct
} from './common/types';
import { DripsState, ReceivableBalance, SplittableBalance, CollectableBalance } from './DripsHub/types';
import {
	SplitsEntry,
	UserMetadata,
	NftSubAccount,
	DripsSetEvent,
	UserAssetConfig,
	DripsReceiverSeenEvent
} from './DripsSubgraph/types';

// TODO: Contract typings. We can move these to separate package exports in TS 4.7 (https://github.com/microsoft/TypeScript/issues/33079).
// Contracts
export * as DripsHub from '../contracts/DripsHub';
export * as NFTDriver from '../contracts/NFTDriver';
export * as CallerDriver from '../contracts/Caller';
export * as AddressDriver from '../contracts/AddressDriver';
export * as ImmutableSplitsDriver from '../contracts/ImmutableSplitsDriver';

// AddressDriver
export { default as AddressDriverClient } from './AddressDriver/AddressDriverClient';

// Caller
export { default as CallerClient } from './Caller/CallerClient';

// Common
export { DripsErrorCode, DripsError } from './common/DripsError';

// DripsHub
export { default as DripsHubClient } from './DripsHub/DripsHubClient';

// Drips Subgraph
export { default as DripsSubgraphClient } from './DripsSubgraph/DripsSubgraphClient';

// ImmutableSplitsDriver
export { default as ImmutableSplitsDriverClient } from './ImmutableSplits/ImmutableSplitsDriver';

// NFTDriver
export { default as NFTDriverClient } from './NFTDriver/NFTDriverClient';

// constants
export { default as constants } from './constants';

// Utils
export { default as Utils } from './utils';

// Types
export {
	Preset,
	CycleInfo,
	CallStruct,
	DripsState,
	SplitsEntry,
	UserMetadata,
	NftSubAccount,
	DripsSetEvent,
	NetworkConfig,
	DripsReceiver,
	UserAssetConfig,
	ReceivableBalance,
	SplittableBalance,
	CollectableBalance,
	DripsReceiverStruct,
	DripsReceiverConfig,
	SplitsReceiverStruct,
	DripsReceiverSeenEvent
};
