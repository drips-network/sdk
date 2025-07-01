<script>
	import { walletStore, canPerformWriteOperations } from '$lib/stores/wallet';
</script>

<style>
	.operations {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
		gap: 20px;
		margin: 20px 0;
	}
	
	.operation {
		background-color: #f0f0f0;
		border: 2px outset #c0c0c0;
		padding: 20px;
	}
	
	.operation h3 {
		margin-top: 0;
		color: #000080;
		border-bottom: 2px solid #000080;
		padding-bottom: 5px;
	}
	
	.operation p {
		margin: 10px 0;
	}
	
	.operation a {
		display: inline-block;
		background-color: #c0c0c0;
		border: 2px outset #c0c0c0;
		padding: 8px 16px;
		text-decoration: none;
		color: #000000;
		font-weight: bold;
		margin: 5px 5px 5px 0;
	}
	
	.operation a:hover {
		background-color: #e0e0e0;
	}
	
	.operation a:active {
		border: 2px inset #c0c0c0;
	}
	
	.back-link {
		margin-bottom: 20px;
	}
	
	.back-link a {
		color: #000080;
		text-decoration: underline;
	}
	
	.drip-lists-info {
		background-color: #ffffcc;
		border: 2px solid #ffcc00;
		padding: 15px;
		margin: 20px 0;
	}
	
	.access-indicator {
		display: inline-block;
		font-size: 10px;
		padding: 2px 6px;
		margin-left: 8px;
		border: 1px solid;
		font-weight: bold;
		font-family: 'Courier New', monospace;
	}
	
	.access-indicator.write {
		background-color: #ffcccc;
		border-color: #ff6666;
		color: #cc0000;
	}
	
	.access-indicator.read {
		background-color: #ccffcc;
		border-color: #66ff66;
		color: #006600;
	}
	
	.operation.disabled {
		opacity: 0.5;
		pointer-events: none;
	}
	
	.operation.disabled .access-indicator {
		opacity: 0.7;
	}
</style>

<div class="back-link">
	<a href="/">← Back to Home</a>
</div>

<h1>🗂️ Drip Lists Module</h1>

<p>
	Drip Lists are collections of receivers (addresses, projects, or other drip lists) that 
	automatically split incoming funds according to specified weights. This module allows you 
	to create and update drip lists using either Viem or Ethers blockchain adapters.
</p>

<div class="drip-lists-info">
	<h3>Drip List Operations:</h3>
	<ul>
		<li><strong>Create:</strong> Deploy a new drip list with specified receivers and weights</li>
		<li><strong>Update:</strong> Modify existing drip list metadata and receiver configurations</li>
		<li><strong>Split Distribution:</strong> Automatically distribute incoming funds based on weights</li>
	</ul>
</div>

<div class="operations">
	<div class="operation" class:disabled={!canPerformWriteOperations()}>
		<h3>Create Drip List (Viem) <span class="access-indicator write">🔒 WRITE</span></h3>
		<p>
			Create a new drip list using the Viem blockchain adapter. This operation will:
		</p>
		<ul>
			<li>Set up a Viem wallet client</li>
			<li>Define split receivers with weights</li>
			<li>Create and deploy the drip list</li>
			<li>Upload metadata to IPFS</li>
			<li>Wait for indexing and verification</li>
		</ul>
		<a href="/drip-lists/create-viem">Create with Viem →</a>
	</div>
	
	<div class="operation" class:disabled={!canPerformWriteOperations()}>
		<h3>Create Drip List (Ethers) <span class="access-indicator write">🔒 WRITE</span></h3>
		<p>
			Create a new drip list using the Ethers blockchain adapter. This operation will:
		</p>
		<ul>
			<li>Set up an Ethers wallet/signer</li>
			<li>Define split receivers with weights</li>
			<li>Create and deploy the drip list</li>
			<li>Upload metadata to IPFS</li>
			<li>Wait for indexing and verification</li>
		</ul>
		<a href="/drip-lists/create-ethers">Create with Ethers →</a>
	</div>
	
	<div class="operation" class:disabled={!canPerformWriteOperations()}>
		<h3>Update Drip List (Viem) <span class="access-indicator write">🔒 WRITE</span></h3>
		<p>
			Update an existing drip list using the Viem blockchain adapter. This operation will:
		</p>
		<ul>
			<li>Create an initial drip list</li>
			<li>Modify metadata and receivers</li>
			<li>Update the drip list on-chain</li>
			<li>Upload new metadata to IPFS</li>
			<li>Verify the updates were applied</li>
		</ul>
		<a href="/drip-lists/update-viem">Update with Viem →</a>
	</div>
	
	<div class="operation" class:disabled={!canPerformWriteOperations()}>
		<h3>Update Drip List (Ethers) <span class="access-indicator write">🔒 WRITE</span></h3>
		<p>
			Update an existing drip list using the Ethers blockchain adapter. This operation will:
		</p>
		<ul>
			<li>Create an initial drip list</li>
			<li>Modify metadata and receivers</li>
			<li>Update the drip list on-chain</li>
			<li>Upload new metadata to IPFS</li>
			<li>Verify the updates were applied</li>
		</ul>
		<a href="/drip-lists/update-ethers">Update with Ethers →</a>
	</div>
	
	<div class="operation">
		<h3>Get Drip List <span class="access-indicator read">👁️ READ</span></h3>
		<p>
			Query and retrieve drip list information from the network. This operation will:
		</p>
		<ul>
			<li>Connect to the GraphQL API</li>
			<li>Query drip list by ID</li>
			<li>Fetch metadata from IPFS</li>
			<li>Display receivers and weights</li>
			<li>Show current balance and statistics</li>
		</ul>
		<a href="/drip-lists/get">Get Drip List →</a>
	</div>
</div>
