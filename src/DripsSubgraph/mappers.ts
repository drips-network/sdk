import type {
	ApiDripsSetEvent,
	ApiSplitEntry,
	ApiUserAssetConfig,
	DripsSetEvent,
	SplitEntry,
	UserAssetConfig
} from './types';

export const mapUserAssetConfigToDto = (userAssetConfig: ApiUserAssetConfig): UserAssetConfig => ({
	id: userAssetConfig.id,
	assetId: BigInt(userAssetConfig.assetId),
	dripsEntries: userAssetConfig.dripsEntries?.map((d) => ({
		userId: BigInt(d.userId),
		config: BigInt(d.config)
	})),
	balance: BigInt(userAssetConfig.balance),
	amountCollected: BigInt(userAssetConfig.amountCollected),
	lastUpdatedBlockTimestamp: BigInt(userAssetConfig.lastUpdatedBlockTimestamp)
});

export const mapSplitEntryToDto = (splitEntry: ApiSplitEntry): SplitEntry => ({
	userId: BigInt(splitEntry.userId),
	weight: BigInt(splitEntry.weight)
});

export const mapDripsSetEventToDto = (dripsSetEvent: ApiDripsSetEvent): DripsSetEvent => ({
	userId: BigInt(dripsSetEvent.userId),
	assetId: BigInt(dripsSetEvent.assetId),
	dripsReceiverSeenEvents: dripsSetEvent.dripsReceiverSeenEvents?.map((r) => ({
		receiverUserId: BigInt(r.receiverUserId),
		config: BigInt(r.config)
	})),
	dripsHistoryHash: dripsSetEvent.dripsHistoryHash,
	balance: BigInt(dripsSetEvent.balance),
	blockTimestamp: BigInt(dripsSetEvent.blockTimestamp),
	maxEnd: BigInt(dripsSetEvent.maxEnd)
});