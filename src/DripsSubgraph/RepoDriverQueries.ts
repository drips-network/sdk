import type { Forge } from 'src/common/types';
import { isNullOrUndefined } from '../common/internals';
import { DripsErrors } from '../common/DripsError';
import type { RepoAccount } from './types';
import type * as SubgraphTypes from './generated/graphql-types';
import * as gql from './gql';
import { mapRepoAccountToDto } from './mappers';

export default class RepoDriverQueries {
	#apiUrl!: string;
	#queryExecutor!: <T = unknown>(query: string, variables: unknown, apiUrl: string) => Promise<{ data: T }>;

	private constructor() {}

	public static create(
		apiUrl: string,
		queryExecutor: <T = unknown>(query: string, variables: unknown, apiUrl: string) => Promise<{ data: T }>
	) {
		const queries = new RepoDriverQueries();

		queries.#apiUrl = apiUrl;
		queries.#queryExecutor = queryExecutor;

		return queries;
	}

	/**
	 * Returns the `RepoAccount` for the given `name` and `forge`.
	 * @param name The name of the repository.
	 * @param forge The forge of the repository.
	 * @returns The `RepoAccount` for the given `name` and `forge` or `null` if no `RepoAccount` was found.
	 * @throws {@link DripsErrors.argumentError} if `name` or `forge` is missing.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getRepoAccountByNameAndForge(name: string, forge: Forge): Promise<RepoAccount | null> {
		if (!name || isNullOrUndefined(forge)) {
			throw DripsErrors.argumentError(`Could not get repo account: name or forge is missing.`);
		}

		type QueryResponse = {
			repoAccounts: SubgraphTypes.RepoAccount[];
		};

		const response = await this.#queryExecutor<QueryResponse>(
			gql.repoDriverQueries.getRepoAccountByNameAndForge,
			{
				name,
				forge
			},
			this.#apiUrl
		);

		if (!response.data.repoAccounts || response.data.repoAccounts.length === 0) {
			return null;
		}

		if (response.data.repoAccounts.length >= 2) {
			throw DripsErrors.subgraphQueryError(
				`Could not get repo account: more than one repo account found with name ${name} and forge ${forge}. This should never happen.`
			);
		}

		return mapRepoAccountToDto(response.data.repoAccounts[0]);
	}

	/**
	 * Returns the `RepoAccount` for the given `accountId`.
	 * @param accountId The ID of the repository.
	 * @returns The `RepoAccount` for the given `accountId` or `null` if no `RepoAccount` was found.
	 * @throws {@link DripsErrors.argumentError} if `accountId` is missing.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getRepoAccountById(accountId: string) {
		if (!accountId) {
			throw DripsErrors.argumentError(`Could not get repo account: accountId is missing.`);
		}

		type QueryResponse = {
			repoAccount: SubgraphTypes.RepoAccount;
		};

		const response = await this.#queryExecutor<QueryResponse>(
			gql.repoDriverQueries.getRepoAccountById,
			{
				accountId
			},
			this.#apiUrl
		);

		if (!response.data.repoAccount) {
			return null;
		}

		return mapRepoAccountToDto(response.data.repoAccount);
	}

	public async getRepoAccountsOwnedByAddress(address: string) {
		if (!address) {
			throw DripsErrors.argumentError('Unable to get repo accounts: no address provided');
		}

		type QueryResponse = {
			repoAccounts: SubgraphTypes.RepoAccount[];
		};

		const response = await this.#queryExecutor<QueryResponse>(
			gql.repoDriverQueries.getRepoAccountsByOwnerAddress,
			{
				address
			},
			this.#apiUrl
		);

		if (!response?.data?.repoAccounts) {
			return [];
		}

		return response.data.repoAccounts.map((ra) => mapRepoAccountToDto(ra));
	}
}
