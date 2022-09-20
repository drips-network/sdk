<script lang="ts">
	import { AddressAppClient, DripsError, DripsErrorCode, DripsSubgraphClient, Utils } from 'radicle-drips';
	import WalletConnectProvider from '@walletconnect/web3-provider/dist/umd/index.min';
	import Web3Modal from 'web3modal';
	import { providers } from 'ethers';
	import { createEventDispatcher } from 'svelte';
	import { writable } from 'svelte/store';
	import Modal, { bind } from 'svelte-simple-modal';
	import Disclaimer from './Disclaimer.svelte';

	const modal = writable(null);
	const dispatch = createEventDispatcher();

	const showModal = () => modal.set(bind(Disclaimer, {}));

	const toggleTheme = () => {
		light = !light;

		const element = document.body;
		element.classList.toggle('dark-mode');
	};

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

	const createAddressAppClient = async () => {
		const walletProvider = await web3Modal.connect();
		const provider = new providers.Web3Provider(walletProvider, 'any');

		// https://docs.ethers.io/v5/concepts/best-practices/#best-practices--network-changes
		provider.on('network', (newNetwork, oldNetwork) => {
			if (oldNetwork) {
				window.location.reload();
			}
		});

		addressAppClient = await AddressAppClient.create(provider);
	};

	const createDripsSubgraphClient = () => {
		dripsSubgraphClient = DripsSubgraphClient.create(5); // Goerli.
	};

	const connect = async () => {
		try {
			await createAddressAppClient();
			createDripsSubgraphClient();

			dispatch('connected', {
				addressAppClient,
				dripsSubgraphClient
			});
		} catch (error: any) {
			console.error(error);

			resetLocalState();

			dispatch('connectionFailed', {
				errorMessage: error.message
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

	let light = true;
</script>

<div class="container">
	<div class="terminal-nav">
		<header class="terminal-logo">
			<div class="logo terminal-prompt">DripsJS SDK v2.0</div>
		</header>

		<nav class="terminal-menu">
			<ul>
				<li>
					<Modal
						show={$modal}
						closeButton={false}
						styleWindow={{ backgroundColor: 'pink', boxShadow: '0 2px 5px 0 rgba(0, 0, 0, 0)' }}
						styleContent={{ backgroundColor: 'var(--background-color)', color: 'var(--font-color)', padding: 0 }}
					>
						<button class="btn-disclaimer" on:click={showModal}>Disclaimer</button>
					</Modal>
				</li>
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
					<button class="btn-disclaimer" on:click={toggleTheme}>
						{#if light}
							<span style="height: 16px; width: 16px" class="material-icons">wb_sunny </span>
						{:else}
							<span style="height: 16px; width: 16px" class="material-icons">dark_mode</span>
						{/if}
					</button>
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

	.btn-disclaimer {
		background-color: var(--background-color);
		text-decoration: none;
		display: block;
		width: 100%;
		border: none;
		color: var(--secondary-color);
		cursor: pointer;
	}
</style>
