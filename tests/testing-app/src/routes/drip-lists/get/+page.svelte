<script>
	import { walletStore } from '$lib/stores/wallet';
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
	
	.form-group input {
		width: 100%;
		padding: 8px;
		border: 2px inset #c0c0c0;
		font-family: 'Courier New', monospace;
		background-color: white;
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
	
	.result-container {
		background-color: #f8f8f8;
		border: 2px inset #c0c0c0;
		padding: 15px;
		margin: 20px 0;
		font-family: 'Courier New', monospace;
		font-size: 12px;
	}
</style>

<div class="back-link">
	<a href="/drip-lists">← Back to Drip Lists</a>
</div>

<h1>Get Drip List</h1>

<div class="info-box">
	<strong>📖 About this operation:</strong><br>
	This operation queries the Drips network to retrieve information about an existing drip list. 
	It will fetch the drip list metadata, receivers, weights, and current statistics from the GraphQL API and IPFS.
</div>

<div class="step-indicator">
	Step 1: Configure Network Settings
</div>

<div class="form-container">
	<div class="form-group">
		<label for="graphqlUrl">GraphQL URL (optional):</label>
		<input type="text" id="graphqlUrl" placeholder="https://api.example.com/graphql (leave empty for default)" />
	</div>
	
	<div class="form-group">
		<label for="ipfsGateway">IPFS Gateway (optional):</label>
		<input type="text" id="ipfsGateway" placeholder="https://gateway.pinata.cloud" />
	</div>
</div>

<div class="step-indicator">
	Step 2: Specify Drip List to Query
</div>

<div class="form-container">
	<div class="form-group">
		<label for="dripListId">Drip List ID:</label>
		<input type="text" id="dripListId" placeholder="Enter drip list ID (e.g., 123456789)" />
	</div>
	
	<div class="form-group">
		<label for="fetchMetadata">
			<input type="checkbox" id="fetchMetadata" checked /> 
			Fetch metadata from IPFS
		</label>
	</div>
	
	<div class="form-group">
		<label for="fetchReceivers">
			<input type="checkbox" id="fetchReceivers" checked /> 
			Fetch receiver details
		</label>
	</div>
</div>

<div class="step-indicator">
	Step 3: Execute Query
</div>

<div class="form-container">
	<button class="button primary">🔍 Get Drip List</button>
	<button class="button">📋 Load from Environment</button>
	<button class="button">💾 Save Configuration</button>
</div>

<div class="step-indicator">
	Results
</div>

<div class="result-container">
	<strong>Query results will appear here...</strong>
	<br><br>
	<em>Click "Get Drip List" to execute the query and see the drip list information.</em>
</div>

<div class="info-box">
	<strong>ℹ️ Note:</strong> This is a read-only operation that doesn't require wallet connection or gas fees. 
	It only queries existing data from the network.
</div>
