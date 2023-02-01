import type { DripsReceiverConfig } from 'src/common/types';

export type Millis = number;

export interface StreamEstimate {
	id: string;
	totalStreamed: bigint;
	currentAmountPerSecond: bigint;
	runsOutOfFunds?: Date;
	receiverId: string;
	senderId: string;
	tokenAddress: string;
}

export interface AssetConfigEstimate {
	streams: StreamEstimate[];
	totals: {
		totalStreamed: bigint;
		remainingBalance: bigint;
		totalAmountPerSecond: bigint;
	};
}

export interface AssetConfigEstimates {
	total: AssetConfigEstimate;
	currentCycle: AssetConfigEstimate;
}

export type AccountEstimate = { [tokenAddress: string]: AssetConfigEstimates };

export interface Account {
	userId: string;
	name?: string;
	description?: string;
	emoji?: string;
	assetConfigs: AssetConfig[];
	lastUpdated?: Date;
	lastUpdatedByAddress?: string;
	lastIpfsHash?: string;
}

export interface Stream {
	id: string;
	senderId: string;
	receiverId: string;
	dripsConfig: DripsReceiverConfig;
}

export interface Receiver {
	streamId: string;
	dripsConfig?: DripsReceiverConfig;
	receiverId: string;
}

export interface AssetConfigHistoryItem {
	timestamp: Date;
	balance: bigint;
	runsOutOfFunds?: Date;
	streams: Receiver[];
	historyHash: string;
	receiversHash: string;
}

export interface AssetConfig {
	tokenAddress: string;
	streams: Stream[];
	history: AssetConfigHistoryItem[];
}

export interface TimeWindow {
	from: Millis;
	to: Millis;
}
