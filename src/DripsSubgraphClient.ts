import type { BigNumberish } from 'ethers';
import { DripsErrors } from './DripsError';
import * as gql from './gql';
import type { Split, DripsConfiguration } from './types';
import utils from './utils';

type UserAssetConfig = {
	id: string;
	assetId: string;
	balance: BigNumberish;
	amountCollected: BigNumberish;
	dripsEntries: {
		config: BigNumberish;
		receiverUserId: string;
	}[];
	lastUpdatedBlockTimestamp: string;
};

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
	public async getAllDripsConfigurations(userId: string): Promise<DripsConfiguration[] | null> {
		type ApiResponse = {
			user: {
				assetConfigs: UserAssetConfig[];
			};
		};

		const response = await this.query<ApiResponse>(gql.getAllUserAssetConfigs, { userId });

		const assetConfigs = response?.data?.user?.assetConfigs;

		if (assetConfigs) {
			return utils.mappers.mapUserAssetConfigToDtos(assetConfigs);
		}

		return null;
	}

	/**
	 * Returns the user's drips configuration for the specified asset ID.
	 * @param  {string} assetId The asset ID.
	 * @param  {string} erc20TokenAddress The ERC20 token address.
	 * @returns A Promise which resolves to the user's drips configuration.
	 */
	public async getDripsConfiguration(userId: string, assetId: string): Promise<DripsConfiguration | null> {
		type ApiResponse = {
			userAssetConfig: UserAssetConfig;
		};

		const response = await this.query<ApiResponse>(gql.getUserAssetConfigById, {
			configId: utils.constructUserAssetConfigId(userId, assetId)
		});

		const userAssetConfig = response?.data?.userAssetConfig;

		if (userAssetConfig) {
			return utils.mappers.mapUserAssetConfigToDto(userAssetConfig);
		}

		return null;
	}

	/**
	 * Returns the user's splits configuration.
	 * @param  {string} userId The user ID.
	 * @returns A Promise which resolves to the user's splits configuration.
	 */
	public async getSplitsConfiguration(userId: string): Promise<Split[]> {
		type ApiResponse = {
			user: {
				splitsEntries: Split[];
			};
		};

		const response = await this.query<ApiResponse>(gql.getSplitEntries, { userId });

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
