import type { providers, Signer } from "ethers";
import type { Dai, DaiDripsHub, RadicleRegistry } from '../contracts';
import { getContractsForNetwork } from './contracts'
import { constants } from 'ethers';
import { validateDrips, validateSplits } from './utils';
import { Dai__factory } from "../contracts/factories/Dai__factory";
import { DaiDripsHub__factory } from "../contracts/factories/DaiDripsHub__factory";
import { RadicleRegistry__factory } from "../contracts/factories/RadicleRegistry__factory";

export class DripsClient {
  provider: providers.Web3Provider
  signer: Signer
  address: string
  networkId: number

  contractDetails: any

  radicleRegistryContact: RadicleRegistry;
  daiContract: Dai
  hubContract: DaiDripsHub;

  constructor(provider: providers.Web3Provider, networkName: string) {
    this.provider = provider
    this.signer = undefined
    this.address = undefined
    this.networkId = undefined
 
    this.contractDetails = getContractsForNetwork(networkName)

    this.radicleRegistryContact = RadicleRegistry__factory.connect(this.contractDetails.CONTRACT_RADICLE_REGISTRY, this.provider);
    this.daiContract = Dai__factory.connect(this.contractDetails.CONTRACT_DAI, this.provider)
    this.hubContract = DaiDripsHub__factory.connect(this.contractDetails.CONTRACT_DRIPS_HUB, this.provider)
  }

  async connect() {
    try {
      this.signer = this.provider.getSigner()
      const signerAddress = await this.signer.getAddress()
      this.signIn(signerAddress)
      this.networkId = (await this.provider.getNetwork()).chainId
      return true
    } catch (e) {
      this.disconnect()
      throw e
    }
  }

  disconnect () {
    this.signOut()
    this.signer = null
    this.networkId = null;
  }

  get connected () : boolean {
    return !!this.networkId;
  }

  private signIn (signInAddress: string) {
    this.address = signInAddress.toLowerCase()
  }

  private signOut () {
    this.address = null
  }

  approveDAIContract () {
    if (!this.signer) throw 'DripsClient must be connected before approving DAI'

    const contractSigner = this.daiContract.connect(this.signer)
    return contractSigner.approve(this.contractDetails.CONTRACT_DRIPS_HUB, constants.MaxUint256)
  }

  updateUserDrips: DaiDripsHub['setDrips(uint64,uint128,(address,uint128)[],int128,(address,uint128)[])'] =
    (lastUpdate, lastBalance, currentReceivers, balanceDelta, newReceivers) => {
      if (!this.signer) throw "Not connected to wallet"

      validateDrips(newReceivers)

      const contractSigner = this.hubContract.connect(this.signer)

      return contractSigner['setDrips(uint64,uint128,(address,uint128)[],int128,(address,uint128)[])'](
        lastUpdate, lastBalance, currentReceivers, balanceDelta, newReceivers
      )
    }

  updateUserSplits: DaiDripsHub['setSplits'] =
    (currentReceivers, newReceivers) => {
      if (!this.signer) throw "Not connected to wallet"

      validateSplits(newReceivers)

      const contractSigner = this.hubContract.connect(this.signer)

      return contractSigner['setSplits'](currentReceivers, newReceivers)
    }

  // check how much DAI the DripsHub is allowed to spend on behalf of the signed-in user
  getAllowance() {
    if (!this.address) throw "Must call connect() before calling getAllowance()"

    return this.daiContract.allowance(this.address, this.contractDetails.CONTRACT_DRIPS_HUB);
  }

  getAmountCollectableWithSplits: DaiDripsHub['collectable'] =
    (address, currentSplits) => {
      if (!this.provider) throw "Must have a provider defined to query the collectable balance"

      return this.hubContract.collectable(address, currentSplits)
    }

}
