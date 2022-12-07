import type {
	DripsReceiverSeenEvent,
	DripsSetEvent,
	SplitsEntry,
	UserAssetConfig,
	UserMetadataEntry,
	SplitEvent,
	ReceivedDripsEvent,
	GivenEvent,
	CollectedEvent,
	SqueezedDripsEvent
} from './types';
import type * as SubgraphTypes from './generated/graphql-types';

/** @internal */
export const mapUserAssetConfigToDto = (userAssetConfig: SubgraphTypes.UserAssetConfig): UserAssetConfig => ({
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
export const mapSplitEntryToDto = (splitEntry: SubgraphTypes.SplitsEntry): SplitsEntry => ({
	id: splitEntry.id,
	userId: splitEntry.userId,
	senderId: splitEntry.sender.id,
	weight: BigInt(splitEntry.weight)
});

/** @internal */
export const mapDripsSetEventToDto = (dripsSetEvent: SubgraphTypes.DripsSetEvent): DripsSetEvent => ({
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
export const mapSplitEventToDto = (splitEvent: SubgraphTypes.SplitEvent): SplitEvent => ({
	id: splitEvent.id,
	amount: BigInt(splitEvent.amt),
	assetId: BigInt(splitEvent.assetId),
	blockTimestamp: BigInt(splitEvent.blockTimestamp),
	receiverId: splitEvent.receiverId,
	userId: splitEvent.userId
});

/** @internal */
export const mapReceivedDripsEventToDto = (
	receivedDripsEvent: SubgraphTypes.ReceivedDripsEvent
): ReceivedDripsEvent => ({
	id: receivedDripsEvent.id,
	amount: BigInt(receivedDripsEvent.amt),
	assetId: BigInt(receivedDripsEvent.assetId),
	blockTimestamp: BigInt(receivedDripsEvent.blockTimestamp),
	receivableCycles: BigInt(receivedDripsEvent.receivableCycles),
	userId: receivedDripsEvent.userId
});

/** @internal */
export const mapCollectedEventToDto = (collectedEvent: SubgraphTypes.CollectedEvent): CollectedEvent => ({
	id: collectedEvent.id,
	collected: BigInt(collectedEvent.collected),
	assetId: BigInt(collectedEvent.assetId),
	blockTimestamp: BigInt(collectedEvent.blockTimestamp),
	userId: collectedEvent.user.id
});

/** @internal */
export const mapSqueezedDripsToDto = (squeezedDripsEvent: SubgraphTypes.SqueezedDripsEvent): SqueezedDripsEvent => ({
	amount: BigInt(squeezedDripsEvent.amt),
	assetId: BigInt(squeezedDripsEvent.assetId),
	blockTimestamp: BigInt(squeezedDripsEvent.blockTimestamp),
	id: squeezedDripsEvent.id,
	senderId: squeezedDripsEvent.senderId,
	userId: squeezedDripsEvent.userId
});

/** @internal */
export const mapGivenEventToDto = (givenEvent: SubgraphTypes.GivenEvent): GivenEvent => ({
	id: givenEvent.id,
	amount: BigInt(givenEvent.amt),
	assetId: BigInt(givenEvent.assetId),
	blockTimestamp: BigInt(givenEvent.blockTimestamp),
	receiverUserId: givenEvent.receiverUserId,
	userId: givenEvent.userId
});

/** @internal */
export const mapDripsReceiverSeenEventToDto = (
	dripsReceiverSeenEvent: SubgraphTypes.DripsReceiverSeenEvent
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
export const mapUserMetadataEventToDto = (userMetadata: SubgraphTypes.UserMetadataEvent): UserMetadataEntry => ({
	id: userMetadata.id,
	value: userMetadata.value,
	userId: userMetadata.userId,
	key: userMetadata.key,
	lastUpdatedBlockTimestamp: BigInt(userMetadata.lastUpdatedBlockTimestamp)
});
