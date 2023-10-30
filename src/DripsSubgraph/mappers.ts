import Utils from '../utils';
import type {
	StreamReceiverSeenEvent,
	StreamsSetEvent,
	SplitsEntry,
	AccountAssetConfig,
	AccountMetadataEntry,
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
	accountId: repoAccount.id,
	name: repoAccount.name,
	status: repoAccount.status ? (repoAccount.status as RepoAccountStatus) : null,
	forge: BigInt(repoAccount.forge),
	ownerAddress: repoAccount.ownerAddress ? repoAccount.ownerAddress : null,
	lastUpdatedBlockTimestamp: BigInt(repoAccount.lastUpdatedBlockTimestamp)
});

/** @internal */
export const mapAccountAssetConfigToDto = (
	accountAssetConfig: SubgraphTypes.AccountAssetConfig
): AccountAssetConfig => ({
	id: accountAssetConfig.id,
	assetId: BigInt(accountAssetConfig.assetId),
	streamsEntries: accountAssetConfig.streamsEntries?.map((d) => ({
		id: d.id,
		accountId: d.accountId,
		config: BigInt(d.config)
	})),
	balance: BigInt(accountAssetConfig.balance),
	amountCollected: BigInt(accountAssetConfig.amountCollected),
	lastUpdatedBlockTimestamp: BigInt(accountAssetConfig.lastUpdatedBlockTimestamp)
});

/** @internal */
export const mapSplitEntryToDto = (splitEntry: SubgraphTypes.SplitsEntry): SplitsEntry => ({
	id: splitEntry.id,
	accountId: splitEntry.accountId,
	senderId: splitEntry.sender.id,
	weight: BigInt(splitEntry.weight)
});

/** @internal */
export const mapStreamsSetEventToDto = (streamsSetEvent: SubgraphTypes.StreamsSetEvent): StreamsSetEvent => ({
	id: streamsSetEvent.id,
	accountId: streamsSetEvent.accountId,
	assetId: BigInt(streamsSetEvent.assetId),
	streamReceiverSeenEvents: streamsSetEvent.streamReceiverSeenEvents?.map((r) => ({
		id: r.id,
		receiverAccountId: r.receiverAccountId,
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
	accountId: splitEvent.accountId
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
	accountId: receivedDripsEvent.accountId
});

/** @internal */
export const mapCollectedEventToDto = (collectedEvent: SubgraphTypes.CollectedEvent): CollectedEvent => ({
	id: collectedEvent.id,
	collected: BigInt(collectedEvent.collected),
	assetId: BigInt(collectedEvent.assetId),
	blockTimestamp: BigInt(collectedEvent.blockTimestamp),
	accountId: collectedEvent.account.id
});

/** @internal */
export const mapSqueezedStreamsToDto = (
	squeezedStreamsEvent: SubgraphTypes.SqueezedStreamsEvent
): SqueezedStreamsEvent => ({
	amount: BigInt(squeezedStreamsEvent.amt),
	assetId: BigInt(squeezedStreamsEvent.assetId),
	blockTimestamp: BigInt(squeezedStreamsEvent.blockTimestamp),
	id: squeezedStreamsEvent.id,
	senderId: squeezedStreamsEvent.senderId,
	accountId: squeezedStreamsEvent.accountId,
	streamsHistoryHashes: squeezedStreamsEvent.streamsHistoryHashes
});

/** @internal */
export const mapGivenEventToDto = (givenEvent: SubgraphTypes.GivenEvent): GivenEvent => ({
	id: givenEvent.id,
	amount: BigInt(givenEvent.amt),
	assetId: BigInt(givenEvent.assetId),
	blockTimestamp: BigInt(givenEvent.blockTimestamp),
	receiverAccountId: givenEvent.receiverAccountId,
	accountId: givenEvent.accountId
});

/** @internal */
export const mapStreamReceiverSeenEventToDto = (
	streamsReceiverSeenEvent: SubgraphTypes.StreamReceiverSeenEvent
): StreamReceiverSeenEvent => ({
	id: streamsReceiverSeenEvent.id,
	config: BigInt(streamsReceiverSeenEvent.config),
	senderAccountId: BigInt(streamsReceiverSeenEvent.senderAccountId),
	receiverAccountId: BigInt(streamsReceiverSeenEvent.receiverAccountId),
	streamsSetEvent: {
		id: streamsReceiverSeenEvent.streamsSetEvent.id,
		assetId: BigInt(streamsReceiverSeenEvent.streamsSetEvent.assetId),
		receiversHash: streamsReceiverSeenEvent.streamsSetEvent.receiversHash
	},
	blockTimestamp: BigInt(streamsReceiverSeenEvent.blockTimestamp)
});

/** @internal */
export const mapAccountMetadataEventToDto = (
	accountMetadata: SubgraphTypes.AccountMetadataEvent
): AccountMetadataEntry => {
	const { key, value } = Utils.Metadata.convertMetadataBytesToString(accountMetadata);

	return {
		key,
		value,
		id: accountMetadata.id,
		accountId: accountMetadata.accountId,
		lastUpdatedBlockTimestamp: BigInt(accountMetadata.lastUpdatedBlockTimestamp)
	};
};
