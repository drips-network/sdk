import type { DripsReceiverConfig } from 'src/common/types';

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
