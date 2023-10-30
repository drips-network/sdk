import { assert } from 'chai';
import {
	mapCollectedEventToDto,
	mapStreamReceiverSeenEventToDto,
	mapStreamsSetEventToDto,
	mapGivenEventToDto,
	mapReceivedStreamsEventToDto,
	mapSplitEntryToDto,
	mapSplitEventToDto,
	mapSqueezedStreamsToDto,
	mapAccountAssetConfigToDto,
	mapAccountMetadataEventToDto
} from '../../src/DripsSubgraph/mappers';
import type * as SubgraphTypes from '../../src/DripsSubgraph/generated/graphql-types';
import Utils from '../../src/utils';

describe('mappers', () => {
	describe('mapCollectedEventToDto()', () => {
		it('should return the expected result', () => {
			// Arrange
			const event: SubgraphTypes.CollectedEvent = {
				assetId: 1n,
				blockTimestamp: 2n,
				collected: 3n,
				id: '4',
				account: {
					id: '5'
				} as SubgraphTypes.Account
			};

			// Act
			const result = mapCollectedEventToDto(event);

			// Assert
			assert.equal(result.id, event.id);
			assert.equal(result.assetId, event.assetId);
			assert.equal(result.collected, event.collected);
			assert.equal(result.blockTimestamp, event.blockTimestamp);
		});
	});

	describe('mapGivenEventToDto()', () => {
		it('should return the expected result', () => {
			// Arrange
			const event: SubgraphTypes.GivenEvent = {
				amt: 1n,
				assetId: 2n,
				blockTimestamp: 3n,
				id: '4',
				receiverAccountId: '5',
				accountId: '6'
			};

			// Act
			const result = mapGivenEventToDto(event);

			// Assert
			assert.equal(result.id, event.id);
			assert.equal(result.assetId, BigInt(event.assetId));
			assert.equal(result.amount, BigInt(event.amt));
			assert.equal(result.accountId, event.accountId);
			assert.equal(result.receiverAccountId, event.receiverAccountId);
			assert.equal(result.blockTimestamp, BigInt(event.blockTimestamp));
		});
	});

	describe('mapReceivedStreamsEventToDto()', () => {
		it('should return the expected result', () => {
			// Arrange
			const event: SubgraphTypes.ReceivedStreamsEvent = {
				amt: 1n,
				assetId: '2',
				blockTimestamp: 3n,
				id: '4',
				receivableCycles: 5n,
				accountId: '6'
			};

			// Act
			const result = mapReceivedStreamsEventToDto(event);

			// Assert
			assert.equal(result.id, event.id);
			assert.equal(result.assetId, event.assetId);
			assert.equal(result.amount, BigInt(event.amt));
			assert.equal(result.receivableCycles, BigInt(event.receivableCycles));
			assert.equal(result.accountId, event.accountId);
			assert.equal(result.blockTimestamp, BigInt(event.blockTimestamp));
		});
	});

	describe('mapSplitEventToDto()', () => {
		it('should return the expected result', () => {
			// Arrange
			const event: SubgraphTypes.SplitEvent = {
				amt: 1n,
				assetId: 2n,
				blockTimestamp: 3n,
				id: '4',
				receiverId: '5',
				accountId: '6'
			};

			// Act
			const result = mapSplitEventToDto(event);

			// Assert
			assert.equal(result.id, event.id);
			assert.equal(result.assetId, BigInt(event.assetId));
			assert.equal(result.amount, BigInt(event.amt));
			assert.equal(result.receiverId, event.receiverId);
			assert.equal(result.accountId, event.accountId);
			assert.equal(result.blockTimestamp, BigInt(event.blockTimestamp));
		});
	});

	describe('mapSqueezedStreamsToDto()', () => {
		it('should return the expected result', () => {
			// Arrange
			const event: SubgraphTypes.SqueezedStreamsEvent = {
				assetId: 1n,
				blockTimestamp: 2n,
				id: '3',
				amt: '4',
				senderId: '5',
				accountId: '6',
				streamsHistoryHashes: ['7', '8']
			} as SubgraphTypes.SqueezedStreamsEvent;

			// Act
			const result = mapSqueezedStreamsToDto(event);

			// Assert
			assert.equal(result.id, event.id);
			assert.equal(result.assetId, BigInt(event.assetId));
			assert.equal(result.amount, BigInt(event.amt));
			assert.equal(result.senderId, event.senderId);
			assert.equal(result.accountId, event.accountId);
			assert.equal(result.blockTimestamp, BigInt(event.blockTimestamp));
			assert.isTrue(result.streamsHistoryHashes.includes('7'));
			assert.isTrue(result.streamsHistoryHashes.includes('8'));
		});
	});

	describe('mapAccountAssetConfigToDto()', () => {
		it('should return the expected result', () => {
			// Arrange
			const apiConfig: SubgraphTypes.AccountAssetConfig = {
				id: '1',
				assetId: '2',
				streamsEntries: [{ id: '1', accountId: '3', config: '4' }],
				balance: '5',
				amountCollected: '6',
				lastUpdatedBlockTimestamp: '7'
			} as SubgraphTypes.AccountAssetConfig;

			// Act
			const result = mapAccountAssetConfigToDto(apiConfig);

			// Assert
			assert.equal(result.id, apiConfig.id);
			assert.equal(result.assetId.toString(), apiConfig.assetId);
			assert.equal(result.streamsEntries[0].id.toString(), apiConfig.streamsEntries[0].id);
			assert.equal(result.streamsEntries[0].accountId.toString(), apiConfig.streamsEntries[0].accountId);
			assert.equal(result.streamsEntries[0].config.toString(), apiConfig.streamsEntries[0].config);
			assert.equal(result.balance.toString(), apiConfig.balance);
			assert.equal(result.amountCollected.toString(), apiConfig.amountCollected);
			assert.equal(result.lastUpdatedBlockTimestamp.toString(), apiConfig.lastUpdatedBlockTimestamp);
		});
	});

	describe('mapStreamsSetEventToDto()', () => {
		it('should return the expected result', () => {
			// Arrange
			const apiStreamsSetEvent: SubgraphTypes.StreamsSetEvent = {
				id: '100',
				accountId: '1',
				assetId: '2',
				streamReceiverSeenEvents: [{ id: '1', receiverAccountId: '3', config: '4' }],
				streamsHistoryHash: '5',
				balance: '6',
				blockTimestamp: '7',
				maxEnd: '7',
				receiversHash: '0x00'
			} as SubgraphTypes.StreamsSetEvent;

			// Act
			const result = mapStreamsSetEventToDto(apiStreamsSetEvent);

			// Assert
			assert.equal(result.id.toString(), apiStreamsSetEvent.id);
			assert.equal(result.accountId.toString(), apiStreamsSetEvent.accountId);
			assert.equal(result.assetId.toString(), apiStreamsSetEvent.assetId);
			assert.equal(result.streamReceiverSeenEvents[0].id.toString(), apiStreamsSetEvent.streamReceiverSeenEvents[0].id);
			assert.equal(
				result.streamReceiverSeenEvents[0].receiverAccountId.toString(),
				apiStreamsSetEvent.streamReceiverSeenEvents[0].receiverAccountId
			);
			assert.equal(
				result.streamReceiverSeenEvents[0].config.toString(),
				apiStreamsSetEvent.streamReceiverSeenEvents[0].config
			);
			assert.equal(result.streamsHistoryHash.toString(), apiStreamsSetEvent.streamsHistoryHash);
			assert.equal(result.balance.toString(), apiStreamsSetEvent.balance);
			assert.equal(result.blockTimestamp.toString(), apiStreamsSetEvent.blockTimestamp);
			assert.equal(result.maxEnd.toString(), apiStreamsSetEvent.maxEnd);
		});
	});

	describe('mapSplitEntryToDto()', () => {
		it('should return the expected result', () => {
			// Arrange
			const apiSplitEntry: SubgraphTypes.SplitsEntry = {
				id: '100',
				accountId: '1',
				weight: '2',
				sender: {
					id: '3'
				}
			} as SubgraphTypes.SplitsEntry;

			// Act
			const result = mapSplitEntryToDto(apiSplitEntry);

			// Assert
			assert.equal(result.id.toString(), apiSplitEntry.id);
			assert.equal(result.accountId.toString(), apiSplitEntry.accountId);
			assert.equal(result.weight.toString(), apiSplitEntry.weight);
			assert.equal(result.senderId.toString(), apiSplitEntry.sender.id);
		});
	});

	describe('mapStreamReceiverSeenEventToDto()', () => {
		it('should return the expected result', () => {
			// Arrange
			const apiStreamReceiverSeenEvent: SubgraphTypes.StreamReceiverSeenEvent = {
				id: '100',
				config: '1',
				streamsSetEvent: {
					id: '100',
					assetId: '2',
					receiversHash: '0x00'
				},
				receiverAccountId: '2',
				senderAccountId: '3',
				blockTimestamp: '4'
			} as SubgraphTypes.StreamReceiverSeenEvent;

			// Act
			const result = mapStreamReceiverSeenEventToDto(apiStreamReceiverSeenEvent);

			// Assert
			assert.equal(result.id.toString(), apiStreamReceiverSeenEvent.id);
			assert.equal(result.config.toString(), apiStreamReceiverSeenEvent.config);
			assert.equal(result.streamsSetEvent.id, apiStreamReceiverSeenEvent.streamsSetEvent.id);
			assert.equal(result.senderAccountId.toString(), apiStreamReceiverSeenEvent.senderAccountId);
			assert.equal(result.blockTimestamp.toString(), apiStreamReceiverSeenEvent.blockTimestamp);
			assert.equal(result.receiverAccountId.toString(), apiStreamReceiverSeenEvent.receiverAccountId);
			assert.equal(result.streamsSetEvent.assetId.toString(), apiStreamReceiverSeenEvent.streamsSetEvent.assetId);
			assert.equal(result.streamsSetEvent.assetId.toString(), apiStreamReceiverSeenEvent.streamsSetEvent.assetId);
		});
	});

	describe('mapAccountMetadataEventToDto()', () => {
		it('should return the expected result', () => {
			// Arrange
			const apiAccountMetadataEvent: SubgraphTypes.AccountMetadataEvent = {
				id: '100',
				accountId: '1',
				value: Utils.Metadata.valueFromString('value'),
				key: Utils.Metadata.keyFromString('key'),
				lastUpdatedBlockTimestamp: '4'
			} as SubgraphTypes.AccountMetadataEvent;

			// Act
			const result = mapAccountMetadataEventToDto(apiAccountMetadataEvent);

			// Assert
			assert.equal(result.value, 'value');
			assert.equal(result.accountId, apiAccountMetadataEvent.accountId);
			assert.equal(result.id.toString(), apiAccountMetadataEvent.id);
			assert.equal(result.key, 'key');
			assert.equal(result.lastUpdatedBlockTimestamp.toString(), apiAccountMetadataEvent.lastUpdatedBlockTimestamp);
		});
	});
});
