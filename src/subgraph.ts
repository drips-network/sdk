import * as gql from './gql';

export type Split = {
  sender: string;
  receiver: string;
  weight: number;
}

export type Drip = {
  amtPerSec: string;
  receiver: string;
}

export type DripsConfig = {
  withdrawable?: number;
  balance?: string;
  timestamp?: string;
  receivers?: Drip[];
}

export class SubgraphClient {
  apiUrl: string
  
  constructor(apiUrl: string) {
    this.apiUrl = apiUrl
  }

  async getDripsBySender (address: string) : Promise<DripsConfig> {
    type APIResponse = {dripsConfigs: DripsConfig[]};
    const resp = await this.query<APIResponse>(gql.dripsConfigByID, { id : address })
    return resp.data?.dripsConfigs[0] || {} as DripsConfig;
  }
  
  async getDripsByReceiver (receiver: string) : Promise<Drip[]> {
    type APIResponse = {dripsEntries: Drip[]};
    const resp = await this.query<APIResponse>(gql.dripsByReceiver, { receiver })
    return resp.data?.dripsEntries
  }
  
  private async _getSplits(query: string, args: {sender: string} | {receiver: string}) : Promise<Split[]> {
    type APIResponse = { splitsEntries: Split[] };
    const resp = await this.query<APIResponse>(query, { ...args, first: 100 });
    return resp.data?.splitsEntries || [];
  }
  
  getSplitsBySender = (sender: string) => this._getSplits(gql.splitsBySender, {sender})
  getSplitsByReceiver = (receiver: string) => this._getSplits(gql.splitsByReceiver, {receiver})
  
  async query<T = unknown>(query: string, variables: unknown): Promise<{ data: T }> {
    const id = btoa(JSON.stringify({ query, variables }))
    if (!this.apiUrl) {
      throw new Error('API URL missing')
    }
    
    const resp = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, variables })
    })

    if (resp.status >= 200 && resp.status <= 299) {
      return await resp.json() as {data: T};
    } else {
      throw Error(resp.statusText)
    }
  }
}
