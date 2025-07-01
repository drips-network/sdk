<script>
	import { walletStore } from '$lib/stores/wallet';
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
	
	.utils-info {
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

<h1>🔧 Utils Module</h1>

<p>
	The utils module provides helper functions and tools for working with the Drips SDK. 
	These utilities help with common tasks like calculating account IDs, working with metadata, 
	and other SDK-related operations.
</p>

<div class="utils-info">
	<h3>Utility Categories:</h3>
	<ul>
		<li><strong>Account ID Calculators:</strong> Calculate account IDs for addresses and drip lists</li>
		<li><strong>Project ID Tools:</strong> Calculate project IDs from GitHub URLs</li>
		<li><strong>Metadata Helpers:</strong> Work with IPFS metadata and schemas</li>
	</ul>
</div>

<div class="operations">
	<div class="operation">
		<h3>Calculate Account IDs <span class="access-indicator read">👁️ READ</span></h3>
		<p>
			Calculate account IDs for different types of accounts in the Drips ecosystem:
		</p>
		<ul>
			<li>Address account IDs</li>
			<li>Drip list account IDs</li>
			<li>Project account IDs</li>
		</ul>
		<a href="/utils/account-id">Calculate Account IDs →</a>
	</div>
	
	<div class="operation">
		<h3>Calculate Project IDs <span class="access-indicator read">👁️ READ</span></h3>
		<p>
			Calculate project IDs from GitHub repository URLs and other project identifiers:
		</p>
		<ul>
			<li>GitHub project ID calculation</li>
			<li>Project URL parsing</li>
			<li>Forge and name extraction</li>
		</ul>
		<a href="/utils/project-id">Calculate Project IDs →</a>
	</div>
	
	<div class="operation">
		<h3>Metadata Tools <span class="access-indicator read">👁️ READ</span></h3>
		<p>
			Work with IPFS metadata, schemas, and other metadata-related operations:
		</p>
		<ul>
			<li>Metadata schema validation</li>
			<li>IPFS hash generation</li>
			<li>Metadata encoding/decoding</li>
		</ul>
		<a href="/utils/metadata">Metadata Tools →</a>
	</div>
</div>
