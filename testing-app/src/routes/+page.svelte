<script>
	import { walletStore } from '$lib/stores/wallet';
</script>

<style>
	.welcome {
		text-align: center;
		margin: 40px 0;
	}
	
	.description {
		background-color: #f0f0f0;
		border: 2px inset #c0c0c0;
		padding: 20px;
		margin: 20px 0;
	}
	
	.wallet-info {
		background-color: #e6f3ff;
		border: 2px solid #0066cc;
		padding: 20px;
		margin: 20px 0;
	}
	
	.wallet-info.connected {
		background-color: #e6ffe6;
		border-color: #00cc00;
	}
	
	.wallet-info.disconnected {
		background-color: #ffe6e6;
		border-color: #cc0000;
	}
	
	.wallet-address {
		font-family: 'Courier New', monospace;
		background-color: #f0f0f0;
		padding: 8px;
		border: 1px inset #c0c0c0;
		margin: 10px 0;
		word-break: break-all;
	}
	
	.modules {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 20px;
		margin: 30px 0;
	}
	
	.module {
		background-color: #e0e0e0;
		border: 2px outset #c0c0c0;
		padding: 15px;
	}
	
	.module h3 {
		margin-top: 0;
		color: #000080;
	}
	
	.module ul {
		margin: 10px 0;
		padding-left: 20px;
	}
	
	.module a {
		color: #000080;
		text-decoration: underline;
	}
	
	.module a:hover {
		background-color: #ffff00;
	}
</style>

<div class="welcome">
	<h1>Welcome to the Drips SDK Testing App</h1>
	<p>This simple interface allows you to test and explore the Drips SDK functionality</p>
</div>

<div class="wallet-info" class:connected={$walletStore.isConnected} class:disconnected={!$walletStore.isConnected}>
	<h2>🔗 Wallet Connection</h2>
	{#if $walletStore.isConnected}
		<p><strong>✅ Wallet Connected!</strong></p>
		<p>Your wallet is connected and ready to interact with the Drips SDK.</p>
		<div class="wallet-address">
			<strong>Connected Address:</strong><br>
			{$walletStore.address}
		</div>
		<p><em>You can now use all the SDK features that require wallet interaction.</em></p>
	{:else}
		<p><strong>❌ Wallet Not Connected</strong></p>
		<p>Connect your MetaMask wallet using the button in the header to interact with blockchain features.</p>
		<p><em>Some features may require a connected wallet to function properly.</em></p>
	{/if}
</div>

<div class="description">
	<h2>About This App</h2>
	<p>
		This testing application provides a user interface to replicate the integration tests 
		found in the Drips SDK. Each module corresponds to different SDK functionality, 
		allowing you to interact with the blockchain through a simple web interface.
	</p>
	<p>
		<strong>Note:</strong> This is a testing interface designed for development and 
		exploration purposes. All operations will interact with the configured blockchain network.
	</p>
</div>

<div class="modules">
	<div class="module">
		<h3>🗂️ Drip Lists</h3>
		<p>Create and manage drip lists - collections of receivers that split incoming funds.</p>
		<ul>
			<li><a href="/drip-lists/create-viem">Create Drip List (Viem)</a></li>
			<li><a href="/drip-lists/create-ethers">Create Drip List (Ethers)</a></li>
			<li><a href="/drip-lists/update-viem">Update Drip List (Viem)</a></li>
			<li><a href="/drip-lists/update-ethers">Update Drip List (Ethers)</a></li>
		</ul>
	</div>
	
	<div class="module">
		<h3>💰 Donations</h3>
		<p>Send one-time and continuous donations to drip lists and other receivers.</p>
		<ul>
			<li><a href="/donations/one-time-viem">One-Time Donation (Viem)</a></li>
			<li><a href="/donations/one-time-ethers">One-Time Donation (Ethers)</a></li>
			<li><a href="/donations/continuous-viem">Continuous Donation (Viem)</a></li>
			<li><a href="/donations/continuous-ethers">Continuous Donation (Ethers)</a></li>
		</ul>
	</div>
	
	<div class="module">
		<h3>🔧 Utils</h3>
		<p>Utility functions and helper tools for working with the Drips SDK.</p>
		<ul>
			<li><a href="/utils/account-id">Calculate Account IDs</a></li>
			<li><a href="/utils/project-id">Calculate Project IDs</a></li>
			<li><a href="/utils/metadata">Metadata Tools</a></li>
		</ul>
	</div>
</div>
