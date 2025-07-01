<script lang="ts">
	let initialReceivers = [
		{
			type: 'project',
			address: '',
			projectUrl: 'https://github.com/drips-network/sdk',
			dripListId: '',
			weight: 500000
		},
		{
			type: 'address',
			address: '0x945AFA63507e56748368D3F31ccC35043efDbd4b',
			projectUrl: '',
			dripListId: '',
			weight: 500000
		}
	];

	let updatedReceivers = [
		{
			type: 'project',
			address: '',
			projectUrl: 'https://github.com/drips-network/sdk',
			dripListId: '',
			weight: 300000
		},
		{
			type: 'address',
			address: '0x945AFA63507e56748368D3F31ccC35043efDbd4b',
			projectUrl: '',
			dripListId: '',
			weight: 400000
		},
		{
			type: 'address',
			address: '0x1234567890123456789012345678901234567890',
			projectUrl: '',
			dripListId: '',
			weight: 300000
		}
	];

	function addInitialReceiver() {
		initialReceivers = [...initialReceivers, {
			type: 'address',
			address: '',
			projectUrl: '',
			dripListId: '',
			weight: 0
		}];
	}

	function removeInitialReceiver(index: number) {
		initialReceivers = initialReceivers.filter((_, i) => i !== index);
	}

	function handleInitialReceiverTypeChange(index: number, newType: string) {
		initialReceivers[index].type = newType;
		initialReceivers[index].address = '';
		initialReceivers[index].projectUrl = '';
		initialReceivers[index].dripListId = '';
		initialReceivers = [...initialReceivers];
	}

	function addUpdatedReceiver() {
		updatedReceivers = [...updatedReceivers, {
			type: 'address',
			address: '',
			projectUrl: '',
			dripListId: '',
			weight: 0
		}];
	}

	function removeUpdatedReceiver(index: number) {
		updatedReceivers = updatedReceivers.filter((_, i) => i !== index);
	}

	function handleUpdatedReceiverTypeChange(index: number, newType: string) {
		updatedReceivers[index].type = newType;
		updatedReceivers[index].address = '';
		updatedReceivers[index].projectUrl = '';
		updatedReceivers[index].dripListId = '';
		updatedReceivers = [...updatedReceivers];
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
		background-color: #800080;
		color: white;
	}
	
	.button.primary:hover {
		background-color: #600060;
	}
	
	.button.secondary {
		background-color: #808000;
		color: white;
	}
	
	.button.secondary:hover {
		background-color: #606000;
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
	
	.phase-separator {
		background-color: #ff6666;
		color: white;
		padding: 15px;
		margin: 30px 0;
		text-align: center;
		font-weight: bold;
		border: 2px solid #cc0000;
	}
</style>

<div class="back-link">
	<a href="/drip-lists">← Back to Drip Lists</a>
</div>

<h1>Update Drip List (Ethers)</h1>

<div class="info-box">
	<strong>📝 About this operation:</strong><br>
	This page replicates the "Update Drip List using Ethers" integration test. It will first create an initial drip list, 
	then update its metadata and receivers, and verify the changes were applied correctly.
</div>

<div class="step-indicator">
	Step 1: Configure Wallet and Network Settings
</div>

<div class="form-container">
	<div class="form-group">
		<label for="privateKey">Private Key:</label>
		<input type="password" id="privateKey" placeholder="0x..." />
	</div>
	
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

<div class="phase-separator">
	PHASE 1: CREATE INITIAL DRIP LIST
</div>

<div class="step-indicator">
	Step 3: Define Initial Drip List Metadata
</div>

<div class="form-container">
	<div class="form-group">
		<label for="initialDripListName">Initial Drip List Name:</label>
		<input type="text" id="initialDripListName" value="Test Drip List for Update (Ethers)" />
	</div>
	
	<div class="form-group">
		<label for="initialDripListDescription">Initial Description:</label>
		<textarea id="initialDripListDescription">Initial drip list to be updated using Ethers adapter</textarea>
	</div>
	
	<div class="form-group">
		<label for="initialIsVisible">
			<input type="checkbox" id="initialIsVisible" checked /> 
			Make initial drip list visible
		</label>
	</div>
</div>

<div class="step-indicator">
	Step 4: Configure Initial Split Receivers
</div>

<div class="receivers-section">
	<h3>Initial Split Receivers</h3>
	<p>Define the initial receivers (total weight must equal 1,000,000).</p>
	
	{#each initialReceivers as receiver, index}
		<div class="receiver-item">
			<div class="receiver-controls">
				<label>Type:</label>
				<select bind:value={receiver.type} on:change={() => handleInitialReceiverTypeChange(index, receiver.type)}>
					<option value="address">Address</option>
					<option value="project">Project</option>
					<option value="drip-list">Drip List</option>
				</select>
				<button class="button" on:click={() => removeInitialReceiver(index)}>🗑️ Remove</button>
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
	
	<button class="button" on:click={addInitialReceiver}>+ Add Receiver</button>
</div>

<div class="phase-separator">
	PHASE 2: UPDATE THE DRIP LIST
</div>

<div class="step-indicator">
	Step 5: Define Updated Drip List Metadata
</div>

<div class="form-container">
	<div class="form-group">
		<label for="updatedDripListName">Updated Drip List Name:</label>
		<input type="text" id="updatedDripListName" value="Updated Test Drip List (Ethers)" />
	</div>
	
	<div class="form-group">
		<label for="updatedDripListDescription">Updated Description:</label>
		<textarea id="updatedDripListDescription">Updated drip list description using Ethers adapter</textarea>
	</div>
	
	<div class="form-group">
		<label for="updatedIsVisible">
			<input type="checkbox" id="updatedIsVisible" /> 
			Make updated drip list visible (changed from initial)
		</label>
	</div>
</div>

<div class="step-indicator">
	Step 6: Configure Updated Split Receivers
</div>

<div class="receivers-section">
	<h3>Updated Split Receivers</h3>
	<p>Define the updated receivers with new weights and an additional receiver.</p>
	
	{#each updatedReceivers as receiver, index}
		<div class="receiver-item">
			<div class="receiver-controls">
				<label>Type:</label>
				<select bind:value={receiver.type} on:change={() => handleUpdatedReceiverTypeChange(index, receiver.type)}>
					<option value="address">Address</option>
					<option value="project">Project</option>
					<option value="drip-list">Drip List</option>
				</select>
				<button class="button" on:click={() => removeUpdatedReceiver(index)}>🗑️ Remove</button>
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
	
	<button class="button" on:click={addUpdatedReceiver}>+ Add Receiver</button>
</div>

<div class="step-indicator">
	Step 7: Execute Operation
</div>

<div class="form-container">
	<button class="button secondary">🏗️ Create Initial Drip List</button>
	<button class="button primary">🔄 Update Drip List with Ethers</button>
</div>

<div class="info-box">
	<strong>⚠️ Note:</strong> This operation involves two blockchain transactions and IPFS uploads. 
	Make sure you have sufficient funds for gas fees and valid API credentials.
</div>
