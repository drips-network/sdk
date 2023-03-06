import type { DripsReceiverConfig } from 'src/common/types';

import type { DripsSetEvent } from 'src/DripsSubgraph/types';

export interface Account {
	userId: string;
	assetConfigs: AssetConfig[];
}

export interface AssetConfig {
	tokenAddress: string;
	streams: Stream[];
	history: AssetConfigHistoryItem[];
}

export interface AssetConfigHistoryItem {
	balance: bigint;
	timestamp: Date;
	streams: Stream[];
	historyHash: string;
	receiversHash: string;
	runsOutOfFunds?: Date | undefined;
}

export interface Stream {
	id: string;
	senderId: string;
	receiverId: string;
	dripsConfig: DripsReceiverConfig;
}

export type UserId = string;
export type TokenAddress = string;

export interface ActiveSupporters {
	dripping: { [key: UserId]: { [key: TokenAddress]: DripsReceiverConfig[] } };
	splitting: { weight: bigint }[];
}

export interface TotalSupporters {
	dripping: { [key: TokenAddress]: Set<UserId> };
	splitting: { weight: bigint }[];
}

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

export interface TimeWindow {
	from: Millis;
	to: Millis;
}

export type AccountEstimate = { [tokenAddress: string]: AssetConfigEstimates };

export type DripsSetEventWithFullReceivers = {
	currentReceivers: {
		id: string;
		receiverUserId: string;
		config: bigint;
	}[];
} & DripsSetEvent;
