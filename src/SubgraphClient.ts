import { Result } from 'typescript-functional-extensions';
import type { DripsError } from './dripsErrors';
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

	public static async create(apiUrl: string): Promise<Result<SubgraphClient, DripsError>> {
		if (!apiUrl) {
			return Result.failure(DripsErrors.invalidArgument('Cannot create instance: API URL is missing.'));
		}

		const subgraphClient = new SubgraphClient();
		subgraphClient.#apiUrl = apiUrl;

		return Result.success(subgraphClient);
	}

	public async getDripsBySender(address: string): Promise<DripsConfig> {
		type ApiResponse = { dripsConfigs: DripsConfig[] };

		const resp = await this.query<ApiResponse>(gql.dripsConfigByID, { id: address });

		return resp.data?.dripsConfigs?.length ? resp.data?.dripsConfigs[0] : ({} as DripsConfig);
	}

	public async getDripsByReceiver(receiver: string): Promise<Drip[]> {
		type ApiResponse = { dripsEntries: Drip[] };

		const resp = await this.query<ApiResponse>(gql.dripsByReceiver, { receiver });

		return resp.data?.dripsEntries;
	}

	public getSplitsBySender(sender: string): Promise<Split[]> {
		return this._getSplits(gql.splitsBySender, { sender });
	}

	public getSplitsByReceiver(receiver: string): Promise<Split[]> {
		return this._getSplits(gql.splitsByReceiver, { receiver });
	}

	public async query<T = unknown>(query: string, variables: unknown): Promise<{ data: T }> {
		const response = await fetch(this.apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ query, variables })
		});

		if (response.status >= 200 && response.status <= 299) {
			return (await response.json()) as { data: T };
		}

		throw DripsErrors.httpError(response.statusText, response);
	}

	private async _getSplits(query: string, args: { sender: string } | { receiver: string }): Promise<Split[]> {
		type ApiResponse = { splitsEntries: Split[] };

		const response = await this.query<ApiResponse>(query, { ...args, first: 100 });

		return response.data?.splitsEntries || [];
	}
}
