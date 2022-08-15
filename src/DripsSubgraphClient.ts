import { DripsErrors } from './DripsError';
import * as gql from './gql';
import type { SplitEntry, UserAssetConfig } from './types';

/**
 * A client for interacting with the Drips Subgraph.
 */
export default class DripsSubgraphClient {
	#apiUrl!: string;
	/**
	 * The Subgraph URL.
	 */
	public get apiUrl() {
		return this.#apiUrl;
	}

	private constructor() {}

	/**
	 * Creates a new `DripsSubgraphClient` instance.
	 *
	 * @param  {string} apiUrl The Subgraph API URL.
	 * @throws {@link DripsErrors.invalidArgument} if the Subgraph API URL has a "falsy" value, or the provider is connected to an unsupported chain.
	 * @returns The new `DripsSubgraphClient` instance.
	 */
	public static create(apiUrl: string): DripsSubgraphClient {
		if (!apiUrl) {
			throw DripsErrors.invalidArgument('Cannot create instance: API URL is missing.');
		}

		const subgraphClient = new DripsSubgraphClient();
		subgraphClient.#apiUrl = apiUrl;

		return subgraphClient;
	}

	public toJsonString(): string {
		// https://stackoverflow.com/questions/40080473/using-json-stringify-in-conjunction-with-typescript-getter-setter

		const obj = {
			apiUrl: this.#apiUrl
		};

		return JSON.stringify(obj);
	}

	/**
	 * Returns all asset configurations for the specified user.
	 * @param  {string} userId The user ID.
	 * @returns A Promise which resolves to the user's asset configurations.
	 * @throws {@link DripsErrors.userNotFound} if the user for the specified user ID does not exist.
	 */
	public async getUserAssetConfigs(userId: string): Promise<UserAssetConfig[]> {
		type APIResponse = {
			user: {
				assetConfigs: UserAssetConfig[];
			};
		};

		const response = await this._query<APIResponse>(gql.getUserAssetConfigs, { userId });

		const user = response.data?.user;
		if (!user) {
			throw DripsErrors.userNotFound(`Subgraph query failed: user with id '${userId}' does not exist.`);
		}

		return user.assetConfigs;
	}

	/**
	 * Returns the user asset configuration for the specified ID.
	 * @param  {string} configId The user asset configuration ID.
	 * @returns A Promise which resolves to the user asset configuration.
	 */
	public async getUserAssetConfigById(configId: string): Promise<UserAssetConfig> {
		type APIResponse = {
			userAssetConfig: UserAssetConfig;
		};

		const response = await this._query<APIResponse>(gql.getUserAssetConfigById, { configId });

		return response?.data?.userAssetConfig;
	}

	/**
	 * Returns all split entries for the specified user.
	 * @param  {string} userId The user ID.
	 * @returns A Promise which resolves to the user's split entries.
	 * @throws {@link DripsErrors.userNotFound} if the user for the specified user ID does not exist.
	 */
	public async getSplitEntries(userId: string): Promise<SplitEntry[]> {
		type APIResponse = {
			user: {
				splitsEntries: SplitEntry[];
			};
		};

		const response = await this._query<APIResponse>(gql.getSplitEntries, { userId });

		const user = response.data?.user;
		if (!user) {
			throw DripsErrors.userNotFound(`Subgraph query failed: user with id '${userId}' does not exist.`);
		}

		return user.splitsEntries;
	}

	private async _query<T = unknown>(query: string, variables: unknown): Promise<{ data: T }> {
		const resp = await fetch(this.apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ query, variables })
		});

		if (resp.status >= 200 && resp.status <= 299) {
			return (await resp.json()) as { data: T };
		}

		throw new Error(`Subgraph query failed: ${resp.statusText}`);
	}
}
