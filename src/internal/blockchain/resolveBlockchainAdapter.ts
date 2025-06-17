import {WalletClient} from 'viem';
import type {Provider, Signer} from 'ethers';
import {SupportedBlockchainClient} from '../../sdk/createDripsSdk';
import {DripsError} from '../shared/DripsError';
import {
  createEthersReadAdapter,
  createEthersWriteAdapter,
} from './adapters/ethers/ethersAdapters';
import {
  createViemReadAdapter,
  createViemWriteAdapter,
} from './adapters/viem/viemAdapters';
import {
  ReadBlockchainAdapter,
  WriteBlockchainAdapter,
} from './BlockchainAdapter';
import {requireWalletHasAccount} from '../shared/assertions';

export function resolveBlockchainAdapter(
  client: SupportedBlockchainClient,
): ReadBlockchainAdapter | WriteBlockchainAdapter {
  // Custom adapters - check FIRST to prevent interference
  if (
    'type' in client &&
    client.type === 'custom' &&
    'call' in client &&
    typeof client.call === 'function'
  ) {
    return client as ReadBlockchainAdapter | WriteBlockchainAdapter;
  }

  // Viem write client
  if (
    'transport' in client &&
    hasRequiredMethods(client, ['sendTransaction']) &&
    !hasRequiredMethods(client, ['signMessage', 'getAddress'])
  ) {
    const walletClient = client as WalletClient;
    requireWalletHasAccount(walletClient);
    return createViemWriteAdapter(walletClient);
  }

  // Viem read-only client
  if (
    'transport' in client &&
    hasRequiredMethods(client, ['call']) &&
    !('sendTransaction' in client)
  ) {
    return createViemReadAdapter(client);
  }

  // Ethers write client
  if (
    !('transport' in client) &&
    hasRequiredMethods(client, ['signMessage', 'getAddress'])
  ) {
    return createEthersWriteAdapter(client as Signer);
  }

  // Ethers read-only client
  if (
    !('transport' in client) &&
    hasRequiredMethods(client, ['call']) &&
    !('signMessage' in client)
  ) {
    return createEthersReadAdapter(client as Provider);
  }

  throw new DripsError('Unsupported client type for blockchain adapter', {
    meta: {
      operation: 'resolveBlockchainAdapter',
      clientKeys: Object.keys(client),
    },
  });
}

function hasRequiredMethods(obj: any, methods: string[]): boolean {
  if (!obj) {
    return false;
  }
  return methods.every(
    method => method in obj && typeof obj[method] === 'function',
  );
}
