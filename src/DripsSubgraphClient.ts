import { validators } from './common';
import { DripsErrors } from './DripsError';
import * as gql from './gql';
import type { SplitEntry, DripsConfiguration } from './types';
import utils from './utils';

/**
 * A client for querying the Drips Subgraph.
 */
export default class DripsSubgraphClient {
	#apiUrl!: string;
	/**
	 * Returns the `DripsSubgraphClient`'s API URL.
	 */
	public get apiUrl() {
		return this.#apiUrl;
	}

	private constructor() {}

	/**
	 * Creates a new immutable `DripsSubgraphClient` instance.
	 *
	 * @param  {string} apiUrl The Subgraph API URL.
	 * @throws {@link DripsErrors.invalidArgument} if the `apiUrl` is missing.
	 * @returns The new `DripsSubgraphClient` instance.
	 */
	public static create(apiUrl: string): DripsSubgraphClient {
		if (!apiUrl) {
			throw DripsErrors.invalidArgument(
				'Cannot create instance: the API URL was missing but is required.',
				'DripsSubgraphClient.create()'
			);
		}

		const subgraphClient = new DripsSubgraphClient();
		subgraphClient.#apiUrl = apiUrl;

		return subgraphClient;
	}

	/**
	 * Returns all drips configurations for the specified user.
	 * @param  {string} userId The user ID.
	 * @returns A Promise which resolves to the user's drips configurations.
	 */
	public async getAllDripsConfigurations(userId: string): Promise<DripsConfiguration[]> {
		type APIResponse = {
			user: {
				assetConfigs: DripsConfiguration[];
			};
		};

		const response = await this.query<APIResponse>(gql.getAllUserAssetConfigs, { userId });

		const assetConfigs = response?.data?.user?.assetConfigs?.map((config) => ({
			...config,
			tokenAddress: utils.getTokenAddressFromAssetId(config.assetId)
		}));

		return assetConfigs || [];
	}

	/**
	 * Returns the user's drips configuration for the specified token.
	 * @param  {string} userId The user ID.
	 * @param  {string} erc20TokenAddress The ERC20 token address.
	 * @returns A Promise which resolves to the user's drips configuration.
	 * @throws {@link DripsErrors.invalidAddress} if the `erc20TokenAddress` address is not valid.
	 */
	public async getDripsConfiguration(userId: string, erc20TokenAddress: string): Promise<DripsConfiguration> {
		validators.validateAddress(erc20TokenAddress);

		type APIResponse = {
			userAssetConfig: DripsConfiguration;
		};

		const assetId = utils.getAssetIdFromAddress(erc20TokenAddress);

		const response = await this.query<APIResponse>(gql.getUserAssetConfigById, {
			configId: utils.constructUserAssetConfigId(userId, assetId)
		});

		return response?.data?.userAssetConfig;
	}

	/**
	 * Returns the user's splits configuration.
	 * @param  {string} userId The user ID.
	 * @returns A Promise which resolves to the user's splits configuration.
	 */
	public async getSplitsConfiguration(userId: string): Promise<SplitEntry[]> {
		type APIResponse = {
			user: {
				splitsEntries: SplitEntry[];
			};
		};

		const response = await this.query<APIResponse>(gql.getSplitEntries, { userId });

		const splitsEntries = response?.data?.user?.splitsEntries;

		return splitsEntries || [];
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
