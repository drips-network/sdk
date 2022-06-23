import { DripsErrors } from './DripsError';
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
	public readonly apiUrl: string;

	public constructor(apiUrl: string) {
		if (!apiUrl) {
			throw DripsErrors.invalidArgument('Cannot create instance: API URL is missing.');
		}

		this.apiUrl = apiUrl;
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

	public getSplitsBySender(sender: string) {
		return this._getSplits(gql.splitsBySender, { sender });
	}

	public getSplitsByReceiver(receiver: string) {
		return this._getSplits(gql.splitsByReceiver, { receiver });
	}

	public async query<T = unknown>(query: string, variables: unknown): Promise<{ data: T }> {
		if (!this.apiUrl) {
			throw DripsErrors.invalidOperation(
				`API URL is missing but this should never happen here! Make sure you didn't *manually* changed it after creating the client instance.`
			);
		}

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

		throw DripsErrors.unknownError(resp.statusText, resp);
	}

	private async _getSplits(query: string, args: { sender: string } | { receiver: string }): Promise<Split[]> {
		type APIResponse = { splitsEntries: Split[] };

		const resp = await this.query<APIResponse>(query, { ...args, first: 100 });

		return resp.data?.splitsEntries || [];
	}
}
