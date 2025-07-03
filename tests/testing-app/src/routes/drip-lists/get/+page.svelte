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
    createRandomReadonlySdk,
    localtestnet,
  } from '$lib/utils/sdkFactory';
  import type {DripsSdk, DripList} from 'drips-sdk-test-0';

  // Form state
  let graphqlUrl = '';
  let dripListId = '';

  // Results state
  let dripListData: any = null;
  let isLoading = false;

  function showStatusMessage(
    message: string,
    type: 'info' | 'success' | 'error' | 'warning' = 'info',
  ) {
    updateOperationStatus({currentStep: message});
    addLog(message);
  }

  async function getDripList() {
    try {
      resetOperation();
      isLoading = true;
      dripListData = null;
      updateOperationStatus({isRunning: true, progress: 0});

      // Step 1: Validate inputs
      showStatusMessage('Validating inputs...', 'info');

      if (!dripListId) {
        throw new Error('Drip List ID is required');
      }

      updateOperationStatus({progress: 10});

      // Step 2: Set up SDK
      showStatusMessage('Setting up SDK...', 'info');

      let sdk: DripsSdk;
      let adapterUsed: string;

      if ($walletStore.isConnected) {
        showStatusMessage(
          `Using connected wallet: ${$walletStore.address}`,
          'info',
        );

        // Use connected wallet with Viem
        const {sdk: connectedSdk} = await createViemSdk({
          useConnectedWallet: true,
          rpcUrl: 'http://localhost:8545',
          graphqlUrl: graphqlUrl || undefined,
          pinataJwt: 'dummy', // Not needed for read operations
          pinataGateway: 'dummy', // Not needed for read operations
        });

        sdk = connectedSdk;
        adapterUsed = 'viem (connected wallet)';
      } else {
        showStatusMessage(
          'No wallet connected, creating readonly adapter...',
          'info',
        );

        // Create random readonly adapter
        const {sdk: readonlySdk, adapterUsed: randomAdapter} =
          await createRandomReadonlySdk({
            rpcUrl: 'http://localhost:8545',
            graphqlUrl: graphqlUrl || undefined,
            adapter: 'viem', // This will be overridden by random selection
          });

        sdk = readonlySdk;
        adapterUsed = `${randomAdapter} (readonly)`;
      }

      showStatusMessage(`SDK created using ${adapterUsed} adapter`, 'success');
      updateOperationStatus({progress: 30});

      // Step 3: Query drip list
      showStatusMessage(`Querying drip list with ID: ${dripListId}...`, 'info');

      const dripList = await sdk.dripLists.getById(
        BigInt(dripListId),
        localtestnet.id,
      );
      console.log('💧💧💧💧💧💧 ~ getDripList ~ dripList:', dripList);

      if (!dripList) {
        throw new Error(`Drip List with ID ${dripListId} not found`);
      }

      showStatusMessage('Drip list retrieved successfully!', 'success');
      updateOperationStatus({progress: 80});

      // Step 4: Store raw drip list data for JSON display
      showStatusMessage('Preparing JSON representation...', 'info');

      // Store the raw drip list object for pretty JSON display
      dripListData = {
        dripList,
        adapterUsed,
      };

      updateOperationStatus({progress: 100});
      showStatusMessage('Operation completed successfully!', 'success');

      updateOperationStatus({
        isRunning: false,
        result: dripListData,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      showStatusMessage(`Error: ${errorMessage}`, 'error');
      updateOperationStatus({
        isRunning: false,
        error: errorMessage,
      });
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="back-link">
  <a href="/drip-lists">← Back to Drip Lists</a>
</div>

<h1>Get Drip List</h1>

<div class="info-box">
  <strong>📖 About this operation:</strong><br />
  This operation queries the Drips network to retrieve information about an existing
  drip list. It will fetch the drip list metadata, receivers, weights, and current
  statistics from the GraphQL API and IPFS.
</div>

<div class="step-indicator">Step 1: Configure Network Settings</div>

{#if $walletStore.isConnected}
  <div class="wallet-status">
    ✅ Wallet Connected: {$walletStore.address?.slice(
      0,
      6,
    )}...{$walletStore.address?.slice(-4)}
    <br /><small>Using connected wallet for queries</small>
  </div>
{:else}
  <div class="wallet-status disconnected">
    ❌ No Wallet Connected - Using Random Readonly Adapter
  </div>
{/if}

<div class="form-container">
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

<div class="step-indicator">Step 2: Specify Drip List to Query</div>

<div class="form-container">
  <div class="form-group">
    <label for="dripListId">Drip List ID:</label>
    <input
      type="text"
      id="dripListId"
      bind:value={dripListId}
      placeholder="Enter drip list ID (e.g., 123456789)"
    />
  </div>
</div>

<div class="step-indicator">Step 3: Execute Query</div>

<div class="form-container">
  <button
    class="button primary"
    on:click={getDripList}
    disabled={isLoading || $operationStatus.isRunning}
  >
    {#if isLoading || $operationStatus.isRunning}
      🔄 Querying...
    {:else}
      🔍 Get Drip List
    {/if}
  </button>
</div>

<div class="step-indicator">Results</div>

<div class="result-container">
  {#if $operationStatus.isRunning}
    <div class="operation-status">
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
    </div>
  {:else if $operationStatus.error}
    <div class="error-message">
      <strong>❌ Error:</strong>
      {$operationStatus.error}
    </div>
  {:else if dripListData}
    <div class="success-message">
      <strong>✅ Drip List Retrieved Successfully!</strong>
      <br /><strong>Adapter Used:</strong>
      {dripListData.adapterUsed}
    </div>

    <div class="json-display">
      <h3>📋 Drip List JSON</h3>
      <pre class="json-content">{JSON.stringify(
          dripListData.dripList,
          null,
          2,
        )}</pre>
    </div>
  {:else}
    <strong>Query results will appear here...</strong>
    <br /><br />
    <em
      >Click "Get Drip List" to execute the query and see the drip list
      information.</em
    >
  {/if}

  {#if $operationStatus.logs.length > 0}
    <div class="logs-section">
      <h4>📝 Operation Logs:</h4>
      <div class="logs-container">
        {#each $operationStatus.logs as log}
          <div class="log-entry">{log}</div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<div class="info-box">
  <strong>ℹ️ Note:</strong> This is a read-only operation that doesn't require wallet
  connection or gas fees. It only queries existing data from the network.
</div>

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

  .operation-status {
    margin: 15px 0;
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
  }

  .error-message {
    margin: 15px 0;
    padding: 10px;
    background-color: #ffcccc;
    border: 2px solid #ff0000;
    color: #cc0000;
  }

  .success-message {
    margin: 15px 0;
    padding: 10px;
    background-color: #ccffcc;
    border: 2px solid #00ff00;
    color: #006600;
  }

  .json-display {
    margin: 20px 0;
    padding: 15px;
    background-color: #ffffff;
    border: 2px inset #c0c0c0;
  }

  .json-display h3 {
    color: #000080;
    margin: 0 0 15px 0;
  }

  .json-content {
    background-color: #f8f8f8;
    border: 2px inset #c0c0c0;
    padding: 15px;
    margin: 0;
    overflow-x: auto;
    white-space: pre-wrap;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    line-height: 1.4;
    color: #000000;
    max-height: 500px;
    overflow-y: auto;
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
    font-size: 11px;
    margin: 2px 0;
    color: #000000;
    font-family: 'Courier New', monospace;
  }
</style>
