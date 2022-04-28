import { ethers as Ethers, utils } from 'ethers'
import { RadicleRegistry, DAI, DripsToken, DaiDripsHub } from './contracts'
import { validateSplits } from './utils'

export class DripsClient {
  provider: any;
  signer: any;
  walletProvider: any;
  address: any;
  networkId: any;


  constructor(provider) {
    this.provider = provider
    this.signer = undefined
    this.walletProvider = undefined
    this.address = undefined
    this.networkId = undefined
  }

  getAddress () {
    return this.address
  }

  getNetworkId () {
    return this.networkId
  }

  getRadicleRegistryContract () {
    return new Ethers.Contract(RadicleRegistry.address, RadicleRegistry.abi, this.provider)
  }

  getProjectContract (address) {
    return new Ethers.Contract(this.address, DripsToken.abi, this.provider)
  }

  getDAIContract () {
    return new Ethers.Contract(DAI.address, DAI.abi, this.provider)
  }

  getHubContract () {
    return new Ethers.Contract(DaiDripsHub.address, DaiDripsHub.abi, this.provider)
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

      this.listenToWalletProvider()

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
    this.setupFallbackProvider()
    this.signer = null

    console.log('disconnected from wallet')
  }

  listenToWalletProvider () {
    if (!this.walletProvider?.on) return

    // account changed (or disconnected)
    this.walletProvider.on('accountsChanged', accounts => {
      console.log('accountsChanged', accounts)
      if (!accounts.length) {
        this.disconnect()
      }
      this.signIn(accounts[0])
    })

    // changed network
    this.walletProvider.on('chainChanged', chainId => {
      console.log('network changed', chainId)
      // reload page so data is correct...
      window.location.reload()
    })

    // random disconnection? (doesn't fire on account disconnect)
    this.walletProvider.on('disconnect', error => {
      console.error('disconnected?', error)
      this.disconnect()
    })
  }

  async setNetworkId() {
    this.networkId = (await this.provider.getNetwork()).chainId
  }

  signIn(signInAddress) {
    this.address = signInAddress.toLowerCase()
    console.log('setting address to ' + this.address)
  }

  signOut () {
    this.address = null
    this.networkId = null
  }

  async setupFallbackProvider () {
    try {
      if (window.ethereum) {
        // metamask/browser
        this.provider = new Ethers.providers.Web3Provider(window.ethereum)
      }
      // else {
      //   // infura fallback
      //   this.provider = Ethers.getDefaultProvider(deployNetwork.infura)
      // }

      return true
    } catch (e) {
      console.error(e)
    }

    return false;
  }

  async approveDAIContract () {
    try {
      if (!this.signer) throw 'DripsClient must be connected before approving DAI'

      const contract = new Ethers.Contract(DAI.address, DAI.abi, this.provider)
      const contractSigner = contract.connect(this.signer)

      // approve max amount
      const amount = Ethers.constants.MaxUint256
      const tx = await contractSigner.approve(DaiDripsHub.address, amount)
      return tx
    } catch (e) {
      console.error('@approveDAIContract', e)
      throw e
    }
  }

  async updateUserDrips (lastUpdate:number, lastBalance:number, currentReceivers:string, balanceDelta:number, newReceivers:string) {
    try {
      if (!this.signer) throw "Not connected to wallet"

      // TODO -- here we should validate that the new receivers are all valid Ethereum addresses, similar to validateSplits below

      const contract = this.getHubContract()
      const contractSigner = contract.connect(this.signer)

      // Send the tx to the contract
      console.log('lastUpdate: ' + lastUpdate)
      console.log('lastBalance: ' + lastBalance)
      console.log('currentReceivers: ' + currentReceivers)
      console.log('balanceDelta: ' + balanceDelta)
      console.log('newReceivers: ' + newReceivers)
      return contractSigner['setDrips(uint64,uint128,(address,uint128)[],int128,(address,uint128)[])'](lastUpdate, lastBalance, currentReceivers, balanceDelta, newReceivers)
    } catch (e) {
      console.error(e)
      throw e
    }
  }

  async updateUserSplits (currentReceivers, newReceivers) {
    try {
      if (!this.signer) throw "Not connected to wallet"
      
      validateSplits(newReceivers)

      const contract = this.getHubContract()
      const contractSigner = contract.connect(this.signer)
      // submit
      return contractSigner['setSplits'](currentReceivers, newReceivers)
    } catch (e) {
      console.error(e)
      throw e
    }
  }

  // Check how much DAI an address is allowed to spend on behalf of the signed-in user
  async getAllowance () {
    if (!this.address) throw "Must call connect() before calling getAllowance()"

    const daiContract = this.getDAIContract()
    //console.log('this.address=' + this.address + ' spendingAddress=' + DaiDripsHub.address)
    return daiContract.allowance(this.address, DaiDripsHub.address)
  }
}
