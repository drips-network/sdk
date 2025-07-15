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
  import type {DripsSdk} from 'drips-sdk-test-2';
  import {
    calcAddressId,
    contractsRegistry,
    utils,
    collect,
    createViemWriteAdapter,
  } from 'drips-sdk-test-2';
  import type {WriteBlockchainAdapter} from 'drips-sdk-test-2';

  // Define SupportedChain type locally since it's not exported
  type SupportedChain = keyof typeof contractsRegistry;

  // Define dripsAbi locally with just the split function we need
  const dripsAbi = [
    {
      inputs: [
        {internalType: 'uint256', name: 'accountId', type: 'uint256'},
        {internalType: 'contract IERC20', name: 'erc20', type: 'address'},
        {
          components: [
            {internalType: 'uint256', name: 'accountId', type: 'uint256'},
            {internalType: 'uint32', name: 'weight', type: 'uint32'},
          ],
          internalType: 'struct SplitsReceiver[]',
          name: 'currReceivers',
          type: 'tuple[]',
        },
      ],
      name: 'split',
      outputs: [
        {internalType: 'uint128', name: 'collectableAmt', type: 'uint128'},
        {internalType: 'uint128', name: 'splitAmt', type: 'uint128'},
      ],
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ] as const;

  // Form state
  let graphqlUrl = '';
  let accountId = '';
  let tokenAddress = '';

  // Results state
  let withdrawableBalances: any = null;
  let isLoading = false;
  let hasCollectableAmount = false;
  let hasSplittableAmount = false;

  function showStatusMessage(
    message: string,
    type: 'info' | 'success' | 'error' | 'warning' = 'info',
  ) {
    updateOperationStatus({currentStep: message});
    addLog(message);
  }

  async function fetchWithdrawableBalances() {
    try {
      resetOperation();
      isLoading = true;
      withdrawableBalances = null;
      hasCollectableAmount = false;
      updateOperationStatus({isRunning: true, progress: 0});

      // Step 1: Validate inputs
      showStatusMessage('Validating inputs...', 'info');

      if (!accountId) {
        throw new Error('Account ID is required');
      }

      // Validate account ID format (should be a valid Ethereum address)
      if (!/^0x[a-fA-F0-9]{40}$/.test(accountId)) {
        throw new Error('Account ID must be a valid Ethereum address (0x...)');
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

      // Debug: Check SDK structure
      console.log('SDK object:', sdk);
      console.log('SDK users module:', sdk.users);
      console.log(
        'SDK users getWithdrawableBalances:',
        sdk.users?.getWithdrawableBalances,
      );

      // Step 3: Query withdrawable balances
      showStatusMessage(
        `Querying withdrawable balances for account: ${accountId}...`,
        'info',
      );

      if (!sdk.users || !sdk.users.getWithdrawableBalances) {
        throw new Error(
          'SDK users module or getWithdrawableBalances method not available',
        );
      }

      const balances = await sdk.users.getWithdrawableBalances(
        accountId as `0x${string}`,
        localtestnet.id,
      );

      showStatusMessage(
        'Withdrawable balances retrieved successfully!',
        'success',
      );
      updateOperationStatus({progress: 80});

      // Step 4: Process results and check for collectable amounts
      showStatusMessage('Processing results...', 'info');

      // Check if there are any collectable amounts and splittable amounts
      let totalCollectable = false;
      let totalSplittable = false;
      if (balances && balances.length > 0) {
        for (const chainData of balances) {
          if (
            chainData.withdrawableBalances &&
            chainData.withdrawableBalances.length > 0
          ) {
            for (const balance of chainData.withdrawableBalances) {
              if (
                balance.collectableAmount &&
                BigInt(balance.collectableAmount) > 0n
              ) {
                totalCollectable = true;
              }
              if (
                balance.splittableAmount &&
                BigInt(balance.splittableAmount) > 0n
              ) {
                totalSplittable = true;
              }
            }
          }
          if (totalCollectable && totalSplittable) break;
        }
      }

      hasCollectableAmount = totalCollectable;
      hasSplittableAmount = totalSplittable;

      // Store the raw balances data for JSON display
      withdrawableBalances = {
        balances,
        adapterUsed,
        hasCollectableAmount: totalCollectable,
        hasSplittableAmount: totalSplittable,
      };

      updateOperationStatus({progress: 100});
      showStatusMessage('Operation completed successfully!', 'success');

      updateOperationStatus({
        isRunning: false,
        result: withdrawableBalances,
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

  async function splitFunds() {
    try {
      resetOperation();
      updateOperationStatus({isRunning: true, progress: 0});

      showStatusMessage('Starting split process...', 'info');

      if (!$walletStore.isConnected) {
        throw new Error('Wallet must be connected to split funds');
      }

      if (!tokenAddress) {
        throw new Error('Token address is required for split operation');
      }

      // Validate token address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
        throw new Error(
          'Token address must be a valid Ethereum address (0x...)',
        );
      }

      updateOperationStatus({progress: 20});

      // Set up SDK with connected wallet
      showStatusMessage('Setting up SDK for split operation...', 'info');

      const {sdk, walletClient} = await createViemSdk({
        useConnectedWallet: true,
        rpcUrl: 'http://localhost:8545',
        graphqlUrl: graphqlUrl || undefined,
        pinataJwt: 'dummy',
        pinataGateway: 'dummy',
      });

      updateOperationStatus({progress: 40});

      showStatusMessage('Calculating account ID...', 'info');

      const adapter = createViemWriteAdapter(walletClient);

      // Calculate account ID using the SDK utility
      const calculatedAccountId = await calcAddressId(
        adapter,
        accountId as `0x${string}`,
      );

      showStatusMessage(
        `Account ID calculated: ${calculatedAccountId}`,
        'info',
      );
      updateOperationStatus({progress: 60});

      showStatusMessage('Preparing split transaction...', 'info');

      // Get drips contract address
      const dripsContractAddress =
        contractsRegistry[localtestnet.id as SupportedChain].drips.address;

      updateOperationStatus({progress: 80});

      showStatusMessage('Sending split transaction...', 'info');

      // Send split transaction directly using walletClient
      const splitTxResponse = await walletClient.writeContract({
        address: dripsContractAddress,
        abi: dripsAbi,
        functionName: 'split',
        args: [calculatedAccountId, tokenAddress as `0x${string}`, []],
      });

      showStatusMessage(
        `Split transaction sent: ${splitTxResponse.hash}`,
        'success',
      );

      // Wait for confirmation
      showStatusMessage('Waiting for transaction confirmation...', 'info');
      // For viem, we need to wait for the transaction receipt
      const receipt = await walletClient.waitForTransactionReceipt({
        hash: splitTxResponse,
      });

      updateOperationStatus({progress: 100});
      showStatusMessage('Split operation completed successfully!', 'success');

      updateOperationStatus({
        isRunning: false,
        result: {
          transactionHash: splitTxResponse,
          accountId: calculatedAccountId,
          tokenAddress,
          message: 'Split operation completed successfully',
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

  async function collectFunds() {
    try {
      resetOperation();
      updateOperationStatus({isRunning: true, progress: 0});

      showStatusMessage('Starting collection process...', 'info');

      if (!$walletStore.isConnected) {
        throw new Error('Wallet must be connected to collect funds');
      }

      if (!tokenAddress) {
        throw new Error('Token address is required for collect operation');
      }

      // Validate token address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
        throw new Error(
          'Token address must be a valid Ethereum address (0x...)',
        );
      }

      updateOperationStatus({progress: 20});

      // Set up SDK with connected wallet
      showStatusMessage('Setting up SDK for collection...', 'info');

      const {sdk, walletClient} = await createViemSdk({
        useConnectedWallet: true,
        rpcUrl: 'http://localhost:8545',
        graphqlUrl: graphqlUrl || undefined,
        pinataJwt: 'dummy',
        pinataGateway: 'dummy',
      });

      updateOperationStatus({progress: 40});

      showStatusMessage('Calculating account ID...', 'info');

      const adapter = createViemWriteAdapter(walletClient);

      // Calculate account ID using the SDK utility
      const calculatedAccountId = await calcAddressId(
        adapter,
        accountId as `0x${string}`,
      );

      showStatusMessage(
        `Account ID calculated: ${calculatedAccountId}`,
        'info',
      );
      updateOperationStatus({progress: 60});

      showStatusMessage('Preparing collection transaction...', 'info');

      // Use the SDK's collect function
      const collectTxResponse = await sdk.collect({
        accountId: calculatedAccountId,
        currentReceivers: [],
        tokenAddresses: [tokenAddress as `0x${string}`],
      });

      showStatusMessage(
        `Collection transaction sent: ${collectTxResponse.hash}`,
        'success',
      );
      updateOperationStatus({progress: 80});

      // Wait for confirmation
      showStatusMessage('Waiting for transaction confirmation...', 'info');
      const {hash: collectHash} = await collectTxResponse.wait();

      updateOperationStatus({progress: 100});
      showStatusMessage(
        'Collection process completed successfully!',
        'success',
      );

      updateOperationStatus({
        isRunning: false,
        result: {
          transactionHash: collectHash,
          accountId: calculatedAccountId,
          tokenAddress,
          message: 'Collection completed successfully',
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
</script>

<div class="back-link">
  <a href="/">← Back to Home</a>
</div>

<h1>Collect Funds</h1>

<div class="info-box">
  <strong>💰 About this operation:</strong><br />
  This operation allows you to check, split, and collect withdrawable funds for a
  specific account. It will query the Drips network to find any splittable and collectable
  amounts.
  <br /><br />
  <strong>Split:</strong> Makes received funds available for collection by
  processing them through the splits system.
  <br />
  <strong>Collect:</strong> Transfers the collectable funds to your wallet.
</div>

<div class="step-indicator">Step 1: Configure Network Settings</div>

{#if $walletStore.isConnected}
  <div class="wallet-status">
    ✅ Wallet Connected: {$walletStore.address?.slice(
      0,
      6,
    )}...{$walletStore.address?.slice(-4)}
    <br /><small>Using connected wallet for queries and transactions</small>
  </div>
{:else}
  <div class="wallet-status disconnected">
    ❌ No Wallet Connected - Using Random Readonly Adapter for queries only
    <br /><small>Connect wallet to enable fund collection</small>
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

<div class="step-indicator">
  Step 2: Check Account, Split, and Collect Funds
</div>

<div class="form-container">
  <div class="form-group">
    <label for="accountId">Address:</label>
    <input
      type="text"
      id="accountId"
      bind:value={accountId}
      placeholder="0x1234567890123456789012345678901234567890"
    />
    <small>Enter the address to check for withdrawable funds</small>
  </div>

  <div class="form-group">
    <label for="tokenAddress">Token Address:</label>
    <input
      type="text"
      id="tokenAddress"
      bind:value={tokenAddress}
      placeholder="0x1234567890123456789012345678901234567890"
    />
    <small>Enter the ERC20 token address for split/collect operations</small>
  </div>

  <div class="button-group">
    <button
      class="button primary"
      on:click={fetchWithdrawableBalances}
      disabled={isLoading || $operationStatus.isRunning}
    >
      {#if isLoading || $operationStatus.isRunning}
        🔄 Checking...
      {:else}
        🔍 Check Withdrawable Balances
      {/if}
    </button>

    <button
      class="button split"
      on:click={splitFunds}
      disabled={!hasSplittableAmount ||
        !$walletStore.isConnected ||
        !tokenAddress ||
        $operationStatus.isRunning}
    >
      {#if $operationStatus.isRunning}
        🔄 Splitting...
      {:else if !$walletStore.isConnected}
        🔒 Connect Wallet to Split
      {:else if !tokenAddress}
        📝 Enter Token Address
      {:else if !hasSplittableAmount}
        🔄 No Funds to Split
      {:else}
        🔄 Split Funds
      {/if}
    </button>

    <button
      class="button collect"
      on:click={collectFunds}
      disabled={!hasCollectableAmount ||
        !$walletStore.isConnected ||
        !tokenAddress ||
        $operationStatus.isRunning}
    >
      {#if $operationStatus.isRunning}
        🔄 Collecting...
      {:else if !$walletStore.isConnected}
        🔒 Connect Wallet to Collect
      {:else if !tokenAddress}
        📝 Enter Token Address
      {:else if !hasCollectableAmount}
        💰 No Funds to Collect
      {:else}
        💰 Collect Funds
      {/if}
    </button>
  </div>

  {#if withdrawableBalances}
    <div class="status-container">
      {#if hasSplittableAmount}
        <div class="collect-status success">
          🔄 <strong>Splittable funds available!</strong>
          <br />This account has funds that can be split to make them
          collectable.
        </div>
      {:else}
        <div class="collect-status disabled">
          ❌ <strong>No splittable funds available</strong>
          <br />This account does not have any funds ready for splitting.
        </div>
      {/if}

      {#if hasCollectableAmount}
        <div class="collect-status success">
          ✅ <strong>Collectable funds available!</strong>
          <br />This account has funds that can be collected.
        </div>
      {:else}
        <div class="collect-status disabled">
          ❌ <strong>No collectable funds available</strong>
          <br />This account does not have any funds ready for collection.
        </div>
      {/if}
    </div>
  {/if}
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
  {:else if withdrawableBalances}
    <div class="success-message">
      <strong>✅ Withdrawable Balances Retrieved Successfully!</strong>
      <br /><strong>Adapter Used:</strong>
      {withdrawableBalances.adapterUsed}
      <br /><strong>Has Splittable Amount:</strong>
      {withdrawableBalances.hasSplittableAmount ? 'Yes' : 'No'}
      <br /><strong>Has Collectable Amount:</strong>
      {withdrawableBalances.hasCollectableAmount ? 'Yes' : 'No'}
    </div>

    <div class="json-display">
      <h3>📋 Withdrawable Balances JSON</h3>
      <pre class="json-content">{JSON.stringify(
          withdrawableBalances.balances,
          null,
          2,
        )}</pre>
    </div>
  {:else}
    <strong>Query results will appear here...</strong>
    <br /><br />
    <em
      >Enter an account ID and click "Check Withdrawable Balances" to see what
      funds are available for collection.</em
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
  <strong>ℹ️ Note:</strong> Checking withdrawable balances is a read-only
  operation that doesn't require wallet connection or gas fees. However,
  splitting and collecting funds require a connected wallet and will involve
  blockchain transactions with gas fees.
  <br /><br />
  <strong>Typical Flow:</strong>
  1. Check balances to see available amounts 2. Split funds to make them collectable
  (if splittable amount > 0) 3. Collect funds to transfer them to your wallet (if
  collectable amount > 0)
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

  .form-group small {
    display: block;
    margin-top: 5px;
    color: #666;
    font-style: italic;
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

  .button.split {
    background-color: #ff8800;
    color: white;
  }

  .button.split:hover {
    background-color: #cc6600;
  }

  .button.collect {
    background-color: #00aa00;
    color: white;
  }

  .button.collect:hover {
    background-color: #008800;
  }

  .button.disabled {
    background-color: #808080;
    color: #c0c0c0;
    cursor: not-allowed;
  }

  .button:disabled {
    background-color: #808080;
    color: #c0c0c0;
    cursor: not-allowed;
  }

  .button-group {
    display: flex;
    gap: 10px;
    margin: 15px 0;
    flex-wrap: wrap;
  }

  .button-group .button {
    margin: 0;
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

  .collect-status {
    padding: 15px;
    margin: 15px 0;
    border: 2px solid;
    font-weight: bold;
  }

  .collect-status.success {
    background-color: #ccffcc;
    border-color: #00ff00;
    color: #006600;
  }

  .collect-status.disabled {
    background-color: #ffcccc;
    border-color: #ff6666;
    color: #cc0000;
  }

  .status-container {
    margin: 15px 0;
  }

  .status-container .collect-status {
    margin: 10px 0;
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
