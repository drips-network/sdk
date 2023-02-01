import type { DripsReceiverConfig } from 'src/common/types';

export type Millis = number;

export type User = {
	userId: string;
};

export interface StreamEstimate {
	id: string;
	totalStreamed: bigint;
	currentAmountPerSecond: bigint;
	runsOutOfFunds?: Date;
	receiver: User;
	sender: User;
	tokenAddress: string;
}

export interface AssetConfigEstimates {
	total: AssetConfigEstimate;
	currentCycle: AssetConfigEstimate;
}

export interface AssetConfigEstimate {
	streams: StreamEstimate[];
	totals: {
		totalStreamed: bigint;
		remainingBalance: bigint;
		totalAmountPerSecond: bigint;
	};
}

export interface Cycle {
	start: Date;
	duration: Millis;
}

export interface TimeWindow {
	from: Millis;
	to: Millis;
}

export type AccountEstimate = { [tokenAddress: string]: AssetConfigEstimates };

export interface Stream {
	id: string;
	sender: User;
	receiver: User;
	dripsConfig: DripsReceiverConfig;
}

export interface Receiver {
	streamId: string;
	dripsConfig?: DripsReceiverConfig;
	receiver: User;
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

export interface Account {
	user: User;
	assetConfigs: AssetConfig[];
}
