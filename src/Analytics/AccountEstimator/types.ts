import type { DripsSetEvent } from 'src/DripsSubgraph/types';

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
