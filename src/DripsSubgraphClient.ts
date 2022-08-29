import type { BigNumberish } from 'ethers';
import { BigNumber } from 'ethers';
import { validators } from './common';
import { DripsErrors } from './DripsError';
import DripsReceiverConfig from './DripsReceiverConfig';
import * as gql from './gql';
import type { SplitEntry, DripsConfiguration, DripsEntry } from './types';
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
		type ApiResponse = {
			user: {
				assetConfigs: {
					id: string;
					assetId: string;
					tokenAddress: string;
					balance: BigNumberish;
					sender: { id: string };
					amountCollected: BigNumberish;
					dripsEntries: {
						id: string;
						config: BigNumberish;
						receiverUserId: string;
					}[];
					lastUpdatedBlockTimestamp: string;
				}[];
			};
		};

		const response = await this.query<ApiResponse>(gql.getAllUserAssetConfigs, { userId });

		const assetConfigs = response?.data?.user?.assetConfigs?.map((config) => ({
			...config,
			tokenAddress: utils.getTokenAddressFromAssetId(config.assetId),
			dripsEntries: this._mapDripEntries(config.dripsEntries)
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
	public async getDripsConfiguration(userId: string, erc20TokenAddress: string): Promise<DripsConfiguration | null> {
		validators.validateAddress(erc20TokenAddress);

		type ApiResponse = {
			userAssetConfig: {
				id: BigNumberish;
				assetId: BigNumberish;
				tokenAddress: string;
				balance: BigNumberish;
				sender: { id: string };
				amountCollected: BigNumberish;
				dripsEntries: {
					id: string;
					config: BigNumberish;
					receiverUserId: string;
				}[];
				lastUpdatedBlockTimestamp: string;
			};
		};

		const assetId = utils.getAssetIdFromAddress(erc20TokenAddress);

		const response = await this.query<ApiResponse>(gql.getUserAssetConfigById, {
			configId: utils.constructUserAssetConfigId(userId, assetId)
		});

		const userAssetConfig = response?.data?.userAssetConfig;

		if (userAssetConfig) {
			return {
				...userAssetConfig,
				dripsEntries: this._mapDripEntries(userAssetConfig.dripsEntries)
			};
		}

		return null;
	}

	/**
	 * Returns the user's splits configuration.
	 * @param  {string} userId The user ID.
	 * @returns A Promise which resolves to the user's splits configuration.
	 */
	public async getSplitsConfiguration(userId: string): Promise<SplitEntry[]> {
		type ApiResponse = {
			user: {
				splitsEntries: SplitEntry[];
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

	private _mapDripEntries(
		dripsEntries: {
			id: string;
			config: BigNumberish;
			receiverUserId: string;
		}[]
	): DripsEntry[] {
		return dripsEntries?.map((drip) => {
			// Return config as an object instead of as a BigNumberish.

			// Create a new config from the uint256 value returned from the subgraph.
			const configToReturn = DripsReceiverConfig.fromUint256(BigNumber.from(drip.config));

			// Get the *new* config as uint256.
			const configToReturnAsNum = BigNumber.from(configToReturn.asUint256);

			// Compare the received with the new values.
			if (!configToReturnAsNum.eq(drip.config)) {
				throw new Error('Cannot map results from subgraph query: configs do not match.');
			}

			return {
				...drip,
				config: {
					start: configToReturn.start.toString(),
					duration: configToReturn.duration.toString(),
					asUint256: configToReturn.asUint256.toString(),
					amountPerSec: configToReturn.amountPerSec.toString()
				}
			};
		});
	}
}
