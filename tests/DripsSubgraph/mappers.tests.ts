import { assert } from 'chai';
import {
	mapDripsReceiverSeenEventToDto,
	mapDripsSetEventToDto,
	mapSplitEntryToDto,
	mapUserAssetConfigToDto
} from '../../src/DripsSubgraph/mappers';
import type {
	ApiDripsReceiverSeenEvent,
	ApiDripsSetEvent,
	ApiSplitsEntry,
	ApiUserAssetConfig
} from '../../src/DripsSubgraph/types';

describe('mappers', () => {
	describe('mapUserAssetConfigToDto()', () => {
		it('should return the expected result', () => {
			// Arrange
			const apiConfig: ApiUserAssetConfig = {
				id: '1',
				assetId: '2',
				dripsEntries: [{ id: '1', userId: '3', config: '4' }],
				balance: '5',
				amountCollected: '6',
				lastUpdatedBlockTimestamp: '7'
			};

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
			const apiDripsSetEvent: ApiDripsSetEvent = {
				id: '100',
				userId: '1',
				assetId: '2',
				dripsReceiverSeenEvents: [{ id: '1', receiverUserId: '3', config: '4' }],
				dripsHistoryHash: '5',
				balance: '6',
				blockTimestamp: '7',
				maxEnd: '7',
				receiversHash: '0x00'
			};

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
			const apiSplitEntry: ApiSplitsEntry = {
				id: '100',
				userId: '1',
				weight: '2'
			};

			// Act
			const result = mapSplitEntryToDto(apiSplitEntry);

			// Assert
			assert.equal(result.id.toString(), apiSplitEntry.id);
			assert.equal(result.userId.toString(), apiSplitEntry.userId);
			assert.equal(result.weight.toString(), apiSplitEntry.weight);
		});
	});

	describe('mapDripsReceiverSeenEventToDto()', () => {
		it('should return the expected result', () => {
			// Arrange
			const apiDripsReceiverSeenEvent: ApiDripsReceiverSeenEvent = {
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
			};

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
});
