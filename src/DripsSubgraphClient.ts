import { BigNumber } from 'ethers';
import { DripsErrors } from './DripsError';
import * as gql from './gql';
import type { SplitEntry, UserAssetConfig } from './types';

export type Split = {
	sender: string;
	weight: number;
	receiver: string;
};

export type Drip = {
	receiver: string;
	amtPerSec: string;
};

export type DripsConfig = {
	balance?: string;
	receivers?: Drip[];
	timestamp?: string;
	withdrawable?: number;
};

/**
 * A client for interacting with the Drips Subgraph.
 */
export class DripsSubgraphClient {
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

	// public async getDripsBySender(address: string): Promise<DripsConfig> {
	// 	type APIResponse = { dripsConfigs: DripsConfig[] };

	// 	const resp = await this._query<APIResponse>(gql.dripsConfigByID, { id: address });

	// 	return resp.data?.dripsConfigs?.length ? resp.data?.dripsConfigs[0] : ({} as DripsConfig);
	// }

	// public async getDripsByReceiver(receiver: string): Promise<Drip[]> {
	// 	type APIResponse = { dripsEntries: Drip[] };

	// 	const resp = await this._query<APIResponse>(gql.dripsByReceiver, { receiver });

	// 	return resp.data?.dripsEntries;
	// }

	// public getSplitsBySender(sender: string): Promise<Split[]> {
	// 	return this._getSplits(gql.splitsBySender, { sender });
	// }

	// public getSplitsByReceiver(receiver: string): Promise<Split[]> {
	// 	return this._getSplits(gql.splitsByReceiver, { receiver });
	// }

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

	private async _getSplits(query: string, args: { sender: string } | { receiver: string }): Promise<Split[]> {
		type APIResponse = { splitsEntries: Split[] };

		const resp = await this._query<APIResponse>(query, { ...args, first: 100 });

		return resp.data?.splitsEntries || [];
	}

	public static getUserIdFromUserAssetConfigId(configId: string): string {
		// guard against valid config string
		return configId.split('-')[0];
	}

	public static getAssetIdFromFromUserAssetConfigId(configId: string): string {
		// guard against valid config string
		return configId.split('-')[1];
	}

	public static getAssetIdFromAssetAddress(erc20TokenAddress: string): string {
		// guard against valid config string
		// Return the asset ID in base-10, as stored on the contract.
		return BigNumber.from(erc20TokenAddress).toString();
	}

	public static getTokenAddressFromAssetId(assetId: string): string {
		// guard against valid config string
		return BigNumber.from(assetId).toHexString();
	}
}
