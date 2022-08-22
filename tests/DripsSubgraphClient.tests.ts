import { assert } from 'chai';
import * as sinon from 'sinon';
import { Wallet } from 'ethers';
import DripsSubgraphClient from '../src/DripsSubgraphClient';
import * as gql from '../src/gql';
import { DripsErrorCode } from '../src/DripsError';
import type { SplitEntry, UserAssetConfig } from '../src/types';

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
				// Act.
				// eslint-disable-next-line no-new
				DripsSubgraphClient.create(undefined as unknown as string);
			} catch (error) {
				// Assert.
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert.
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it('should create a fully initialized client instance', () => {
			// Assert.
			assert.equal(testSubgraphClient.apiUrl, API_URL);
		});
	});

	describe('getUserAssetConfigs', () => {
		it('should throw userNotFound error when user does not exist', async () => {
			// Arrange.
			const userId = '12342';

			sinon.stub(testSubgraphClient, 'query').withArgs(gql.getUserAssetConfigs, { userId }).resolves({
				data: {}
			});

			let threw = false;

			// Act.
			try {
				await testSubgraphClient.getUserAssetConfigs(userId);
			} catch (error) {
				// Assert.
				assert.equal(error.code, DripsErrorCode.USER_NOT_FOUND);
				threw = true;
			}

			// Assert.
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it('should return the expected user asset configs', async () => {
			// Arrange.
			const userId = '12342';
			const assetConfigs: UserAssetConfig[] = [
				{
					id: '1'
				} as UserAssetConfig
			];

			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getUserAssetConfigs, { userId })
				.resolves({
					data: {
						user: {
							assetConfigs
						}
					}
				});

			// Act.
			const configs = await testSubgraphClient.getUserAssetConfigs(userId);

			// Assert.
			assert.equal(configs, assetConfigs);
			assert(
				clientStub.calledOnceWithExactly(gql.getUserAssetConfigs, { userId }),
				`Expected query() method to be called with different arguments`
			);
		});
	});

	describe('getUserAssetConfigById', () => {
		it('should return the expected user asset config', async () => {
			// Arrange.
			const configId = '12342';
			const userAssetConfig: UserAssetConfig = {
				id: '1'
			} as UserAssetConfig;
			const clientStub = sinon
				.stub(testSubgraphClient, 'query')
				.withArgs(gql.getUserAssetConfigById, { configId })
				.resolves({
					data: {
						userAssetConfig
					}
				});

			// Act.
			const config = await testSubgraphClient.getUserAssetConfigById(configId);

			// Assert.
			assert.equal(config, userAssetConfig);
			assert(
				clientStub.calledOnceWithExactly(gql.getUserAssetConfigById, { configId }),
				`Expected query() method to be called with different arguments`
			);
		});
	});

	describe('getSplitEntries', () => {
		it('should throw userNotFound error when user does not exist', async () => {
			// Arrange.
			const userId = '12342';

			sinon.stub(testSubgraphClient, 'query').withArgs(gql.getSplitEntries, { userId }).resolves({
				data: {}
			});

			let threw = false;

			// Act.
			try {
				await testSubgraphClient.getSplitEntries(userId);
			} catch (error) {
				// Assert.
				assert.equal(error.code, DripsErrorCode.USER_NOT_FOUND);
				threw = true;
			}

			// Assert.
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it('should return the expected split entries', async () => {
			// Arrange.
			const userId = '12342';
			const splitsEntries: SplitEntry[] = [
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

			// Act.
			const splits = await testSubgraphClient.getSplitEntries(userId);

			// Assert.
			assert.equal(splits, splitsEntries);
			assert(
				clientStub.calledOnceWithExactly(gql.getSplitEntries, { userId }),
				`Expected query() method to be called with different arguments`
			);
		});
	});

	describe('query()', async () => {
		it('should return expected response', async () => {
			// Arrange.
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

			// Act.
			const response = await testSubgraphClient.query<
				{
					amtPerSec: string;
					receiver: string;
				}[]
			>(gql.getSplitEntries, {});

			// Assert.
			assert.equal(response.data, apiResponse);
		});

		it('should throw if API response status code is not >= 200 and <= 299', async () => {
			// Arrange.
			global.fetch = sinon.stub(
				async (): Promise<Response> => ({ status: 500, statusText: 'Internal Server Error' } as Response)
			);

			try {
				// Act.
				await testSubgraphClient.query(gql.getSplitEntries, {});
			} catch (error) {
				// Assert
				assert.include(error.message, 'Subgraph query failed');
			}
		});
	});
});
