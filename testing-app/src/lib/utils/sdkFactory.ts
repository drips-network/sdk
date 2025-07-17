import {
  createDripsSdk,
  createPinataIpfsMetadataUploader,
  contractsRegistry,
  type SdkSplitsReceiver,
} from 'drips-sdk-test-3';
import {createWalletClient, http, createPublicClient} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {JsonRpcProvider, Wallet} from 'ethers';

// Local testnet configuration
export const localtestnet = {
  name: 'Local Testnet',
  id: 31337,
  rpcUrls: {
    default: {http: ['http://localhost:8545']},
  },
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
};

export interface SdkConfig {
  rpcUrl?: string;
  graphqlUrl?: string;
  pinataJwt: string;
  pinataGateway: string;
}

export interface CreateViemSdkParams extends SdkConfig {
  privateKey?: string;
  useConnectedWallet?: boolean;
}

export interface CreateEthersSdkParams extends SdkConfig {
  privateKey?: string;
  useConnectedWallet?: boolean;
}

export interface CreateReadonlySdkParams {
  rpcUrl?: string;
  graphqlUrl?: string;
  adapter: 'viem' | 'ethers';
}

// Re-export the SDK type and contractsRegistry for convenience
export {type SdkSplitsReceiver, contractsRegistry};

/**
 * Create a Drips SDK instance using Viem adapter
 */
export async function createViemSdk(params: CreateViemSdkParams) {
  const {
    privateKey,
    useConnectedWallet = false,
    rpcUrl = 'http://localhost:8545',
    graphqlUrl,
    pinataJwt,
    pinataGateway,
  } = params;

  let walletClient: any;
  let account: any;

  if (useConnectedWallet) {
    // Use the connected wallet from window.ethereum
    if (typeof window !== 'undefined' && window.ethereum) {
      const {createWalletClient, custom} = await import('viem');

      // Get the connected accounts first
      const accounts = await window.ethereum.request({method: 'eth_accounts'});
      if (accounts.length === 0) {
        throw new Error('No connected accounts found');
      }

      // Create account object with the connected address
      account = {address: accounts[0]};

      // Create wallet client with the account properly set
      walletClient = createWalletClient({
        account: accounts[0], // Set the account in the wallet client
        chain: localtestnet,
        transport: custom(window.ethereum),
      });
    } else {
      throw new Error('No wallet connection found');
    }
  } else {
    if (!privateKey) {
      throw new Error(
        'Private key is required when not using connected wallet',
      );
    }

    // Step 1: Set up wallet account with private key
    account = privateKeyToAccount(`0x${privateKey.replace('0x', '')}`);

    // Step 2: Create Viem wallet client
    walletClient = createWalletClient({
      chain: localtestnet,
      transport: http(rpcUrl),
      account,
    });
  }

  // Step 3: Set up IPFS uploader
  const ipfsMetadataUploader = createPinataIpfsMetadataUploader({
    pinataJwt,
    pinataGateway,
  });

  // Step 4: Create SDK instance
  const sdkConfig: any = {};
  if (graphqlUrl) {
    sdkConfig.graphql = {url: graphqlUrl};
  }

  const sdk = createDripsSdk(walletClient, ipfsMetadataUploader, sdkConfig);

  return {
    sdk,
    walletClient,
    account,
    ipfsMetadataUploader,
  };
}

/**
 * Create a Drips SDK instance using Ethers adapter
 */
export async function createEthersSdk(params: CreateEthersSdkParams) {
  const {
    privateKey,
    useConnectedWallet = false,
    rpcUrl = 'http://localhost:8545',
    graphqlUrl,
    pinataJwt,
    pinataGateway,
  } = params;

  let wallet: any;
  let provider: any;
  let account: any;

  if (useConnectedWallet) {
    // Use the connected wallet from window.ethereum
    if (typeof window !== 'undefined' && window.ethereum) {
      const {BrowserProvider} = await import('ethers');

      // Get the connected accounts first
      const accounts = await window.ethereum.request({method: 'eth_accounts'});
      if (accounts.length === 0) {
        throw new Error('No connected accounts found');
      }

      // Create account object with the connected address
      account = {address: accounts[0]};

      // Create Ethers provider from window.ethereum
      provider = new BrowserProvider(window.ethereum);

      // Get the signer (wallet) from the provider
      wallet = await provider.getSigner();
    } else {
      throw new Error('No wallet connection found');
    }
  } else {
    if (!privateKey) {
      throw new Error(
        'Private key is required when not using connected wallet',
      );
    }

    // Step 1: Set up JSON RPC provider
    provider = new JsonRpcProvider(rpcUrl);

    // Step 2: Create Ethers wallet
    wallet = new Wallet(privateKey.replace('0x', ''), provider);

    // Create account object
    account = {address: wallet.address};
  }

  // Step 3: Set up IPFS uploader
  const ipfsMetadataUploader = createPinataIpfsMetadataUploader({
    pinataJwt,
    pinataGateway,
  });

  // Step 4: Create SDK instance
  const sdkConfig: any = {};
  if (graphqlUrl) {
    sdkConfig.graphql = {url: graphqlUrl};
  }

  const sdk = createDripsSdk(wallet, ipfsMetadataUploader, sdkConfig);

  return {
    sdk,
    wallet,
    provider,
    account,
    ipfsMetadataUploader,
  };
}

/**
 * Validate form receivers before conversion
 */
export function validateFormReceivers(receivers: any[]): {
  isValid: boolean;
  error?: string;
} {
  if (receivers.length === 0) {
    return {isValid: false, error: 'At least one receiver is required'};
  }

  const totalWeight = receivers.reduce(
    (sum, receiver) => sum + receiver.weight,
    0,
  );

  if (totalWeight !== 1_000_000) {
    return {
      isValid: false,
      error: `Total weight must equal 1,000,000. Current total: ${totalWeight}`,
    };
  }

  // Validate individual receivers
  for (const receiver of receivers) {
    if (receiver.weight <= 0) {
      return {
        isValid: false,
        error: 'All receiver weights must be greater than 0',
      };
    }

    if (receiver.type === 'address' && !receiver.address) {
      return {
        isValid: false,
        error: 'Address receivers must have a valid address',
      };
    }

    if (receiver.type === 'project' && !receiver.projectUrl) {
      return {isValid: false, error: 'Project receivers must have a valid URL'};
    }

    if (receiver.type === 'drip-list' && !receiver.dripListId) {
      return {
        isValid: false,
        error: 'Drip list receivers must have a valid drip list ID',
      };
    }
  }

  return {isValid: true};
}

/**
 * Generate a random UUID for drip list names
 */
export function generateRandomId(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

/**
 * Convert form receivers to SDK format
 */
export function convertReceiversToSdkFormat(
  formReceivers: any[],
): SdkSplitsReceiver[] {
  return formReceivers.map(receiver => {
    if (receiver.type === 'address') {
      return {
        type: 'address' as const,
        address: receiver.address,
        weight: receiver.weight,
      };
    } else if (receiver.type === 'project') {
      return {
        type: 'project' as const,
        url: receiver.projectUrl,
        weight: receiver.weight,
      };
    } else {
      throw new Error(`Unsupported receiver type: ${receiver.type}`);
    }
  });
}

/**
 * Create a readonly Drips SDK instance using Viem adapter
 */
export async function createViemReadonlySdk(params: CreateReadonlySdkParams) {
  const {rpcUrl = 'http://localhost:8545', graphqlUrl} = params;

  // Create Viem public client (readonly)
  const publicClient = createPublicClient({
    chain: localtestnet,
    transport: http(rpcUrl),
  });

  // Create a dummy IPFS uploader (not needed for readonly operations)
  const dummyIpfsUploader = async () => {
    throw new Error('IPFS operations not supported in readonly mode');
  };

  // Create SDK instance
  const sdkConfig: any = {};
  if (graphqlUrl) {
    sdkConfig.graphql = {url: graphqlUrl};
  }

  const sdk = createDripsSdk(publicClient, dummyIpfsUploader, sdkConfig);

  return {
    sdk,
    publicClient,
  };
}

/**
 * Create a readonly Drips SDK instance using Ethers adapter
 */
export async function createEthersReadonlySdk(params: CreateReadonlySdkParams) {
  const {rpcUrl = 'http://localhost:8545', graphqlUrl} = params;

  // Create Ethers provider (readonly)
  const provider = new JsonRpcProvider(rpcUrl);

  // Create a dummy IPFS uploader (not needed for readonly operations)
  const dummyIpfsUploader = async () => {
    throw new Error('IPFS operations not supported in readonly mode');
  };

  // Create SDK instance
  const sdkConfig: any = {};
  if (graphqlUrl) {
    sdkConfig.graphql = {url: graphqlUrl};
  }

  const sdk = createDripsSdk(provider, dummyIpfsUploader, sdkConfig);

  return {
    sdk,
    provider,
  };
}

/**
 * Create a readonly SDK instance with random adapter selection
 */
export async function createRandomReadonlySdk(params: CreateReadonlySdkParams) {
  const adapters = ['viem', 'ethers'] as const;
  const randomAdapter = adapters[Math.floor(Math.random() * adapters.length)];

  const paramsWithAdapter = {
    ...params,
    adapter: randomAdapter,
  };

  if (randomAdapter === 'viem') {
    const result = await createViemReadonlySdk(paramsWithAdapter);
    return {
      ...result,
      adapterUsed: 'viem' as const,
    };
  } else {
    const result = await createEthersReadonlySdk(paramsWithAdapter);
    return {
      ...result,
      adapterUsed: 'ethers' as const,
    };
  }
}
