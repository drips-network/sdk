import type { providers } from 'ethers';
import type { NFTDriverClient, DripsSubgraphClient } from 'radicle-drips';
import { derived, writable } from 'svelte/store';

export const wallet = writable<{ provider: providers.JsonRpcProvider } | undefined>();

export const isConnected = derived(wallet, ($provider) => !!$provider);

export const walletProvider = derived(wallet, ($provider) => $provider?.provider);

export const dripsClients = writable<
	| {
			nftDriverClient: NFTDriverClient;
			subgraphClient: DripsSubgraphClient;
	  }
	| undefined
>();
