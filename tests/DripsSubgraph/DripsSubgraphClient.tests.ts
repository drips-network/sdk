import { assert } from 'chai';
import { BigNumber, ethers, Wallet } from 'ethers';
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
import constants from '../../src/constants';
import type { CycleInfo } from '../../src/common/types';

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
					}
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
					}
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
				.withArgs(gql.getAllUserAssetConfigsByUserId, { userId, skip: 0, first: 100 })
				.resolves({
					data: {
						user: {
							assetConfigs: apiConfigs
						}
					}
				});

			const expectedConfig: UserAssetConfig = {} as UserAssetConfig;

			const mapperStub = sinon.stub(mappers, 'mapUserAssetConfigToDto').withArgs(apiConfigs[0]).returns(expectedConfig);

			// Act
			const actualConfigs = await testSubgraphClient.getAllUserAssetConfigsByUserId(userId);

			// Assert
			assert.equal(actualConfigs[0], expectedConfig);
			assert(
				queryStub.calledOnceWithExactly(gql.getAllUserAssetConfigsByUserId, { userId, skip: 0, first: 100 }),
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
				.withArgs(gql.getAllUserAssetConfigsByUserId, { userId, skip: 0, first: 100 })
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
				.withArgs(gql.getSplitsConfigByUserId, { userId, skip: 0, first: 100 })
				.resolves({
					data: {
						user: {
							splitsEntries
						}
					}
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
				clientStub.calledOnceWithExactly(gql.getSplitsConfigByUserId, { userId, skip: 0, first: 100 }),
				'Expected method to be called with different arguments'
			);
			assert(mapperStub.calledOnceWith(splitsEntries[0]), 'Expected method to be called with different arguments');
		});

		it('should return an empty array when splits does not exist', async () => {
			// Arrange
			const userId = '1';
			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getSplitsConfigByUserId, { userId, skip: 0, first: 100 })
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
				clientStub.calledOnceWithExactly(gql.getSplitsConfigByUserId, { userId, skip: 0, first: 100 }),
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
				.withArgs(gql.getSplitEntriesByReceiverUserId, { receiverUserId, skip: 0, first: 100 })
				.resolves({
					data: {
						splitsEntries
					}
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
				clientStub.calledOnceWithExactly(gql.getSplitEntriesByReceiverUserId, { receiverUserId, skip: 0, first: 100 }),
				'Expected method to be called with different arguments'
			);
			assert(mapperStub.calledOnceWith(splitsEntries[0]), 'Expected method to be called with different arguments');
		});

		it('should return an empty array when splits does not exist', async () => {
			// Arrange
			const receiverUserId = '1';
			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getSplitEntriesByReceiverUserId, { receiverUserId, skip: 0, first: 100 })
				.resolves({
					data: {
						splitsEntries: []
					}
				});

			// Act
			const splits = await testSubgraphClient.getSplitEntriesByReceiverUserId(receiverUserId);

			// Assert
			assert.isEmpty(splits);
			assert(
				clientStub.calledOnceWithExactly(gql.getSplitEntriesByReceiverUserId, { receiverUserId, skip: 0, first: 100 }),
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
				.withArgs(gql.getDripsSetEventsByUserId, { userId, skip: 0, first: 100 })
				.resolves({
					data: {
						dripsSetEvents
					}
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
				clientStub.calledOnceWithExactly(gql.getDripsSetEventsByUserId, { userId, skip: 0, first: 100 }),
				'Expected method to be called with different arguments'
			);
			assert(mapperStub.calledOnceWith(dripsSetEvents[0]), 'Expected method to be called with different arguments');
		});

		it('should return an empty array when DripsSetEvent entries do not exist', async () => {
			// Arrange
			const userId = '1';
			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getDripsSetEventsByUserId, { userId, skip: 0, first: 100 })
				.resolves({
					data: {
						dripsSetEvents: undefined
					}
				});

			// Act
			const dripsSetEvents = await testSubgraphClient.getDripsSetEventsByUserId(userId);

			// Assert
			assert.isEmpty(dripsSetEvents);
			assert(
				clientStub.calledOnceWithExactly(gql.getDripsSetEventsByUserId, { userId, skip: 0, first: 100 }),
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
				.withArgs(gql.getDripsReceiverSeenEventsByReceiverId, { receiverUserId, skip: 0, first: 100 })
				.resolves({
					data: {
						dripsReceiverSeenEvents
					}
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
				clientStub.calledOnceWithExactly(gql.getDripsReceiverSeenEventsByReceiverId, {
					receiverUserId,
					skip: 0,
					first: 100
				}),
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
				.withArgs(gql.getDripsReceiverSeenEventsByReceiverId, { receiverUserId, skip: 0, first: 100 })
				.resolves({
					data: {
						dripsReceiverSeenEvents: []
					}
				});

			// Act
			const dripsSetEvents = await testSubgraphClient.getDripsReceiverSeenEventsByReceiverId(receiverUserId);

			// Assert
			assert.isEmpty(dripsSetEvents);
			assert(
				clientStub.calledOnceWithExactly(gql.getDripsReceiverSeenEventsByReceiverId, {
					receiverUserId,
					skip: 0,
					first: 100
				}),
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
				.withArgs(gql.getMetadataHistoryByUser, { userId, skip: 0, first: 100 })
				.resolves({
					data: {
						userMetadataEvent: null
					}
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
					key: Utils.Metadata.keyFromString('key'),
					value: Utils.Metadata.valueFromString('value'),
					userId: '5',
					lastUpdatedBlockTimestamp: '5'
				}
			];

			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getMetadataHistoryByUser, {
					userId: userMetadataEvents[0].userId,
					skip: 0,
					first: 100
				})
				.resolves({
					data: {
						userMetadataEvents
					}
				});

			// Act
			const metadata = await testSubgraphClient.getMetadataHistory(userMetadataEvents[0].userId);

			// Assert
			assert.equal(metadata![0].key.toString(), 'key');
			assert.equal(metadata![0].userId, userMetadataEvents[0].userId);
			assert.equal(metadata![0].value, 'value');
			assert.equal(metadata![0].lastUpdatedBlockTimestamp.toString(), userMetadataEvents[0].lastUpdatedBlockTimestamp);
			assert(
				clientStub.calledOnceWithExactly(gql.getMetadataHistoryByUser, {
					userId: userMetadataEvents[0].userId,
					skip: 0,
					first: 100
				}),
				'Expected method to be called with different arguments'
			);
		});

		it('should return the expected result when querying by user ID and key', async () => {
			// Arrange
			const userMetadataEvents: SubgraphTypes.UserMetadataEvent[] = [
				{
					id: '1',
					key: Utils.Metadata.keyFromString('key'),
					value: Utils.Metadata.valueFromString('value'),
					userId: '5',
					lastUpdatedBlockTimestamp: '5'
				}
			];

			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getMetadataHistoryByUserAndKey, {
					userId: userMetadataEvents[0].userId,
					key: Utils.Metadata.keyFromString('key'),
					skip: 0,
					first: 100
				})
				.resolves({
					data: {
						userMetadataEvents
					}
				});

			// Act
			const metadata = await testSubgraphClient.getMetadataHistory(userMetadataEvents[0].userId, 'key');

			// Assert
			assert.equal(metadata![0].key.toString(), 'key');
			assert.equal(metadata![0].userId, userMetadataEvents[0].userId);
			assert.equal(metadata![0].value, 'value');
			assert.equal(metadata![0].lastUpdatedBlockTimestamp.toString(), userMetadataEvents[0].lastUpdatedBlockTimestamp);
			assert(
				clientStub.calledOnceWithExactly(gql.getMetadataHistoryByUserAndKey, {
					userId: userMetadataEvents[0].userId,
					key: userMetadataEvents[0].key,
					skip: 0,
					first: 100
				}),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getLatestUserMetadata()', () => {
		it('should throw argumentError error when user ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getLatestUserMetadata(undefined as unknown as string, 'key');
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw argumentError error when key is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getLatestUserMetadata('1', undefined as unknown as string);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
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
					}
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
				key: Utils.Metadata.keyFromString('key'),
				value: Utils.Metadata.valueFromString('value'),
				userId: '4',
				lastUpdatedBlockTimestamp: '5'
			};

			const id = `${userMetadataByKey.userId}-key`;

			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getLatestUserMetadata, {
					id
				})
				.resolves({
					data: {
						userMetadataByKey
					}
				});

			// Act
			const metadata = await testSubgraphClient.getLatestUserMetadata(userMetadataByKey.userId, 'key');

			// Assert
			assert.equal(metadata!.key, 'key');
			assert.equal(metadata!.userId, userMetadataByKey.userId);
			assert.equal(metadata!.value, 'value');
			assert.equal(metadata!.lastUpdatedBlockTimestamp.toString(), userMetadataByKey.lastUpdatedBlockTimestamp);
			assert(
				clientStub.calledOnceWithExactly(gql.getLatestUserMetadata, { id }),
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
					}
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
				.withArgs(gql.getNftSubAccountsByOwner, { ownerAddress, skip: 0, first: 100 })
				.resolves({
					data: {
						nftsubAccounts
					}
				});

			// Act
			const result = await testSubgraphClient.getNftSubAccountsByOwner(ownerAddress);

			// Assert
			assert.equal(result![0].tokenId, nftsubAccounts[0].id);
			assert.equal(result![0].ownerAddress, nftsubAccounts[0].ownerAddress);
			assert(
				clientStub.calledOnceWithExactly(gql.getNftSubAccountsByOwner, { ownerAddress, skip: 0, first: 100 }),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getNftSubAccountIdsByApp()', () => {
		it('should throw an argumentError when associatedApp is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getNftSubAccountIdsByApp(undefined as unknown as string);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return empty array when no sub accounts found', async () => {
			// Arrange
			const associatedApp = ethers.utils.formatBytes32String('myApp');

			sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getMetadataHistoryByKeyAndValue, {
					key: constants.ASSOCIATED_APP_KEY_BYTES,
					value: associatedApp
				})
				.resolves({
					data: {
						nftsubAccounts: null
					}
				});

			// Act
			const metadata = await testSubgraphClient.getNftSubAccountIdsByApp(associatedApp);

			// Assert
			assert.isEmpty(metadata);
		});

		it('should return the expected result', async () => {
			// Arrange
			const associatedApp = ethers.utils.formatBytes32String('myApp');
			const userMetadataEvents: SubgraphTypes.UserMetadataEvent[] = [
				{
					userId: '1'
				} as SubgraphTypes.UserMetadataEvent,
				{
					userId: '1'
				} as SubgraphTypes.UserMetadataEvent,
				{
					userId: '2'
				} as SubgraphTypes.UserMetadataEvent
			];

			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getMetadataHistoryByKeyAndValue, {
					key: constants.ASSOCIATED_APP_KEY_BYTES,
					value: Utils.Metadata.valueFromString(associatedApp),
					skip: 0,
					first: 100
				})
				.resolves({
					data: {
						userMetadataEvents
					}
				});

			// Act
			const accountIds = await testSubgraphClient.getNftSubAccountIdsByApp(associatedApp);

			// Assert
			assert.equal(accountIds.length, 2);
			assert.equal(accountIds[0], '1');
			assert.equal(accountIds[1], '2');
			assert(
				clientStub.calledOnceWithExactly(gql.getMetadataHistoryByKeyAndValue, {
					key: constants.ASSOCIATED_APP_KEY_BYTES,
					value: Utils.Metadata.valueFromString(associatedApp),
					skip: 0,
					first: 100
				}),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getCollectedEventsByUserId()', () => {
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
					}
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
				.withArgs(gql.getCollectedEventsByUserId, { userId, skip: 0, first: 100 })
				.resolves({
					data: {
						collectedEvents: events
					}
				});

			// Act
			const result = await testSubgraphClient.getCollectedEventsByUserId(userId);

			// Assert
			assert.equal(result![0].id, events[0].id);
			assert(
				clientStub.calledOnceWithExactly(gql.getCollectedEventsByUserId, { userId, skip: 0, first: 100 }),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getSqueezedDripsEventsByUserId()', () => {
		it('should throw an argumentMissingError when user ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getSqueezedDripsEventsByUserId(undefined as unknown as string);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
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
				.withArgs(gql.getSqueezedDripsEventsByUserId, { userId, skip: 0, first: 100 })
				.resolves({
					data: {
						givenEvents: null
					}
				});

			// Act
			const metadata = await testSubgraphClient.getSqueezedDripsEventsByUserId(userId);

			// Assert
			assert.isEmpty(metadata);
		});

		it('should return the expected result', async () => {
			// Arrange
			const userId = '1';
			const events: SubgraphTypes.SqueezedDripsEvent[] = [
				{
					assetId: 1n,
					blockTimestamp: 2n,
					id: '3',
					amt: '4',
					senderId: '5',
					userId: '6'
				} as SubgraphTypes.SqueezedDripsEvent
			];

			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getSqueezedDripsEventsByUserId, { userId, skip: 0, first: 100 })
				.resolves({
					data: {
						squeezedDripsEvents: events
					}
				});

			// Act
			const result = await testSubgraphClient.getSqueezedDripsEventsByUserId(userId);

			// Assert
			assert.equal(result![0].id, events[0].id);
			assert(
				clientStub.calledOnceWithExactly(gql.getSqueezedDripsEventsByUserId, { userId, skip: 0, first: 100 }),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getSplitEventsByUserId()', () => {
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
					}
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
				.withArgs(gql.getSplitEventsByUserId, { userId: events[0].userId, skip: 0, first: 100 })
				.resolves({
					data: {
						splitEvents: events
					}
				});

			// Act
			const result = await testSubgraphClient.getSplitEventsByUserId(events[0].userId);

			// Assert
			assert.equal(result![0].id, events[0].id);
			assert(
				clientStub.calledOnceWithExactly(gql.getSplitEventsByUserId, { userId: events[0].userId, skip: 0, first: 100 }),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getSplitEventsByReceiverUserId()', () => {
		it('should throw an argumentError when user ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getSplitEventsByReceiverUserId(undefined as unknown as string);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return empty array when no events are found', async () => {
			// Arrange
			const receiverUserId = '1';

			sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getSplitEventsByReceiverUserId, { receiverUserId })
				.resolves({
					data: {
						givenEvents: null
					}
				});

			// Act
			const metadata = await testSubgraphClient.getSplitEventsByReceiverUserId(receiverUserId);

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
				.withArgs(gql.getSplitEventsByReceiverUserId, { receiverUserId: events[0].receiverId, skip: 0, first: 100 })
				.resolves({
					data: {
						splitEvents: events
					}
				});

			// Act
			const result = await testSubgraphClient.getSplitEventsByReceiverUserId(events[0].receiverId);

			// Assert
			assert.equal(result![0].id, events[0].id);
			assert(
				clientStub.calledOnceWithExactly(gql.getSplitEventsByReceiverUserId, {
					receiverUserId: events[0].receiverId,
					skip: 0,
					first: 100
				}),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getReceivedDripsEventsByUserId()', () => {
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
					}
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
				.withArgs(gql.getReceivedDripsEventsByUserId, { userId, skip: 0, first: 100 })
				.resolves({
					data: {
						receivedDripsEvents: events
					}
				});

			// Act
			const result = await testSubgraphClient.getReceivedDripsEventsByUserId(userId);

			// Assert
			assert.equal(result![0].id, events[0].id);
			assert(
				clientStub.calledOnceWithExactly(gql.getReceivedDripsEventsByUserId, { userId, skip: 0, first: 100 }),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getGivenEventsByUserId()', () => {
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
					}
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
				.withArgs(gql.getGivenEventsByUserId, { userId, skip: 0, first: 100 })
				.resolves({
					data: {
						givenEvents: events
					}
				});

			// Act
			const result = await testSubgraphClient.getGivenEventsByUserId(userId);

			// Assert
			assert.equal(result![0].id, events[0].id);
			assert(
				clientStub.calledOnceWithExactly(gql.getGivenEventsByUserId, { userId, skip: 0, first: 100 }),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getGivenEventsByReceiverUserId()', () => {
		it('should throw an argumentMissingError when user ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getGivenEventsByReceiverUserId(undefined as unknown as string);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return empty array when no events are found', async () => {
			// Arrange
			const receiverUserId = '1';

			sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getGivenEventsByReceiverUserId, { receiverUserId })
				.resolves({
					data: {
						givenEvents: null
					}
				});

			// Act
			const metadata = await testSubgraphClient.getGivenEventsByReceiverUserId(receiverUserId);

			// Assert
			assert.isEmpty(metadata);
		});

		it('should return the expected result', async () => {
			// Arrange
			const receiverUserId = '1';
			const events: SubgraphTypes.GivenEvent[] = [
				{
					id: '1',
					amt: 1n,
					assetId: '1',
					blockTimestamp: 1n,
					userId: '1',
					receiverUserId
				}
			];

			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getGivenEventsByReceiverUserId, { receiverUserId, skip: 0, first: 100 })
				.resolves({
					data: {
						givenEvents: events
					}
				});

			// Act
			const result = await testSubgraphClient.getGivenEventsByReceiverUserId(receiverUserId);

			// Assert
			assert.equal(result![0].id, events[0].id);
			assert(
				clientStub.calledOnceWithExactly(gql.getGivenEventsByReceiverUserId, { receiverUserId, skip: 0, first: 100 }),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getArgsForSqueezingAllDrips()', () => {
		it('should return the expected result when there is no previous history', async () => {
			// Arrange
			const userId = '1';
			const senderId = '2';
			const tokenAddress = Wallet.createRandom().address;
			sinon.stub(DripsSubgraphClient.prototype, 'getDripsSetEventsByUserId').resolves([]);

			// Act
			const args = await testSubgraphClient.getArgsForSqueezingAllDrips(userId, senderId, tokenAddress);

			// Assert
			assert.equal(args.userId, userId);
			assert.equal(args.tokenAddress, tokenAddress);
			assert.equal(args.senderId, senderId);
			assert.equal(args.historyHash, ethers.constants.HashZero);
			assert.equal(args.dripsHistory.length, 0);
		});

		it('should return the expected result', async () => {
			// Arrange
			const userId = '1';
			const senderId = '2';
			const tokenAddress = Wallet.createRandom().address;

			// Fri Dec 10 2021 09:40:49 GMT+0200 (Eastern European Standard Time)
			const now = new Date(1639122049 * 1000);

			// Sun Dec 05 2021 09:40:49 GMT+0200 (Eastern European Standard Time) === (1638690049000)
			const currentCycleStartDate = new Date(new Date(now).setDate(new Date(now).getDate() - 5)).getTime();

			const firstResults: DripsSetEvent[] = new Array(490)
				.fill({})
				.map(
					(_e, i) =>
						({
							id: i,
							assetId: Utils.Asset.getIdFromAddress(tokenAddress),
							receiversHash: `receiversHash-${BigInt(currentCycleStartDate - i * 10 - 1)}-${i}`,
							dripsHistoryHash: `dripsHistoryHash-${BigInt(currentCycleStartDate - i * 10 - 1)}-${i}`,
							blockTimestamp: BigInt(Math.ceil(currentCycleStartDate / 1000 - i * 10 - 1)),
							dripsReceiverSeenEvents: [
								{
									receiverUserId: '3',
									config: i
								}
							],
							maxEnd: BigInt(i)
						} as unknown as DripsSetEvent)
				)
				.concat(
					new Array(10).fill({}).map(
						(_e, i) =>
							({
								id: i + 1000,
								assetId: Utils.Asset.getIdFromAddress(tokenAddress),
								receiversHash: `receiversHash-${BigInt(currentCycleStartDate + i * 10)}-${i + 1000}`,
								dripsHistoryHash: `dripsHistoryHash-${BigInt(currentCycleStartDate + i * 10)}-${i + 1000}`,
								blockTimestamp: BigInt(Math.ceil(currentCycleStartDate / 1000 + i * 10)),
								dripsReceiverSeenEvents: [
									{
										receiverUserId: (i + 1000) % 2 === 0 ? userId : '3',
										config: i + 1000
									}
								],
								maxEnd: BigInt(i + 1000)
							} as unknown as DripsSetEvent)
					)
				);

			const secondResults: DripsSetEvent[] = [
				{
					id: firstResults[0].id,
					maxEnd: firstResults[0].maxEnd,
					receiversHash: firstResults[0].receiversHash,
					blockTimestamp: firstResults[0].blockTimestamp,
					dripsHistoryHash: firstResults[0].dripsHistoryHash,
					assetId: Utils.Asset.getIdFromAddress(tokenAddress),
					dripsReceiverSeenEvents: firstResults[0].dripsReceiverSeenEvents
				} as unknown as DripsSetEvent,
				{
					id: firstResults[firstResults.length - 1].id,
					maxEnd: firstResults[firstResults.length - 1].maxEnd,
					receiversHash: firstResults[firstResults.length - 1].receiversHash,
					blockTimestamp: firstResults[firstResults.length - 1].blockTimestamp,
					dripsHistoryHash: firstResults[firstResults.length - 1].dripsHistoryHash,
					assetId: Utils.Asset.getIdFromAddress(tokenAddress),
					dripsReceiverSeenEvents: firstResults[firstResults.length - 1].dripsReceiverSeenEvents
				} as unknown as DripsSetEvent,
				{
					id: '500',
					maxEnd: '500',
					assetId: Utils.Asset.getIdFromAddress(tokenAddress),
					blockTimestamp: firstResults[firstResults.length - 1].blockTimestamp + BigInt(1),
					receiversHash: `${firstResults[firstResults.length - 1].dripsHistoryHash}-500`,
					dripsHistoryHash: `${firstResults[firstResults.length - 1].dripsHistoryHash}-500`,
					dripsReceiverSeenEvents: [
						{
							receiverUserId: userId,
							config: '500'
						}
					]
				} as unknown as DripsSetEvent,
				{
					id: '600',
					maxEnd: '600',
					assetId: '1000',
					blockTimestamp: firstResults[firstResults.length - 1].blockTimestamp + BigInt(1),
					receiversHash: `${firstResults[firstResults.length - 1].dripsHistoryHash}-600`,
					dripsHistoryHash: `${firstResults[firstResults.length - 1].dripsHistoryHash}-600`,
					dripsReceiverSeenEvents: [
						{
							receiverUserId: userId,
							config: '600'
						}
					]
				} as unknown as DripsSetEvent
			];

			sinon.stub(Utils.Cycle, 'getInfo').returns({
				currentCycleStartDate: new Date(currentCycleStartDate)
			} as CycleInfo);

			sinon
				.stub(DripsSubgraphClient.prototype, 'getDripsSetEventsByUserId')
				.onFirstCall()
				.resolves(firstResults)
				.onSecondCall()
				.resolves(secondResults);

			// Act
			const args = await testSubgraphClient.getArgsForSqueezingAllDrips(userId, senderId, tokenAddress);

			// Assert
			assert.equal(args.userId, userId);
			assert.equal(args.tokenAddress, tokenAddress);
			assert.equal(args.senderId, senderId);
			assert.equal(args.historyHash.substring(args.historyHash.length - 2), '-0');
			assert.equal(
				args.dripsHistory.filter(
					(c) =>
						c.dripsHash === ethers.constants.HashZero && c.receivers.filter((e) => e.userId === userId).length === 1
				).length,
				6
			);
			assert.equal(
				args.dripsHistory.filter((c) => c.dripsHash !== ethers.constants.HashZero && c.receivers.length === 0).length,
				6
			);
		});
	});

	describe('filterSqueezableSenders()', () => {
		it('should return the expected result when there are no squeezable senders', async () => {
			// Arrange
			const receiverId = '1';

			sinon.stub(DripsSubgraphClient.prototype, 'query').resolves({ data: { dripsReceiverSeenEvents: [] } });

			// Act
			const senders = await testSubgraphClient.filterSqueezableSenders(receiverId);

			// Assert
			assert.equal(Object.keys(senders).length, 0);
		});

		it('should return the expected result', async () => {
			// Arrange
			const assetId = '100';
			const receiverId = '1';

			const firstResults: DripsReceiverSeenEvent[] = new Array(500).fill({}).map(
				(_e, i) =>
					({
						id: i,
						senderUserId: i,
						dripsSetEvent: { assetId }
					} as unknown as DripsReceiverSeenEvent)
			);

			const secondResults: DripsReceiverSeenEvent[] = [
				firstResults[0],
				{
					id: '501',
					senderUserId: 0,
					dripsSetEvent: { assetId }
				} as unknown as DripsReceiverSeenEvent,
				{
					id: '502',
					senderUserId: 0,
					dripsSetEvent: { assetId: '999' }
				} as unknown as DripsReceiverSeenEvent,
				{
					id: '503',
					senderUserId: 503,
					dripsSetEvent: { assetId: '999' }
				} as unknown as DripsReceiverSeenEvent
			];

			sinon
				.stub(DripsSubgraphClient.prototype, 'query')
				.onFirstCall()
				.resolves({ data: { dripsReceiverSeenEvents: firstResults } })
				.onSecondCall()
				.resolves({ data: { dripsReceiverSeenEvents: secondResults } });

			// Act
			const senders = await testSubgraphClient.filterSqueezableSenders(receiverId);

			// Assert
			assert.equal(Object.keys(senders).length, 501);
			assert.isTrue(senders['0'].includes(assetId));
			assert.isTrue(senders['0'].includes('999'));
		});
	});

	describe('getCurrentDripsReceivers()', () => {
		it('should return the expected result when there are no events', async () => {
			// Arrange
			const userId = '1';
			const tokenAddress = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6';

			sinon.stub(DripsSubgraphClient.prototype, 'getDripsSetEventsByUserId').resolves([]);

			// Act
			const senders = await testSubgraphClient.getCurrentDripsReceivers(userId, tokenAddress);

			// Assert
			assert.equal(Object.keys(senders).length, 0);
		});

		it('should return the expected result', async () => {
			// Arrange
			const userId = '1';
			const tokenAddress = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6';

			const firstResults: DripsSetEvent[] = new Array(500).fill({}).map(
				(_e, i) =>
					({
						id: i,
						blockTimestamp: i,
						assetId: 'not included',
						dripsReceiverSeenEvents: [
							{
								id: i,
								receiverUserId: i,
								config: i
							}
						]
					} as unknown as DripsSetEvent)
			);

			const secondResults: DripsSetEvent[] = [
				{
					id: '502',
					blockTimestamp: 502n,
					assetId: Utils.Asset.getIdFromAddress(tokenAddress),
					dripsReceiverSeenEvents: [
						{
							id: '502',
							receiverUserId: '502',
							config: 502n
						}
					]
				} as DripsSetEvent,
				{
					id: '501',
					blockTimestamp: 501n,
					assetId: Utils.Asset.getIdFromAddress(tokenAddress),
					dripsReceiverSeenEvents: [
						{
							id: '501',
							receiverUserId: '501',
							config: 501n
						}
					]
				} as DripsSetEvent
			];

			sinon
				.stub(DripsSubgraphClient.prototype, 'getDripsSetEventsByUserId')
				.onFirstCall()
				.resolves(firstResults)
				.onSecondCall()
				.resolves(secondResults);

			// Act
			const currentReceivers = await testSubgraphClient.getCurrentDripsReceivers(userId, tokenAddress);

			// Assert
			assert.equal(currentReceivers.length, 1);
			assert.equal(currentReceivers[0].userId, '502');
			assert.equal(currentReceivers[0].config, 502n);
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

		it('should throw a subgraphQueryError when the graphql response contains errors', async () => {
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

			let threw = false;

			// Act
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
