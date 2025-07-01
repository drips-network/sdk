<script lang="ts">
	import { walletStore } from '$lib/stores/wallet';

	let receivers = [
		{
			type: 'address',
			address: '0x945AFA63507e56748368D3F31ccC35043efDbd4b',
			projectUrl: '',
			dripListId: '',
			weight: 500000
		},
		{
			type: 'project',
			address: '',
			projectUrl: 'https://github.com/drips-network/sdk',
			dripListId: '',
			weight: 500000
		}
	];

	function addReceiver() {
		receivers = [...receivers, {
			type: 'address',
			address: '',
			projectUrl: '',
			dripListId: '',
			weight: 0
		}];
	}

	function removeReceiver(index: number) {
		receivers = receivers.filter((_, i) => i !== index);
	}

	function handleReceiverTypeChange(index: number, newType: string) {
		receivers[index].type = newType;
		// Clear other fields when type changes
		receivers[index].address = '';
		receivers[index].projectUrl = '';
		receivers[index].dripListId = '';
		receivers = [...receivers]; // Trigger reactivity
	}
</script>

<style>
	.form-container {
		background-color: #f0f0f0;
		border: 2px inset #c0c0c0;
		padding: 20px;
		margin: 20px 0;
	}
	
	.form-group {
		margin: 15px 0;
	}
	
	.form-group label {
		display: block;
		font-weight: bold;
		margin-bottom: 5px;
		color: #000080;
	}
	
	.checkbox-group {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	
	.checkbox-group label {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 0;
	}
	
	.checkbox-group input[type="checkbox"] {
		width: auto;
		margin: 0;
	}
	
	.form-group input,
	.form-group textarea {
		width: 100%;
		padding: 8px;
		border: 2px inset #c0c0c0;
		font-family: 'Courier New', monospace;
		background-color: white;
		box-sizing: border-box;
	}
	
	.form-group textarea {
		height: 80px;
		resize: vertical;
	}
	
	.receivers-section {
		background-color: #e0e0e0;
		border: 2px inset #c0c0c0;
		padding: 15px;
		margin: 15px 0;
	}
	
	.receiver-item {
		background-color: #f8f8f8;
		border: 1px solid #808080;
		padding: 10px;
		margin: 10px 0;
	}
	
	.receiver-controls {
		display: flex;
		gap: 10px;
		align-items: center;
		margin: 10px 0;
	}
	
	.receiver-controls select {
		padding: 5px;
		border: 2px inset #c0c0c0;
	}
	
	.button {
		background-color: #c0c0c0;
		border: 2px outset #c0c0c0;
		padding: 10px 20px;
		font-family: 'Courier New', monospace;
		font-weight: bold;
		cursor: pointer;
		margin: 5px;
	}
	
	.button:hover {
		background-color: #e0e0e0;
	}
	
	.button:active {
		border: 2px inset #c0c0c0;
	}
	
	.button.primary {
		background-color: #008080;
		color: white;
	}
	
	.button.primary:hover {
		background-color: #006666;
	}
	
	.back-link {
		margin-bottom: 20px;
	}
	
	.back-link a {
		color: #000080;
		text-decoration: underline;
	}
	
	.info-box {
		background-color: #ffffcc;
		border: 2px solid #ffcc00;
		padding: 15px;
		margin: 20px 0;
	}
	
	.step-indicator {
		background-color: #e0e0e0;
		border: 2px outset #c0c0c0;
		padding: 10px;
		margin: 10px 0;
		font-weight: bold;
	}
	
	.wallet-status {
		background-color: #ccffcc;
		border: 2px solid #66ff66;
		padding: 10px;
		margin: 10px 0;
		font-weight: bold;
		color: #006600;
	}
	
	.wallet-status.disconnected {
		background-color: #ffcccc;
		border-color: #ff6666;
		color: #cc0000;
	}
</style>

<div class="back-link">
	<a href="/drip-lists">← Back to Drip Lists</a>
</div>

<h1>Create Drip List (Viem)</h1>

<div class="info-box">
	<strong>📝 About this operation:</strong><br>
	This page replicates the "Create Drip List using Viem" integration test. It will set up a Viem wallet client, 
	define split receivers, create the drip list, upload metadata to IPFS, and verify the creation.
</div>

<div class="step-indicator">
	Step 1: Configure Wallet and Network Settings
</div>

<div class="form-container">
	{#if $walletStore.isConnected}
		<div class="wallet-status">
			✅ Wallet Connected: {$walletStore.address?.slice(0, 6)}...{$walletStore.address?.slice(-4)}
			<br><small>Using connected wallet for transactions</small>
		</div>
	{:else}
		<div class="wallet-status disconnected">
			❌ No Wallet Connected - Using Private Key Input
		</div>
		<div class="form-group">
			<label for="privateKey">Private Key:</label>
			<input type="password" id="privateKey" placeholder="0x..." />
		</div>
	{/if}
	
	<div class="form-group">
		<label for="rpcUrl">RPC URL:</label>
		<input type="text" id="rpcUrl" value="http://localhost:8545" />
	</div>
	
	<div class="form-group">
		<label for="graphqlUrl">GraphQL URL (optional):</label>
		<input type="text" id="graphqlUrl" placeholder="https://api.example.com/graphql (leave empty for default)" />
	</div>
</div>

<div class="step-indicator">
	Step 2: Configure IPFS Settings
</div>

<div class="form-container">
	<div class="form-group">
		<label for="pinataJwt">Pinata JWT:</label>
		<input type="password" id="pinataJwt" placeholder="Your Pinata JWT token" />
	</div>
	
	<div class="form-group">
		<label for="pinataGateway">Pinata Gateway:</label>
		<input type="text" id="pinataGateway" placeholder="https://gateway.pinata.cloud" />
	</div>
</div>

<div class="step-indicator">
	Step 3: Define Drip List Metadata
</div>

<div class="form-container">
	<div class="form-group">
		<label for="dripListName">Drip List Name:</label>
		<input type="text" id="dripListName" value="Test Drip List (Viem)" />
	</div>
	
	<div class="form-group">
		<label for="dripListDescription">Description:</label>
		<textarea id="dripListDescription">A test drip list created using Viem adapter</textarea>
	</div>
	
	<div class="form-group checkbox-group">
		<label for="isVisible">
			<input type="checkbox" id="isVisible" checked />
			Make drip list visible
		</label>
	</div>
</div>

<div class="step-indicator">
	Step 4: Configure Split Receivers
</div>

<div class="receivers-section">
	<h3>Split Receivers</h3>
	<p>Define who will receive the funds and their respective weights (total must equal 1,000,000).</p>
	
	{#each receivers as receiver, index}
		<div class="receiver-item">
			<div class="receiver-controls">
				<label>Type:</label>
				<select bind:value={receiver.type} on:change={() => handleReceiverTypeChange(index, receiver.type)}>
					<option value="address">Address</option>
					<option value="project">Project</option>
					<option value="drip-list">Drip List</option>
				</select>
				<button class="button" on:click={() => removeReceiver(index)}>🗑️ Remove</button>
			</div>
			
			{#if receiver.type === 'address'}
				<div class="form-group">
					<label>Address:</label>
					<input type="text" bind:value={receiver.address} placeholder="0x..." />
				</div>
			{:else if receiver.type === 'project'}
				<div class="form-group">
					<label>Project URL:</label>
					<input type="text" bind:value={receiver.projectUrl} placeholder="https://github.com/..." />
				</div>
			{:else if receiver.type === 'drip-list'}
				<div class="form-group">
					<label>Drip List ID:</label>
					<input type="text" bind:value={receiver.dripListId} placeholder="Enter drip list ID" />
				</div>
			{/if}
			
			<div class="form-group">
				<label>Weight:</label>
				<input type="number" bind:value={receiver.weight} min="1" max="1000000" />
			</div>
		</div>
	{/each}
	
	<button class="button" on:click={addReceiver}>+ Add Receiver</button>
</div>

<div class="step-indicator">
	Step 5: Execute Operation
</div>

<div class="form-container">
	<button class="button primary">🚀 Create Drip List with Viem</button>
</div>

<div class="info-box">
	<strong>⚠️ Note:</strong> This operation will interact with the blockchain and IPFS. 
	Make sure you have sufficient funds for gas fees and valid API credentials.
</div>
