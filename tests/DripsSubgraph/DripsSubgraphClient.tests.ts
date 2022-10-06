import { assert } from 'chai';
import { Wallet } from 'ethers';
import * as sinon from 'sinon';
import { DripsErrorCode } from '../../src/common/DripsError';
import DripsSubgraphClient from '../../src/DripsSubgraph/DripsSubgraphClient';
import * as gql from '../../src/DripsSubgraph/gql';
import type { UserAssetConfig, SplitEntry, DripsReceiverSeenEvent } from '../../src/DripsSubgraph/types';
import Utils from '../../src/utils';
import type { DripsSetEventObject } from '../../contracts/DripsHub';
import { toBN } from '../../src/common/internals';

describe('DripsSubgraphClient', () => {
	const TEST_CHAIN_ID = 5;
	let testSubgraphClient: DripsSubgraphClient;

	// Acts also as the "base Arrange step".
	beforeEach(() => {
		testSubgraphClient = DripsSubgraphClient.create(TEST_CHAIN_ID);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('create()', () => {
		it('should throw argumentMissingError error when chain ID is missing', async () => {
			let threw = false;

			try {
				// Act
				DripsSubgraphClient.create(undefined as unknown as number);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should create a fully initialized client instance', () => {
			// Assert
			assert.equal(testSubgraphClient.apiUrl, Utils.Network.dripsMetadata[TEST_CHAIN_ID].SUBGRAPH_URL);
		});

		it('should throw unsupportedNetworkError error when chain is not supported', async () => {
			let threw = false;

			try {
				// Act
				DripsSubgraphClient.create(7 as number);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.UNSUPPORTED_NETWORK);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should create a fully initialized client instance', () => {
			// Assert
			assert.equal(testSubgraphClient.chainId, TEST_CHAIN_ID);
			assert.equal(testSubgraphClient.apiUrl, Utils.Network.dripsMetadata[TEST_CHAIN_ID].SUBGRAPH_URL);
		});
	});

	describe('getUserAssetConfig()', () => {
		it('should return the expected result', async () => {
			// Arrange
			const userId = '1';
			const assetId = '2';
			const configId = `${userId}-${assetId}`;

			const expectedConfig: UserAssetConfig = {
				id: configId,
				assetId,
				balance: 3,
				amountCollected: 4,
				dripsEntries: [
					{
						userId: '5',
						config: '0x010000000200000003'
					}
				],
				lastUpdatedBlockTimestamp: 6
			};

			const queryStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getUserAssetConfigById, { configId: `${expectedConfig.id}` })
				.resolves({
					data: {
						userAssetConfig: expectedConfig
					}
				});

			// Act
			const actualConfig = await testSubgraphClient.getUserAssetConfigById(userId, assetId);

			// Assert
			assert.equal(actualConfig, expectedConfig);
			assert(
				queryStub.calledOnceWithExactly(gql.getUserAssetConfigById, sinon.match({ configId })),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getAllUserAssetConfigs()', () => {
		it('should return the expected result', async () => {
			// Arrange
			const userId = '1';
			const assetId = '2';
			const configId = `${userId}-${assetId}`;

			const expectedAssetConfigs: UserAssetConfig[] = [
				{
					id: configId,
					assetId,
					balance: 3,
					amountCollected: 4,
					dripsEntries: [
						{
							userId: '5',
							config: '0x010000000200000003'
						}
					],
					lastUpdatedBlockTimestamp: 6
				}
			];

			const queryStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getAllUserAssetConfigsByUserId, { userId })
				.resolves({
					data: {
						user: {
							assetConfigs: expectedAssetConfigs
						}
					}
				});

			// Act
			const actualConfigs = await testSubgraphClient.getAllUserAssetConfigsByUserId(userId);

			// Assert
			assert.equal(actualConfigs, expectedAssetConfigs);
			assert(
				queryStub.calledOnceWithExactly(gql.getAllUserAssetConfigsByUserId, { userId }),
				'Expected method to be called with different arguments'
			);
		});

		it('should return an empty array if configs do not exist', async () => {
			// Arrange
			const userId = '1';

			sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getAllUserAssetConfigsByUserId, { userId })
				.resolves({
					data: {
						user: {}
					}
				});

			// Act
			const actualConfigs = await testSubgraphClient.getAllUserAssetConfigsByUserId(userId);

			// Assert
			assert.equal(actualConfigs.length, 0);
		});
	});

	describe('getSplitsConfig()', () => {
		it('should return the expected result', async () => {
			// Arrange
			const userId = '1';
			const splitsEntries: SplitEntry[] = [
				{
					weight: '2',
					userId: '3'
				}
			];
			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getSplitsConfigByUserId, { userId })
				.resolves({
					data: {
						user: {
							splitsEntries
						}
					}
				});

			// Act
			const splits = await testSubgraphClient.getSplitsConfigByUserId(userId);

			// Assert
			assert.equal(splits, splitsEntries);
			assert(
				clientStub.calledOnceWithExactly(gql.getSplitsConfigByUserId, { userId }),
				'Expected method to be called with different arguments'
			);
		});

		it('should return an empty array when splits does not exist', async () => {
			// Arrange
			const userId = '1';
			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getSplitsConfigByUserId, { userId })
				.resolves({
					data: {
						user: {}
					}
				});

			// Act
			const splits = await testSubgraphClient.getSplitsConfigByUserId(userId);

			// Assert
			assert.isEmpty(splits);
			assert(
				clientStub.calledOnceWithExactly(gql.getSplitsConfigByUserId, { userId }),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getDripsSetEvents()', () => {
		it('should return the expected result', async () => {
			// Arrange
			const userId = '1';
			const dripsSetEvents: DripsSetEventObject[] = [
				{
					userId: toBN(1)
				} as DripsSetEventObject
			];
			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getDripsSetEventsByUserId, { userId })
				.resolves({
					data: {
						dripsSetEvents
					}
				});

			// Act
			const result = await testSubgraphClient.getDripsSetEventsByUserId(userId);

			// Assert
			assert.equal(result.length, 1);
			assert.equal(result[0].userId, dripsSetEvents[0].userId.toString());
			assert(
				clientStub.calledOnceWithExactly(gql.getDripsSetEventsByUserId, { userId }),
				'Expected method to be called with different arguments'
			);
		});

		it('should return an empty array when DripsSetEvent entries do not exist', async () => {
			// Arrange
			const userId = '1';
			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getDripsSetEventsByUserId, { userId })
				.resolves({
					data: {
						dripsSetEvents: []
					}
				});

			// Act
			const dripsSetEvents = await testSubgraphClient.getDripsSetEventsByUserId(userId);

			// Assert
			assert.isEmpty(dripsSetEvents);
			assert(
				clientStub.calledOnceWithExactly(gql.getDripsSetEventsByUserId, { userId }),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getSqueezableSenders()', () => {
		it('should return an empty list when there are no DripsReceiverSeen events for the specified receiver', async () => {
			// Arrange
			sinon.stub(testSubgraphClient, 'query').resolves({
				data: {}
			});

			// Act
			const squeezableSenders = await testSubgraphClient.getSqueezableSenders('1');

			// Assert
			assert.isEmpty(squeezableSenders);
		});

		it('should return the expected result', async () => {
			// Arrange
			const receiverId = '1';
			const { currentCycleStartDate } = Utils.Cycle.getInfo(5);
			const beforeCurrentCycleStart = currentCycleStartDate.setUTCDate(currentCycleStartDate.getUTCDate() - 1);
			const afterCurrentCycleStart = currentCycleStartDate.setUTCDate(currentCycleStartDate.getUTCDate() + 2);
			const dripsReceiverSeenEvents: DripsReceiverSeenEvent[] = [
				{
					senderUserId: '1'
				},
				{
					senderUserId: '1'
				},
				{
					senderUserId: '2'
				},
				{
					senderUserId: '2'
				},
				{
					senderUserId: '3'
				},
				{
					senderUserId: '4'
				},
				{
					senderUserId: '5'
				},
				{
					senderUserId: '6'
				}
			];
			const sender1AssetConfigs: UserAssetConfig[] = [
				{
					assetId: '1',
					balance: 1_000_000,
					lastUpdatedBlockTimestamp: beforeCurrentCycleStart,
					dripsEntries: [
						{
							config: Utils.DripsReceiverConfiguration.toUint256String({
								amountPerSec: 1,
								duration: 0,
								start: 0
							}),
							userId: receiverId
						}
					]
				} as UserAssetConfig,
				{
					assetId: '1',
					balance: 1_000_000,
					lastUpdatedBlockTimestamp: afterCurrentCycleStart,
					dripsEntries: [
						{
							config: Utils.DripsReceiverConfiguration.toUint256String({
								amountPerSec: 1,
								duration: 0,
								start: 0
							}),
							userId: '999'
						}
					]
				} as UserAssetConfig,
				{
					assetId: '2',
					balance: 1_000_000,
					lastUpdatedBlockTimestamp: beforeCurrentCycleStart,
					dripsEntries: [
						{
							config: Utils.DripsReceiverConfiguration.toUint256String({
								amountPerSec: 1,
								duration: 0,
								start: 0
							}),
							userId: receiverId
						}
					]
				} as UserAssetConfig
			];
			const sender2AssetConfigs: UserAssetConfig[] = [
				{
					assetId: '1',
					balance: 1_000_000,
					lastUpdatedBlockTimestamp: beforeCurrentCycleStart,
					dripsEntries: [
						{
							config: Utils.DripsReceiverConfiguration.toUint256String({
								amountPerSec: 1,
								duration: 0,
								start: 0
							}),
							userId: receiverId
						}
					]
				} as UserAssetConfig,
				{
					assetId: '2',
					balance: 1_000_000,
					lastUpdatedBlockTimestamp: afterCurrentCycleStart,
					dripsEntries: [
						{
							config: Utils.DripsReceiverConfiguration.toUint256String({
								amountPerSec: 1,
								duration: 0,
								start: 0
							}),
							userId: receiverId
						}
					]
				} as UserAssetConfig
			];
			const sender3AssetConfigs: UserAssetConfig[] = [
				{
					assetId: '1',
					balance: 1_000_000,
					lastUpdatedBlockTimestamp: afterCurrentCycleStart,
					dripsEntries: [
						{
							config: Utils.DripsReceiverConfiguration.toUint256String({
								amountPerSec: 1,
								duration: 0,
								start: 0
							}),
							userId: receiverId
						}
					]
				} as UserAssetConfig,
				{
					assetId: '2',
					balance: 1_000_000,
					lastUpdatedBlockTimestamp: afterCurrentCycleStart,
					dripsEntries: [
						{
							config: Utils.DripsReceiverConfiguration.toUint256String({
								amountPerSec: 1,
								duration: 0,
								start: 0
							}),
							userId: receiverId
						}
					]
				} as UserAssetConfig
			];
			const sender4AssetConfigs: UserAssetConfig[] = [
				{
					assetId: '1',
					balance: 1,
					lastUpdatedBlockTimestamp: beforeCurrentCycleStart,
					dripsEntries: [
						{
							config: Utils.DripsReceiverConfiguration.toUint256String({
								amountPerSec: 1,
								duration: 0,
								start: 0
							}),
							userId: receiverId
						}
					]
				} as UserAssetConfig
			];
			const sender5AssetConfigs: UserAssetConfig[] = [
				{
					assetId: '1',
					balance: 0,
					lastUpdatedBlockTimestamp: afterCurrentCycleStart,
					dripsEntries: [
						{
							config: Utils.DripsReceiverConfiguration.toUint256String({
								amountPerSec: 1,
								duration: 0,
								start: 0
							}),
							userId: receiverId
						}
					]
				} as UserAssetConfig
			];
			const sender6AssetConfigs: UserAssetConfig[] = [
				{
					assetId: '1',
					balance: 1_000_000,
					lastUpdatedBlockTimestamp: afterCurrentCycleStart,
					dripsEntries: [
						{
							config: Utils.DripsReceiverConfiguration.toUint256String({
								amountPerSec: 1,
								duration: 0,
								start: 0
							}),
							userId: '100'
						}
					]
				} as UserAssetConfig
			];

			const getAllUserAssetConfigsByUserIdStub = sinon
				.stub(testSubgraphClient, 'getAllUserAssetConfigsByUserId')
				.onCall(0)
				.resolves(sender1AssetConfigs)
				.onCall(1)
				.resolves(sender2AssetConfigs)
				.onCall(2)
				.resolves(sender3AssetConfigs)
				.onCall(3)
				.resolves(sender4AssetConfigs)
				.onCall(4)
				.resolves(sender5AssetConfigs)
				.onCall(5)
				.resolves(sender6AssetConfigs);

			const queryStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getDripsReceiverSeenEventsByReceiverId, { receiverId })
				.resolves({
					data: {
						dripsReceiverSeenEvents
					}
				});
			// Act
			const squeezableSenders = await testSubgraphClient.getSqueezableSenders(receiverId);

			// Assert
			assert.equal(squeezableSenders['1'].length, 2);
			assert.equal(squeezableSenders['2'].length, 2);
			assert.equal(squeezableSenders['3'].length, 2);
			assert.equal(Object.keys(squeezableSenders).length, 3);
			assert.equal(getAllUserAssetConfigsByUserIdStub.callCount, 6);
			assert(
				queryStub.calledOnceWithExactly(gql.getDripsReceiverSeenEventsByReceiverId, { receiverId }),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('query()', async () => {
		it('should return expected response', async () => {
			// Arrange
			const apiResponse = [
				{
					amtPerSec: '1',
					receiver: Wallet.createRandom().address
				}
			];

			global.fetch = sinon.stub(
				async (): Promise<Response> =>
					({
						status: 200,
						json: async () => ({ data: apiResponse })
					} as Response)
			);

			// Act
			const response = await testSubgraphClient.query<
				{
					amtPerSec: string;
					receiver: string;
				}[]
			>(gql.getSplitsConfigByUserId, {});

			// Assert
			assert.equal(response.data, apiResponse);
		});

		it('should throw subgraphQueryError when API response status code is not >= 200 and <= 299', async () => {
			// Arrange
			let threw = false;

			global.fetch = sinon.stub(
				async (): Promise<Response> => ({ status: 500, statusText: 'Internal Server Error' } as Response)
			);

			try {
				// Act
				await testSubgraphClient.query(gql.getSplitsConfigByUserId, {});
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.SUBGRAPH_QUERY_ERROR);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});
	});
});
