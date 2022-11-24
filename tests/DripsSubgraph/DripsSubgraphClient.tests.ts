import { assert } from 'chai';
import { BigNumber, Wallet } from 'ethers';
import * as sinon from 'sinon';
import { DripsErrorCode } from '../../src/common/DripsError';
import DripsSubgraphClient from '../../src/DripsSubgraph/DripsSubgraphClient';
import * as gql from '../../src/DripsSubgraph/gql';
import type {
	UserAssetConfig,
	SplitsEntry,
	DripsSetEvent,
	DripsReceiverSeenEvent
} from '../../src/DripsSubgraph/types';
import Utils from '../../src/utils';
import * as mappers from '../../src/DripsSubgraph/mappers';
import * as validators from '../../src/common/validators';
import type * as SubgraphTypes from '../../src/DripsSubgraph/generated/graphql-types';

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
			assert.equal(testSubgraphClient.apiUrl, Utils.Network.configs[TEST_CHAIN_ID].SUBGRAPH_URL);
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

		it('should set the custom network config when provided', () => {
			// Arrange
			const customApiUrl = 'https://custom-api-url.com';

			// Act
			const client = DripsSubgraphClient.create(TEST_CHAIN_ID, customApiUrl);

			// Assert
			assert.equal(client.apiUrl, customApiUrl);
		});

		it('should create a fully initialized client instance', () => {
			// Assert
			assert.equal(testSubgraphClient.chainId, TEST_CHAIN_ID);
			assert.equal(testSubgraphClient.apiUrl, Utils.Network.configs[TEST_CHAIN_ID].SUBGRAPH_URL);
		});
	});

	describe('getUserAssetConfigById()', () => {
		it('should throw argumentMissingError error when user ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getUserAssetConfigById(undefined as unknown as string, 1);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw argumentMissingError error when asset ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getUserAssetConfigById('1', undefined as unknown as number);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return null when the user asset configuration is not found', async () => {
			// Arrange
			const userId = '1';
			const assetId = 2n;
			const configId = `${userId}-${assetId}`;

			const apiConfig: SubgraphTypes.UserAssetConfig = {
				id: configId,
				assetId: assetId.toString(),
				balance: '3',
				amountCollected: '4',
				dripsEntries: [
					{
						id: '1',
						userId: '5',
						config: BigNumber.from(269599466671506397946670150870196306736371444226143594574070383902750000n).toString()
					}
				],
				lastUpdatedBlockTimestamp: '6'
			} as SubgraphTypes.UserAssetConfig;

			sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getUserAssetConfigById, { configId: `${apiConfig.id}` })
				.resolves({
					data: {
						userAssetConfig: null
					},
					error: undefined
				});

			// Act
			const actualConfig = await testSubgraphClient.getUserAssetConfigById(userId, assetId);

			// Assert
			assert.isNull(actualConfig);
		});

		it('should return the expected result', async () => {
			// Arrange
			const userId = '1';
			const assetId = 2n;
			const configId = `${userId}-${assetId}`;

			const apiConfig: SubgraphTypes.UserAssetConfig = {
				id: configId,
				assetId: assetId.toString(),
				balance: '3',
				amountCollected: '4',
				dripsEntries: [
					{
						id: '1',
						userId: '5',
						config: BigNumber.from(269599466671506397946670150870196306736371444226143594574070383902750000n).toString()
					}
				],
				lastUpdatedBlockTimestamp: '6'
			} as SubgraphTypes.UserAssetConfig;

			const queryStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getUserAssetConfigById, { configId: `${apiConfig.id}` })
				.resolves({
					data: {
						userAssetConfig: apiConfig
					},
					error: undefined
				});

			const expectedConfig: UserAssetConfig = {} as UserAssetConfig;

			const mapperStub = sinon.stub(mappers, 'mapUserAssetConfigToDto').withArgs(apiConfig).returns(expectedConfig);

			// Act
			const actualConfig = await testSubgraphClient.getUserAssetConfigById(userId, assetId);

			// Assert
			assert.equal(actualConfig, expectedConfig);
			assert(
				queryStub.calledOnceWithExactly(gql.getUserAssetConfigById, sinon.match({ configId })),
				'Expected method to be called with different arguments'
			);
			assert(mapperStub.calledOnceWithExactly(apiConfig), 'Expected method to be called with different arguments');
		});
	});

	describe('getAllUserAssetConfigsByUserId()', () => {
		it('should throw argumentMissingError error when user ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getAllUserAssetConfigsByUserId(undefined as unknown as string);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return the expected result', async () => {
			// Arrange
			const userId = '1';
			const assetId = 2n;
			const configId = `${userId}-${assetId}`;

			const apiConfigs: SubgraphTypes.UserAssetConfig[] = [
				{
					id: configId,
					assetId: assetId.toString(),
					balance: '3',
					amountCollected: '4',
					dripsEntries: [
						{
							id: '1',
							userId: '5',
							config:
								BigNumber.from(269599466671506397946670150870196306736371444226143594574070383902750000n).toString()
						}
					],
					lastUpdatedBlockTimestamp: '6'
				} as SubgraphTypes.UserAssetConfig
			];

			const queryStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getAllUserAssetConfigsByUserId, { userId })
				.resolves({
					data: {
						user: {
							assetConfigs: apiConfigs
						}
					},
					error: undefined
				});

			const expectedConfig: UserAssetConfig = {} as UserAssetConfig;

			const mapperStub = sinon.stub(mappers, 'mapUserAssetConfigToDto').withArgs(apiConfigs[0]).returns(expectedConfig);

			// Act
			const actualConfigs = await testSubgraphClient.getAllUserAssetConfigsByUserId(userId);

			// Assert
			assert.equal(actualConfigs[0], expectedConfig);
			assert(
				queryStub.calledOnceWithExactly(gql.getAllUserAssetConfigsByUserId, { userId }),
				'Expected method to be called with different arguments'
			);
			assert(
				mapperStub.calledOnceWith(sinon.match((c: SubgraphTypes.UserAssetConfig) => c.id === apiConfigs[0].id)),
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
					},
					error: undefined
				});

			// Act
			const actualConfigs = await testSubgraphClient.getAllUserAssetConfigsByUserId(userId);

			// Assert
			assert.equal(actualConfigs.length, 0);
		});
	});

	describe('getSplitsConfig()', () => {
		it('should throw argumentMissingError error when user ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getSplitsConfigByUserId(undefined as unknown as string);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return the expected result', async () => {
			// Arrange
			const userId = '1';
			const splitsEntries: SubgraphTypes.SplitsEntry[] = [
				{
					id: '1',
					weight: '2',
					userId: '3'
				} as SubgraphTypes.SplitsEntry
			];
			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getSplitsConfigByUserId, { userId })
				.resolves({
					data: {
						user: {
							splitsEntries
						}
					},
					error: undefined
				});

			const expectedSplitEntry: SplitsEntry = {} as SplitsEntry;

			const mapperStub = sinon
				.stub(mappers, 'mapSplitEntryToDto')
				.withArgs(splitsEntries[0])
				.returns(expectedSplitEntry);

			// Act
			const splits = await testSubgraphClient.getSplitsConfigByUserId(userId);

			// Assert
			assert.equal(splits[0], expectedSplitEntry);
			assert(
				clientStub.calledOnceWithExactly(gql.getSplitsConfigByUserId, { userId }),
				'Expected method to be called with different arguments'
			);
			assert(mapperStub.calledOnceWith(splitsEntries[0]), 'Expected method to be called with different arguments');
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
					},
					error: undefined
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

	describe('getSplitEntriesByReceiverUserId()', () => {
		it('should throw argumentMissingError error when user ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getSplitEntriesByReceiverUserId(undefined as unknown as string);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return the expected result', async () => {
			// Arrange
			const receiverUserId = '1';
			const splitsEntries: SubgraphTypes.SplitsEntry[] = [
				{
					id: '1',
					weight: '2',
					userId: '3'
				} as SubgraphTypes.SplitsEntry
			];
			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getSplitEntriesByReceiverUserId, { receiverUserId })
				.resolves({
					data: {
						splitsEntries
					},
					error: undefined
				});

			const expectedSplitEntry: SplitsEntry = {} as SplitsEntry;

			const mapperStub = sinon
				.stub(mappers, 'mapSplitEntryToDto')
				.withArgs(splitsEntries[0])
				.returns(expectedSplitEntry);

			// Act
			const splits = await testSubgraphClient.getSplitEntriesByReceiverUserId(receiverUserId);

			// Assert
			assert.equal(splits[0], expectedSplitEntry);
			assert(
				clientStub.calledOnceWithExactly(gql.getSplitEntriesByReceiverUserId, { receiverUserId }),
				'Expected method to be called with different arguments'
			);
			assert(mapperStub.calledOnceWith(splitsEntries[0]), 'Expected method to be called with different arguments');
		});

		it('should return an empty array when splits does not exist', async () => {
			// Arrange
			const receiverUserId = '1';
			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getSplitEntriesByReceiverUserId, { receiverUserId })
				.resolves({
					data: {
						splitsEntries: []
					},
					error: undefined
				});

			// Act
			const splits = await testSubgraphClient.getSplitEntriesByReceiverUserId(receiverUserId);

			// Assert
			assert.isEmpty(splits);
			assert(
				clientStub.calledOnceWithExactly(gql.getSplitEntriesByReceiverUserId, { receiverUserId }),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getDripsSetEventsByUserId()', () => {
		it('should throw argumentMissingError error when asset ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getDripsSetEventsByUserId(undefined as unknown as string);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return the expected result', async () => {
			// Arrange
			const userId = '1';
			const dripsSetEvents: SubgraphTypes.DripsSetEvent[] = [
				{
					userId: '1'
				} as SubgraphTypes.DripsSetEvent
			];
			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getDripsSetEventsByUserId, { userId })
				.resolves({
					data: {
						dripsSetEvents
					},
					error: undefined
				});

			const expectedDripsSetEvent = {} as DripsSetEvent;

			const mapperStub = sinon
				.stub(mappers, 'mapDripsSetEventToDto')
				.withArgs(dripsSetEvents[0])
				.returns(expectedDripsSetEvent);

			// Act
			const result = await testSubgraphClient.getDripsSetEventsByUserId(userId);

			// Assert
			assert.equal(result[0], expectedDripsSetEvent);
			assert(
				clientStub.calledOnceWithExactly(gql.getDripsSetEventsByUserId, { userId }),
				'Expected method to be called with different arguments'
			);
			assert(mapperStub.calledOnceWith(dripsSetEvents[0]), 'Expected method to be called with different arguments');
		});

		it('should return an empty array when DripsSetEvent entries do not exist', async () => {
			// Arrange
			const userId = '1';
			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getDripsSetEventsByUserId, { userId })
				.resolves({
					data: {
						dripsSetEvents: undefined
					},
					error: undefined
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

	describe('getDripsReceiverSeenEventsByReceiverId()', () => {
		it('should throw argumentMissingError error when asset ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getDripsReceiverSeenEventsByReceiverId(undefined as unknown as string);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return the expected result', async () => {
			// Arrange
			const receiverUserId = '1';
			const dripsReceiverSeenEvents: SubgraphTypes.DripsReceiverSeenEvent[] = [
				{
					receiverUserId: '1',
					dripsSetEvent: {} as SubgraphTypes.DripsSetEvent
				} as unknown as SubgraphTypes.DripsReceiverSeenEvent
			];
			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getDripsReceiverSeenEventsByReceiverId, { receiverUserId })
				.resolves({
					data: {
						dripsReceiverSeenEvents
					},
					error: undefined
				});

			const expectedDripsReceiverSeenEvent = {} as DripsReceiverSeenEvent;

			const mapperStub = sinon
				.stub(mappers, 'mapDripsReceiverSeenEventToDto')
				.withArgs(dripsReceiverSeenEvents[0])
				.returns(expectedDripsReceiverSeenEvent);

			// Act
			const result = await testSubgraphClient.getDripsReceiverSeenEventsByReceiverId(receiverUserId);

			// Assert
			assert.equal(result[0], expectedDripsReceiverSeenEvent);
			assert(
				clientStub.calledOnceWithExactly(gql.getDripsReceiverSeenEventsByReceiverId, { receiverUserId }),
				'Expected method to be called with different arguments'
			);
			assert(
				mapperStub.calledOnceWith(dripsReceiverSeenEvents[0]),
				'Expected method to be called with different arguments'
			);
		});

		it('should return an empty array when DripsReceiverSeen event entries do not exist', async () => {
			// Arrange
			const receiverUserId = '1';
			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getDripsReceiverSeenEventsByReceiverId, { receiverUserId })
				.resolves({
					data: {
						dripsReceiverSeenEvents: []
					},
					error: undefined
				});

			// Act
			const dripsSetEvents = await testSubgraphClient.getDripsReceiverSeenEventsByReceiverId(receiverUserId);

			// Assert
			assert.isEmpty(dripsSetEvents);
			assert(
				clientStub.calledOnceWithExactly(gql.getDripsReceiverSeenEventsByReceiverId, { receiverUserId }),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getUsersStreamingToUser()', () => {
		it('should throw argumentMissingError error when asset ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getUsersStreamingToUser(undefined as unknown as string);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return the expected result', async () => {
			// Arrange
			const receiverUserId = '1';
			const dripsReceiverSeenEvents: DripsReceiverSeenEvent[] = [
				{
					senderUserId: '1',
					dripsSetEvent: {} as DripsSetEvent
				} as unknown as DripsReceiverSeenEvent,
				{
					senderUserId: '1',
					dripsSetEvent: {} as DripsSetEvent
				} as unknown as DripsReceiverSeenEvent,
				{
					senderUserId: '2',
					dripsSetEvent: {} as DripsSetEvent
				} as unknown as DripsReceiverSeenEvent
			];

			sinon
				.stub(DripsSubgraphClient.prototype, 'getDripsReceiverSeenEventsByReceiverId')
				.resolves(dripsReceiverSeenEvents);

			// Act
			const result = await testSubgraphClient.getUsersStreamingToUser(receiverUserId);

			// Assert
			assert.equal(result.length, 2);
			assert.equal(result[0], 1n);
			assert.equal(result[1], 2n);
		});
	});

	describe('getMetadataHistory()', () => {
		it('should throw argumentMissingError error when asset ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getMetadataHistory(undefined as unknown as string);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return an empty array when no metadata found', async () => {
			// Arrange
			const userId = '1';

			sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getMetadataHistoryByUser, { userId })
				.resolves({
					data: {
						userMetadataEvent: null
					},
					error: undefined
				});

			// Act
			const metadata = await testSubgraphClient.getMetadataHistory(userId);

			// Assert
			assert.isEmpty(metadata);
		});

		it('should return the expected result when querying only by user ID', async () => {
			// Arrange
			const userMetadataEvents: SubgraphTypes.UserMetadataEvent[] = [
				{
					id: '1',
					key: '2',
					value: '3',
					userId: '5',
					lastUpdatedBlockTimestamp: '5'
				}
			];

			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getMetadataHistoryByUser, {
					userId: userMetadataEvents[0].userId
				})
				.resolves({
					data: {
						userMetadataEvents
					},
					error: undefined
				});

			// Act
			const metadata = await testSubgraphClient.getMetadataHistory(userMetadataEvents[0].userId);

			// Assert
			assert.equal(metadata![0].key.toString(), userMetadataEvents[0].key);
			assert.equal(metadata![0].userId, userMetadataEvents[0].userId);
			assert.equal(metadata![0].value, userMetadataEvents[0].value);
			assert.equal(metadata![0].lastUpdatedBlockTimestamp.toString(), userMetadataEvents[0].lastUpdatedBlockTimestamp);
			assert(
				clientStub.calledOnceWithExactly(gql.getMetadataHistoryByUser, {
					userId: userMetadataEvents[0].userId
				}),
				'Expected method to be called with different arguments'
			);
		});

		it('should return the expected result when querying by user ID and key', async () => {
			// Arrange
			const userMetadataEvents: SubgraphTypes.UserMetadataEvent[] = [
				{
					id: '1',
					key: '2',
					value: '3',
					userId: '5',
					lastUpdatedBlockTimestamp: '5'
				}
			];

			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getMetadataHistoryByUserAndKey, {
					userId: userMetadataEvents[0].userId,
					key: userMetadataEvents[0].key.toString()
				})
				.resolves({
					data: {
						userMetadataEvents
					},
					error: undefined
				});

			// Act
			const metadata = await testSubgraphClient.getMetadataHistory(
				userMetadataEvents[0].userId,
				userMetadataEvents[0].key
			);

			// Assert
			assert.equal(metadata![0].key.toString(), userMetadataEvents[0].key);
			assert.equal(metadata![0].userId, userMetadataEvents[0].userId);
			assert.equal(metadata![0].value, userMetadataEvents[0].value);
			assert.equal(metadata![0].lastUpdatedBlockTimestamp.toString(), userMetadataEvents[0].lastUpdatedBlockTimestamp);
			assert(
				clientStub.calledOnceWithExactly(gql.getMetadataHistoryByUserAndKey, {
					userId: userMetadataEvents[0].userId,
					key: userMetadataEvents[0].key
				}),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getLatestUserMetadata()', () => {
		it('should throw argumentMissingError error when user ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getLatestUserMetadata(undefined as unknown as string, 'key');
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw argumentMissingError error when key is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getLatestUserMetadata('1', undefined as unknown as string);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return null when no metadata found', async () => {
			// Arrange
			const key = '1';
			const userId = '1';

			sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getLatestUserMetadata, { key: `${userId}-${BigNumber.from(key)}` })
				.resolves({
					data: {
						userMetadataEvents: null
					},
					error: undefined
				});

			// Act
			const metadata = await testSubgraphClient.getLatestUserMetadata(userId, key);

			// Assert
			assert.isNull(metadata);
		});

		it('should return the expected result', async () => {
			// Arrange
			const userMetadataByKey: SubgraphTypes.UserMetadataEvent = {
				id: '1',
				key: '2',
				value: '3',
				userId: '4',
				lastUpdatedBlockTimestamp: '5'
			};

			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getLatestUserMetadata, {
					id: `${userMetadataByKey.userId}-${BigNumber.from(userMetadataByKey.key)}`
				})
				.resolves({
					data: {
						userMetadataByKey
					},
					error: undefined
				});

			// Act
			const metadata = await testSubgraphClient.getLatestUserMetadata(userMetadataByKey.userId, userMetadataByKey.key);

			// Assert
			assert.equal(metadata!.key.toString(), userMetadataByKey.key);
			assert.equal(metadata!.userId, userMetadataByKey.userId);
			assert.equal(metadata!.value, userMetadataByKey.value);
			assert.equal(metadata!.lastUpdatedBlockTimestamp.toString(), userMetadataByKey.lastUpdatedBlockTimestamp);
			assert(
				clientStub.calledOnceWithExactly(gql.getLatestUserMetadata, {
					id: `${userMetadataByKey.userId}-${BigNumber.from(userMetadataByKey.key)}`
				}),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getNftSubAccountsByOwner()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const ownerAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			sinon.stub(testSubgraphClient, 'query').withArgs(gql.getNftSubAccountsByOwner, { ownerAddress });

			// Act
			await testSubgraphClient.getNftSubAccountsByOwner(ownerAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(ownerAddress));
		});

		it('should return empty array when no sub accounts found', async () => {
			// Arrange
			const ownerAddress = Wallet.createRandom().address;

			sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getNftSubAccountsByOwner, { ownerAddress })
				.resolves({
					data: {
						nftsubAccounts: null
					},
					error: undefined
				});

			// Act
			const metadata = await testSubgraphClient.getNftSubAccountsByOwner(ownerAddress);

			// Assert
			assert.isEmpty(metadata);
		});

		it('should return the expected result', async () => {
			// Arrange
			const ownerAddress = Wallet.createRandom().address;
			const nftsubAccounts: SubgraphTypes.NftSubAccount[] = [
				{
					id: '1',
					ownerAddress: Wallet.createRandom().address
				}
			];

			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getNftSubAccountsByOwner, { ownerAddress })
				.resolves({
					data: {
						nftsubAccounts
					},
					error: undefined
				});

			// Act
			const result = await testSubgraphClient.getNftSubAccountsByOwner(ownerAddress);

			// Assert
			assert.equal(result![0].tokenId, nftsubAccounts[0].id);
			assert.equal(result![0].ownerAddress, nftsubAccounts[0].ownerAddress);
			assert(
				clientStub.calledOnceWithExactly(gql.getNftSubAccountsByOwner, { ownerAddress }),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getCollectedEventsByUserId', () => {
		it('should throw an argumentMissingError when user ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getCollectedEventsByUserId(undefined as unknown as string);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return empty array when no events are found', async () => {
			// Arrange
			const userId = '1';

			sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getCollectedEventsByUserId, { userId })
				.resolves({
					data: {
						givenEvents: null
					},
					error: undefined
				});

			// Act
			const metadata = await testSubgraphClient.getCollectedEventsByUserId(userId);

			// Assert
			assert.isEmpty(metadata);
		});

		it('should return the expected result', async () => {
			// Arrange
			const userId = '1';
			const events: SubgraphTypes.CollectedEvent[] = [
				{
					assetId: 1n,
					blockTimestamp: 2n,
					collected: 3n,
					id: '4',
					user: {
						id: '5'
					} as SubgraphTypes.User
				}
			];

			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getCollectedEventsByUserId, { userId })
				.resolves({
					data: {
						collectedEvents: events
					},
					error: undefined
				});

			// Act
			const result = await testSubgraphClient.getCollectedEventsByUserId(userId);

			// Assert
			assert.equal(result![0].id, events[0].id);
			assert(
				clientStub.calledOnceWithExactly(gql.getCollectedEventsByUserId, { userId }),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getSplitEventsByUserId', () => {
		it('should throw an argumentMissingError when user ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getSplitEventsByUserId(undefined as unknown as string);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return empty array when no events are found', async () => {
			// Arrange
			const userId = '1';

			sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getSplitEventsByUserId, { userId })
				.resolves({
					data: {
						givenEvents: null
					},
					error: undefined
				});

			// Act
			const metadata = await testSubgraphClient.getSplitEventsByUserId(userId);

			// Assert
			assert.isEmpty(metadata);
		});

		it('should return the expected result', async () => {
			// Arrange
			const events: SubgraphTypes.SplitEvent[] = [
				{
					amt: 1n,
					assetId: 2n,
					blockTimestamp: 3n,
					id: '4',
					receiverId: '5',
					userId: '6'
				}
			];

			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getSplitEventsByUserId, { userId: events[0].userId })
				.resolves({
					data: {
						splitEvents: events
					},
					error: undefined
				});

			// Act
			const result = await testSubgraphClient.getSplitEventsByUserId(events[0].userId);

			// Assert
			assert.equal(result![0].id, events[0].id);
			assert(
				clientStub.calledOnceWithExactly(gql.getSplitEventsByUserId, { userId: events[0].userId }),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getReceivedDripsEventsByUserId', () => {
		it('should throw an argumentMissingError when user ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getReceivedDripsEventsByUserId(undefined as unknown as string);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return empty array when no events are found', async () => {
			// Arrange
			const userId = '1';

			sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getReceivedDripsEventsByUserId, { userId })
				.resolves({
					data: {
						givenEvents: null
					},
					error: undefined
				});

			// Act
			const metadata = await testSubgraphClient.getReceivedDripsEventsByUserId(userId);

			// Assert
			assert.isEmpty(metadata);
		});

		it('should return the expected result', async () => {
			// Arrange
			const userId = '1';
			const events: SubgraphTypes.ReceivedDripsEvent[] = [
				{
					id: '1',
					amt: 1n,
					assetId: '1',
					blockTimestamp: 1n,
					receivableCycles: 1n,
					userId
				}
			];

			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getReceivedDripsEventsByUserId, { userId })
				.resolves({
					data: {
						receivedDripsEvents: events
					},
					error: undefined
				});

			// Act
			const result = await testSubgraphClient.getReceivedDripsEventsByUserId(userId);

			// Assert
			assert.equal(result![0].id, events[0].id);
			assert(
				clientStub.calledOnceWithExactly(gql.getReceivedDripsEventsByUserId, { userId }),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getGivenEventsByUserId', () => {
		it('should throw an argumentMissingError when user ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getGivenEventsByUserId(undefined as unknown as string);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return empty array when no events are found', async () => {
			// Arrange
			const userId = '1';

			sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getGivenEventsByUserId, { userId })
				.resolves({
					data: {
						givenEvents: null
					},
					error: undefined
				});

			// Act
			const metadata = await testSubgraphClient.getGivenEventsByUserId(userId);

			// Assert
			assert.isEmpty(metadata);
		});

		it('should return the expected result', async () => {
			// Arrange
			const userId = '1';
			const events: SubgraphTypes.GivenEvent[] = [
				{
					id: '1',
					amt: 1n,
					assetId: '1',
					blockTimestamp: 1n,
					receiverUserId: '1',
					userId
				}
			];

			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getGivenEventsByUserId, { userId })
				.resolves({
					data: {
						givenEvents: events
					},
					error: undefined
				});

			// Act
			const result = await testSubgraphClient.getGivenEventsByUserId(userId);

			// Assert
			assert.equal(result![0].id, events[0].id);
			assert(
				clientStub.calledOnceWithExactly(gql.getGivenEventsByUserId, { userId }),
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

		it('should return expected error response', async () => {
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
						json: async () => ({ data: apiResponse, errors: ['something went wrong'] })
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
			assert.equal(response.error, 'something went wrong');
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
