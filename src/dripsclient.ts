import type { providers, Signer } from "ethers";
import type { Dai, DaiDripsHub, RadicleRegistry } from '../contracts';
import { constants } from 'ethers';
import { validateDrips, validateSplits } from './utils';
import { Dai__factory } from "../contracts/factories/Dai__factory";
import { DaiDripsHub__factory } from "../contracts/factories/DaiDripsHub__factory";
import { RadicleRegistry__factory } from "../contracts/factories/RadicleRegistry__factory";

const DAI_DRIPS_HUB_ADDRESS = "0xfbcD6918907902c106A99058146CBdBb76a812f6";
const DAI_ADDRESS = "0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea";
const RADICLE_REGISTRY_ADDRESS = "0xc2a8F699317795956bE5Cc4f9FF61FD4E7667670";

export class DripsClient {
  provider: providers.Web3Provider
  signer: Signer
  address: string
  networkId: number

  radicleRegistryContact: RadicleRegistry;
  daiContract: Dai
  hubContract: DaiDripsHub;

  constructor(provider: providers.Web3Provider) {
    this.provider = provider
    this.signer = undefined
    this.address = undefined
    this.networkId = undefined
 
    this.radicleRegistryContact = RadicleRegistry__factory.connect(RADICLE_REGISTRY_ADDRESS, this.provider);
    this.daiContract = Dai__factory.connect(DAI_ADDRESS, this.provider)
    this.hubContract = DaiDripsHub__factory.connect(DAI_DRIPS_HUB_ADDRESS, this.provider)
  }

  async connect() {
    try {
      console.log("in connect")
      this.signer = this.provider.getSigner()
      const signerAddress = await this.signer.getAddress()
      this.signIn(signerAddress)
      this.networkId = (await this.provider.getNetwork()).chainId
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
    this.networkId = null;
  }

  get connected() {
    return !!this.networkId;
  }

  private signIn (signInAddress: string) {
    this.address = signInAddress.toLowerCase()
  }

  private signOut () {
    this.address = null
  }

  approveDAIContract () {
    try {
      if (!this.signer) throw 'DripsClient must be connected before approving DAI'

      const contractSigner = this.daiContract.connect(this.signer)
      return contractSigner.approve(DAI_DRIPS_HUB_ADDRESS, constants.MaxUint256)
    } catch (e) {
      console.error('@approveDAIContract', e)
      throw e
    }
  }

  updateUserDrips: DaiDripsHub['setDrips(uint64,uint128,(address,uint128)[],int128,(address,uint128)[])'] =
    (lastUpdate, lastBalance, currentReceivers, balanceDelta, newReceivers) => {
      try {
        if (!this.signer) throw "Not connected to wallet"

        validateDrips(newReceivers)

        const contractSigner = this.hubContract.connect(this.signer)

        return contractSigner['setDrips(uint64,uint128,(address,uint128)[],int128,(address,uint128)[])'](
          lastUpdate, lastBalance, currentReceivers, balanceDelta, newReceivers
        )
      } catch (e) {
        console.error(e)
        throw e
      }
    }

  updateUserSplits: DaiDripsHub['setSplits'] =
    (currentReceivers, newReceivers) => {
      try {
        if (!this.signer) throw "Not connected to wallet"

        validateSplits(newReceivers)

        const contractSigner = this.hubContract.connect(this.signer)

        return contractSigner['setSplits'](currentReceivers, newReceivers)
      } catch (e) {
        console.error(e)
        throw e
      }
    }

  // check how much DAI the DripsHub is allowed to spend on behalf of the signed-in user
  getAllowance() {
    if (!this.address) throw "Must call connect() before calling getAllowance()"

    return this.daiContract.allowance(this.address, DAI_DRIPS_HUB_ADDRESS);
  }

  getAmountCollectableWithSplits: DaiDripsHub['collectable'] =
    (address, currentSplits) => {
      try {
        if (!this.provider) throw "Must have a provider defined to query the collectable balance"

        return this.hubContract.collectable(address, currentSplits)
      } catch (e) {
        console.error('@getCollectable', e)
        throw e
      }
    }

}
