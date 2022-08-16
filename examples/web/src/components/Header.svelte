<script lang="ts">
	import { AddressAppClient, DripsError, DripsErrorCode, DripsSubgraphClient } from 'drips-sdk';
	// TODO: https://github.com/WalletConnect/walletconnect-monorepo/issues/341
	import WalletConnectProvider from '@walletconnect/web3-provider/dist/umd/index.min';
	import Web3Modal from 'web3modal';
	import { providers } from 'ethers';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	// Change this to connect to a different provider.
	const subgraphUrl = 'https://api.thegraph.com/subgraphs/name/gh0stwheel/drips-v02-on-goerli';

	const web3Modal = new Web3Modal({
		cacheProvider: true,
		providerOptions: {
			walletconnect: {
				package: WalletConnectProvider,
				options: {
					infuraId: '1cf5614cae9f49968fe604b818804be6'
				}
			}
		},
		theme: 'dark'
	});

	let addressAppClient: AddressAppClient;
	let dripsSubgraphClient: DripsSubgraphClient;

	$: isConnected = Boolean(addressAppClient) && Boolean(dripsSubgraphClient);

	const connect = async () => {
		try {
			resetLocalState();

			const walletProvider = await web3Modal.connect();
			const provider = new providers.Web3Provider(walletProvider);

			addressAppClient = await AddressAppClient.create(provider);
			dripsSubgraphClient = DripsSubgraphClient.create(subgraphUrl);

			console.log(`AddressAppClient created: ${JSON.stringify(addressAppClient.debug())}`);
			console.log(`DripsSubgraphClient created: ${JSON.stringify(dripsSubgraphClient.debug())}`);

			dispatch('connected', {
				addressAppClient,
				dripsSubgraphClient
			});
		} catch (error) {
			// Example for handling a specific DripsError.
			let errorMessage: string;

			if (error?.code === DripsErrorCode.INVALID_ARGUMENT) {
				errorMessage = `${error.code} : ${error.message}`;
			} else {
				errorMessage = error.message;
			}

			console.log(error);

			dispatch('connectionFailed', {
				errorMessage
			});
		}
	};

	const disconnect = async () => {
		resetLocalState();

		web3Modal.clearCachedProvider();
		localStorage.removeItem('walletconnect');

		dispatch('disconnected');
	};

	const resetLocalState = () => {
		addressAppClient = null;
		dripsSubgraphClient = null;
	};
</script>

<div class="container">
	<div class="terminal-nav">
		<header class="terminal-logo">
			<div class="logo terminal-prompt">Drips v0.2 JavaScript SDK</div>
		</header>

		<nav class="terminal-menu">
			<ul>
				<li>
					<a href="https://v2.docs.drips.network/docs/whats-a-drip.html" target="_blank" class="menu-item"
						><span>Docs</span></a
					>
				</li>
				<li>
					<a href="https://github.com/radicle-dev/drips-js-sdk" target="_blank" class="menu-item"><span>GitHub</span></a
					>
				</li>
				<li>
					{#if !isConnected}
						<button class="btn-connect" on:click={connect}><span>Connect</span> </button>
					{:else}
						<button class="btn-connect" on:click={disconnect}><span>Disconnect</span> </button>
					{/if}
				</li>
			</ul>
		</nav>
	</div>
</div>

<style>
	.btn-connect {
		cursor: pointer;
		color: #24292f;
		border-color: rgba(27, 31, 36, 0.15);
		padding: 5px 10px;
		border-radius: 0.25em 0 0 0.25em;
		background-color: #ebf0f4;
	}
	.btn-connect:hover,
	.btn-connect:focus {
		background-color: #e9ebef;
		background-position: 0 -0.5em;
		border-color: #caccd1;
		border-color: rgba(27, 31, 36, 0.15);
	}
</style>
