import { assert } from 'chai';
import * as sinon from 'sinon';
import { BigNumber, Wallet } from 'ethers';
import DripsSubgraphClient from '../src/DripsSubgraphClient';
import * as gql from '../src/gql';
import { DripsErrorCode } from '../src/DripsError';
import type { Split } from '../src/types';
import utils from '../src/utils';
import DripsReceiverConfig from '../src/DripsReceiverConfig';

describe('DripsSubgraphClient', () => {
	const API_URL = 'https://api.graphql';
	let testSubgraphClient: DripsSubgraphClient;

	// Acts also as the "base Arrange step".
	beforeEach(() => {
		testSubgraphClient = DripsSubgraphClient.create(API_URL);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('create()', () => {
		it('should throw invalidArgument error when API URL is missing', async () => {
			let threw = false;

			try {
				// Act
				// eslint-disable-next-line no-new
				DripsSubgraphClient.create(undefined as unknown as string);
			} catch (error) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it('should create a fully initialized client instance', () => {
			// Assert
			assert.equal(testSubgraphClient.apiUrl, API_URL);
		});
	});

	describe('getAllDripsConfigurations()', () => {
		it('should return empty array when user does not exist', async () => {
			// Arrange
			const userId = '12342';

			sinon.stub(testSubgraphClient, 'query').withArgs(gql.getAllUserAssetConfigs, { userId }).resolves({
				data: {}
			});

			// Act
			const configs = await testSubgraphClient.getAllDripsConfigurations(userId);

			// Assert
			assert.isEmpty(configs);
		});

		it('should return the expected drips configurations', async () => {
			// Arrange
			const userId = '12342';
			const assetConfigs = [
				{
					id: '1',
					assetId: utils.getAssetIdFromAddress('0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'),
					dripsEntries: [
						{
							id: 1,
							config: new DripsReceiverConfig(1, 1, 1).asUint256
						}
					]
				}
			];

			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getAllUserAssetConfigs, { userId })
				.resolves({
					data: {
						user: {
							assetConfigs
						}
					}
				});

			// Act
			const configs = await testSubgraphClient.getAllDripsConfigurations(userId);

			// Assert
			assert.isTrue(configs.length === 1);
			assert.isTrue(BigNumber.from(configs[0].id).eq(assetConfigs[0].id));
			assert.isTrue(
				BigNumber.from(configs[0].tokenAddress).eq(utils.getTokenAddressFromAssetId(assetConfigs[0].assetId))
			);
			assert(
				clientStub.calledOnceWithExactly(gql.getAllUserAssetConfigs, { userId }),
				`Expected query() method to be called with different arguments`
			);
		});
	});

	describe('getDripsConfiguration()', () => {
		it('should return the expected drips configuration', async () => {
			// Arrange
			const userId = '12342';
			const tokenAddress = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984';
			const assetId = utils.getAssetIdFromAddress(tokenAddress);
			const configId = utils.constructUserAssetConfigId(userId, assetId);
			const userAssetConfig = {
				id: '1',
				assetId,
				tokenAddress,
				dripsEntries: [
					{
						id: 1,
						config: new DripsReceiverConfig(1, 1, 1).asUint256
					}
				]
			};
			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getUserAssetConfigById, { configId })
				.resolves({
					data: {
						userAssetConfig
					}
				});

			// Act
			const config = await testSubgraphClient.getDripsConfiguration(userId, tokenAddress);

			// Assert
			assert.isTrue(BigNumber.from(config!.id).eq(userAssetConfig.id));
			assert.isTrue(BigNumber.from(config!.tokenAddress).eq(utils.getTokenAddressFromAssetId(userAssetConfig.assetId)));
			assert(
				clientStub.calledOnceWithExactly(gql.getUserAssetConfigById, sinon.match({ configId })),
				`Expected query() method to be called with different arguments`
			);
		});
	});

	it('should return null when user asset config is not found', async () => {
		// Arrange
		const userId = '12342';
		const tokenAddress = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984';
		const assetId = utils.getAssetIdFromAddress(tokenAddress);
		const configId = utils.constructUserAssetConfigId(userId, assetId);

		sinon
			.stub(testSubgraphClient, 'query')
			.withArgs(gql.getUserAssetConfigById, { configId })
			.resolves({
				data: {
					userAssetConfig: null
				}
			});

		// Act
		const config = await testSubgraphClient.getDripsConfiguration(userId, tokenAddress);

		// Assert
		assert.isNull(config);
	});

	describe('_mapDripEntries()', () => {
		it('should throw error when config received from subgraph and mapped config values do not match', async () => {
			// Arrange
			const userId = '12342';
			const tokenAddress = '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984';
			const assetId = utils.getAssetIdFromAddress(tokenAddress);
			const configId = utils.constructUserAssetConfigId(userId, assetId);
			const userAssetConfig = {
				id: '1',
				assetId,
				tokenAddress,
				dripsEntries: [
					{
						id: 1,
						config: new DripsReceiverConfig(1, 1, 1).asUint256
					}
				]
			};
			sinon.stub(testSubgraphClient, 'query').withArgs(gql.getUserAssetConfigById, { configId }).resolves({
				data: {
					userAssetConfig
				}
			});

			sinon.stub(DripsReceiverConfig, 'fromUint256').returns(new DripsReceiverConfig(2, 2, 2));

			// Act
			try {
				await testSubgraphClient.getDripsConfiguration(userId, tokenAddress);
			} catch (error) {
				// Assert
				assert.equal(error.message, 'Cannot map results from subgraph query: configs do not match.');
			}
		});
	});

	describe('getSplitsConfiguration()', () => {
		it('should return empty array when user does not exist', async () => {
			// Arrange
			const userId = '12342';

			sinon.stub(testSubgraphClient, 'query').withArgs(gql.getSplitEntries, { userId }).resolves({
				data: {}
			});

			// Act
			const splits = await testSubgraphClient.getSplitsConfiguration(userId);

			// Assert
			assert.isEmpty(splits);
		});

		it('should return the expected split entries', async () => {
			// Arrange
			const userId = '12342';
			const splitsEntries: Split[] = [
				{
					weight: '1',
					receiverUserId: '1'
				}
			];
			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getSplitEntries, { userId })
				.resolves({
					data: {
						user: {
							splitsEntries
						}
					}
				});

			// Act
			const splits = await testSubgraphClient.getSplitsConfiguration(userId);

			// Assert
			assert.equal(splits, splitsEntries);
			assert(
				clientStub.calledOnceWithExactly(gql.getSplitEntries, { userId }),
				`Expected query() method to be called with different arguments`
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
			>(gql.getSplitEntries, {});

			// Assert
			assert.equal(response.data, apiResponse);
		});

		it('should throw if API response status code is not >= 200 and <= 299', async () => {
			// Arrange
			global.fetch = sinon.stub(
				async (): Promise<Response> => ({ status: 500, statusText: 'Internal Server Error' } as Response)
			);

			try {
				// Act
				await testSubgraphClient.query(gql.getSplitEntries, {});
			} catch (error) {
				// Assert
				assert.include(error.message, 'Subgraph query failed');
			}
		});
	});
});
