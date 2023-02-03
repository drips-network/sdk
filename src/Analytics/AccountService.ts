/* eslint-disable no-await-in-loop */
import type { DripsSetEvent } from 'src/DripsSubgraph/types';
import Utils from '../utils';
import constants from '../constants';
import DripsSubgraphClient from '../DripsSubgraph/DripsSubgraphClient';
import type { DripsSetEventWithFullReceivers } from './AccountEstimator/types';
import type { Account, AssetConfig, AssetConfigHistoryItem, Stream } from './common/types';

export interface IAccountService {
	fetchAccount(userId: string, chainId: number): Promise<Account>;
}

const defaultDependencyFactory = (chainId: number) => DripsSubgraphClient.create(chainId);

export default class AccountService implements IAccountService {
	#chainId: number;
	get chainId() {
		return this.#chainId;
	}

	#subgraphClient: DripsSubgraphClient;
	get subgraphClient() {
		return this.#subgraphClient;
	}

	public constructor(
		chainId: number,
		dependencyFactory: (chainId: number) => DripsSubgraphClient = defaultDependencyFactory
	) {
		this.#chainId = chainId;
		this.#subgraphClient = dependencyFactory(chainId);
	}

	async fetchAccount(userId: string, chainId: number): Promise<Account> {
		try {
			const dripsSetEvents = await this.#getDripsSetEvents(userId);
			if (!userId) {
				throw new Error(`Could fetch account: user ID is required.`);
			}

			if (!chainId) {
				throw new Error(`Could fetch account: chain ID is required.`);
			}

			const dripsSetEventsWithFullReceivers = this.#reconcileDripsSetReceivers(dripsSetEvents);
			const dripsSetEventsByTokenAddress = this.#separateDripsSetEvents(dripsSetEventsWithFullReceivers);
			const assetConfigs = this.#buildAssetConfigsForUser(userId, dripsSetEventsByTokenAddress) || [];

			return {
				userId,
				assetConfigs
			};
		} catch (error: any) {
			throw new Error(`Could not fetch account: ${error.message}`);
		}
	}

	async #getDripsSetEvents(userId: string) {
		let skip = 0;
		const first = 500;
		const dripsSetEvents: DripsSetEvent[] = [];
		while (true) {
			const iterationEvents = await this.#subgraphClient.getDripsSetEventsByUserId(userId, skip, first);

			dripsSetEvents.push(...iterationEvents);

			if (!iterationEvents?.length || iterationEvents.length < first) {
				break;
			}

			skip += first;
		}
		return dripsSetEvents;
	}

	#reconcileDripsSetReceivers(dripsSetEvents: DripsSetEvent[]): DripsSetEventWithFullReceivers[] {
		const sortedDripsSetEvents = this.#sortDripsSetEvents(dripsSetEvents);

		interface DripsReceiverSeenEvent {
			id: string;
			receiverUserId: string;
			config: bigint;
		}

		const receiversHashes = sortedDripsSetEvents.reduce<string[]>((acc, dripsSetEvent) => {
			const { receiversHash } = dripsSetEvent;

			return !acc.includes(receiversHash) ? [...acc, receiversHash] : acc;
		}, []);

		const dripsReceiverSeenEventsByReceiversHash = receiversHashes.reduce<{
			[receiversHash: string]: DripsReceiverSeenEvent[];
		}>((acc, receiversHash) => {
			const receivers = this.#deduplicateArray(
				sortedDripsSetEvents
					.filter((event) => event.receiversHash === receiversHash)
					.reduce<DripsReceiverSeenEvent[]>((accc, event) => [...accc, ...event.dripsReceiverSeenEvents], []),
				'config'
			);

			return {
				...acc,
				[receiversHash]: receivers
			};
		}, {});

		return sortedDripsSetEvents.reduce<DripsSetEventWithFullReceivers[]>(
			(acc, dripsSetEvent) => [
				...acc,
				{
					...dripsSetEvent,
					currentReceivers: dripsReceiverSeenEventsByReceiversHash[dripsSetEvent.receiversHash] ?? []
				}
			],
			[]
		);
	}

	#separateDripsSetEvents<T extends DripsSetEvent>(
		dripsSetEvents: T[]
	): {
		[tokenAddress: string]: T[];
	} {
		const sorted = this.#sortDripsSetEvents(dripsSetEvents);

		const result = sorted.reduce<{ [tokenAddress: string]: T[] }>((acc, dripsSetEvent) => {
			const { assetId } = dripsSetEvent;
			const tokenAddress = Utils.Asset.getAddressFromId(assetId);

			if (acc[tokenAddress]) {
				acc[tokenAddress].push(dripsSetEvent);
			} else {
				acc[tokenAddress] = [dripsSetEvent];
			}

			return acc;
		}, {});

		return result;
	}

	#buildAssetConfigsForUser(
		userId: string,
		dripsSetEvents: { [tokenAddress: string]: DripsSetEventWithFullReceivers[] }
	): AssetConfig[] {
		return Object.entries(dripsSetEvents).reduce<AssetConfig[]>((acc, [tokenAddress, assetConfigDripsSetEvents]) => {
			if (assetConfigDripsSetEvents && assetConfigDripsSetEvents.length > 0) {
				throw new Error(`Unable to find dripsSet events for asset config with token address ${tokenAddress}`);
			}

			const assetConfigHistoryItems: AssetConfigHistoryItem[] = [];

			assetConfigDripsSetEvents.forEach((dripsSetEvent) => {
				const assetConfigHistoryItemStreams: Stream[] = [];

				dripsSetEvent.currentReceivers.forEach((dripsReceiverSeenEvent) => {
					const dripsConfig = Utils.DripsReceiverConfiguration.fromUint256(dripsReceiverSeenEvent.config);

					const streamId = Utils.Stream.makeStreamId(userId, tokenAddress, dripsConfig.dripId.toString());

					assetConfigHistoryItemStreams.push({
						id: streamId,
						dripsConfig,
						receiverId: dripsReceiverSeenEvent.receiverUserId.toString(),
						senderId: userId
					});
				});

				let runsOutOfFunds: Date | undefined;

				// If `maxEnd` is the largest possible timestamp, all current streams end before balance is depleted.
				if (dripsSetEvent.maxEnd === 2n ** 32n - 1n) {
					runsOutOfFunds = undefined;
				} else if (dripsSetEvent.maxEnd === 0n) {
					runsOutOfFunds = undefined;
				} else {
					runsOutOfFunds = new Date(Number(dripsSetEvent.maxEnd) * 1000);
				}

				assetConfigHistoryItems.push({
					timestamp: new Date(Number(dripsSetEvent.blockTimestamp) * 1000),
					balance: dripsSetEvent.balance * BigInt(constants.AMT_PER_SEC_MULTIPLIER),
					runsOutOfFunds,
					streams: assetConfigHistoryItemStreams,
					historyHash: dripsSetEvent.dripsHistoryHash,
					receiversHash: dripsSetEvent.receiversHash
				});
			});

			const currentStreams = assetConfigHistoryItems[assetConfigHistoryItems.length - 1].streams;

			acc.push({
				tokenAddress,
				streams: currentStreams,
				history: assetConfigHistoryItems
			});

			return acc;
		}, []);
	}

	#sortDripsSetEvents<T extends DripsSetEvent>(dripsSetEvents: T[]): T[] {
		return dripsSetEvents.sort((a, b) => Number(a.blockTimestamp) - Number(b.blockTimestamp));
	}

	#deduplicateArray<T>(array: T[], key: keyof T): T[] {
		return [...new Map(array.map((item) => [item[key], item])).values()];
	}
}
