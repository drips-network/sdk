import { assert } from 'chai';
import { BigNumber, Wallet } from 'ethers';
import * as sinon from 'sinon';
import { DripsErrorCode } from '../../src/common/DripsError';
import DripsSubgraphClient from '../../src/DripsSubgraph/DripsSubgraphClient';
import * as gql from '../../src/DripsSubgraph/gql';
import type {
	UserAssetConfig,
	ApiUserAssetConfig,
	ApiSplitsEntry,
	ApiDripsSetEvent,
	SplitsEntry,
	DripsSetEvent,
	ApiDripsReceiverSeenEvent,
	DripsReceiverSeenEvent,
	ApiUserMetadataEvent,
	ApiNftSubAccount
} from '../../src/DripsSubgraph/types';
import Utils from '../../src/utils';
import * as mappers from '../../src/DripsSubgraph/mappers';
import * as internals from '../../src/common/internals';

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

			const apiConfig: ApiUserAssetConfig = {
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
			};

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

			const apiConfig: ApiUserAssetConfig = {
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
			};

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

			const apiConfigs: ApiUserAssetConfig[] = [
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
				}
			];

			const queryStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getAllUserAssetConfigsByUserId, { userId })
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
				queryStub.calledOnceWithExactly(gql.getAllUserAssetConfigsByUserId, { userId }),
				'Expected method to be called with different arguments'
			);
			assert(
				mapperStub.calledOnceWith(sinon.match((c: ApiUserAssetConfig) => c.id === apiConfigs[0].id)),
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
		it('should throw argumentMissingError error when asset ID is missing', async () => {
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
			const splitsEntries: ApiSplitsEntry[] = [
				{
					id: '1',
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
			const dripsSetEvents: ApiDripsSetEvent[] = [
				{
					userId: '1'
				} as ApiDripsSetEvent
			];
			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getDripsSetEventsByUserId, { userId })
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
			const dripsReceiverSeenEvents: ApiDripsReceiverSeenEvent[] = [
				{
					receiverUserId: '1',
					dripsSetEvent: {} as ApiDripsSetEvent
				} as unknown as ApiDripsReceiverSeenEvent
			];
			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getDripsReceiverSeenEventsByReceiverId, { receiverUserId })
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
					}
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

	describe('getUserMetadataByUserId()', () => {
		it('should throw argumentMissingError error when asset ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getUserMetadataByUserId(undefined as unknown as string);
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
			const userId = '1';

			sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getUserMetadataByUserId, { userId })
				.resolves({
					data: {
						userMetadataEvent: null
					}
				});

			// Act
			const metadata = await testSubgraphClient.getUserMetadataByUserId(userId);

			// Assert
			assert.isNull(metadata);
		});

		it('should return the expected result', async () => {
			// Arrange
			const userId = '1';
			const userMetadataEvent: ApiUserMetadataEvent = {
				id: '1',
				key: '2',
				value: '3',
				lastUpdatedBlockTimestamp: '4'
			};

			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getUserMetadataByUserId, { userId })
				.resolves({
					data: {
						userMetadataEvent
					}
				});

			// Act
			const metadata = await testSubgraphClient.getUserMetadataByUserId(userId);

			// Assert
			assert.equal(metadata!.key.toString(), userMetadataEvent.key);
			assert.equal(metadata!.userId, userMetadataEvent.id);
			assert.equal(metadata!.value, userMetadataEvent.value);
			assert.equal(metadata!.lastUpdatedBlockTimestamp.toString(), userMetadataEvent.lastUpdatedBlockTimestamp);
			assert(
				clientStub.calledOnceWithExactly(gql.getUserMetadataByUserId, { userId }),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getUserMetadataByKey()', () => {
		it('should throw argumentMissingError error when asset ID is missing', async () => {
			let threw = false;

			try {
				// Act
				await testSubgraphClient.getUserMetadataByKey(undefined as unknown as string);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return empty array when no metadata found', async () => {
			// Arrange
			const key = '1';

			sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getUserMetadataByKey, { key })
				.resolves({
					data: {
						userMetadataEvents: null
					}
				});

			// Act
			const metadata = await testSubgraphClient.getUserMetadataByKey(key);

			// Assert
			assert.isEmpty(metadata);
		});

		it('should return the expected result', async () => {
			// Arrange
			const key = '1';
			const userMetadataEvents: ApiUserMetadataEvent[] = [
				{
					id: '1',
					key: '2',
					value: '3',
					lastUpdatedBlockTimestamp: '4'
				}
			];

			const clientStub = sinon.stub(testSubgraphClient, 'query').withArgs(gql.getUserMetadataByKey, { key }).resolves({
				data: {
					userMetadataEvents
				}
			});

			// Act
			const metadata = await testSubgraphClient.getUserMetadataByKey(key);

			// Assert
			assert.equal(metadata![0].key.toString(), userMetadataEvents[0].key);
			assert.equal(metadata![0].userId, userMetadataEvents[0].id);
			assert.equal(metadata![0].value, userMetadataEvents[0].value);
			assert.equal(metadata![0].lastUpdatedBlockTimestamp.toString(), userMetadataEvents[0].lastUpdatedBlockTimestamp);
			assert(
				clientStub.calledOnceWithExactly(gql.getUserMetadataByKey, { key }),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getNftSubAccountsByOwner()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const ownerAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(internals, 'validateAddress');

			sinon.stub(testSubgraphClient, 'query').withArgs(gql.getUserMetadataByKey, { ownerAddress });

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
			const nftsubAccounts: ApiNftSubAccount[] = [
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
					}
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
