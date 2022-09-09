import { assert } from 'chai';
import { Wallet } from 'ethers';
import * as sinon from 'sinon';
import { DripsErrorCode } from '../../src/common/DripsError';
import DripsSubgraphClient from '../../src/DripsSubgraph/DripsSubgraphClient';
import * as gql from '../../src/DripsSubgraph/gql';
import type { UserAssetConfig, SplitEntry } from '../../src/DripsSubgraph/types';

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
		it('should throw argumentMissingError error when API URL is missing', async () => {
			let threw = false;

			try {
				// Act
				DripsSubgraphClient.create(undefined as unknown as string);
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
			assert.equal(testSubgraphClient.apiUrl, API_URL);
		});
	});

	describe('getDripsConfiguration()', () => {
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
						receiverUserId: '5',
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
			const actualConfig = await testSubgraphClient.getUserAssetConfig(userId, assetId);

			// Assert
			assert.equal(actualConfig, expectedConfig);
			assert(
				queryStub.calledOnceWithExactly(gql.getUserAssetConfigById, sinon.match({ configId })),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getAllDripsConfigurations()', () => {
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
							receiverUserId: '5',
							config: '0x010000000200000003'
						}
					],
					lastUpdatedBlockTimestamp: 6
				}
			];

			const queryStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getAllUserAssetConfigs, { userId })
				.resolves({
					data: {
						user: {
							assetConfigs: expectedAssetConfigs
						}
					}
				});

			// Act
			const actualConfigs = await testSubgraphClient.getAllUserAssetConfigs(userId);

			// Assert
			assert.equal(actualConfigs, expectedAssetConfigs);
			assert(
				queryStub.calledOnceWithExactly(gql.getAllUserAssetConfigs, { userId }),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getSplitsConfiguration()', () => {
		it('should return the expected result', async () => {
			// Arrange
			const userId = '1';
			const splitsEntries: SplitEntry[] = [
				{
					weight: '2',
					receiverUserId: '3'
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
				'Expected method to be called with different arguments'
			);
		});

		it('should return an empty array when splits does not exist', async () => {
			// Arrange
			const userId = '1';
			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getSplitEntries, { userId })
				.resolves({
					data: {
						user: {}
					}
				});

			// Act
			const splits = await testSubgraphClient.getSplitsConfiguration(userId);

			// Assert
			assert.isEmpty(splits);
			assert(
				clientStub.calledOnceWithExactly(gql.getSplitEntries, { userId }),
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
			>(gql.getSplitEntries, {});

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
				await testSubgraphClient.query(gql.getSplitEntries, {});
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.SUBGRAPH_QUERY_FAILED);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});
	});
});
