import { assert } from 'chai';
import * as sinon from 'sinon';
import DripsSubgraphClient from '../../src/DripsSubgraph/DripsSubgraphClient';
import RepoDriverQueries from '../../src/DripsSubgraph/RepoDriverQueries';
import { Forge } from '../../src/common/types';
import { DripsErrorCode } from '../../src/common/DripsError';
import * as gql from '../../src/DripsSubgraph/gql';
import type { RepoAccountStatus } from '../../src/DripsSubgraph/types';

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
				.withArgs(
					gql.repoDriverQueries.getRepoAccountByNameAndForge,
					{
						name: expectedAccount.name,
						forge
					},
					API_URL
				)
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
				.withArgs(gql.repoDriverQueries.getRepoAccountByNameAndForge, { name, forge }, API_URL)
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
				.withArgs(
					gql.repoDriverQueries.getRepoAccountByNameAndForge,
					{
						name: expectedAccount.name,
						forge
					},
					API_URL
				)
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
			assert.equal(result!.accountId, expectedAccount.id);
			assert.equal(result!.name, expectedAccount.name);
			assert.equal(result!.forge, expectedAccount.forge);
			assert.equal(result!.ownerAddress, expectedAccount.ownerAddress);
			assert.equal(result!.status, expectedAccount.status as RepoAccountStatus);
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
			const accountId = '0x12345';

			queryExecutorStub.withArgs(gql.repoDriverQueries.getRepoAccountById, { accountId }).resolves({
				data: {
					repoAccounts: []
				}
			});

			// Act
			const result = await sut.getRepoAccountById(accountId);

			// Assert
			assert.isNull(result);
		});

		it('should return the expected repo account when repo exist', async () => {
			// Arrange
			const accountId = '0x12345';
			const forge = Forge.GitHub;

			const expectedAccount = {
				id: accountId,
				name: 'name',
				forge: BigInt(forge),
				status: 'CLAIMED',
				ownerAddress: 'ownerAddress',
				lastUpdatedBlockTimestamp: 1n
			};

			queryExecutorStub
				.withArgs(
					gql.repoDriverQueries.getRepoAccountById,
					{
						accountId
					},
					API_URL
				)
				.resolves({
					data: {
						repoAccount: expectedAccount
					}
				});

			// Act
			const result = await sut.getRepoAccountById(expectedAccount.id);

			// Assert
			assert.equal(result!.accountId, expectedAccount.id);
			assert.equal(result!.name, expectedAccount.name);
			assert.equal(result!.forge, expectedAccount.forge);
			assert.equal(result!.ownerAddress, expectedAccount.ownerAddress);
			assert.equal(result!.status, expectedAccount.status as RepoAccountStatus);
			assert.equal(result!.lastUpdatedBlockTimestamp, expectedAccount.lastUpdatedBlockTimestamp);
		});
	});

	describe('getRepoAccountsOwnedByAddress', () => {
		it('should throw when address is missing', async () => {
			// Arrange
			let threw = false;

			try {
				// Act
				await sut.getRepoAccountsOwnedByAddress(undefined as unknown as string);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return an empty array if there are no owned accounts', async () => {
			// Act
			const res = await sut.getRepoAccountsOwnedByAddress('0x0');
			assert.equal(res.length, 0);
		});

		it('should return the expected repo accounts when they exist', async () => {
			// Arrange
			const ownerAddress = '0x0000000000000000000000000000000000000000';

			const expectedAccounts = [
				{
					id: '0x12345',
					name: 'name1',
					forge: BigInt(Forge.GitHub),
					status: 'CLAIMED',
					ownerAddress,
					lastUpdatedBlockTimestamp: 1n
				},
				{
					id: '0x12346',
					name: 'name2',
					forge: BigInt(Forge.GitHub),
					status: 'CLAIMED',
					ownerAddress,
					lastUpdatedBlockTimestamp: 1n
				}
			];

			queryExecutorStub
				.withArgs(
					gql.repoDriverQueries.getRepoAccountsByOwnerAddress,
					{
						address: ownerAddress
					},
					API_URL
				)
				.resolves({
					data: {
						repoAccounts: expectedAccounts
					}
				});

			// Act
			const result = await sut.getRepoAccountsOwnedByAddress(ownerAddress);

			// Assert
			assert.equal(result[0].accountId, expectedAccounts[0].id);
			assert.equal(result[0].name, expectedAccounts[0].name);
			assert.equal(result[0].forge, expectedAccounts[0].forge);
			assert.equal(result[0].ownerAddress, expectedAccounts[0].ownerAddress);
			assert.equal(result[0].status, expectedAccounts[0].status as RepoAccountStatus);
			assert.equal(result[0].lastUpdatedBlockTimestamp, expectedAccounts[0].lastUpdatedBlockTimestamp);

			assert.equal(result[1].accountId, expectedAccounts[1].id);
			assert.equal(result[1].name, expectedAccounts[1].name);
			assert.equal(result[1].forge, expectedAccounts[1].forge);
			assert.equal(result[1].ownerAddress, expectedAccounts[1].ownerAddress);
			assert.equal(result[1].status, expectedAccounts[1].status as RepoAccountStatus);
			assert.equal(result[1].lastUpdatedBlockTimestamp, expectedAccounts[1].lastUpdatedBlockTimestamp);
		});
	});
});
