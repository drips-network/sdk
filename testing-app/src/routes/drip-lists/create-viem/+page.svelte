<script lang="ts">
  import {walletStore} from '$lib/stores/wallet';
  import {
    operationStatus,
    updateOperationStatus,
    addLog,
    resetOperation,
  } from '$lib/stores/sdk';
  import {
    createViemSdk,
    validateFormReceivers,
    convertReceiversToSdkFormat,
    generateRandomId,
    localtestnet,
    type SdkSplitsReceiver,
  } from '$lib/utils/sdkFactory';
  import {expect as expectUntil} from '$lib/utils/expect';
  import {goto} from '$app/navigation';

  // Form state
  let privateKey = '';
  let rpcUrl = 'http://localhost:8545';
  let graphqlUrl = '';
  let pinataJwt = '';
  let pinataGateway = 'https://gateway.pinata.cloud';
  let dripListName = `Test Drip List (Viem) - ${generateRandomId()}`;
  let dripListDescription = 'A test drip list created using Viem adapter';
  let isVisible = true;

  let receivers = [
    {
      type: 'address',
      address: '0x945AFA63507e56748368D3F31ccC35043efDbd4b',
      projectUrl: '',
      dripListId: '',
      weight: 500000,
    },
    {
      type: 'project',
      address: '',
      projectUrl: 'https://github.com/drips-network/sdk',
      dripListId: '',
      weight: 500000,
    },
  ];

  // Status popup state
  let showStatusPopup = false;
  let createdDripListId: string | null = null;

  function addReceiver() {
    receivers = [
      ...receivers,
      {
        type: 'address',
        address: '',
        projectUrl: '',
        dripListId: '',
        weight: 0,
      },
    ];
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

  function showStatusMessage(
    message: string,
    type: 'info' | 'success' | 'error' | 'warning' = 'info',
  ) {
    updateOperationStatus({currentStep: message});
    addLog(message);
  }

  async function createDripListWithViem() {
    try {
      resetOperation();
      showStatusPopup = true;
      updateOperationStatus({isRunning: true, progress: 0});

      // Step 1: Validate inputs
      showStatusMessage('Validating inputs...', 'info');

      if (!pinataJwt || !pinataGateway) {
        throw new Error('Pinata JWT and Gateway are required');
      }

      if (!$walletStore.isConnected && !privateKey) {
        throw new Error('Either connect MetaMask or provide a private key');
      }

      // Convert and validate receivers
      const validation = validateFormReceivers(receivers);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }
      const sdkReceivers = convertReceiversToSdkFormat(receivers);

      updateOperationStatus({progress: 10});

      // Step 2: Set up wallet
      showStatusMessage('Setting up Viem wallet client...', 'info');

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
        'Creating Drips SDK instance with Viem adapter...',
        'info',
      );

      const {sdk, account} = await createViemSdk({
        privateKey: useConnectedWallet ? undefined : privateKey,
        useConnectedWallet,
        rpcUrl,
        graphqlUrl: graphqlUrl || undefined,
        pinataJwt,
        pinataGateway,
      });

      showStatusMessage(`Wallet account: ${account.address}`, 'success');
      if ($walletStore.isConnected) {
        showStatusMessage(
          `Connected wallet matches: ${$walletStore.address?.toLowerCase() === account.address?.toLowerCase()}`,
          'info',
        );
      }
      updateOperationStatus({progress: 40});

      // Step 4: Create drip list
      showStatusMessage('Creating drip list on blockchain...', 'info');

      const createResult = await sdk.dripLists.create({
        name: dripListName,
        description: dripListDescription,
        isVisible,
        receivers: sdkReceivers,
      });

      const {dripListId, salt, ipfsHash, txResponse} = createResult;

      showStatusMessage(`Drip list created! ID: ${dripListId}`, 'success');
      showStatusMessage(`Salt: ${salt}`, 'info');
      showStatusMessage(`IPFS Hash: ${ipfsHash}`, 'info');

      updateOperationStatus({progress: 70});

      // Step 5: Wait for transaction confirmation
      showStatusMessage('Waiting for transaction confirmation...', 'info');

      const {hash} = await txResponse.wait();
      showStatusMessage(`Transaction confirmed! Hash: ${hash}`, 'success');

      updateOperationStatus({progress: 75});

      // Step 6: Wait for indexing
      showStatusMessage(
        'Drip list created but not yet indexed. Waiting for indexing...',
        'warning',
      );

      const INDEXING_TIMEOUT = 120_000; // 2 minutes
      const POLLING_INTERVAL = 2_000; // 2 seconds

      let pollingAttempt = 0;
      const maxAttempts = Math.floor(INDEXING_TIMEOUT / POLLING_INTERVAL);

      const indexingResult = await expectUntil(
        () => {
          pollingAttempt++;
          // Update progress from 75% to 95% based on polling attempts
          const pollingProgress = 75 + (pollingAttempt / maxAttempts) * 20;
          updateOperationStatus({
            progress: Math.min(Math.floor(pollingProgress), 95),
          });
          showStatusMessage(
            `Checking indexing status... (attempt ${pollingAttempt}/${maxAttempts})`,
            'info',
          );

          return sdk.dripLists.getById(dripListId, localtestnet.id);
        },
        dripList => dripList !== null,
        INDEXING_TIMEOUT,
        POLLING_INTERVAL,
        true,
      );

      if (indexingResult.failed) {
        throw new Error('Drip list was not indexed within the timeout');
      }

      showStatusMessage(
        'Drip list has been indexed and can now be queried!',
        'success',
      );

      updateOperationStatus({progress: 95});

      // Step 7: Complete
      showStatusMessage(
        'Drip list creation and indexing completed successfully!',
        'success',
      );
      createdDripListId = dripListId.toString();

      updateOperationStatus({
        progress: 100,
        isRunning: false,
        result: {dripListId, salt, ipfsHash, txHash: hash},
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

  function viewCreatedDripList() {
    if (createdDripListId) {
      goto(`/drip-lists/get?id=${createdDripListId}`);
    }
  }

  function closeStatusPopup() {
    showStatusPopup = false;
  }
</script>

<div class="back-link">
  <a href="/drip-lists">← Back to Drip Lists</a>
</div>

<h1>Create Drip List (Viem)</h1>

<div class="info-box">
  <strong>📝 About this operation:</strong><br />
  This page replicates the "Create Drip List using Viem" integration test. It will
  set up a Viem wallet client, define split receivers, create the drip list, upload
  metadata to IPFS, and verify the creation.
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

<div class="step-indicator">Step 3: Define Drip List Metadata</div>

<div class="form-container">
  <div class="form-group">
    <label for="dripListName">Drip List Name:</label>
    <input type="text" id="dripListName" bind:value={dripListName} />
  </div>

  <div class="form-group">
    <label for="dripListDescription">Description:</label>
    <textarea id="dripListDescription" bind:value={dripListDescription}
    ></textarea>
  </div>

  <div class="form-group checkbox-group">
    <label for="isVisible">
      <input type="checkbox" id="isVisible" bind:checked={isVisible} />
      Make drip list visible
    </label>
  </div>
</div>

<div class="step-indicator">Step 4: Configure Split Receivers</div>

<div class="receivers-section">
  <h3>Split Receivers</h3>
  <p>
    Define who will receive the funds and their respective weights (total must
    equal 1,000,000).
  </p>

  {#each receivers as receiver, index}
    <div class="receiver-item">
      <div class="receiver-controls">
        <label>Type:</label>
        <select
          bind:value={receiver.type}
          on:change={() => handleReceiverTypeChange(index, receiver.type)}
        >
          <option value="address">Address</option>
          <option value="project">Project</option>
          <option value="drip-list">Drip List</option>
        </select>
        <button class="button" on:click={() => removeReceiver(index)}
          >🗑️ Remove</button
        >
      </div>

      {#if receiver.type === 'address'}
        <div class="form-group">
          <label>Address:</label>
          <input
            type="text"
            bind:value={receiver.address}
            placeholder="0x..."
          />
        </div>
      {:else if receiver.type === 'project'}
        <div class="form-group">
          <label>Project URL:</label>
          <input
            type="text"
            bind:value={receiver.projectUrl}
            placeholder="https://github.com/..."
          />
        </div>
      {:else if receiver.type === 'drip-list'}
        <div class="form-group">
          <label>Drip List ID:</label>
          <input
            type="text"
            bind:value={receiver.dripListId}
            placeholder="Enter drip list ID"
          />
        </div>
      {/if}

      <div class="form-group">
        <label>Weight:</label>
        <input
          type="number"
          bind:value={receiver.weight}
          min="1"
          max="1000000"
        />
      </div>
    </div>
  {/each}

  <button class="button" on:click={addReceiver}>+ Add Receiver</button>
</div>

<div class="step-indicator">Step 5: Execute Operation</div>

<div class="form-container">
  <button
    class="button primary"
    on:click={createDripListWithViem}
    disabled={$operationStatus.isRunning}
  >
    {#if $operationStatus.isRunning}
      🔄 Creating...
    {:else}
      🚀 Create Drip List with Viem
    {/if}
  </button>
</div>

<div class="info-box">
  <strong>⚠️ Note:</strong> This operation will interact with the blockchain and
  IPFS. Make sure you have sufficient funds for gas fees and valid API credentials.
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
        <h3>🚀 DRIP LIST CREATION STATUS</h3>
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

        {#if $operationStatus.result && createdDripListId}
          <div class="success-message">
            <strong>✅ Success!</strong> Drip List created successfully!
            <br /><strong>Drip List ID:</strong>
            <div class="drip-list-id">{createdDripListId}</div>
            <br /><button class="button" on:click={viewCreatedDripList}
              >View Drip List</button
            >
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

  .checkbox-group input[type='checkbox'] {
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
