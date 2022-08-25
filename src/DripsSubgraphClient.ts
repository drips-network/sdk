import { DripsErrors } from './DripsError';
import * as gql from './gql';
import type { SplitEntry, UserAssetConfig } from './types';
import utils from './utils';

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
			throw DripsErrors.invalidArgument(
				'Cannot create instance: the API URL is missing.',
				'DripsSubgraphClient.create()'
			);
		}

		const subgraphClient = new DripsSubgraphClient();
		subgraphClient.#apiUrl = apiUrl;

		return subgraphClient;
	}

	/**
	 * Returns all asset configurations for the specified user.
	 * @param  {string} userId The user ID.
	 * @returns A Promise which resolves to the user's asset configurations.
	 */
	public async getAllUserAssetConfigs(userId: string): Promise<UserAssetConfig[]> {
		type APIResponse = {
			user: {
				assetConfigs: UserAssetConfig[];
			};
		};

		const response = await this.query<APIResponse>(gql.getAllUserAssetConfigs, { userId });

		const user = response.data?.user;

		return user?.assetConfigs || [];
	}

	/**
	 * Returns the user's drips configuration for the specified asset.
	 * @param  {string} userId The user ID.
	 * @param  {string} assetId The asset ID.
	 * @returns A Promise which resolves to the user asset configuration.
	 */
	public async getUserAssetConfig(userId: string, assetId: string): Promise<UserAssetConfig> {
		type APIResponse = {
			userAssetConfig: UserAssetConfig;
		};

		const response = await this.query<APIResponse>(gql.getUserAssetConfigById, {
			configId: utils.constructUserAssetConfigId(userId, assetId)
		});

		return response?.data?.userAssetConfig;
	}

	/**
	 * Returns all split entries for the specified user.
	 * @param  {string} userId The user ID.
	 * @returns A Promise which resolves to the user's split entries.
	 */
	public async getSplitEntries(userId: string): Promise<SplitEntry[]> {
		type APIResponse = {
			user: {
				splitsEntries: SplitEntry[];
			};
		};

		const response = await this.query<APIResponse>(gql.getSplitEntries, { userId });

		const user = response.data?.user;

		return user?.splitsEntries || [];
	}

	public async query<T = unknown>(query: string, variables: unknown): Promise<{ data: T }> {
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
