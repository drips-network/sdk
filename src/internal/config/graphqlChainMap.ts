import {SupportedChain} from './contractsRegistry';

export const graphqlChainMap = {
  1: 'MAINNET',
  11155111: 'SEPOLIA',
  11155420: 'OPTIMISM_SEPOLIA',
  80002: 'POLYGON_AMOY',
  84532: 'BASE_SEPOLIA',
  314: 'FILECOIN',
  1088: 'METIS',
  31337: 'LOCALTESTNET',
  10: 'OPTIMISM',
} as const satisfies Record<SupportedChain, string>;
