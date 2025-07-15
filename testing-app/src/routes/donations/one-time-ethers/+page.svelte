<script lang="ts">
  import {walletStore} from '$lib/stores/wallet';
  import {
    operationStatus,
    updateOperationStatus,
    addLog,
    resetOperation,
  } from '$lib/stores/sdk';
  import {
    createEthersSdk,
    localtestnet,
    contractsRegistry,
  } from '$lib/utils/sdkFactory';
  import {expect as expectUntil} from '$lib/utils/expect';
  import {goto} from '$app/navigation';

  // ERC20 ABI for approve function
  const erc20Abi = [
    {
      inputs: [
        {name: 'spender', type: 'address'},
        {name: 'amount', type: 'uint256'},
      ],
      name: 'approve',
      outputs: [{name: '', type: 'bool'}],
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ] as const;

  // Form state
  let privateKey = '';
  let rpcUrl = 'http://localhost:8545';
  let graphqlUrl = '';
  let pinataJwt = '';
  let pinataGateway = 'https://gateway.pinata.cloud';

  // Drip list fetching
  let dripListId = '';
  let dripListIdBigInt: bigint | null = null;
  let fetchedDripList: any = null;
  let isFetching = false;
  let fetchError = '';

  // Donation configuration
  let donationAmount = 1;
  let erc20Token = '';
  let receiverType = 'drip-list';
  let receiverAddress = '';
  let receiverProjectUrl = '';
  let receiverDripListId = '';

  // Status popup state
  let showStatusPopup = false;
  let donationTxHash: string | null = null;

  function showStatusMessage(
    message: string,
    type: 'info' | 'success' | 'error' | 'warning' = 'info',
  ) {
    updateOperationStatus({currentStep: message});
    addLog(message);
  }

  async function fetchDripList() {
    if (!dripListId.trim()) {
      fetchError = 'Please enter a drip list ID';
      return;
    }

    try {
      isFetching = true;
      fetchError = '';
      fetchedDripList = null;

      // Create a minimal SDK instance just for fetching
      const {sdk} = await createEthersSdk({
        privateKey: $walletStore.isConnected
          ? undefined
          : privateKey ||
            '0x0000000000000000000000000000000000000000000000000000000000000001',
        useConnectedWallet: $walletStore.isConnected,
        rpcUrl,
        graphqlUrl: graphqlUrl || undefined,
        pinataJwt: pinataJwt || 'dummy',
        pinataGateway: pinataGateway || 'https://gateway.pinata.cloud',
      });

      // Convert string ID to bigint
      dripListIdBigInt = BigInt(dripListId);
      const dripList = await sdk.dripLists.getById(
        dripListIdBigInt,
        localtestnet.id,
      );

      if (!dripList) {
        throw new Error('Drip list not found');
      }

      fetchedDripList = dripList;
      fetchError = '';
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch drip list';
      fetchError = errorMessage;
      fetchedDripList = null;
    } finally {
      isFetching = false;
    }
  }

  async function sendOneTimeDonation() {
    try {
      resetOperation();
      showStatusPopup = true;
      updateOperationStatus({isRunning: true, progress: 0});

      // Step 1: Validate inputs
      showStatusMessage('Validating donation inputs...', 'info');

      if (!pinataJwt || !pinataGateway) {
        throw new Error('Pinata JWT and Gateway are required');
      }

      if (!$walletStore.isConnected && !privateKey) {
        throw new Error('Either connect MetaMask or provide a private key');
      }

      if (!erc20Token) {
        throw new Error('ERC20 token address is required');
      }

      if (
        receiverType === 'drip-list' &&
        !fetchedDripList &&
        !receiverDripListId
      ) {
        throw new Error('Please fetch a drip list or provide a drip list ID');
      }

      updateOperationStatus({progress: 10});

      // Step 2: Set up wallet
      showStatusMessage('Setting up Ethers wallet...', 'info');

      const useConnectedWallet = $walletStore.isConnected;
      if (useConnectedWallet) {
        showStatusMessage(
          `Using connected wallet: ${$walletStore.address}`,
          'info',
        );
      } else {
        showStatusMessage('Using private key for wallet setup...', 'info');
      }

      updateOperationStatus({progress: 20});

      // Step 3: Create SDK instance
      showStatusMessage(
        'Creating Drips SDK instance with Ethers adapter...',
        'info',
      );

      const {sdk, wallet, account} = await createEthersSdk({
        privateKey: useConnectedWallet ? undefined : privateKey,
        useConnectedWallet,
        rpcUrl,
        graphqlUrl: graphqlUrl || undefined,
        pinataJwt,
        pinataGateway,
      });

      showStatusMessage(`Wallet account: ${account.address}`, 'success');
      updateOperationStatus({progress: 30});

      // Step 4: Define donation parameters
      showStatusMessage('Defining donation parameters...', 'info');

      // Build receiver based on selected type
      let oneTimeDonationReceiver: any;
      if (receiverType === 'drip-list') {
        if (receiverDripListId) {
          oneTimeDonationReceiver = {
            type: 'drip-list' as const,
            accountId: BigInt(receiverDripListId),
          };
        } else {
          oneTimeDonationReceiver = {
            type: 'drip-list' as const,
            accountId: dripListIdBigInt,
          };
        }
      } else if (receiverType === 'address') {
        if (!receiverAddress) {
          throw new Error('Receiver address is required');
        }
        oneTimeDonationReceiver = {
          type: 'address' as const,
          address: receiverAddress as `0x${string}`,
        };
      } else if (receiverType === 'project') {
        if (!receiverProjectUrl) {
          throw new Error('Project URL is required');
        }
        oneTimeDonationReceiver = {
          type: 'project' as const,
          url: receiverProjectUrl,
        };
      }

      const donationAmountBigInt = BigInt(donationAmount);
      const erc20TokenAddress = erc20Token as `0x${string}`;

      updateOperationStatus({progress: 40});

      // Step 5: Approve token spending
      showStatusMessage('Approving token spending...', 'info');

      const addressDriverAddress =
        contractsRegistry[localtestnet.id as keyof typeof contractsRegistry]
          .addressDriver.address;

      // Create contract instance for token approval
      const {Contract} = await import('ethers');
      const tokenContract = new Contract(erc20TokenAddress, erc20Abi, wallet);

      const approveTx = await tokenContract.approve(
        addressDriverAddress,
        donationAmountBigInt,
      );

      showStatusMessage(
        `Token approval transaction sent with hash: ${approveTx.hash}`,
        'success',
      );

      // Wait for approval transaction to be mined
      await approveTx.wait();
      showStatusMessage('Token approval confirmed!', 'success');

      updateOperationStatus({progress: 60});

      // Step 6: Send the one-time donation
      showStatusMessage('Sending one-time donation...', 'info');

      const donationTxResponse = await sdk.donations.sendOneTime({
        receiver: oneTimeDonationReceiver,
        amount: donationAmountBigInt,
        erc20: erc20TokenAddress,
      });

      showStatusMessage('Donation transaction sent!', 'success');

      updateOperationStatus({progress: 75});

      // Step 6: Wait for donation transaction confirmation
      showStatusMessage(
        'Waiting for donation transaction confirmation...',
        'info',
      );

      const {hash} = await donationTxResponse.wait();
      showStatusMessage(
        `Donation transaction confirmed! Hash: ${hash}`,
        'success',
      );
      donationTxHash = hash;

      updateOperationStatus({progress: 85});

      // Step 7: Wait for indexing and verify donation (only for drip list donations)
      if (
        receiverType === 'drip-list' &&
        (dripListIdBigInt || receiverDripListId)
      ) {
        showStatusMessage(
          'Waiting for indexing and verifying donation support...',
          'info',
        );

        const INDEXING_TIMEOUT = 120_000; // 2 minutes
        const POLLING_INTERVAL = 2_000; // 2 seconds
        const ONE_MINUTE_MS = 60_000;

        // Use the correct drip list ID for verification
        const verificationDripListId = receiverDripListId
          ? BigInt(receiverDripListId)
          : dripListIdBigInt;

        const result = await expectUntil(
          () => sdk.dripLists.getById(verificationDripListId!, localtestnet.id),
          dripList => {
            if (
              !dripList ||
              !dripList.support ||
              dripList.support.length === 0
            ) {
              return false;
            }

            const oneMinuteAgo = Date.now() - ONE_MINUTE_MS;
            const donation = dripList.support.find(
              support =>
                support.__typename === 'OneTimeDonationSupport' &&
                support.date > oneMinuteAgo,
            );

            return donation !== undefined;
          },
          INDEXING_TIMEOUT,
          POLLING_INTERVAL,
          true,
        );

        if (result.failed) {
          throw new Error(
            'Donation was not indexed in drip list support within the timeout',
          );
        }

        const dripList = result.result!;

        // Step 8: Verify donation data
        showStatusMessage('Verifying donation support data...', 'info');

        const oneMinuteAgo = Date.now() - ONE_MINUTE_MS;
        const donation = dripList.support.find(
          support =>
            support.__typename === 'OneTimeDonationSupport' &&
            support.date > oneMinuteAgo,
        );

        if (!donation || donation.__typename !== 'OneTimeDonationSupport') {
          throw new Error('Donation not found in support data');
        }

        showStatusMessage(
          `✓ Donation verified! Amount: ${donation.amount.amount} ${donation.amount.tokenAddress}`,
          'success',
        );
      } else {
        // For address and project donations, we can't verify through drip list support
        showStatusMessage(
          'Donation sent successfully! (Verification not available for address/project donations)',
          'success',
        );
      }

      updateOperationStatus({progress: 95});

      // Step 9: Complete
      showStatusMessage(
        'One-time donation sent and verified successfully!',
        'success',
      );

      updateOperationStatus({
        progress: 100,
        isRunning: false,
        result: {
          dripListId: dripListId,
          donationTxHash: hash,
          donationAmount: donationAmountBigInt.toString(),
          erc20Token: erc20TokenAddress,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      showStatusMessage(`Error: ${errorMessage}`, 'error');
      updateOperationStatus({
        isRunning: false,
        error: errorMessage,
      });
    }
  }

  function viewDripList() {
    if (dripListId) {
      goto(`/drip-lists/get?id=${dripListId}`);
    }
  }

  function closeStatusPopup() {
    showStatusPopup = false;
  }
</script>

<div class="back-link">
  <a href="/donations">← Back to Donations</a>
</div>

<h1>One-Time Donation (Ethers)</h1>

<div class="info-box">
  <strong>📝 About this operation:</strong><br />
  This page replicates the "One-Time Donation using Ethers" integration test. It
  will fetch an existing drip list, set up an Ethers wallet, send the donation, and
  verify it was received.
</div>

<div class="step-indicator">Step 1: Configure Wallet and Network Settings</div>

<div class="form-container">
  {#if $walletStore.isConnected}
    <div class="wallet-status">
      ✅ Wallet Connected: {$walletStore.address?.slice(
        0,
        6,
      )}...{$walletStore.address?.slice(-4)}
      <br /><small>Using connected wallet for transactions</small>
    </div>
  {:else}
    <div class="wallet-status disconnected">
      ❌ No Wallet Connected - Using Private Key Input
    </div>
    <div class="form-group">
      <label for="privateKey">Private Key:</label>
      <input
        type="password"
        id="privateKey"
        bind:value={privateKey}
        placeholder="0x..."
      />
    </div>
  {/if}

  <div class="form-group">
    <label for="rpcUrl">RPC URL:</label>
    <input type="text" id="rpcUrl" bind:value={rpcUrl} />
  </div>

  <div class="form-group">
    <label for="graphqlUrl">GraphQL URL (optional):</label>
    <input
      type="text"
      id="graphqlUrl"
      bind:value={graphqlUrl}
      placeholder="https://api.example.com/graphql (leave empty for default)"
    />
  </div>
</div>

<div class="step-indicator">Step 2: Configure IPFS Settings</div>

<div class="form-container">
  <div class="form-group">
    <label for="pinataJwt">Pinata JWT:</label>
    <input
      type="password"
      id="pinataJwt"
      bind:value={pinataJwt}
      placeholder="Your Pinata JWT token"
    />
  </div>

  <div class="form-group">
    <label for="pinataGateway">Pinata Gateway:</label>
    <input
      type="text"
      id="pinataGateway"
      bind:value={pinataGateway}
      placeholder="https://gateway.pinata.cloud"
    />
  </div>
</div>

<div class="step-indicator">Step 3: Fetch Existing Drip List</div>

<div class="form-container">
  <div class="form-group">
    <label for="dripListId">Drip List ID to Receive Donation:</label>
    <input
      type="text"
      id="dripListId"
      bind:value={dripListId}
      placeholder="Enter the ID of the drip list to receive the donation"
    />
  </div>

  <button
    class="button"
    on:click={fetchDripList}
    disabled={isFetching || !dripListId.trim()}
  >
    {#if isFetching}
      🔄 Fetching...
    {:else}
      📥 Fetch Drip List
    {/if}
  </button>

  {#if fetchError}
    <div class="error-message">
      <strong>❌ Error:</strong>
      {fetchError}
    </div>
  {/if}

  {#if fetchedDripList}
    <div class="success-message">
      <strong>✅ Drip List Fetched Successfully!</strong>
      <br />Name: {fetchedDripList.name || 'Unnamed'}
      <br />Description: {fetchedDripList.description || 'No description'}
      <br />Visible: {fetchedDripList.isVisible ? 'Yes' : 'No'}
      <br />Splits Receivers: {fetchedDripList.receivers?.length || 0}
    </div>
  {/if}
</div>

<div class="step-indicator">Step 4: Configure Donation Parameters</div>

<div class="form-container">
  <div class="form-group">
    <label for="donationAmount">Donation Amount:</label>
    <input
      type="number"
      id="donationAmount"
      bind:value={donationAmount}
      min="1"
    />
    <small>Amount in token units</small>
  </div>

  <div class="form-group">
    <label for="erc20Token">ERC20 Token Address:</label>
    <input
      type="text"
      id="erc20Token"
      bind:value={erc20Token}
      placeholder="0x..."
    />
    <small>Address of the ERC20 token to donate</small>
  </div>

  <div class="form-group">
    <label for="receiverType">Receiver Type:</label>
    <select id="receiverType" bind:value={receiverType}>
      <option value="drip-list" selected>Drip List (fetched above)</option>
      <option value="address">Direct Address</option>
      <option value="project">Project</option>
    </select>
  </div>

  {#if receiverType === 'address'}
    <div class="form-group">
      <label for="receiverAddress">Receiver Address:</label>
      <input
        type="text"
        id="receiverAddress"
        bind:value={receiverAddress}
        placeholder="0x..."
      />
      <small>Ethereum address to receive the donation</small>
    </div>
  {:else if receiverType === 'project'}
    <div class="form-group">
      <label for="receiverProjectUrl">Project URL:</label>
      <input
        type="text"
        id="receiverProjectUrl"
        bind:value={receiverProjectUrl}
        placeholder="https://github.com/..."
      />
      <small>GitHub project URL to receive the donation</small>
    </div>
  {:else if receiverType === 'drip-list' && receiverDripListId}
    <div class="form-group">
      <label for="receiverDripListId">Custom Drip List ID:</label>
      <input
        type="text"
        id="receiverDripListId"
        bind:value={receiverDripListId}
        placeholder="Enter different drip list ID (optional)"
      />
      <small>Leave empty to use the fetched drip list above</small>
    </div>
  {/if}
</div>

<div class="step-indicator">Step 5: Execute Operation</div>

<div class="form-container">
  <button
    class="button primary"
    on:click={sendOneTimeDonation}
    disabled={$operationStatus.isRunning}
  >
    {#if $operationStatus.isRunning}
      🔄 Sending...
    {:else}
      💰 Send One-Time Donation with Ethers
    {/if}
  </button>
</div>

<div class="info-box">
  <strong>⚠️ Note:</strong> This operation will send a one-time donation to the specified
  receiver. Make sure you have sufficient funds for gas fees and the donation amount.
</div>

<div class="info-box">
  <strong>🔍 Verification:</strong> After sending the donation, the system will wait
  for indexing and verify that the donation appears in the receiver's support data
  with the correct amount and token.
</div>

<!-- Status Popup -->
{#if showStatusPopup}
  <div
    class="popup-overlay"
    on:click={closeStatusPopup}
    role="button"
    tabindex="0"
    on:keydown={e => e.key === 'Escape' && closeStatusPopup()}
  >
    <div
      class="popup-content retro-popup"
      on:click|stopPropagation
      role="dialog"
      tabindex="-1"
    >
      <div class="popup-header">
        <h3>💰 ONE-TIME DONATION STATUS</h3>
        <button class="close-button" on:click={closeStatusPopup}>×</button>
      </div>

      <div class="status-content">
        <div class="progress-bar">
          <div
            class="progress-fill"
            style="width: {$operationStatus.progress}%"
          ></div>
        </div>
        <div class="progress-text">{$operationStatus.progress}% Complete</div>

        <div class="current-step">
          <strong>Current Step:</strong>
          {$operationStatus.currentStep}
        </div>

        {#if $operationStatus.error}
          <div class="error-message">
            <strong>❌ Error:</strong>
            {$operationStatus.error}
          </div>
        {/if}

        {#if $operationStatus.result && donationTxHash}
          <div class="success-message">
            <strong>✅ Success!</strong>
            One-time donation sent and verified successfully!
            <br /><strong>Transaction Hash:</strong>
            <div class="drip-list-id">{donationTxHash}</div>
            {#if receiverType === 'drip-list'}
              <br /><strong>Drip List ID:</strong>
              <div class="drip-list-id">{dripListId}</div>
              <br /><button class="button" on:click={viewDripList}
                >View Drip List</button
              >
            {/if}
          </div>
        {/if}

        <div class="logs-section">
          <h4>Operation Logs:</h4>
          <div class="logs-container">
            {#each $operationStatus.logs as log}
              <div class="log-entry">{log}</div>
            {/each}
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

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
    box-sizing: border-box;
  }

  .form-group textarea {
    height: 80px;
    resize: vertical;
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

  .error-message {
    margin: 15px 0;
    padding: 10px;
    background-color: #ffcccc;
    border: 2px solid #ff0000;
    color: #cc0000;
    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: break-word;
  }

  .success-message {
    margin: 15px 0;
    padding: 10px;
    background-color: #ccffcc;
    border: 2px solid #00ff00;
    color: #006600;
    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: break-word;
  }

  .button:disabled {
    background-color: #808080;
    color: #c0c0c0;
    cursor: not-allowed;
  }

  /* Popup Styles - Retro 90s Theme */
  .popup-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.8);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }

  .popup-content {
    background-color: #c0c0c0;
    border: 4px outset #c0c0c0;
    color: #000000;
    font-family: 'Courier New', monospace;
    width: 90%;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    overflow-x: auto;
    box-shadow: 4px 4px 8px rgba(0, 0, 0, 0.5);
    word-wrap: break-word;
    overflow-wrap: break-word;
  }

  .retro-popup {
    background: linear-gradient(
      45deg,
      #c0c0c0 25%,
      #d0d0d0 25%,
      #d0d0d0 50%,
      #c0c0c0 50%,
      #c0c0c0 75%,
      #d0d0d0 75%
    );
    background-size: 8px 8px;
  }

  .popup-header {
    background-color: #000080;
    color: white;
    padding: 15px;
    border-bottom: 2px solid #808080;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .popup-header h3 {
    margin: 0;
    color: white;
    font-size: 18px;
    text-shadow: 1px 1px 0px #000000;
  }

  .close-button {
    background-color: #c0c0c0;
    border: 2px outset #c0c0c0;
    color: #000000;
    font-size: 20px;
    cursor: pointer;
    padding: 5px 10px;
    font-family: 'Courier New', monospace;
    font-weight: bold;
  }

  .close-button:hover {
    background-color: #e0e0e0;
  }

  .close-button:active {
    border: 2px inset #c0c0c0;
  }

  .status-content {
    padding: 20px;
    background-color: #f0f0f0;
  }

  .progress-bar {
    width: 100%;
    height: 20px;
    background-color: #808080;
    border: 2px inset #c0c0c0;
    margin: 10px 0;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #00ff00, #008000);
    transition: width 0.3s ease;
    border-right: 2px solid #004000;
  }

  .progress-text {
    text-align: center;
    font-weight: bold;
    margin: 10px 0;
    color: #000080;
  }

  .current-step {
    margin: 15px 0;
    padding: 10px;
    background-color: #e0e0e0;
    border: 2px inset #c0c0c0;
    color: #000080;
    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: break-word;
  }

  .drip-list-id {
    font-family: 'Courier New', monospace;
    background-color: #ffffff;
    border: 1px inset #c0c0c0;
    padding: 8px;
    margin: 8px 0;
    word-break: break-all;
    font-size: 12px;
    max-width: 100%;
    overflow-wrap: break-word;
  }

  .logs-section {
    margin-top: 20px;
  }

  .logs-section h4 {
    color: #000080;
    margin-bottom: 10px;
  }

  .logs-container {
    max-height: 200px;
    overflow-y: auto;
    background-color: #ffffff;
    border: 2px inset #c0c0c0;
    padding: 10px;
  }

  .log-entry {
    font-size: 12px;
    margin: 2px 0;
    color: #000000;
    font-family: 'Courier New', monospace;
    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: break-word;
  }
</style>
