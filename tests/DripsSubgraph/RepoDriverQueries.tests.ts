import { assert } from 'chai';
import * as sinon from 'sinon';
import DripsSubgraphClient from '../../src/DripsSubgraph/DripsSubgraphClient';
import RepoDriverQueries from '../../src/DripsSubgraph/RepoDriverQueries';
import { Forge } from '../../src/common/types';
import { DripsErrorCode } from '../../src/common/DripsError';
import * as gql from '../../src/DripsSubgraph/gql';

describe('RepoDriverQueries', () => {
	const API_URL = 'http://localhost:8000';
	let sut: RepoDriverQueries;
	let queryExecutorStub: sinon.SinonStub;

	beforeEach(() => {
		queryExecutorStub = sinon.stub(DripsSubgraphClient.prototype, 'query');
		sut = RepoDriverQueries.create(API_URL, queryExecutorStub);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('getRepoAccountByNameAndForge', () => {
		it('should throw when name is missing', async () => {
			// Arrange
			let threw = false;

			try {
				// Act
				await sut.getRepoAccountByNameAndForge(undefined as unknown as string, Forge.GitHub);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw when forge is missing', async () => {
			// Arrange
			let threw = false;

			try {
				// Act
				await sut.getRepoAccountByNameAndForge('name', undefined as unknown as Forge);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw when multiple accounts found', async () => {
			// Arrange
			let threw = false;

			const forge = Forge.GitHub;

			const expectedAccount = {
				id: 'id',
				name: 'name',
				forge: BigInt(forge),
				status: 'status',
				ownerAddress: 'ownerAddress',
				lastUpdatedBlockTimestamp: 1n
			};

			queryExecutorStub
				.withArgs(API_URL, gql.repoDriverQueries.getRepoAccountByNameAndForge, {
					name: expectedAccount.name,
					forge
				})
				.resolves({
					data: {
						repoAccounts: [expectedAccount, expectedAccount]
					}
				});

			try {
				// Act
				await sut.getRepoAccountByNameAndForge(expectedAccount.name, Number(expectedAccount.forge) as Forge);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.SUBGRAPH_QUERY_ERROR);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return null when repo does not exist', async () => {
			// Arrange
			const name = 'name';
			const forge = Forge.GitHub;

			queryExecutorStub
				.withArgs(API_URL, gql.repoDriverQueries.getRepoAccountByNameAndForge, { name, forge })
				.resolves({
					data: {
						repoAccounts: []
					}
				});

			// Act
			const result = await sut.getRepoAccountByNameAndForge(name, forge);

			// Assert
			assert.isNull(result);
		});

		it('should return the expected repo account when repo exist', async () => {
			// Arrange
			const forge = Forge.GitHub;

			const expectedAccount = {
				id: 'id',
				name: 'name',
				forge: BigInt(forge),
				status: 'status',
				ownerAddress: 'ownerAddress',
				lastUpdatedBlockTimestamp: 1n
			};

			queryExecutorStub
				.withArgs(API_URL, gql.repoDriverQueries.getRepoAccountByNameAndForge, {
					name: expectedAccount.name,
					forge
				})
				.resolves({
					data: {
						repoAccounts: [expectedAccount]
					}
				});

			// Act
			const result = await sut.getRepoAccountByNameAndForge(
				expectedAccount.name,
				Number(expectedAccount.forge) as Forge
			);

			// Assert
			assert.equal(result!.userId, expectedAccount.id);
			assert.equal(result!.name, expectedAccount.name);
			assert.equal(result!.forge, expectedAccount.forge);
			assert.equal(result!.status, expectedAccount.status);
			assert.equal(result!.ownerAddress, expectedAccount.ownerAddress);
			assert.equal(result!.lastUpdatedBlockTimestamp, expectedAccount.lastUpdatedBlockTimestamp);
		});
	});

	describe('getRepoAccountById', () => {
		it('should throw when repo ID is missing', async () => {
			// Arrange
			let threw = false;

			try {
				// Act
				await sut.getRepoAccountById(undefined as unknown as string);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return null when repo does not exist', async () => {
			// Arrange
			const userId = '0x12345';

			queryExecutorStub.withArgs(API_URL, gql.repoDriverQueries.getRepoAccountById, { userId }).resolves({
				data: {
					repoAccounts: []
				}
			});

			// Act
			const result = await sut.getRepoAccountById(userId);

			// Assert
			assert.isNull(result);
		});

		it('should return the expected repo account when repo exist', async () => {
			// Arrange
			const userId = '0x12345';
			const forge = Forge.GitHub;

			const expectedAccount = {
				id: userId,
				name: 'name',
				forge: BigInt(forge),
				status: 'status',
				ownerAddress: 'ownerAddress',
				lastUpdatedBlockTimestamp: 1n
			};

			queryExecutorStub
				.withArgs(API_URL, gql.repoDriverQueries.getRepoAccountById, {
					userId
				})
				.resolves({
					data: {
						repoAccount: expectedAccount
					}
				});

			// Act
			const result = await sut.getRepoAccountById(expectedAccount.id);

			// Assert
			assert.equal(result!.userId, expectedAccount.id);
			assert.equal(result!.name, expectedAccount.name);
			assert.equal(result!.forge, expectedAccount.forge);
			assert.equal(result!.status, expectedAccount.status);
			assert.equal(result!.ownerAddress, expectedAccount.ownerAddress);
			assert.equal(result!.lastUpdatedBlockTimestamp, expectedAccount.lastUpdatedBlockTimestamp);
		});
	});
});
