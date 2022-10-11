import { assert } from 'chai';
import { mapDripsSetEventToDto, mapSplitEntryToDto, mapUserAssetConfigToDto } from '../../src/DripsSubgraph/mappers';
import type { ApiDripsSetEvent, ApiSplitEntry, ApiUserAssetConfig } from '../../src/DripsSubgraph/types';

describe('mappers', () => {
	describe('mapUserAssetConfigToDto()', () => {
		it('should return the expected result', () => {
			// Arrange
			const apiConfig: ApiUserAssetConfig = {
				id: '1',
				assetId: '2',
				dripsEntries: [{ userId: '3', config: '4' }],
				balance: '5',
				amountCollected: '6',
				lastUpdatedBlockTimestamp: '7'
			};

			// Act
			const result = mapUserAssetConfigToDto(apiConfig);

			// Assert
			assert.equal(result.id, apiConfig.id);
			assert.equal(result.assetId.toString(), apiConfig.assetId);
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
				userId: '1',
				assetId: '2',
				dripsReceiverSeenEvents: [{ receiverUserId: '3', config: '4' }],
				dripsHistoryHash: '5',
				balance: '6',
				blockTimestamp: '7',
				maxEnd: '7'
			};

			// Act
			const result = mapDripsSetEventToDto(apiDripsSetEvent);

			// Assert
			assert.equal(result.userId.toString(), apiDripsSetEvent.userId);
			assert.equal(result.assetId.toString(), apiDripsSetEvent.assetId);
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
			const apiSplitEntry: ApiSplitEntry = {
				userId: '1',
				weight: '2'
			};

			// Act
			const result = mapSplitEntryToDto(apiSplitEntry);

			// Assert
			assert.equal(result.userId.toString(), apiSplitEntry.userId);
			assert.equal(result.weight.toString(), apiSplitEntry.weight);
		});
	});
});
