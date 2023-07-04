import Utils from '../utils';
import type {
	StreamReceiverSeenEvent,
	StreamsSetEvent,
	SplitsEntry,
	UserAssetConfig,
	UserMetadataEntry,
	SplitEvent,
	ReceivedStreamsEvent,
	GivenEvent,
	CollectedEvent,
	SqueezedStreamsEvent,
	RepoAccount,
	RepoAccountStatus
} from './types';
import type * as SubgraphTypes from './generated/graphql-types';

/** @internal */
export const mapRepoAccountToDto = (repoAccount: SubgraphTypes.RepoAccount): RepoAccount => ({
	userId: repoAccount.id,
	name: repoAccount.name,
	status: repoAccount.status ? (repoAccount.status as RepoAccountStatus) : null,
	forge: BigInt(repoAccount.forge),
	ownerAddress: repoAccount.ownerAddress ? repoAccount.ownerAddress : null,
	lastUpdatedBlockTimestamp: BigInt(repoAccount.lastUpdatedBlockTimestamp)
});

/** @internal */
export const mapUserAssetConfigToDto = (userAssetConfig: SubgraphTypes.UserAssetConfig): UserAssetConfig => ({
	id: userAssetConfig.id,
	assetId: BigInt(userAssetConfig.assetId),
	streamsEntries: userAssetConfig.streamsEntries?.map((d) => ({
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
export const mapStreamsSetEventToDto = (streamsSetEvent: SubgraphTypes.StreamsSetEvent): StreamsSetEvent => ({
	id: streamsSetEvent.id,
	userId: streamsSetEvent.userId,
	assetId: BigInt(streamsSetEvent.assetId),
	streamReceiverSeenEvents: streamsSetEvent.streamReceiverSeenEvents?.map((r) => ({
		id: r.id,
		receiverUserId: r.receiverUserId,
		config: BigInt(r.config)
	})),
	streamsHistoryHash: streamsSetEvent.streamsHistoryHash,
	balance: BigInt(streamsSetEvent.balance),
	blockTimestamp: BigInt(streamsSetEvent.blockTimestamp),
	maxEnd: BigInt(streamsSetEvent.maxEnd),
	receiversHash: streamsSetEvent.receiversHash
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
export const mapReceivedStreamsEventToDto = (
	receivedDripsEvent: SubgraphTypes.ReceivedStreamsEvent
): ReceivedStreamsEvent => ({
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
export const mapSqueezedDripsToDto = (
	squeezedDripsEvent: SubgraphTypes.SqueezedStreamsEvent
): SqueezedStreamsEvent => ({
	amount: BigInt(squeezedDripsEvent.amt),
	assetId: BigInt(squeezedDripsEvent.assetId),
	blockTimestamp: BigInt(squeezedDripsEvent.blockTimestamp),
	id: squeezedDripsEvent.id,
	senderId: squeezedDripsEvent.senderId,
	userId: squeezedDripsEvent.userId,
	streamsHistoryHashes: squeezedDripsEvent.streamsHistoryHashes
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
export const mapStreamReceiverSeenEventToDto = (
	streamsReceiverSeenEvent: SubgraphTypes.StreamReceiverSeenEvent
): StreamReceiverSeenEvent => ({
	id: streamsReceiverSeenEvent.id,
	config: BigInt(streamsReceiverSeenEvent.config),
	senderUserId: BigInt(streamsReceiverSeenEvent.senderUserId),
	receiverUserId: BigInt(streamsReceiverSeenEvent.receiverUserId),
	streamsSetEvent: {
		id: streamsReceiverSeenEvent.streamsSetEvent.id,
		assetId: BigInt(streamsReceiverSeenEvent.streamsSetEvent.assetId),
		receiversHash: streamsReceiverSeenEvent.streamsSetEvent.receiversHash
	},
	blockTimestamp: BigInt(streamsReceiverSeenEvent.blockTimestamp)
});

/** @internal */
export const mapUserMetadataEventToDto = (userMetadata: SubgraphTypes.UserMetadataEvent): UserMetadataEntry => {
	const { key, value } = Utils.Metadata.convertMetadataBytesToString(userMetadata);

	return {
		key,
		value,
		id: userMetadata.id,
		userId: userMetadata.userId,
		lastUpdatedBlockTimestamp: BigInt(userMetadata.lastUpdatedBlockTimestamp)
	};
};
