/* eslint-disable no-await-in-loop */
import Utils from '../utils';
import { nameOf, toBN } from '../common/internals';
import { DripsErrors } from '../common/DripsError';
import * as gql from './gql';
import type { DripsReceiverSeenEvent, DripsSetEvent, SplitEntry, UserAssetConfig } from './types';

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
	 * @param  {string} userId The user ID.
	 * @param  {string} assetId The asset ID.
	 * @returns A `Promise` which resolves to the user's drips configuration.
	 * @throws {DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getUserAssetConfigById(userId: string, assetId: string): Promise<UserAssetConfig> {
		type ApiResponse = {
			userAssetConfig: UserAssetConfig;
		};

		const response = await this.query<ApiResponse>(gql.getUserAssetConfigById, {
			configId: `${userId}-${assetId}`
		});

		return response?.data?.userAssetConfig;
	}

	/**
	 * Returns all drips configurations for the given user.
	 * @param  {string} userId The user ID.
	 * @returns A `Promise` which resolves to the user's drips configurations.
	 * @throws {DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getAllUserAssetConfigsByUserId(userId: string): Promise<UserAssetConfig[]> {
		type ApiResponse = {
			user: {
				assetConfigs: UserAssetConfig[];
			};
		};

		const response = await this.query<ApiResponse>(gql.getAllUserAssetConfigsByUserId, { userId });

		return response?.data?.user?.assetConfigs || [];
	}

	/**
	 * Returns the user's splits configuration.
	 * @param  {string} userId The user ID.
	 * @returns A `Promise` which resolves to the user's splits configuration.
	 * @throws {DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getSplitsConfigByUserId(userId: string): Promise<SplitEntry[]> {
		type ApiResponse = {
			user: {
				splitsEntries: SplitEntry[];
			};
		};

		const response = await this.query<ApiResponse>(gql.getSplitsConfigByUserId, { userId });

		return response?.data?.user?.splitsEntries || [];
	}

	/**
	 * Returns the user's `DripsSetEvent`s.
	 * @param  {string} userId The user ID.
	 * @returns A `Promise` which resolves to the user's `DripsSetEvent`s.
	 * @throws {DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getDripsSetEventsByUserId(userId: string): Promise<DripsSetEvent[]> {
		type ApiResponse = {
			dripsSetEvents: DripsSetEvent[];
		};

		const response = await this.query<ApiResponse>(gql.getDripsSetEventsByUserId, { userId });

		return response?.data?.dripsSetEvents || [];
	}

	/**
	 * Returns the senders for which drips can be squeezed for a given receiver.
	 * @param  {string} receiverId The receiver's user ID.
	 * @returns A `Promise` which resolves to a map with keys being the sender IDs and values the asset IDs.
	 * @throws {DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getSqueezableSenders(receiverId: string): Promise<Record<string, string[]>> {
		type ApiResponse = {
			dripsReceiverSeenEvents: DripsReceiverSeenEvent[];
		};

		// Get all `DripsReceiverSeen` events for the given receiver.
		const response = await this.query<ApiResponse>(gql.getDripsReceiverSeenEventsByReceiverId, { receiverId });
		const dripsReceiverSeenEvents = response?.data?.dripsReceiverSeenEvents;

		if (!dripsReceiverSeenEvents?.length) {
			return {};
		}

		const { currentCycleStartDate } = Utils.Cycle.getInfo(this.#chainId);
		const squeezableSenders: Record<string, string[]> = {}; // key: senderId, value: [assetId, assetId]
		const processedSenders: Record<string, boolean> = {};

		// Iterate over all `DripsReceiverSeen` events.
		for (let i = 0; i < dripsReceiverSeenEvents.length; i++) {
			const dripsReceiverSeenEvent = dripsReceiverSeenEvents[i];

			const { senderUserId } = dripsReceiverSeenEvent;

			if (!processedSenders[senderUserId]) {
				// Mark the sender as processed in order not to process the same sender ID multiple times.
				processedSenders[senderUserId] = true;

				// For each event's sender, get all user asset configurations.
				const senderAssetConfigs = await this.getAllUserAssetConfigsByUserId(senderUserId);

				// Iterate over all sender configurations.
				for (let j = 0; j < senderAssetConfigs.length; j++) {
					const senderAssetConfig = senderAssetConfigs[j];

					// Iterate over all configuration drip entries.
					for (let k = 0; k < senderAssetConfig.dripsEntries.length; k++) {
						const dripEntry = senderAssetConfig.dripsEntries[k];

						// Get the rate of dripping from the config.
						const { amountPerSec } = Utils.DripsReceiverConfiguration.fromUint256(
							senderAssetConfig.dripsEntries[0]?.config
						);

						// Keep only the configurations that drip to the `receiverId`.
						if (dripEntry.userId === receiverId && amountPerSec > 0 && senderAssetConfig.balance > 0) {
							const configUpdateTimestamp = new Date(toBN(senderAssetConfig.lastUpdatedBlockTimestamp).toNumber());

							// If the configuration was updated before the start of the current timestamp.
							if (configUpdateTimestamp < currentCycleStartDate) {
								// Calculate the seconds that elapsed from the time the configuration was updated until the start of the current cycle.
								const elapsedSecsUntilCurrentCycleStart = Math.floor(
									(currentCycleStartDate.getTime() - configUpdateTimestamp.getTime()) / 1000
								);

								const drippedAmount = toBN(amountPerSec).mul(elapsedSecsUntilCurrentCycleStart);

								// If the balance is greater than the dripped amount, the receiver will have drips to squeeze in the current cycle.
								if (senderAssetConfig.balance > drippedAmount) {
									if (!squeezableSenders[senderUserId]) {
										squeezableSenders[senderUserId] = [];
									}
									squeezableSenders[senderUserId].push(senderAssetConfig.assetId);
								}
							}
							// If the configuration was updated after the start of the current timestamp the receiver will have drips to squeeze in the current cycle.
							else {
								if (!squeezableSenders[senderUserId]) {
									squeezableSenders[senderUserId] = [];
								}
								squeezableSenders[senderUserId].push(senderAssetConfig.assetId);
							}
						}
					}
				}
			}
		}

		return squeezableSenders;
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
