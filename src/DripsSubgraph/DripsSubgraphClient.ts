import type { SupportedChain } from 'src/common/types';
import Utils from '../utils';
import { nameOf } from '../common/internals';
import { DripsErrors } from '../common/DripsError';
import * as gql from './gql';
import type { SplitEntry, UserAssetConfig } from './types';

/**
 * A client for querying the Drips Subgraph.
 */
export default class DripsSubgraphClient {
	#apiUrl!: string;
	/** Returns the `DripsSubgraphClient`'s API URL. */
	public get apiUrl() {
		return this.#apiUrl;
	}

	private constructor() {}

	/**
	 * Creates a new immutable `DripsSubgraphClient` instance.
	 *
	 * @param  {string} chainId The chain ID.
	 * @throws {@link DripsErrors.argumentError} if the `chainId` is missing.
	 * @throws {DripsErrors.unsupportedNetworkError} if the `chainId` is not supported.
	 * @returns The new `DripsSubgraphClient` instance.
	 */
	public static create(chainId: SupportedChain): DripsSubgraphClient {
		if (!chainId) {
			throw DripsErrors.argumentMissingError(
				"Could not create a new 'DripsSubgraphClient' instance: the chain ID is missing.",
				nameOf({ chainId })
			);
		}

		const apiUrl = Utils.Network.chainDripsMetadata[chainId]?.SUBGRAPH_URL;

		if (!apiUrl) {
			throw DripsErrors.unsupportedNetworkError(
				`Could not create a new 'DripsSubgraphClient' instance: chain ID '${chainId}' is not supported.`,
				chainId
			);
		}

		const subgraphClient = new DripsSubgraphClient();

		subgraphClient.#apiUrl = apiUrl;

		return subgraphClient;
	}

	/**
	 * Returns the user's drips configuration for the specified asset.
	 * @param  {string} userId The user ID.
	 * @param  {string} assetId The asset ID.
	 * @returns A Promise which resolves to the user's drips configuration.
	 * @throws {DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getUserAssetConfig(userId: string, assetId: string): Promise<UserAssetConfig> {
		type ApiResponse = {
			userAssetConfig: UserAssetConfig;
		};

		const response = await this.query<ApiResponse>(gql.getUserAssetConfig, {
			configId: `${userId}-${assetId}`
		});

		return response?.data?.userAssetConfig;
	}

	/**
	 * Returns all drips configurations for the specified user.
	 * @param  {string} userId The user ID.
	 * @returns A Promise which resolves to the user's drips configurations.
	 * @throws {DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getAllUserAssetConfigs(userId: string): Promise<UserAssetConfig[]> {
		type ApiResponse = {
			user: {
				assetConfigs: UserAssetConfig[];
			};
		};

		const response = await this.query<ApiResponse>(gql.getAllUserAssetConfigs, { userId });

		return response?.data?.user?.assetConfigs || [];
	}

	/**
	 * Returns the user's splits configuration.
	 * @param  {string} userId The user ID.
	 * @returns A Promise which resolves to the user's splits configuration.
	 * @throws {DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getSplitsConfig(userId: string): Promise<SplitEntry[]> {
		type ApiResponse = {
			user: {
				splitsEntries: SplitEntry[];
			};
		};

		const response = await this.query<ApiResponse>(gql.getSplitsConfig, { userId });

		return response?.data?.user?.splitsEntries || [];
	}

	/** @internal */
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

		throw DripsErrors.subgraphQueryError(`Subgraph query failed: ${resp.statusText}`);
	}
}
