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
	.form-group textarea,
	.form-group select {
		width: 100%;
		padding: 8px;
		border: 2px inset #c0c0c0;
		font-family: 'Courier New', monospace;
		background-color: white;
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
	<a href="/donations">← Back to Donations</a>
</div>

<h1>One-Time Donation (Viem)</h1>

<div class="info-box">
	<strong>📝 About this operation:</strong><br>
	This page replicates the "One-Time Donation using Viem" integration test. It will create a drip list, 
	set up a Viem wallet client, approve token spending, send the donation, and verify it was received.
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
	PHASE 1: CREATE DRIP LIST TO RECEIVE DONATION
</div>

<div class="step-indicator">
	Step 3: Define Drip List for Receiving Donation
</div>

<div class="form-container">
	<div class="form-group">
		<label for="dripListName">Drip List Name:</label>
		<input type="text" id="dripListName" value="Testing One-Time Donation to Drip List with Viem" />
	</div>
	
	<div class="form-group">
		<label for="dripListDescription">Description:</label>
		<textarea id="dripListDescription">A drip list to test one-time donations</textarea>
	</div>
	
	<div class="form-group">
		<label for="isVisible">
			<input type="checkbox" id="isVisible" checked /> 
			Make drip list visible
		</label>
	</div>
</div>

<div class="receivers-section">
	<h3>Split Receivers for Drip List</h3>
	<p>Define who will receive the donated funds (total weight must equal 1,000,000).</p>
	
	<div class="receiver-item">
		<div class="form-group">
			<label>Receiver Address:</label>
			<input type="text" value="0x945AFA63507e56748368D3F31ccC35043efDbd4b" />
		</div>
		<div class="form-group">
			<label>Weight:</label>
			<input type="number" value="1000000" min="1" max="1000000" />
		</div>
	</div>
</div>

<div class="phase-separator">
	PHASE 2: CONFIGURE AND SEND DONATION
</div>

<div class="step-indicator">
	Step 4: Configure Donation Parameters
</div>

<div class="form-container">
	<div class="form-group">
		<label for="donationAmount">Donation Amount:</label>
		<input type="number" id="donationAmount" value="1" min="1" />
		<small>Amount in token units (e.g., 1 = 1 token)</small>
	</div>
	
	<div class="form-group">
		<label for="erc20Token">ERC20 Token Address:</label>
		<input type="text" id="erc20Token" placeholder="0x..." />
		<small>Address of the ERC20 token to donate</small>
	</div>
	
	<div class="form-group">
		<label for="receiverType">Receiver Type:</label>
		<select id="receiverType">
			<option value="drip-list" selected>Drip List (created above)</option>
			<option value="address">Direct Address</option>
			<option value="project">Project</option>
		</select>
	</div>
</div>

<div class="step-indicator">
	Step 5: Execute Operation
</div>

<div class="form-container">
	<button class="button secondary">🏗️ Create Drip List First</button>
	<button class="button primary">💰 Send One-Time Donation with Viem</button>
	<button class="button">📋 Load from Environment</button>
	<button class="button">💾 Save Configuration</button>
</div>

<div class="info-box">
	<strong>⚠️ Note:</strong> This operation involves multiple blockchain transactions:
	<ol>
		<li>Create the drip list to receive donations</li>
		<li>Approve ERC20 token spending</li>
		<li>Send the one-time donation</li>
	</ol>
	Make sure you have sufficient funds for gas fees and the donation amount.
</div>

<div class="info-box">
	<strong>🔍 Verification:</strong> After sending the donation, the system will wait for indexing 
	and verify that the donation appears in the drip list's support data with the correct amount and token.
</div>
