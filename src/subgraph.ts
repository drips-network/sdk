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

  async getDripsBySender (address: string) {
    type APIResponse = {dripsConfigs: DripsConfig[]};
    try {
      const resp = await this.query<APIResponse>(gql.dripsConfigByID, { id : address })
      return resp.data?.dripsConfigs[0] || {} as DripsConfig;
    } catch (e) {
      console.error(e)
      throw e
    }
  }
  
  async getDripsByReceiver (receiver: string) {
    type APIResponse = {dripsEntries: unknown};
    try {
      const resp = await this.query<APIResponse>(gql.dripsByReceiver, { receiver })
      return resp.data?.dripsEntries
    } catch (e) {
      console.error(e)
      throw e
    }
  }
  
  private async _getSplits(query: string, args: {sender: string} | {receiver: string}) {
    type APIResponse = { splitsEntries: Split[] };
    try {
      const resp = await this.query<APIResponse>(query, { ...args, first: 100 });
      return resp.data?.splitsEntries || [];
    } catch (e) {
      console.error(e)
      throw e
    }
  }
  
  getSplitsBySender = (sender: string) => this._getSplits(gql.splitsBySender, {sender})
  getSplitsByReceiver = (receiver: string) => this._getSplits(gql.splitsByReceiver, {receiver})
  
  async query<T = unknown>(query: string, variables: unknown): Promise<{ data: T }> {
    const id = btoa(JSON.stringify({ query, variables }))
    try {
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
    } catch (e) {
      console.error(e)
      sessionStorage.removeItem(id)
      throw new Error('API Error')
    }
  }
}
