/* eslint-disable no-await-in-loop */
import type { DripsSetEvent } from 'src/DripsSubgraph/types';
import DripsSubgraphClient from '../DripsSubgraph/DripsSubgraphClient';
import Utils from '../utils';
import type { DripsSetEventWithFullReceivers } from './AccountEstimator/types';

const defaultDependencyFactory = (chainId: number): DripsSubgraphClient => DripsSubgraphClient.create(chainId);

export default class DripsSetEventService {
	#subgraphClient: DripsSubgraphClient;

	constructor(chainId: number, dependencyFactory: (chainId: number) => DripsSubgraphClient = defaultDependencyFactory) {
		this.#subgraphClient = dependencyFactory(chainId);
	}

	public async getAllDripsSetEvents(userId: string) {
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

	public separateDripsSetEvents<T extends DripsSetEvent>(
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

	public reconcileDripsSetReceivers(dripsSetEvents: DripsSetEvent[]): DripsSetEventWithFullReceivers[] {
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

	#sortDripsSetEvents<T extends DripsSetEvent>(dripsSetEvents: T[]): T[] {
		return dripsSetEvents.sort((a, b) => Number(a.blockTimestamp) - Number(b.blockTimestamp));
	}

	#deduplicateArray<T>(array: T[], key: keyof T): T[] {
		return [...new Map(array.map((item) => [item[key], item])).values()];
	}
}
