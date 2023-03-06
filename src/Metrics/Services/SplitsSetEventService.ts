/* eslint-disable no-await-in-loop */
import type { SplitsEntry } from 'src/DripsSubgraph/types';
import DripsSubgraphClient from '../../DripsSubgraph/DripsSubgraphClient';

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

	public async getAllSplitEntriesByReceiverUserId(receiverUserId: string) {
		let skip = 0;
		const first = 500;
		const splits: SplitsEntry[] = [];
		while (true) {
			const iterationEvents = await this._subgraphClient.getSplitEntriesByReceiverUserId(receiverUserId, skip, first);

			splits.push(...iterationEvents);

			if (!iterationEvents?.length || iterationEvents.length < first) {
				break;
			}

			skip += first;
		}
		return splits;
	}
}
