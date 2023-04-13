import { assert } from 'chai';
import {
	mapCollectedEventToDto,
	mapDripsReceiverSeenEventToDto,
	mapDripsSetEventToDto,
	mapGivenEventToDto,
	mapReceivedDripsEventToDto,
	mapSplitEntryToDto,
	mapSplitEventToDto,
	mapSqueezedDripsToDto,
	mapUserAssetConfigToDto,
	mapUserMetadataEventToDto
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
				user: {
					id: '5'
				} as SubgraphTypes.User
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
				receiverUserId: '5',
				userId: '6'
			};

			// Act
			const result = mapGivenEventToDto(event);

			// Assert
			assert.equal(result.id, event.id);
			assert.equal(result.assetId, BigInt(event.assetId));
			assert.equal(result.amount, BigInt(event.amt));
			assert.equal(result.userId, event.userId);
			assert.equal(result.receiverUserId, event.receiverUserId);
			assert.equal(result.blockTimestamp, BigInt(event.blockTimestamp));
		});
	});

	describe('mapReceivedDripsEventToDto()', () => {
		it('should return the expected result', () => {
			// Arrange
			const event: SubgraphTypes.ReceivedDripsEvent = {
				amt: 1n,
				assetId: '2',
				blockTimestamp: 3n,
				id: '4',
				receivableCycles: 5n,
				userId: '6'
			};

			// Act
			const result = mapReceivedDripsEventToDto(event);

			// Assert
			assert.equal(result.id, event.id);
			assert.equal(result.assetId, event.assetId);
			assert.equal(result.amount, BigInt(event.amt));
			assert.equal(result.receivableCycles, BigInt(event.receivableCycles));
			assert.equal(result.userId, event.userId);
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
				userId: '6'
			};

			// Act
			const result = mapSplitEventToDto(event);

			// Assert
			assert.equal(result.id, event.id);
			assert.equal(result.assetId, BigInt(event.assetId));
			assert.equal(result.amount, BigInt(event.amt));
			assert.equal(result.receiverId, event.receiverId);
			assert.equal(result.userId, event.userId);
			assert.equal(result.blockTimestamp, BigInt(event.blockTimestamp));
		});
	});

	describe('mapSqueezedDripsToDto()', () => {
		it('should return the expected result', () => {
			// Arrange
			const event: SubgraphTypes.SqueezedDripsEvent = {
				assetId: 1n,
				blockTimestamp: 2n,
				id: '3',
				amt: '4',
				senderId: '5',
				userId: '6',
				dripsHistoryHashes: ['7', '8']
			} as SubgraphTypes.SqueezedDripsEvent;

			// Act
			const result = mapSqueezedDripsToDto(event);

			// Assert
			assert.equal(result.id, event.id);
			assert.equal(result.assetId, BigInt(event.assetId));
			assert.equal(result.amount, BigInt(event.amt));
			assert.equal(result.senderId, event.senderId);
			assert.equal(result.userId, event.userId);
			assert.equal(result.blockTimestamp, BigInt(event.blockTimestamp));
			assert.isTrue(result.dripsHistoryHashes.includes('7'));
			assert.isTrue(result.dripsHistoryHashes.includes('8'));
		});
	});

	describe('mapUserAssetConfigToDto()', () => {
		it('should return the expected result', () => {
			// Arrange
			const apiConfig: SubgraphTypes.UserAssetConfig = {
				id: '1',
				assetId: '2',
				dripsEntries: [{ id: '1', userId: '3', config: '4' }],
				balance: '5',
				amountCollected: '6',
				lastUpdatedBlockTimestamp: '7'
			} as SubgraphTypes.UserAssetConfig;

			// Act
			const result = mapUserAssetConfigToDto(apiConfig);

			// Assert
			assert.equal(result.id, apiConfig.id);
			assert.equal(result.assetId.toString(), apiConfig.assetId);
			assert.equal(result.dripsEntries[0].id.toString(), apiConfig.dripsEntries[0].id);
			assert.equal(result.dripsEntries[0].userId.toString(), apiConfig.dripsEntries[0].userId);
			assert.equal(result.dripsEntries[0].config.toString(), apiConfig.dripsEntries[0].config);
			assert.equal(result.balance.toString(), apiConfig.balance);
			assert.equal(result.amountCollected.toString(), apiConfig.amountCollected);
			assert.equal(result.lastUpdatedBlockTimestamp.toString(), apiConfig.lastUpdatedBlockTimestamp);
		});
	});

	describe('mapDripsSetEventToDto()', () => {
		it('should return the expected result', () => {
			// Arrange
			const apiDripsSetEvent: SubgraphTypes.DripsSetEvent = {
				id: '100',
				userId: '1',
				assetId: '2',
				dripsReceiverSeenEvents: [{ id: '1', receiverUserId: '3', config: '4' }],
				dripsHistoryHash: '5',
				balance: '6',
				blockTimestamp: '7',
				maxEnd: '7',
				receiversHash: '0x00'
			} as SubgraphTypes.DripsSetEvent;

			// Act
			const result = mapDripsSetEventToDto(apiDripsSetEvent);

			// Assert
			assert.equal(result.id.toString(), apiDripsSetEvent.id);
			assert.equal(result.userId.toString(), apiDripsSetEvent.userId);
			assert.equal(result.assetId.toString(), apiDripsSetEvent.assetId);
			assert.equal(result.dripsReceiverSeenEvents[0].id.toString(), apiDripsSetEvent.dripsReceiverSeenEvents[0].id);
			assert.equal(
				result.dripsReceiverSeenEvents[0].receiverUserId.toString(),
				apiDripsSetEvent.dripsReceiverSeenEvents[0].receiverUserId
			);
			assert.equal(
				result.dripsReceiverSeenEvents[0].config.toString(),
				apiDripsSetEvent.dripsReceiverSeenEvents[0].config
			);
			assert.equal(result.dripsHistoryHash.toString(), apiDripsSetEvent.dripsHistoryHash);
			assert.equal(result.balance.toString(), apiDripsSetEvent.balance);
			assert.equal(result.blockTimestamp.toString(), apiDripsSetEvent.blockTimestamp);
			assert.equal(result.maxEnd.toString(), apiDripsSetEvent.maxEnd);
		});
	});

	describe('mapSplitEntryToDto()', () => {
		it('should return the expected result', () => {
			// Arrange
			const apiSplitEntry: SubgraphTypes.SplitsEntry = {
				id: '100',
				userId: '1',
				weight: '2',
				sender: {
					id: '3'
				}
			} as SubgraphTypes.SplitsEntry;

			// Act
			const result = mapSplitEntryToDto(apiSplitEntry);

			// Assert
			assert.equal(result.id.toString(), apiSplitEntry.id);
			assert.equal(result.userId.toString(), apiSplitEntry.userId);
			assert.equal(result.weight.toString(), apiSplitEntry.weight);
			assert.equal(result.senderId.toString(), apiSplitEntry.sender.id);
		});
	});

	describe('mapDripsReceiverSeenEventToDto()', () => {
		it('should return the expected result', () => {
			// Arrange
			const apiDripsReceiverSeenEvent: SubgraphTypes.DripsReceiverSeenEvent = {
				id: '100',
				config: '1',
				dripsSetEvent: {
					id: '100',
					assetId: '2',
					receiversHash: '0x00'
				},
				receiverUserId: '2',
				senderUserId: '3',
				blockTimestamp: '4'
			} as SubgraphTypes.DripsReceiverSeenEvent;

			// Act
			const result = mapDripsReceiverSeenEventToDto(apiDripsReceiverSeenEvent);

			// Assert
			assert.equal(result.id.toString(), apiDripsReceiverSeenEvent.id);
			assert.equal(result.config.toString(), apiDripsReceiverSeenEvent.config);
			assert.equal(result.dripsSetEvent.id, apiDripsReceiverSeenEvent.dripsSetEvent.id);
			assert.equal(result.senderUserId.toString(), apiDripsReceiverSeenEvent.senderUserId);
			assert.equal(result.blockTimestamp.toString(), apiDripsReceiverSeenEvent.blockTimestamp);
			assert.equal(result.receiverUserId.toString(), apiDripsReceiverSeenEvent.receiverUserId);
			assert.equal(result.dripsSetEvent.assetId.toString(), apiDripsReceiverSeenEvent.dripsSetEvent.assetId);
			assert.equal(result.dripsSetEvent.assetId.toString(), apiDripsReceiverSeenEvent.dripsSetEvent.assetId);
		});
	});

	describe('mapUserMetadataEventToDto()', () => {
		it('should return the expected result', () => {
			// Arrange
			const apiUserMetadataEvent: SubgraphTypes.UserMetadataEvent = {
				id: '100',
				userId: '1',
				value: Utils.Metadata.valueFromString('value'),
				key: Utils.Metadata.keyFromString('key'),
				lastUpdatedBlockTimestamp: '4'
			} as SubgraphTypes.UserMetadataEvent;

			// Act
			const result = mapUserMetadataEventToDto(apiUserMetadataEvent);

			// Assert
			assert.equal(result.value, 'value');
			assert.equal(result.userId, apiUserMetadataEvent.userId);
			assert.equal(result.id.toString(), apiUserMetadataEvent.id);
			assert.equal(result.key, 'key');
			assert.equal(result.lastUpdatedBlockTimestamp.toString(), apiUserMetadataEvent.lastUpdatedBlockTimestamp);
		});
	});
});
