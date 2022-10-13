/* eslint-disable no-await-in-loop */
import type { BigNumberish } from 'ethers';
import Utils from '../utils';
import { nameOf } from '../common/internals';
import { DripsErrors } from '../common/DripsError';
import * as gql from './gql';
import type {
	DripsSetEvent,
	ApiUserAssetConfig,
	SplitEntry,
	UserAssetConfig,
	ApiSplitEntry,
	ApiDripsSetEvent
} from './types';
import { mapDripsSetEventToDto, mapSplitEntryToDto, mapUserAssetConfigToDto } from './mappers';

/**
 * A client for querying the Drips Subgraph.
 */
export default class DripsSubgraphClient {
	#chainId!: number;
	/** Returns the chain ID the `DripsSubgraphClient` is connected to. */
	public get chainId() {
		return this.#chainId;
	}

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
	 * @throws {DripsErrors.argumentError} if the `chainId` is missing.
	 * @throws {DripsErrors.unsupportedNetworkError} if the `chainId` is not supported.
	 * @returns The new `DripsSubgraphClient` instance.
	 */
	public static create(chainId: number): DripsSubgraphClient {
		if (!chainId) {
			throw DripsErrors.argumentMissingError(
				"Could not create a new 'DripsSubgraphClient' instance: the chain ID is missing.",
				nameOf({ chainId })
			);
		}

		if (!Utils.Network.isSupportedChain(chainId)) {
			throw DripsErrors.unsupportedNetworkError(
				`Could not create a new 'DripsSubgraphClient' instance: chain ID '${chainId}' is not supported.`,
				chainId
			);
		}

		const subgraphClient = new DripsSubgraphClient();

		subgraphClient.#chainId = chainId;
		subgraphClient.#apiUrl = Utils.Network.dripsMetadata[subgraphClient.#chainId].SUBGRAPH_URL;

		return subgraphClient;
	}

	/**
	 * Returns the user's drips configuration for the given asset.
	 * @param  {BigNumberish} userId The user ID.
	 * @param  {BigNumberish} assetId The asset ID.
	 * @returns A `Promise` which resolves to the user's drips configuration, or `null` if the configuration is not found.
	 * @throws {DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getUserAssetConfigById(userId: BigNumberish, assetId: BigNumberish): Promise<UserAssetConfig | null> {
		type ApiResponse = {
			userAssetConfig: ApiUserAssetConfig;
		};

		const response = await this.query<ApiResponse>(gql.getUserAssetConfigById, {
			configId: `${userId}-${assetId}`
		});

		const userAssetConfig = response?.data?.userAssetConfig;

		if (!userAssetConfig) {
			return null;
		}

		return mapUserAssetConfigToDto(userAssetConfig);
	}

	/**
	 * Returns all drips configurations for the given user.
	 * @param  {BigNumberish} userId The user ID.
	 * @returns A `Promise` which resolves to the user's drips configurations.
	 * @throws {DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getAllUserAssetConfigsByUserId(userId: BigNumberish): Promise<UserAssetConfig[]> {
		type ApiResponse = {
			user: {
				assetConfigs: ApiUserAssetConfig[];
			};
		};

		const response = await this.query<ApiResponse>(gql.getAllUserAssetConfigsByUserId, { userId });

		return response?.data?.user?.assetConfigs?.map(mapUserAssetConfigToDto) || [];
	}

	/**
	 * Returns the user's splits configuration.
	 * @param  {BigNumberish} userId The user ID.
	 * @returns A `Promise` which resolves to the user's splits configuration.
	 * @throws {DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getSplitsConfigByUserId(userId: BigNumberish): Promise<SplitEntry[]> {
		type ApiResponse = {
			user: {
				splitsEntries: ApiSplitEntry[];
			};
		};

		const response = await this.query<ApiResponse>(gql.getSplitsConfigByUserId, { userId });

		return response?.data?.user?.splitsEntries?.map(mapSplitEntryToDto) || [];
	}

	/**
	 * Returns the user's `DripsSetEvent`s.
	 * @param  {BigNumberish} userId The user ID.
	 * @returns A `Promise` which resolves to the user's `DripsSetEvent`s.
	 * @throws {DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getDripsSetEventsByUserId(userId: BigNumberish): Promise<DripsSetEvent[]> {
		type ApiResponse = {
			dripsSetEvents: ApiDripsSetEvent[];
		};

		const response = await this.query<ApiResponse>(gql.getDripsSetEventsByUserId, { userId });

		return response?.data?.dripsSetEvents?.map(mapDripsSetEventToDto) || [];
	}

	/** @internal */
	public async query<T = unknown>(query: string, variables: unknown): Promise<{ data: T }> {
		const resp = await fetch(this.apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ query, variables }, (_, value) => (typeof value === 'bigint' ? value.toString() : value))
		});

		if (resp.status >= 200 && resp.status <= 299) {
			return (await resp.json()) as { data: T };
		}

		throw DripsErrors.subgraphQueryError(`Subgraph query failed: ${resp.statusText}`);
	}
}
