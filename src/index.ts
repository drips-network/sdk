import { DripsReceiverConfig, DripsMetadata, CycleInfo, DripsReceiver, ReceivableDrips } from './common/types';
import { DripsState, ReceivableTokenBalance } from './DripsHub/types';
import {
	UserAssetConfig,
	SplitsEntry,
	DripsSetEvent,
	DripsReceiverSeenEvent,
	UserMetadata
} from './DripsSubgraph/types';

// TODO: Contract typings. We can move these to separate package exports in TS 4.7 (https://github.com/microsoft/TypeScript/issues/33079).
// Contracts
export * as AddressDriver from '../contracts/AddressDriver';
export * as DripsHub from '../contracts/DripsHub';
export * as NFTDriver from '../contracts/NFTDriver';
export * as ImmutableSplitsDriver from '../contracts/ImmutableSplitsDriver';

// AddressDriver
export { default as AddressDriverClient } from './AddressDriver/AddressDriverClient';

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
	CycleInfo,
	DripsState,
	SplitsEntry,
	UserMetadata,
	DripsSetEvent,
	DripsMetadata,
	DripsReceiver,
	UserAssetConfig,
	ReceivableDrips,
	DripsReceiverConfig,
	DripsReceiverSeenEvent,
	ReceivableTokenBalance
};
