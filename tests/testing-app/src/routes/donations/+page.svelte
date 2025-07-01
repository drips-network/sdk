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
	
	.donation-types {
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

<h1>💰 Donations Module</h1>

<p>
	The donations module allows you to send funds to drip lists and other receivers. 
	You can send one-time donations (immediate transfers) or continuous donations (streams over time).
</p>

<div class="donation-types">
	<h3>Donation Types:</h3>
	<ul>
		<li><strong>One-Time Donations:</strong> Send a fixed amount immediately to a receiver</li>
		<li><strong>Continuous Donations:</strong> Set up a stream that sends tokens over time at a specified rate</li>
	</ul>
</div>

<div class="operations">
	<div class="operation" class:disabled={!canPerformWriteOperations()}>
		<h3>One-Time Donation (Viem) <span class="access-indicator write">🔒 WRITE</span></h3>
		<p>
			Send a one-time donation using the Viem blockchain adapter. This operation will:
		</p>
		<ul>
			<li>Create a drip list to receive the donation</li>
			<li>Set up a Viem wallet client</li>
			<li>Approve ERC20 token spending</li>
			<li>Send the one-time donation</li>
			<li>Verify the donation was received</li>
		</ul>
		<a href="/donations/one-time-viem">Send One-Time (Viem) →</a>
	</div>
	
	<div class="operation" class:disabled={!canPerformWriteOperations()}>
		<h3>One-Time Donation (Ethers) <span class="access-indicator write">🔒 WRITE</span></h3>
		<p>
			Send a one-time donation using the Ethers blockchain adapter. This operation will:
		</p>
		<ul>
			<li>Create a drip list to receive the donation</li>
			<li>Set up an Ethers wallet/signer</li>
			<li>Approve ERC20 token spending</li>
			<li>Send the one-time donation</li>
			<li>Verify the donation was received</li>
		</ul>
		<a href="/donations/one-time-ethers">Send One-Time (Ethers) →</a>
	</div>
	
	<div class="operation" class:disabled={!canPerformWriteOperations()}>
		<h3>Continuous Donation (Viem) <span class="access-indicator write">🔒 WRITE</span></h3>
		<p>
			Set up a continuous donation stream using the Viem blockchain adapter. This operation will:
		</p>
		<ul>
			<li>Create a drip list to receive the stream</li>
			<li>Set up a Viem wallet client</li>
			<li>Configure stream parameters (rate, duration)</li>
			<li>Approve and top-up the stream</li>
			<li>Verify the stream was created</li>
		</ul>
		<a href="/donations/continuous-viem">Send Continuous (Viem) →</a>
	</div>
	
	<div class="operation" class:disabled={!canPerformWriteOperations()}>
		<h3>Continuous Donation (Ethers) <span class="access-indicator write">🔒 WRITE</span></h3>
		<p>
			Set up a continuous donation stream using the Ethers blockchain adapter. This operation will:
		</p>
		<ul>
			<li>Create a drip list to receive the stream</li>
			<li>Set up an Ethers wallet/signer</li>
			<li>Configure stream parameters (rate, duration)</li>
			<li>Approve and top-up the stream</li>
			<li>Verify the stream was created</li>
		</ul>
		<a href="/donations/continuous-ethers">Send Continuous (Ethers) →</a>
	</div>
</div>
