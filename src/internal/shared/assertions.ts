import {WalletClient, Account} from 'viem';
import {DripsError} from './DripsError';
import {SupportedChain, contractsRegistry} from '../config/contractsRegistry';
import {graphqlChainMap} from '../config/graphqlChainMap';
import {
  ReadBlockchainAdapter,
  WriteBlockchainAdapter,
} from '../blockchain/BlockchainAdapter';
import {Forge, supportedForges} from '../projects/calcProjectId';
import {
  IpfsMetadataUploaderFn,
  Metadata,
} from './createPinataIpfsMetadataUploader';

export function requireWalletHasAccount(
  client: WalletClient,
  operation = 'requireWalletHasAccount',
): asserts client is WalletClient & {account: Account} {
  if (!client.account) {
    throw new DripsError('WalletClient must have an account configured', {
      meta: {
        operation,
        client,
      },
    });
  }
}

export function requireSupportedChain(
  chainId: number,
  operation = 'requireSupportedChain',
): asserts chainId is SupportedChain {
  if (!(chainId in contractsRegistry)) {
    throw new DripsError(`Unsupported chain ID: ${chainId}`, {
      meta: {
        operation,
        chainId,
        knownChains: Object.keys(contractsRegistry).map(Number),
      },
    });
  }
}

export function requireGraphQLSupportedChain(
  chainId: number,
  operation = 'requireGraphQLSupportedChain',
): asserts chainId is SupportedChain {
  requireSupportedChain(chainId, operation);

  const chain = graphqlChainMap[chainId as SupportedChain];
  if (!chain) {
    throw new DripsError(`Unsupported chain ID: ${chainId}`, {
      meta: {
        operation,
        chainId,
        resolvedChain: chain,
        knownChains: Object.values(graphqlChainMap),
      },
    });
  }
}

function isWriteAdapter(
  adapter: ReadBlockchainAdapter | WriteBlockchainAdapter,
): adapter is WriteBlockchainAdapter {
  return 'sendTx' in adapter && typeof adapter.sendTx === 'function';
}

export function requireWriteAccess(
  adapter: ReadBlockchainAdapter | WriteBlockchainAdapter,
  operation = 'requireWriteAccess',
): asserts adapter is WriteBlockchainAdapter {
  if (!isWriteAdapter(adapter)) {
    throw new DripsError(
      `Operation '${operation}' requires wallet/signer permissions`,
      {
        meta: {
          operation,
          hint: 'Instantiate Drips SDK with a WriteBlockchainAdapter',
        },
      },
    );
  }
}

export function requireMetadataUploader(
  ipfsMetadataUploaderFn: IpfsMetadataUploaderFn<Metadata> | undefined,
  operation = 'requireMetadataUploader',
): asserts ipfsMetadataUploaderFn is IpfsMetadataUploaderFn<Metadata> {
  if (!ipfsMetadataUploaderFn) {
    throw new DripsError(
      `Operation '${operation}' requires IPFS metadata uploader`,
      {
        meta: {
          operation,
          hint: 'Instantiate Drips SDK with an IPFS metadata uploader function',
        },
      },
    );
  }
}

export function requireSupportedForge(
  forge: string,
  operation = 'requireSupportedForge',
): asserts forge is Forge {
  if (!supportedForges.includes(forge as Forge)) {
    throw new DripsError(`Unsupported forge: ${forge}`, {
      meta: {
        operation,
        forge,
        supportedForges,
      },
    });
  }
}
