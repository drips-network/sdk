import { assert } from 'chai';
import { BigNumber, ethers, Wallet } from 'ethers';
import * as sinon from 'sinon';
import type { Network } from '@ethersproject/providers';
import { JsonRpcProvider } from '@ethersproject/providers';
import type { StubbedInstance } from 'ts-sinon';
import { stubObject } from 'ts-sinon';
import { DripsErrorCode } from '../../src/common/DripsError';
import DripsSubgraphClient from '../../src/DripsSubgraph/DripsSubgraphClient';
import * as gql from '../../src/DripsSubgraph/gql';
import type {
	AccountAssetConfig,
	SplitsEntry,
	StreamsSetEvent,
	StreamReceiverSeenEvent
} from '../../src/DripsSubgraph/types';
import Utils from '../../src/utils';
import * as mappers from '../../src/DripsSubgraph/mappers';
import * as validators from '../../src/common/validators';
import type * as SubgraphTypes from '../../src/DripsSubgraph/generated/graphql-types';
import constants from '../../src/constants';
import type { CycleInfo } from '../../src/common/types';
import DripsClient from '../../src/Drips/DripsClient';

describe('DripsSubgraphClient', () => {
	const TEST_CHAIN_ID = 11155111; // Sepolia.
	let testSubgraphClient: DripsSubgraphClient;
	let networkStub: StubbedInstance<Network>;
	let providerStub: sinon.SinonStubbedInstance<JsonRpcProvider>;

	// Acts also as the "base Arrange step".
	beforeEach(() => {
		providerStub = sinon.createStubInstance(JsonRpcProvider);
		networkStub = stubObject<Network>({ chainId: TEST_CHAIN_ID } as Network);

		providerStub.getNetwork.resolves(networkStub);
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

	describe('getAccountAssetConfigById()', () => {
		it('should throw argumentMissingError error when user ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getAccountAssetConfigById(undefined as unknown as string, 1);
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
				await testSubgraphClient.getAccountAssetConfigById('1', undefined as unknown as number);
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
			const accountId = '1';
			const assetId = 2n;
			const configId = `${accountId}-${assetId}`;

			const apiConfig: SubgraphTypes.AccountAssetConfig = {
				id: configId,
				assetId: assetId.toString(),
				balance: '3',
				amountCollected: '4',
				streamsEntries: [
					{
						id: '1',
						accountId: '5',
						config: BigNumber.from(269599466671506397946670150870196306736371444226143594574070383902750000n).toString()
					}
				],
				lastUpdatedBlockTimestamp: '6'
			} as SubgraphTypes.AccountAssetConfig;

			sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getAccountAssetConfigById, { configId: `${apiConfig.id}` })
				.resolves({
					data: {
						accountAssetConfig: null
					}
				});

			// Act
			const actualConfig = await testSubgraphClient.getAccountAssetConfigById(accountId, assetId);

			// Assert
			assert.isNull(actualConfig);
		});

		it('should return the expected result', async () => {
			// Arrange
			const accountId = '1';
			const assetId = 2n;
			const configId = `${accountId}-${assetId}`;

			const apiConfig: SubgraphTypes.AccountAssetConfig = {
				id: configId,
				assetId: assetId.toString(),
				balance: '3',
				amountCollected: '4',
				streamsEntries: [
					{
						id: '1',
						accountId: '5',
						config: BigNumber.from(269599466671506397946670150870196306736371444226143594574070383902750000n).toString()
					}
				],
				lastUpdatedBlockTimestamp: '6'
			} as SubgraphTypes.AccountAssetConfig;

			const queryStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getAccountAssetConfigById, { configId: `${apiConfig.id}` })
				.resolves({
					data: {
						accountAssetConfig: apiConfig
					}
				});

			const expectedConfig: AccountAssetConfig = {} as AccountAssetConfig;

			const mapperStub = sinon.stub(mappers, 'mapAccountAssetConfigToDto').withArgs(apiConfig).returns(expectedConfig);

			// Act
			const actualConfig = await testSubgraphClient.getAccountAssetConfigById(accountId, assetId);

			// Assert
			assert.equal(actualConfig, expectedConfig);
			assert(
				queryStub.calledOnceWithExactly(gql.getAccountAssetConfigById, sinon.match({ configId })),
				'Expected method to be called with different arguments'
			);
			assert(mapperStub.calledOnceWithExactly(apiConfig), 'Expected method to be called with different arguments');
		});
	});

	describe('getAllAccountAssetConfigsByAccountId()', () => {
		it('should throw argumentMissingError error when user ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getAllAccountAssetConfigsByAccountId(undefined as unknown as string);
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
			const accountId = '1';
			const assetId = 2n;
			const configId = `${accountId}-${assetId}`;

			const apiConfigs: SubgraphTypes.AccountAssetConfig[] = [
				{
					id: configId,
					assetId: assetId.toString(),
					balance: '3',
					amountCollected: '4',
					streamsEntries: [
						{
							id: '1',
							accountId: '5',
							config:
								BigNumber.from(269599466671506397946670150870196306736371444226143594574070383902750000n).toString()
						}
					],
					lastUpdatedBlockTimestamp: '6'
				} as SubgraphTypes.AccountAssetConfig
			];

			const queryStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getAllAccountAssetConfigsByAccountId, { accountId, skip: 0, first: 100 })
				.resolves({
					data: {
						account: {
							assetConfigs: apiConfigs
						}
					}
				});

			const expectedConfig: AccountAssetConfig = {} as AccountAssetConfig;

			const mapperStub = sinon
				.stub(mappers, 'mapAccountAssetConfigToDto')
				.withArgs(apiConfigs[0])
				.returns(expectedConfig);

			// Act
			const actualConfigs = await testSubgraphClient.getAllAccountAssetConfigsByAccountId(accountId);

			// Assert
			assert.equal(actualConfigs[0], expectedConfig);
			assert(
				queryStub.calledOnceWithExactly(gql.getAllAccountAssetConfigsByAccountId, { accountId, skip: 0, first: 100 }),
				'Expected method to be called with different arguments'
			);
			assert(
				mapperStub.calledOnceWith(sinon.match((c: SubgraphTypes.AccountAssetConfig) => c.id === apiConfigs[0].id)),
				'Expected method to be called with different arguments'
			);
		});

		it('should return an empty array if configs do not exist', async () => {
			// Arrange
			const accountId = '1';

			sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getAllAccountAssetConfigsByAccountId, { accountId, skip: 0, first: 100 })
				.resolves({
					data: {
						account: {}
					}
				});

			// Act
			const actualConfigs = await testSubgraphClient.getAllAccountAssetConfigsByAccountId(accountId);

			// Assert
			assert.equal(actualConfigs.length, 0);
		});
	});

	describe('getSplitsConfig()', () => {
		it('should throw argumentMissingError error when user ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getSplitsConfigByAccountId(undefined as unknown as string);
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
			const accountId = '1';
			const splitsEntries: SubgraphTypes.SplitsEntry[] = [
				{
					id: '1',
					weight: '2',
					accountId: '3'
				} as SubgraphTypes.SplitsEntry
			];
			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getSplitsConfigByAccountId, { accountId, skip: 0, first: 100 })
				.resolves({
					data: {
						account: {
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
			const splits = await testSubgraphClient.getSplitsConfigByAccountId(accountId);

			// Assert
			assert.equal(splits[0], expectedSplitEntry);
			assert(
				clientStub.calledOnceWithExactly(gql.getSplitsConfigByAccountId, { accountId, skip: 0, first: 100 }),
				'Expected method to be called with different arguments'
			);
			assert(mapperStub.calledOnceWith(splitsEntries[0]), 'Expected method to be called with different arguments');
		});

		it('should return an empty array when splits does not exist', async () => {
			// Arrange
			const accountId = '1';
			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getSplitsConfigByAccountId, { accountId, skip: 0, first: 100 })
				.resolves({
					data: {
						account: {}
					}
				});

			// Act
			const splits = await testSubgraphClient.getSplitsConfigByAccountId(accountId);

			// Assert
			assert.isEmpty(splits);
			assert(
				clientStub.calledOnceWithExactly(gql.getSplitsConfigByAccountId, { accountId, skip: 0, first: 100 }),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getSplitEntriesByReceiverAccountId()', () => {
		it('should throw argumentMissingError error when user ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getSplitEntriesByReceiverAccountId(undefined as unknown as string);
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
			const receiverAccountId = '1';
			const splitsEntries: SubgraphTypes.SplitsEntry[] = [
				{
					id: '1',
					weight: '2',
					accountId: '3'
				} as SubgraphTypes.SplitsEntry
			];
			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getSplitEntriesByReceiverAccountId, { receiverAccountId, skip: 0, first: 100 })
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
			const splits = await testSubgraphClient.getSplitEntriesByReceiverAccountId(receiverAccountId);

			// Assert
			assert.equal(splits[0], expectedSplitEntry);
			assert(
				clientStub.calledOnceWithExactly(gql.getSplitEntriesByReceiverAccountId, {
					receiverAccountId,
					skip: 0,
					first: 100
				}),
				'Expected method to be called with different arguments'
			);
			assert(mapperStub.calledOnceWith(splitsEntries[0]), 'Expected method to be called with different arguments');
		});

		it('should return an empty array when splits does not exist', async () => {
			// Arrange
			const receiverAccountId = '1';
			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getSplitEntriesByReceiverAccountId, { receiverAccountId, skip: 0, first: 100 })
				.resolves({
					data: {
						splitsEntries: []
					}
				});

			// Act
			const splits = await testSubgraphClient.getSplitEntriesByReceiverAccountId(receiverAccountId);

			// Assert
			assert.isEmpty(splits);
			assert(
				clientStub.calledOnceWithExactly(gql.getSplitEntriesByReceiverAccountId, {
					receiverAccountId,
					skip: 0,
					first: 100
				}),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getStreamsSetEventsByAccountId()', () => {
		it('should throw argumentMissingError error when asset ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getStreamsSetEventsByAccountId(undefined as unknown as string);
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
			const accountId = '1';
			const streamsSetEvents: SubgraphTypes.StreamsSetEvent[] = [
				{
					accountId: '1'
				} as SubgraphTypes.StreamsSetEvent
			];
			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getStreamsSetEventsByAccountId, { accountId, skip: 0, first: 100 })
				.resolves({
					data: {
						streamsSetEvents
					}
				});

			const expectedStreamsSetEvent = {} as StreamsSetEvent;

			const mapperStub = sinon
				.stub(mappers, 'mapStreamsSetEventToDto')
				.withArgs(streamsSetEvents[0])
				.returns(expectedStreamsSetEvent);

			// Act
			const result = await testSubgraphClient.getStreamsSetEventsByAccountId(accountId);

			// Assert
			assert.equal(result[0], expectedStreamsSetEvent);
			assert(
				clientStub.calledOnceWithExactly(gql.getStreamsSetEventsByAccountId, { accountId, skip: 0, first: 100 }),
				'Expected method to be called with different arguments'
			);
			assert(mapperStub.calledOnceWith(streamsSetEvents[0]), 'Expected method to be called with different arguments');
		});

		it('should return an empty array when StreamsSetEvent entries do not exist', async () => {
			// Arrange
			const accountId = '1';
			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getStreamsSetEventsByAccountId, { accountId, skip: 0, first: 100 })
				.resolves({
					data: {
						streamsSetEvents: undefined
					}
				});

			// Act
			const streamsSetEvents = await testSubgraphClient.getStreamsSetEventsByAccountId(accountId);

			// Assert
			assert.isEmpty(streamsSetEvents);
			assert(
				clientStub.calledOnceWithExactly(gql.getStreamsSetEventsByAccountId, { accountId, skip: 0, first: 100 }),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getStreamReceiverSeenEventsByReceiverId()', () => {
		it('should throw argumentMissingError error when asset ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getStreamReceiverSeenEventsByReceiverId(undefined as unknown as string);
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
			const receiverAccountId = '1';
			const streamReceiverSeenEvents: SubgraphTypes.StreamReceiverSeenEvent[] = [
				{
					receiverAccountId: '1',
					streamsSetEvent: {} as SubgraphTypes.StreamsSetEvent
				} as unknown as SubgraphTypes.StreamReceiverSeenEvent
			];
			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getStreamReceiverSeenEventsByReceiverId, { receiverAccountId, skip: 0, first: 100 })
				.resolves({
					data: {
						streamReceiverSeenEvents
					}
				});

			const expectedStreamReceiverSeenEvent = {} as StreamReceiverSeenEvent;

			const mapperStub = sinon
				.stub(mappers, 'mapStreamReceiverSeenEventToDto')
				.withArgs(streamReceiverSeenEvents[0])
				.returns(expectedStreamReceiverSeenEvent);

			// Act
			const result = await testSubgraphClient.getStreamReceiverSeenEventsByReceiverId(receiverAccountId);

			// Assert
			assert.equal(result[0], expectedStreamReceiverSeenEvent);
			assert(
				clientStub.calledOnceWithExactly(gql.getStreamReceiverSeenEventsByReceiverId, {
					receiverAccountId,
					skip: 0,
					first: 100
				}),
				'Expected method to be called with different arguments'
			);
			assert(
				mapperStub.calledOnceWith(streamReceiverSeenEvents[0]),
				'Expected method to be called with different arguments'
			);
		});

		it('should return an empty array when StreamReceiverSeen event entries do not exist', async () => {
			// Arrange
			const receiverAccountId = '1';
			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getStreamReceiverSeenEventsByReceiverId, { receiverAccountId, skip: 0, first: 100 })
				.resolves({
					data: {
						streamReceiverSeenEvents: []
					}
				});

			// Act
			const streamsSetEvents = await testSubgraphClient.getStreamReceiverSeenEventsByReceiverId(receiverAccountId);

			// Assert
			assert.isEmpty(streamsSetEvents);
			assert(
				clientStub.calledOnceWithExactly(gql.getStreamReceiverSeenEventsByReceiverId, {
					receiverAccountId,
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
			const receiverAccountId = '1';
			const streamReceiverSeenEvents: StreamReceiverSeenEvent[] = [
				{
					senderAccountId: '1',
					streamsSetEvent: {} as StreamsSetEvent
				} as unknown as StreamReceiverSeenEvent,
				{
					senderAccountId: '1',
					streamsSetEvent: {} as StreamsSetEvent
				} as unknown as StreamReceiverSeenEvent,
				{
					senderAccountId: '2',
					streamsSetEvent: {} as StreamsSetEvent
				} as unknown as StreamReceiverSeenEvent
			];

			sinon
				.stub(DripsSubgraphClient.prototype, 'getStreamReceiverSeenEventsByReceiverId')
				.resolves(streamReceiverSeenEvents);

			// Act
			const result = await testSubgraphClient.getUsersStreamingToUser(receiverAccountId);

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
			const accountId = '1';

			sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getMetadataHistoryByUser, { accountId, skip: 0, first: 100 })
				.resolves({
					data: {
						accountMetadataEvent: null
					}
				});

			// Act
			const metadata = await testSubgraphClient.getMetadataHistory(accountId);

			// Assert
			assert.isEmpty(metadata);
		});

		it('should return the expected result when querying only by user ID', async () => {
			// Arrange
			const accountMetadataEvents: SubgraphTypes.AccountMetadataEvent[] = [
				{
					id: '1',
					key: Utils.Metadata.keyFromString('key'),
					value: Utils.Metadata.valueFromString('value'),
					accountId: '5',
					lastUpdatedBlockTimestamp: '5'
				}
			];

			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getMetadataHistoryByUser, {
					accountId: accountMetadataEvents[0].accountId,
					skip: 0,
					first: 100
				})
				.resolves({
					data: {
						accountMetadataEvents
					}
				});

			// Act
			const metadata = await testSubgraphClient.getMetadataHistory(accountMetadataEvents[0].accountId);

			// Assert
			assert.equal(metadata![0].key.toString(), 'key');
			assert.equal(metadata![0].accountId, accountMetadataEvents[0].accountId);
			assert.equal(metadata![0].value, 'value');
			assert.equal(
				metadata![0].lastUpdatedBlockTimestamp.toString(),
				accountMetadataEvents[0].lastUpdatedBlockTimestamp
			);
			assert(
				clientStub.calledOnceWithExactly(gql.getMetadataHistoryByUser, {
					accountId: accountMetadataEvents[0].accountId,
					skip: 0,
					first: 100
				}),
				'Expected method to be called with different arguments'
			);
		});

		it('should return the expected result when querying by user ID and key', async () => {
			// Arrange
			const accountMetadataEvents: SubgraphTypes.AccountMetadataEvent[] = [
				{
					id: '1',
					key: Utils.Metadata.keyFromString('key'),
					value: Utils.Metadata.valueFromString('value'),
					accountId: '5',
					lastUpdatedBlockTimestamp: '5'
				}
			];

			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getMetadataHistoryByUserAndKey, {
					accountId: accountMetadataEvents[0].accountId,
					key: Utils.Metadata.keyFromString('key'),
					skip: 0,
					first: 100
				})
				.resolves({
					data: {
						accountMetadataEvents
					}
				});

			// Act
			const metadata = await testSubgraphClient.getMetadataHistory(accountMetadataEvents[0].accountId, 'key');

			// Assert
			assert.equal(metadata![0].key.toString(), 'key');
			assert.equal(metadata![0].accountId, accountMetadataEvents[0].accountId);
			assert.equal(metadata![0].value, 'value');
			assert.equal(
				metadata![0].lastUpdatedBlockTimestamp.toString(),
				accountMetadataEvents[0].lastUpdatedBlockTimestamp
			);
			assert(
				clientStub.calledOnceWithExactly(gql.getMetadataHistoryByUserAndKey, {
					accountId: accountMetadataEvents[0].accountId,
					key: accountMetadataEvents[0].key,
					skip: 0,
					first: 100
				}),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getLatestAccountMetadata()', () => {
		it('should throw argumentError error when user ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getLatestAccountMetadata(undefined as unknown as string, 'key');
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
				await testSubgraphClient.getLatestAccountMetadata('1', undefined as unknown as string);
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
			const accountId = '1';

			sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getLatestAccountMetadata, { key: `${accountId}-${BigNumber.from(key)}` })
				.resolves({
					data: {
						accountMetadataEvents: null
					}
				});

			// Act
			const metadata = await testSubgraphClient.getLatestAccountMetadata(accountId, key);

			// Assert
			assert.isNull(metadata);
		});

		it('should return the expected result', async () => {
			// Arrange
			const accountMetadataByKey: SubgraphTypes.AccountMetadataEvent = {
				id: '1',
				key: Utils.Metadata.keyFromString('key'),
				value: Utils.Metadata.valueFromString('value'),
				accountId: '4',
				lastUpdatedBlockTimestamp: '5'
			};

			const id = `${accountMetadataByKey.accountId}-key`;

			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getLatestAccountMetadata, {
					id
				})
				.resolves({
					data: {
						accountMetadataByKey
					}
				});

			// Act
			const metadata = await testSubgraphClient.getLatestAccountMetadata(accountMetadataByKey.accountId, 'key');

			// Assert
			assert.equal(metadata!.key, 'key');
			assert.equal(metadata!.accountId, accountMetadataByKey.accountId);
			assert.equal(metadata!.value, 'value');
			assert.equal(metadata!.lastUpdatedBlockTimestamp.toString(), accountMetadataByKey.lastUpdatedBlockTimestamp);
			assert(
				clientStub.calledOnceWithExactly(gql.getLatestAccountMetadata, { id }),
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
					ownerAddress: Wallet.createRandom().address,
					originalOwnerAddress: Wallet.createRandom().address
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
			assert.equal(result![0].originalOwnerAddress, nftsubAccounts[0].originalOwnerAddress);
			assert(
				clientStub.calledOnceWithExactly(gql.getNftSubAccountsByOwner, { ownerAddress, skip: 0, first: 100 }),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getNftSubAccountOwnerByTokenId()', () => {
		it('should return null when no sub accounts found', async () => {
			// Arrange
			const tokenId = '1';

			sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getNftSubAccountOwnerByTokenId, { tokenId })
				.resolves({
					data: {
						nftsubAccount: null
					}
				});

			// Act
			const owner = await testSubgraphClient.getNftSubAccountOwnerByTokenId(tokenId);

			// Assert
			assert.isNull(owner);
		});

		it('should return the expected result', async () => {
			// Arrange
			const tokenId = '1';
			const nftsubAccount: SubgraphTypes.NftSubAccount = {
				id: tokenId,
				ownerAddress: Wallet.createRandom().address,
				originalOwnerAddress: Wallet.createRandom().address
			};

			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getNftSubAccountOwnerByTokenId, { tokenId })
				.resolves({
					data: {
						nftsubAccount
					}
				});

			// Act
			const result = await testSubgraphClient.getNftSubAccountOwnerByTokenId(tokenId);

			// Assert
			assert.equal(result!.tokenId, nftsubAccount.id);
			assert.equal(result!.ownerAddress, nftsubAccount.ownerAddress);
			assert.equal(result!.originalOwnerAddress, nftsubAccount.originalOwnerAddress);
			assert(
				clientStub.calledOnceWithExactly(gql.getNftSubAccountOwnerByTokenId, { tokenId }),
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
			const accountMetadataEvents: SubgraphTypes.AccountMetadataEvent[] = [
				{
					accountId: '1'
				} as SubgraphTypes.AccountMetadataEvent,
				{
					accountId: '1'
				} as SubgraphTypes.AccountMetadataEvent,
				{
					accountId: '2'
				} as SubgraphTypes.AccountMetadataEvent
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
						accountMetadataEvents
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

	describe('getCollectedEventsByAccountId()', () => {
		it('should throw an argumentMissingError when user ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getCollectedEventsByAccountId(undefined as unknown as string);
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
			const accountId = '1';

			sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getCollectedEventsByAccountId, { accountId })
				.resolves({
					data: {
						givenEvents: null
					}
				});

			// Act
			const metadata = await testSubgraphClient.getCollectedEventsByAccountId(accountId);

			// Assert
			assert.isEmpty(metadata);
		});

		it('should return the expected result', async () => {
			// Arrange
			const accountId = '1';
			const events: SubgraphTypes.CollectedEvent[] = [
				{
					assetId: 1n,
					blockTimestamp: 2n,
					collected: 3n,
					id: '4',
					account: {
						id: '5'
					} as SubgraphTypes.Account
				}
			];

			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getCollectedEventsByAccountId, { accountId, skip: 0, first: 100 })
				.resolves({
					data: {
						collectedEvents: events
					}
				});

			// Act
			const result = await testSubgraphClient.getCollectedEventsByAccountId(accountId);

			// Assert
			assert.equal(result![0].id, events[0].id);
			assert(
				clientStub.calledOnceWithExactly(gql.getCollectedEventsByAccountId, { accountId, skip: 0, first: 100 }),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getSqueezedStreamsEventsByAccountId()', () => {
		it('should throw an argumentMissingError when user ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getSqueezedStreamsEventsByAccountId(undefined as unknown as string);
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
			const accountId = '1';

			sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getSqueezedStreamsEventsByAccountId, { accountId, skip: 0, first: 100 })
				.resolves({
					data: {
						givenEvents: null
					}
				});

			// Act
			const metadata = await testSubgraphClient.getSqueezedStreamsEventsByAccountId(accountId);

			// Assert
			assert.isEmpty(metadata);
		});

		it('should return the expected result', async () => {
			// Arrange
			const accountId = '1';
			const events: SubgraphTypes.SqueezedStreamsEvent[] = [
				{
					assetId: 1n,
					blockTimestamp: 2n,
					id: '3',
					amt: '4',
					senderId: '5',
					accountId: '6'
				} as SubgraphTypes.SqueezedStreamsEvent
			];

			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getSqueezedStreamsEventsByAccountId, { accountId, skip: 0, first: 100 })
				.resolves({
					data: {
						squeezedStreamsEvents: events
					}
				});

			// Act
			const result = await testSubgraphClient.getSqueezedStreamsEventsByAccountId(accountId);

			// Assert
			assert.equal(result![0].id, events[0].id);
			assert(
				clientStub.calledOnceWithExactly(gql.getSqueezedStreamsEventsByAccountId, { accountId, skip: 0, first: 100 }),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getSplitEventsByAccountId()', () => {
		it('should throw an argumentMissingError when user ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getSplitEventsByAccountId(undefined as unknown as string);
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
			const accountId = '1';

			sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getSplitEventsByAccountId, { accountId })
				.resolves({
					data: {
						givenEvents: null
					}
				});

			// Act
			const metadata = await testSubgraphClient.getSplitEventsByAccountId(accountId);

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
					accountId: '6'
				}
			];

			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getSplitEventsByAccountId, { accountId: events[0].accountId, skip: 0, first: 100 })
				.resolves({
					data: {
						splitEvents: events
					}
				});

			// Act
			const result = await testSubgraphClient.getSplitEventsByAccountId(events[0].accountId);

			// Assert
			assert.equal(result![0].id, events[0].id);
			assert(
				clientStub.calledOnceWithExactly(gql.getSplitEventsByAccountId, {
					accountId: events[0].accountId,
					skip: 0,
					first: 100
				}),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getSplitEventsByReceiverAccountId()', () => {
		it('should throw an argumentError when user ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getSplitEventsByReceiverAccountId(undefined as unknown as string);
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
			const receiverAccountId = '1';

			sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getSplitEventsByReceiverAccountId, { receiverAccountId })
				.resolves({
					data: {
						givenEvents: null
					}
				});

			// Act
			const metadata = await testSubgraphClient.getSplitEventsByReceiverAccountId(receiverAccountId);

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
					accountId: '6'
				}
			];

			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getSplitEventsByReceiverAccountId, {
					receiverAccountId: events[0].receiverId,
					skip: 0,
					first: 100
				})
				.resolves({
					data: {
						splitEvents: events
					}
				});

			// Act
			const result = await testSubgraphClient.getSplitEventsByReceiverAccountId(events[0].receiverId);

			// Assert
			assert.equal(result![0].id, events[0].id);
			assert(
				clientStub.calledOnceWithExactly(gql.getSplitEventsByReceiverAccountId, {
					receiverAccountId: events[0].receiverId,
					skip: 0,
					first: 100
				}),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getReceivedStreamsEventsByAccountId()', () => {
		it('should throw an argumentMissingError when user ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getReceivedStreamsEventsByAccountId(undefined as unknown as string);
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
			const accountId = '1';

			sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getReceivedStreamsEventsByAccountId, { accountId })
				.resolves({
					data: {
						givenEvents: null
					}
				});

			// Act
			const metadata = await testSubgraphClient.getReceivedStreamsEventsByAccountId(accountId);

			// Assert
			assert.isEmpty(metadata);
		});

		it('should return the expected result', async () => {
			// Arrange
			const accountId = '1';
			const events: SubgraphTypes.ReceivedStreamsEvent[] = [
				{
					id: '1',
					amt: 1n,
					assetId: '1',
					blockTimestamp: 1n,
					receivableCycles: 1n,
					accountId
				}
			];

			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getReceivedStreamsEventsByAccountId, { accountId, skip: 0, first: 100 })
				.resolves({
					data: {
						receivedDripsEvents: events
					}
				});

			// Act
			const result = await testSubgraphClient.getReceivedStreamsEventsByAccountId(accountId);

			// Assert
			assert.equal(result![0].id, events[0].id);
			assert(
				clientStub.calledOnceWithExactly(gql.getReceivedStreamsEventsByAccountId, { accountId, skip: 0, first: 100 }),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getGivenEventsByAccountId()', () => {
		it('should throw an argumentMissingError when user ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getGivenEventsByAccountId(undefined as unknown as string);
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
			const accountId = '1';

			sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getGivenEventsByAccountId, { accountId })
				.resolves({
					data: {
						givenEvents: null
					}
				});

			// Act
			const metadata = await testSubgraphClient.getGivenEventsByAccountId(accountId);

			// Assert
			assert.isEmpty(metadata);
		});

		it('should return the expected result', async () => {
			// Arrange
			const accountId = '1';
			const events: SubgraphTypes.GivenEvent[] = [
				{
					id: '1',
					amt: 1n,
					assetId: '1',
					blockTimestamp: 1n,
					receiverAccountId: '1',
					accountId
				}
			];

			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getGivenEventsByAccountId, { accountId, skip: 0, first: 100 })
				.resolves({
					data: {
						givenEvents: events
					}
				});

			// Act
			const result = await testSubgraphClient.getGivenEventsByAccountId(accountId);

			// Assert
			assert.equal(result![0].id, events[0].id);
			assert(
				clientStub.calledOnceWithExactly(gql.getGivenEventsByAccountId, { accountId, skip: 0, first: 100 }),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getGivenEventsByReceiverAccountId()', () => {
		it('should throw an argumentMissingError when user ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getGivenEventsByReceiverAccountId(undefined as unknown as string);
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
			const receiverAccountId = '1';

			sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getGivenEventsByReceiverAccountId, { receiverAccountId })
				.resolves({
					data: {
						givenEvents: null
					}
				});

			// Act
			const metadata = await testSubgraphClient.getGivenEventsByReceiverAccountId(receiverAccountId);

			// Assert
			assert.isEmpty(metadata);
		});

		it('should return the expected result', async () => {
			// Arrange
			const receiverAccountId = '1';
			const events: SubgraphTypes.GivenEvent[] = [
				{
					id: '1',
					amt: 1n,
					assetId: '1',
					blockTimestamp: 1n,
					accountId: '1',
					receiverAccountId
				}
			];

			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getGivenEventsByReceiverAccountId, { receiverAccountId, skip: 0, first: 100 })
				.resolves({
					data: {
						givenEvents: events
					}
				});

			// Act
			const result = await testSubgraphClient.getGivenEventsByReceiverAccountId(receiverAccountId);

			// Assert
			assert.equal(result![0].id, events[0].id);
			assert(
				clientStub.calledOnceWithExactly(gql.getGivenEventsByReceiverAccountId, {
					receiverAccountId,
					skip: 0,
					first: 100
				}),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getArgsForSqueezingAllDrips()', () => {
		it('should return the expected result when there is no previous history', async () => {
			// Arrange
			const accountId = '1';
			const senderId = '2';
			const tokenAddress = Wallet.createRandom().address;
			sinon.stub(DripsSubgraphClient.prototype, 'getStreamsSetEventsByAccountId').resolves([]);

			// Act
			const args = await testSubgraphClient.getArgsForSqueezingAllDrips(accountId, senderId, tokenAddress);

			// Assert
			assert.equal(args.accountId, accountId);
			assert.equal(args.tokenAddress, tokenAddress);
			assert.equal(args.senderId, senderId);
			assert.equal(args.historyHash, ethers.constants.HashZero);
			assert.equal(args.streamsHistory.length, 0);
		});

		it('should return the expected result', async () => {
			// Arrange
			const accountId = '1';
			const senderId = '2';
			const tokenAddress = Wallet.createRandom().address;

			// Fri Dec 10 2021 09:40:49 GMT+0200 (Eastern European Standard Time)
			const now = new Date(1639122049 * 1000);

			// Sun Dec 05 2021 09:40:49 GMT+0200 (Eastern European Standard Time) === (1638690049000)
			const currentCycleStartDate = new Date(new Date(now).setDate(new Date(now).getDate() - 5)).getTime();

			const firstResults: StreamsSetEvent[] = new Array(490)
				.fill({})
				.map(
					(_e, i) =>
						({
							id: i,
							assetId: Utils.Asset.getIdFromAddress(tokenAddress),
							receiversHash: `receiversHash-${BigInt(currentCycleStartDate - i * 10 - 1)}-${i}`,
							streamsHistoryHash: `streamsHistoryHash-${BigInt(currentCycleStartDate - i * 10 - 1)}-${i}`,
							blockTimestamp: BigInt(Math.ceil(currentCycleStartDate / 1000 - i * 10 - 1)),
							streamReceiverSeenEvents: [
								{
									receiverAccountId: '3',
									config: i
								}
							],
							maxEnd: BigInt(i)
						} as unknown as StreamsSetEvent)
				)
				.concat(
					new Array(10).fill({}).map(
						(_e, i) =>
							({
								id: i + 1000,
								assetId: Utils.Asset.getIdFromAddress(tokenAddress),
								receiversHash: `receiversHash-${BigInt(currentCycleStartDate + i * 10)}-${i + 1000}`,
								streamsHistoryHash: `streamsHistoryHash-${BigInt(currentCycleStartDate + i * 10)}-${i + 1000}`,
								blockTimestamp: BigInt(Math.ceil(currentCycleStartDate / 1000 + i * 10)),
								streamReceiverSeenEvents: [
									{
										receiverAccountId: (i + 1000) % 2 === 0 ? accountId : '3',
										config: i + 1000
									}
								],
								maxEnd: BigInt(i + 1000)
							} as unknown as StreamsSetEvent)
					)
				);

			const secondResults: StreamsSetEvent[] = [
				{
					id: firstResults[0].id,
					maxEnd: firstResults[0].maxEnd,
					receiversHash: firstResults[0].receiversHash,
					blockTimestamp: firstResults[0].blockTimestamp,
					streamsHistoryHash: firstResults[0].streamsHistoryHash,
					assetId: Utils.Asset.getIdFromAddress(tokenAddress),
					streamReceiverSeenEvents: firstResults[0].streamReceiverSeenEvents
				} as unknown as StreamsSetEvent,
				{
					id: firstResults[firstResults.length - 1].id,
					maxEnd: firstResults[firstResults.length - 1].maxEnd,
					receiversHash: firstResults[firstResults.length - 1].receiversHash,
					blockTimestamp: firstResults[firstResults.length - 1].blockTimestamp,
					streamsHistoryHash: firstResults[firstResults.length - 1].streamsHistoryHash,
					assetId: Utils.Asset.getIdFromAddress(tokenAddress),
					streamReceiverSeenEvents: firstResults[firstResults.length - 1].streamReceiverSeenEvents
				} as unknown as StreamsSetEvent,
				{
					id: '500',
					maxEnd: '500',
					assetId: Utils.Asset.getIdFromAddress(tokenAddress),
					blockTimestamp: firstResults[firstResults.length - 1].blockTimestamp + BigInt(1),
					receiversHash: `${firstResults[firstResults.length - 1].streamsHistoryHash}-500`,
					streamsHistoryHash: `${firstResults[firstResults.length - 1].streamsHistoryHash}-500`,
					streamReceiverSeenEvents: [
						{
							receiverAccountId: accountId,
							config: '500'
						}
					]
				} as unknown as StreamsSetEvent,
				{
					id: '600',
					maxEnd: '600',
					assetId: '1000',
					blockTimestamp: firstResults[firstResults.length - 1].blockTimestamp + BigInt(1),
					receiversHash: `${firstResults[firstResults.length - 1].streamsHistoryHash}-600`,
					streamsHistoryHash: `${firstResults[firstResults.length - 1].streamsHistoryHash}-600`,
					streamReceiverSeenEvents: [
						{
							receiverAccountId: accountId,
							config: '600'
						}
					]
				} as unknown as StreamsSetEvent
			];

			sinon.stub(Utils.Cycle, 'getInfo').returns({
				currentCycleStartDate: new Date(currentCycleStartDate)
			} as CycleInfo);

			sinon
				.stub(DripsSubgraphClient.prototype, 'getStreamsSetEventsByAccountId')
				.onFirstCall()
				.resolves(firstResults)
				.onSecondCall()
				.resolves(secondResults);

			// Act
			const args = await testSubgraphClient.getArgsForSqueezingAllDrips(accountId, senderId, tokenAddress);

			// Assert
			assert.equal(args.accountId, accountId);
			assert.equal(args.tokenAddress, tokenAddress);
			assert.equal(args.senderId, senderId);
			assert.equal(args.historyHash.substring(args.historyHash.length - 2), '-0');
			assert.equal(
				args.streamsHistory.filter(
					(c) =>
						c.streamsHash === ethers.constants.HashZero &&
						c.receivers.filter((e) => e.accountId === accountId).length === 1
				).length,
				6
			);
			assert.equal(
				args.streamsHistory.filter((c) => c.streamsHash !== ethers.constants.HashZero && c.receivers.length === 0)
					.length,
				6
			);
		});
	});

	describe('filterSqueezableSenders()', () => {
		it('should return the expected result when there are no squeezable senders', async () => {
			// Arrange
			const receiverId = '1';

			sinon.stub(DripsSubgraphClient.prototype, 'query').resolves({ data: { streamReceiverSeenEvents: [] } });

			// Act
			const senders = await testSubgraphClient.filterSqueezableSenders(receiverId);

			// Assert
			assert.equal(Object.keys(senders).length, 0);
		});

		it('should return the expected result', async () => {
			// Arrange
			const assetId = '100';
			const receiverId = '1';

			const firstResults: StreamReceiverSeenEvent[] = new Array(500).fill({}).map(
				(_e, i) =>
					({
						id: i,
						senderAccountId: i,
						streamsSetEvent: { assetId }
					} as unknown as StreamReceiverSeenEvent)
			);

			const secondResults: StreamReceiverSeenEvent[] = [
				firstResults[0],
				{
					id: '501',
					senderAccountId: 0,
					streamsSetEvent: { assetId }
				} as unknown as StreamReceiverSeenEvent,
				{
					id: '502',
					senderAccountId: 0,
					streamsSetEvent: { assetId: '999' }
				} as unknown as StreamReceiverSeenEvent,
				{
					id: '503',
					senderAccountId: 503,
					streamsSetEvent: { assetId: '999' }
				} as unknown as StreamReceiverSeenEvent
			];

			sinon
				.stub(DripsSubgraphClient.prototype, 'query')
				.onFirstCall()
				.resolves({ data: { streamReceiverSeenEvents: firstResults } })
				.onSecondCall()
				.resolves({ data: { streamReceiverSeenEvents: secondResults } });

			// Act
			const senders = await testSubgraphClient.filterSqueezableSenders(receiverId);

			// Assert
			assert.equal(Object.keys(senders).length, 501);
			assert.isTrue(senders['0'].includes(assetId));
			assert.isTrue(senders['0'].includes('999'));
		});
	});

	describe('getCurrentStreamsReceivers()', () => {
		it('should return the expected result when there are no events', async () => {
			// Arrange
			const accountId = '1';
			const tokenAddress = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6';

			sinon.stub(DripsSubgraphClient.prototype, 'getStreamsSetEventsByAccountId').resolves([]);

			// Act
			const senders = await testSubgraphClient.getCurrentStreamsReceivers(accountId, tokenAddress, providerStub);

			// Assert
			assert.equal(Object.keys(senders).length, 0);
		});

		it('should return the expected result', async () => {
			// Arrange
			const accountId = '1';
			const tokenAddress = '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6';

			const firstResults: StreamsSetEvent[] = new Array(500).fill({}).map(
				(_e, i) =>
					({
						id: i,
						blockTimestamp: i,
						assetId: 'not included',
						streamReceiverSeenEvents: [
							{
								id: i,
								receiverAccountId: i,
								config: i
							}
						]
					} as unknown as StreamsSetEvent)
			);

			const secondResults: StreamsSetEvent[] = [
				{
					id: '502',
					blockTimestamp: 502n,
					assetId: Utils.Asset.getIdFromAddress(tokenAddress),
					receiversHash: '0xab1290d36f461ed68109d46b0d53cd064d194773a2c6dbd0b973f51e526e80d9',
					streamReceiverSeenEvents: [
						{
							id: '502',
							receiverAccountId: '502',
							config: 502n
						}
					]
				} as StreamsSetEvent,
				{
					id: '501',
					blockTimestamp: 501n,
					receiversHash: '0xab1290d36f461ed68109d46b0d53cd064d194773a2c6dbd0b973f51e526e80d9',
					assetId: Utils.Asset.getIdFromAddress(tokenAddress),
					streamReceiverSeenEvents: [
						{
							id: '501',
							receiverAccountId: '501',
							config: 501n
						}
					]
				} as StreamsSetEvent
			];

			sinon
				.stub(DripsSubgraphClient.prototype, 'getStreamsSetEventsByAccountId')
				.onFirstCall()
				.resolves(firstResults)
				.onSecondCall()
				.resolves(secondResults);

			sinon
				.stub(DripsClient, 'hashStreams')
				.onFirstCall()
				.resolves('0xab1290d36f461ed68109d46b0d53cd064d194773a2c6dbd0b973f51e526e80d9')
				.onSecondCall()
				.resolves('0xab1290d36f461ed68109d46b0d53cd064d194773a2c6dbd0b973f51e526e80d9');
			// Act
			const currentReceivers = await testSubgraphClient.getCurrentStreamsReceivers(
				accountId,
				tokenAddress,
				providerStub
			);

			// Assert
			assert.equal(currentReceivers.length, 1);
			assert.equal(currentReceivers[0].accountId, '502');
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
			>(gql.getSplitsConfigByAccountId, {});

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
				await testSubgraphClient.query(gql.getSplitsConfigByAccountId, {});
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
				await testSubgraphClient.query(gql.getSplitsConfigByAccountId, {});
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
