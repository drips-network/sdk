<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { walletStore, connectWallet, disconnectWallet, checkConnection, formatAddress, isMetaMaskAvailable } from '../stores/wallet';

	let mounted = false;

	onMount(() => {
		mounted = true;
		// Check if already connected when component mounts
		checkConnection();
	});

	function handleConnect() {
		connectWallet();
	}

	function handleDisconnect() {
		disconnectWallet();
	}

	// Only check MetaMask availability on the client side
	$: metaMaskAvailable = mounted && browser ? isMetaMaskAvailable() : false;
</script>

<style>
	.wallet-container {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.wallet-button {
		background-color: #008080;
		color: white;
		border: 2px outset #008080;
		padding: 8px 16px;
		font-family: 'Courier New', monospace;
		font-weight: bold;
		cursor: pointer;
		font-size: 12px;
	}

	.wallet-button:hover {
		background-color: #006666;
	}

	.wallet-button:active {
		border: 2px inset #008080;
	}

	.wallet-button:disabled {
		background-color: #808080;
		cursor: not-allowed;
		opacity: 0.6;
	}

	.wallet-button.disconnect {
		background-color: #800000;
		border-color: #800000;
	}

	.wallet-button.disconnect:hover {
		background-color: #600000;
	}

	.wallet-status {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		font-weight: bold;
	}

	.status-indicator {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background-color: #00ff00;
		animation: pulse 2s infinite;
	}

	.status-indicator.disconnected {
		background-color: #ff0000;
		animation: none;
	}

	.address {
		background-color: #f0f0f0;
		border: 1px inset #c0c0c0;
		padding: 4px 8px;
		font-family: 'Courier New', monospace;
		font-size: 11px;
		color: #000080;
	}

	.error {
		color: #ff0000;
		font-size: 11px;
		max-width: 200px;
		word-wrap: break-word;
	}

	.connecting {
		color: #ff8800;
		font-size: 11px;
	}

	@keyframes pulse {
		0% { opacity: 1; }
		50% { opacity: 0.5; }
		100% { opacity: 1; }
	}

	.metamask-warning {
		background-color: #fff3cd;
		border: 2px solid #ffeaa7;
		padding: 8px;
		font-size: 11px;
		color: #856404;
		margin-top: 5px;
	}
</style>

<div class="wallet-container">
	{#if !metaMaskAvailable}
	<div class="metamask-warning">
		⚠️ MetaMask not detected. You can still perform write operations by manually entering a private key on operation pages.
	</div>
	{:else if $walletStore.isConnecting}
		<div class="connecting">🔄 Connecting...</div>
	{:else if $walletStore.isConnected}
		<div class="wallet-status">
			<div class="status-indicator"></div>
			<span>Connected:</span>
			<div class="address">{formatAddress($walletStore.address)}</div>
		</div>
		<button class="wallet-button disconnect" on:click={handleDisconnect}>
			Disconnect
		</button>
	{:else}
		<div class="wallet-status">
			<div class="status-indicator disconnected"></div>
			<span>Not Connected</span>
		</div>
		<button class="wallet-button" on:click={handleConnect}>
			Connect MetaMask
		</button>
	{/if}

	{#if $walletStore.error}
		<div class="error">
			❌ {$walletStore.error}
		</div>
	{/if}
</div>
