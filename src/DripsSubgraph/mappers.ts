import type {
	ApiDripsReceiverSeenEvent,
	ApiDripsSetEvent,
	ApiSplitsEntry,
	ApiUserAssetConfig,
	ApiUserMetadataEvent,
	DripsReceiverSeenEvent,
	DripsSetEvent,
	SplitsEntry,
	UserAssetConfig,
	UserMetadata
} from './types';

/** @internal */
export const mapUserAssetConfigToDto = (userAssetConfig: ApiUserAssetConfig): UserAssetConfig => ({
	id: userAssetConfig.id,
	assetId: BigInt(userAssetConfig.assetId),
	dripsEntries: userAssetConfig.dripsEntries?.map((d) => ({
		id: d.id,
		userId: d.userId,
		config: BigInt(d.config)
	})),
	balance: BigInt(userAssetConfig.balance),
	amountCollected: BigInt(userAssetConfig.amountCollected),
	lastUpdatedBlockTimestamp: BigInt(userAssetConfig.lastUpdatedBlockTimestamp)
});

/** @internal */
export const mapSplitEntryToDto = (splitEntry: ApiSplitsEntry): SplitsEntry => ({
	id: splitEntry.id,
	userId: splitEntry.userId,
	weight: BigInt(splitEntry.weight)
});

/** @internal */
export const mapDripsSetEventToDto = (dripsSetEvent: ApiDripsSetEvent): DripsSetEvent => ({
	id: dripsSetEvent.id,
	userId: dripsSetEvent.userId,
	assetId: BigInt(dripsSetEvent.assetId),
	dripsReceiverSeenEvents: dripsSetEvent.dripsReceiverSeenEvents?.map((r) => ({
		id: r.id,
		receiverUserId: r.receiverUserId,
		config: BigInt(r.config)
	})),
	dripsHistoryHash: dripsSetEvent.dripsHistoryHash,
	balance: BigInt(dripsSetEvent.balance),
	blockTimestamp: BigInt(dripsSetEvent.blockTimestamp),
	maxEnd: BigInt(dripsSetEvent.maxEnd),
	receiversHash: dripsSetEvent.receiversHash
});

/** @internal */
export const mapDripsReceiverSeenEventToDto = (
	dripsReceiverSeenEvent: ApiDripsReceiverSeenEvent
): DripsReceiverSeenEvent => ({
	id: dripsReceiverSeenEvent.id,
	config: BigInt(dripsReceiverSeenEvent.config),
	senderUserId: BigInt(dripsReceiverSeenEvent.senderUserId),
	receiverUserId: BigInt(dripsReceiverSeenEvent.receiverUserId),
	dripsSetEvent: {
		id: dripsReceiverSeenEvent.dripsSetEvent.id,
		assetId: BigInt(dripsReceiverSeenEvent.dripsSetEvent.assetId),
		receiversHash: dripsReceiverSeenEvent.dripsSetEvent.receiversHash
	},
	blockTimestamp: BigInt(dripsReceiverSeenEvent.blockTimestamp)
});

/** @internal */
export const mapUserMetadataEventToDto = (userMetadata: ApiUserMetadataEvent): UserMetadata => ({
	id: userMetadata.id,
	userId: userMetadata.id,
	value: userMetadata.value,
	key: BigInt(userMetadata.key),
	lastUpdatedBlockTimestamp: BigInt(userMetadata.lastUpdatedBlockTimestamp)
});
