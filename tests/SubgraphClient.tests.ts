import { assert } from 'chai';
import * as sinon from 'sinon';
import { Wallet } from 'ethers';
import { SubgraphClient } from '../src/SubgraphClient';
import * as gql from '../src/gql';
import { DripsErrorCode } from '../src/dripsErrors';

describe('SubgraphClient', () => {
	const API_URL = 'https://api.graphql';
	let subgraphClient: SubgraphClient;

	// Base "Arrange" step.
	beforeEach(() => {
		subgraphClient = SubgraphClient.create(API_URL);
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
				SubgraphClient.create(undefined as unknown as string);
			} catch (error) {
				// Assert.
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert.
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it('should set the API URL', () => {
			// Assert.
			assert.equal(subgraphClient.apiUrl, API_URL);
		});
	});

	describe('getDripsBySender()', async () => {
		it('should return expected Drips Config when Drips Configs exist', async () => {
			// Arrange.
			const { address } = Wallet.createRandom();
			const apiResponse = {
				dripsConfigs: [
					{
						withdrawable: 1,
						balance: 'balance',
						timestamp: new Date().toISOString(),
						receivers: [
							{
								amtPerSec: '1',
								receiver: Wallet.createRandom().address
							}
						]
					}
				]
			};

			const clientStub = sinon
				.stub(subgraphClient, 'query')
				.withArgs(gql.dripsConfigByID, { id: address })
				.resolves({ data: apiResponse });

			// Act.
			const dripsConfig = await subgraphClient.getDripsBySender(address);

			// Assert.
			assert.equal(dripsConfig, apiResponse.dripsConfigs[0]);
			assert(
				clientStub.calledOnceWithExactly(gql.dripsConfigByID, {
					id: address
				}),
				`Expected query() method to be called with different arguments`
			);
		});

		it('should return empty object when Drips Configs does not exist', async () => {
			// Arrange.
			const sender = Wallet.createRandom().address;
			const apiResponse = { data: { dripsConfigs: [] } };

			sinon.stub(subgraphClient, 'query').withArgs(gql.dripsConfigByID, { id: sender }).resolves({ data: apiResponse });

			// Act.
			const dripsConfig = await subgraphClient.getDripsBySender(sender);

			// Assert.
			assert.deepEqual(dripsConfig, {});
		});
	});

	describe('getDripsByReceiver()', async () => {
		it('should return expected Drips', async () => {
			// Arrange.
			const receiver = Wallet.createRandom().address;
			const apiResponse = {
				dripsEntries: [
					{
						amtPerSec: '1',
						receiver: Wallet.createRandom().address
					}
				]
			};

			const clientStub = sinon
				.stub(subgraphClient, 'query')
				.withArgs(gql.dripsByReceiver, { receiver })
				.resolves({ data: apiResponse });

			// Act.
			const drips = await subgraphClient.getDripsByReceiver(receiver);

			// Assert.
			assert.equal(drips, apiResponse.dripsEntries);
			assert(
				clientStub.calledOnceWithExactly(gql.dripsByReceiver, {
					receiver
				}),
				`Expected query() method to be called with different arguments`
			);
		});
	});

	describe('getSplitsBySender()', () => {
		it('should return expected Splits', async () => {
			// Arrange.
			const sender = Wallet.createRandom().address;
			const apiResponse = {
				splitsEntries: [
					{
						sender,
						receiver: Wallet.createRandom().address,
						weight: 1
					}
				]
			};

			const clientStub = sinon
				.stub(subgraphClient, 'query')
				.withArgs(gql.splitsBySender, { sender, first: 100 })
				.resolves({ data: apiResponse });

			// Act.
			const splits = await subgraphClient.getSplitsBySender(sender);

			// Assert.
			assert.equal(splits, apiResponse.splitsEntries);
			assert(
				clientStub.calledOnceWithExactly(gql.splitsBySender, {
					sender,
					first: 100
				}),
				`Expected query() method to be called with different arguments`
			);
		});

		it('should return empty array when splits do not exist', async () => {
			// Arrange.
			const sender = Wallet.createRandom().address;

			const clientStub = sinon
				.stub(subgraphClient, 'query')
				.withArgs(gql.splitsBySender, { sender, first: 100 })
				.resolves({ data: null });

			// Act.
			const splits = await subgraphClient.getSplitsBySender(sender);

			// Assert.
			assert.deepEqual(splits, []);
			assert(
				clientStub.calledOnceWithExactly(gql.splitsBySender, {
					sender,
					first: 100
				}),
				`Expected query() method to be called with different arguments`
			);
		});
	});

	describe('getSplitsByReceiver()', () => {
		it('should return expected Splits', async () => {
			// Arrange.
			const receiver = Wallet.createRandom().address;
			const apiResponse = {
				splitsEntries: [
					{
						receiver,
						sender: Wallet.createRandom().address,
						weight: 1
					}
				]
			};

			const clientStub = sinon
				.stub(subgraphClient, 'query')
				.withArgs(gql.splitsByReceiver, { receiver, first: 100 })
				.resolves({ data: apiResponse });

			// Act.
			const splits = await subgraphClient.getSplitsByReceiver(receiver);

			// Assert.
			assert.equal(splits, apiResponse.splitsEntries);
			assert(
				clientStub.calledOnceWithExactly(gql.splitsByReceiver, {
					receiver,
					first: 100
				}),
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
			const response = await subgraphClient.query<
				{
					amtPerSec: string;
					receiver: string;
				}[]
			>(gql.dripsByReceiver, {});

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
				await subgraphClient.query(gql.dripsByReceiver, {});
			} catch (error) {
				// Assert
				assert.equal(error.code, DripsErrorCode.SUBGRAPH_QUERY_FAILED);
			}
		});
	});
});
