import { ethers as Ethers } from 'ethers'
import { Web3Provider } from "@ethersproject/providers";
import { getContractsForNetwork } from './contracts'
import { validateDrips,validateSplits } from './utils'
import RadicleRegistryABI from './contracts/RadicleRegistry.js'
import DripsTokenABI from './contracts/DripsToken'
import DaiABI from './contracts/Dai.js'
import DaiDripsHubABI from './contracts/DaiDripsHub.js'
import MetadataABI from './contracts/MetaData'

export class DripsClient {
  provider: Web3Provider
  networkName: string
  signer: Ethers.Signer
  address: string
  networkId: number

  contractDetails: any

  radicleRegistryContact: Ethers.Contract
  daiContract: Ethers.Contract
  hubContract: Ethers.Contract


  constructor(provider, networkName) {
    this.provider = provider
    this.networkName = networkName
    this.signer = undefined
    this.address = undefined
    this.networkId = undefined
 
    this.contractDetails = getContractsForNetwork(networkName)

    this.radicleRegistryContact = new Ethers.Contract(this.contractDetails.CONTRACT_RADICLE_REGISTRY, RadicleRegistryABI, this.provider)
    this.daiContract = new Ethers.Contract(this.contractDetails.CONTRACT_DAI, DaiABI, this.provider)
    this.hubContract = new Ethers.Contract(this.contractDetails.CONTRACT_DRIPS_HUB, DaiDripsHubABI, this.provider)
  }

  getAddress () {
    return this.address
  }

  getNetworkId () {
    return this.networkId
  }

  getRadicleRegistryContract () {
    return this.radicleRegistryContact
  }

  getDAIContract () {
    return this.daiContract
  }

  getHubContract () {
    return this.hubContract
  }

  async connect () {
    try {
      // connect and update signer
      this.signer = this.provider.getSigner()

      // set user address
      let signerAddress = await this.signer.getAddress()
      this.signIn(signerAddress)

      // set network id
      await this.setNetworkId()

      return true
    } catch (e) {
      console.error('@connect', e)

      // clear wallet in case
      this.disconnect()

      // throw error so stops any flows (closes modal too)
      throw e
    }
  }

  disconnect () {
    this.signOut()
    this.signer = null
  }

  private signIn (signInAddress) {
    this.address = signInAddress.toLowerCase()
  }

  private signOut () {
    this.address = null
  }

  async setNetworkId() {
    this.networkId = (await this.provider.getNetwork()).chainId
  }

  async approveDAIContract () {
    try {
      if (!this.signer) throw 'DripsClient must be connected before approving DAI'

      const contract = this.getDAIContract()
      const contractSigner = contract.connect(this.signer)

      // approve the max amount
      const amount = Ethers.constants.MaxUint256
      const tx = await contractSigner.approve(this.contractDetails.DaiDripsHub, amount)
      return tx
    } catch (e) {
      console.error('@approveDAIContract', e)
      throw e
    }
  }
 
  async updateUserDrips (lastUpdate:number, lastBalance:number, currentReceivers:string, balanceDelta:number, newReceivers:string) {
    try {
      if (!this.signer) throw "Not connected to wallet"

      validateDrips(newReceivers)

      const contract = this.getHubContract()
      const contractSigner = contract.connect(this.signer)

      return contractSigner['setDrips(uint64,uint128,(address,uint128)[],int128,(address,uint128)[])'](lastUpdate, lastBalance, currentReceivers, balanceDelta, newReceivers)
    } catch (e) {
      console.error(e)
      throw e
    }
  }

  async updateUserSplits (currentReceivers: any, newReceivers: any) {
    try {
      if (!this.signer) throw "Not connected to wallet"

      validateSplits(newReceivers)

      const contract = this.getHubContract()
      const contractSigner = contract.connect(this.signer)

      return contractSigner['setSplits'](currentReceivers, newReceivers)
    } catch (e) {
      console.error(e)
      throw e
    }
  }

  // check how much DAI the DripsHub is allowed to spend on behalf of the signed-in user
  async getAllowance () {
    if (!this.address) throw "Must call connect() before calling getAllowance()"
    const daiContract = this.getDAIContract()
    return daiContract.allowance(this.address, this.contractDetails.CONTRACT_DRIPS_HUB)
  }

  async getAmountCollectableWithSplits (address: string, currentSplitsJSON: any) {
    try {
      if (!this.provider) throw "Must have a provider defined to query the collectable balance"
      
      // map the current splits JSON into the format that the solidity method is expecting
      const currSplits = currentSplitsJSON.map(entry => ([entry.receiver, entry.weight]))

      // call the collectable() method on the contract
      const contract = this.getHubContract()
      return contract.collectable(address, currSplits)
    } catch (e) {
      console.error('@getCollectable', e)
      throw e
    }
  }
}
