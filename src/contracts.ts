import RadicleRegistryABI from './contracts/RadicleRegistry.js'
import DripsTokenABI from './contracts/DripsToken'
import DaiABI from './contracts/Dai'
import DaiDripsHubABI from './contracts/DaiDripsHub.js'
import MetadataABI from './contracts/MetaData'

export const deploy = {"NAME": "9th Rinkeby Deployment","CONTRACT_DAI": "0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea","CONTRACT_DRIPS_HUB": "0xfbcD6918907902c106A99058146CBdBb76a812f6","CONTRACT_DRIPS_HUB_LOGIC": "0x756E821D9E88D76ef15d2e719bbd4CC3A2167EC1","CONTRACT_RESERVE": "0x880D5095606c7b541AdDE0F94A6858CbABb63F69","CONTRACT_RADICLE_REGISTRY": "0xc2a8F699317795956bE5Cc4f9FF61FD4E7667670","CONTRACT_BUILDER": "0x688662533E0341D518Bcc965525aFc70550CEE39","NETWORK": "rinkeby","DEPLOY_ADDRESS": "eca823848221a1da310e1a711e19d82f43101b07","CYCLE_SECS": "86400","COMMIT_HASH": "9edf9be0e2fa227dcb778db98aec8bcaf89fe1d5","GOVERNANCE_ADDRESS": "0xeca823848221a1da310e1a711e19d82f43101b07","CONTRACT_DRIPS_GOVERNANCE": "0x038d28F839e6d83B2270c6B42BC8B01a5c75cad0","CONTRACT_METADATA" : "0x1C465B0249Fb7c92896709768b9d4aBD0135DBc9"}

export const RadicleRegistry = {
  address: deploy.CONTRACT_RADICLE_REGISTRY,
  abi: RadicleRegistryABI
}

export const DripsToken = {
  // address: ...from each project
  abi: DripsTokenABI
}

export const DAI = {
  address: deploy.CONTRACT_DAI,
  abi: DaiABI
}

export const DaiDripsHub = {
  address: deploy.CONTRACT_DRIPS_HUB,
  abi: DaiDripsHubABI
}

export const Metadata = {
  address: deploy.CONTRACT_METADATA,
  abi: MetadataABI
}
