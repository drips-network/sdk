/* eslint-disable no-await-in-loop */
import type { DripsSetEvent } from 'src/DripsSubgraph/types';
import DripsSubgraphClient from '../../DripsSubgraph/DripsSubgraphClient';
import Utils from '../../utils';
import type { DripsSetEventWithFullReceivers, TokenAddress, UserId } from '../types';

export default class DripsSetEventService {
	private readonly _subgraphClient: DripsSubgraphClient;

	public readonly chainId: number;

	constructor(chainId: number);
	constructor(chainId: number, customApiUrl?: string, dripsSubgraphClient?: DripsSubgraphClient);
	constructor(
		chainId: number,
		customApiUrl?: string,
		dripsSubgraphClient: DripsSubgraphClient = DripsSubgraphClient.create(chainId, customApiUrl)
	) {
		if (chainId !== dripsSubgraphClient.chainId) {
			throw new Error(`Chain ID mismatch: ${chainId} !== ${dripsSubgraphClient.chainId}`);
		}

		this.chainId = chainId;
		this._subgraphClient = dripsSubgraphClient;
	}

	public async getAllDripsSetEventsByUserId(userId: string) {
		let skip = 0;
		const first = 500;
		const dripsSetEvents: DripsSetEvent[] = [];
		while (true) {
			const iterationEvents = await this._subgraphClient.getDripsSetEventsByUserId(userId, skip, first);

			dripsSetEvents.push(...iterationEvents);

			if (!iterationEvents?.length || iterationEvents.length < first) {
				break;
			}

			skip += first;
		}
		return dripsSetEvents;
	}

	public async getAllDripsSetEventsByReceiverUserId(userId: string) {
		let skip = 0;
		const first = 500;
		const dripsSetEvents: DripsSetEvent[] = [];
		while (true) {
			const iterationEvents = await this._subgraphClient.getDripsSetEventsByReceiverUserId(userId, skip, first);

			dripsSetEvents.push(...iterationEvents);

			if (!iterationEvents?.length || iterationEvents.length < first) {
				break;
			}

			skip += first;
		}
		return dripsSetEvents;
	}

	public static groupByTokenAddress<T extends DripsSetEvent>(dripsSetEvents: T[]): { [tokenAddress: string]: T[] } {
		const result: { [tokenAddress: TokenAddress]: T[] } = {};

		dripsSetEvents.forEach((dripsSetEvent) => {
			const { assetId } = dripsSetEvent;
			const tokenAddress = Utils.Asset.getAddressFromId(assetId);

			if (!result[tokenAddress]) {
				result[tokenAddress] = [];
			}

			result[tokenAddress].push(dripsSetEvent);
		});

		return result;
	}

	public static groupByUserAndTokenAddress<T extends DripsSetEvent>(
		dripsSetEvents: T[]
	): { [key: UserId]: { [key: TokenAddress]: DripsSetEvent[] } } {
		const result: { [key: UserId]: { [key: TokenAddress]: DripsSetEvent[] } } = {};

		dripsSetEvents.forEach((dripsSetEvent) => {
			if (!result[dripsSetEvent.userId]) {
				result[dripsSetEvent.userId] = {};
			}

			const tokenAddress = Utils.Asset.getAddressFromId(dripsSetEvent.assetId);

			if (!result[dripsSetEvent.userId][tokenAddress]) {
				result[dripsSetEvent.userId][tokenAddress] = [];
			}

			result[dripsSetEvent.userId][tokenAddress].push(dripsSetEvent);
		});

		return result;
	}

	public static reconcileDripsSetReceivers(dripsSetEvents: DripsSetEvent[]): DripsSetEventWithFullReceivers[] {
		const sortedDripsSetEvents = this.sortByBlockTimestampASC(dripsSetEvents);

		interface DripsReceiverSeenEvent {
			id: string;
			receiverUserId: string;
			config: bigint;
		}

		const receiversHashes = sortedDripsSetEvents.reduce<string[]>((acc, dripsSetEvent) => {
			const { receiversHash } = dripsSetEvent;

			return !acc.includes(receiversHash) ? [...acc, receiversHash] : acc;
		}, []);

		const deduplicateArray = <T>(array: T[], key: keyof T): T[] => [
			...new Map(array.map((item) => [item[key], item])).values()
		];

		const dripsReceiverSeenEventsByReceiversHash = receiversHashes.reduce<{
			[receiversHash: string]: DripsReceiverSeenEvent[];
		}>((acc, receiversHash) => {
			const receivers = deduplicateArray(
				sortedDripsSetEvents
					.filter((event) => event.receiversHash === receiversHash)
					.reduce<DripsReceiverSeenEvent[]>(
						(dripsReceiverSeenEvent, event) => [...dripsReceiverSeenEvent, ...event.dripsReceiverSeenEvents],
						[]
					),
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

	public static sortByBlockTimestampASC<T extends DripsSetEvent>(dripsSetEvents: T[]): T[] {
		return dripsSetEvents.sort((a, b) => Number(a.blockTimestamp) - Number(b.blockTimestamp));
	}
}
