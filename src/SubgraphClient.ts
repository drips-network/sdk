import { DripsErrors } from './dripsErrors';
import * as gql from './gql';

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

export class SubgraphClient {
	#apiUrl!: string;
	public get apiUrl() {
		return this.#apiUrl;
	}

	private constructor() {}

	public static create(apiUrl: string) {
		if (!apiUrl) {
			throw DripsErrors.invalidArgument('Cannot create instance: API URL is missing.');
		}

		const subgraphClient = new SubgraphClient();
		subgraphClient.#apiUrl = apiUrl;

		return subgraphClient;
	}

	public async getDripsBySender(address: string): Promise<DripsConfig> {
		type APIResponse = { dripsConfigs: DripsConfig[] };

		const resp = await this.query<APIResponse>(gql.dripsConfigByID, { id: address });

		return resp.data?.dripsConfigs?.length ? resp.data?.dripsConfigs[0] : ({} as DripsConfig);
	}

	public async getDripsByReceiver(receiver: string): Promise<Drip[]> {
		type APIResponse = { dripsEntries: Drip[] };

		const resp = await this.query<APIResponse>(gql.dripsByReceiver, { receiver });

		return resp.data?.dripsEntries;
	}

	public getSplitsBySender(sender: string): Promise<Split[]> {
		return this._getSplits(gql.splitsBySender, { sender });
	}

	public getSplitsByReceiver(receiver: string): Promise<Split[]> {
		return this._getSplits(gql.splitsByReceiver, { receiver });
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

		throw DripsErrors.subgraphQueryFailed(resp.statusText, resp);
	}

	private async _getSplits(query: string, args: { sender: string } | { receiver: string }): Promise<Split[]> {
		type APIResponse = { splitsEntries: Split[] };

		const resp = await this.query<APIResponse>(query, { ...args, first: 100 });

		return resp.data?.splitsEntries || [];
	}
}
