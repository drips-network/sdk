import { splitsFractionMax } from "./utils"

const cacheAPISec = "3600" // string

export const queryProject = `
query ($id: ID!) {
  fundingProject (id: $id) {
    id
    projectOwner
    daiCollected
    daiSplit
    ipfsHash
    tokenTypes {
      tokenTypeId
      id
      minAmt: minAmtPerSec
      limit
      currentTotalAmtPerSec
      currentTotalGiven
      ipfsHash
      streaming
    }
    tokens {
      owner: tokenReceiver
      giveAmt
      amtPerSec
    }
  }
}
`

export const queryProjectMeta = `
query ($id: ID!) {
  fundingProject (id: $id) {
    ipfsHash
  }
}
`

export const queryDripsConfigByID = `
query ($id: ID!) {
dripsConfigs (where: {id: $id}, first: 1) {
  id
  balance
  timestamp: lastUpdatedBlockTimestamp
  receivers: dripsEntries {
    receiver
    amtPerSec
  }
}
}
`

export const queryDripsByReceiver = `
query ($receiver: Bytes!) {
dripsEntries (where: { receiver: $receiver} ) {
  # id
  sender: user
  receiver
  amtPerSec
}
}
`

export const querySplitsBySender = `
query ($sender: Bytes!, $first: Int!) {
splitsEntries (first: $first, where: { sender: $sender }) {
  # id
  sender
  receiver
  weight
}
}
`

export const querySplitsByReceiver = `
query ($receiver: Bytes!, $first: Int!) {
splitsEntries (first: $first, where: { receiver: $receiver }) {
  # id
  sender
  receiver
  weight
}
}
`

export class SubgraphClient {
  apiUrl: string
  
  constructor(apiUrl) {
    this.apiUrl = apiUrl
  }

  async getDripsBySender (address) {
    const emptyConfig = {
      balance: '0',
      timestamp: '0',
      receivers: [],
      withdrawable: () => '0'
    }
    try {
      // fetch...
      const resp = await this.query({ query: queryDripsConfigByID, variables: { id : address } })
      return resp.data?.dripsConfigs[0]
    } catch (e) {
      console.error(e)
      throw e
    }
  }
  
  async getDripsByReceiver (address) {
    const emptyConfig = {
      balance: '0',
      timestamp: '0',
      receivers: [],
      withdrawable: () => '0'
    }
    try {
      // fetch...
      const resp = await this.query ({ query: queryDripsByReceiver, variables: { receiver : address } })
      return resp.data?.dripsEntries
    } catch (e) {
      console.error(e)
      throw e
    }
  }
  
  async getSplitsBySender (address) {
    try {
      const resp = await this.query({ query: querySplitsBySender, variables: { sender: address, first: 100 } })
      let entries = resp.data?.splitsEntries || []
      // format
      entries = entries.map(entry => ({
        ...entry,
        percent: entry.weight / splitsFractionMax * 100
      }))
      return entries
    } catch (e) {
      console.error(e)
      throw e
    }
  }
  
  async getSplitsByReceiver (address) {
    try {
      const resp = await this.query({ query: querySplitsByReceiver, variables: { address, first: 100 } })
      let entries = resp.data?.splitsEntries || []
      // format
      entries = entries.map(entry => ({
        ...entry,
        percent: entry.weight / splitsFractionMax * 100
      }))
      return entries
    } catch (e) {
      console.error(e)
      throw e
    }
  }
  
  async query ({query, variables}) {
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
        const data = await resp.json()
  
        return data
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
