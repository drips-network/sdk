<script lang="ts">
	import WalletConnectProvider from '@walletconnect/web3-provider/dist/umd/index.min';
	import Web3Modal from 'web3modal';
	import { wallet, isConnected, dripsClients } from '$lib/stores';
	import { providers } from 'ethers';
	import { DripsSubgraphClient, AddressDriverClient } from 'radicle-drips';
	import { onMount } from 'svelte';

	let web3Modal: Web3Modal;

	onMount(() => {
		web3Modal = new Web3Modal({
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
	});

	let light = true;

	function toggleTheme() {
		light = !light;

		const element = document.body;
		element.classList.toggle('dark-mode');
	}

	async function connect() {
		try {
			const walletProvider = await web3Modal.connect();
			const provider = new providers.Web3Provider(walletProvider, 'any');

			wallet.set({ provider });
			dripsClients.set({
				addressDriverClient: await AddressDriverClient.create(provider.getSigner()),
				subgraphClient: DripsSubgraphClient.create((await provider.getNetwork()).chainId)
			});
		} catch (error: any) {
			console.error(error);
			wallet.set(undefined);
			dripsClients.set(undefined);
		}
	}

	const disconnect = async () => {
		web3Modal.clearCachedProvider();
		localStorage.removeItem('walletconnect');
		wallet.set(undefined);
	};
</script>

<div class="header">
	<div class="terminal-nav">
		<header class="terminal-logo">
			<div class="logo terminal-prompt">DripsJS SDK v2.0</div>
		</header>
		<nav class="terminal-menu">
			<ul>
				<li>
					<a href="/" class="menu-item"><span>Home</span></a>
				</li>
				<li>
					<a href="/disclaimer" class="menu-item"><span>Disclaimer</span></a>
				</li>
				<li>
					<a href="https://v2.docs.drips.network/docs/whats-a-drip.html" class="menu-item"
						><span>Docs</span></a
					>
				</li>
				<li>
					<a href="https://github.com/radicle-dev/drips-js-sdk" class="menu-item"
						><span>GitHub</span></a
					>
				</li>
				<li>
					<button class="btn-theme" on:click={toggleTheme}>
						{#if light}
							<span style="height: 16px; width: 16px" class="material-icons">wb_sunny </span>
						{:else}
							<span style="height: 16px; width: 16px" class="material-icons">dark_mode</span>
						{/if}
					</button>
				</li>
				<li>
					{#if !$isConnected}
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
	.header {
		padding: 12px;
	}

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

	.btn-theme {
		background-color: var(--background-color);
		text-decoration: none;
		display: block;
		width: 100%;
		border: none;
		color: var(--secondary-color);
		cursor: pointer;
	}
</style>
