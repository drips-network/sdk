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
  import {
    calcAddressId,
    calcDripListId,
    createViemWriteAdapter,
    createViemReadAdapter,
    calcProjectId,
    utils,
  } from 'drips-sdk-test-2';

  // Form state for different utilities
  let activeTab = 'address-id';

  // Address ID Calculator
  let addressInput = '';
  let addressIdResult: bigint | null = null;

  // Project ID Calculator
  let projectUrl = '';
  let projectIdResult: bigint | null = null;

  // Drip List ID Calculator
  let minterAddress = '';
  let saltValue = '';
  let dripListIdResult: bigint | null = null;

  // Stream Config Encoder
  let streamId = '';
  let amountPerSec = '';
  let start = '';
  let duration = '';
  let encodedStreamConfig: bigint | null = null;

  // Stream Config Decoder
  let packedStreamConfig = '';
  let decodedStreamConfig: any = null;

  // Metadata Key-Value Encoder
  let metadataKey = '';
  let metadataValue = '';
  let encodedMetadata: any = null;

  // General state
  let isLoading = false;

  // Local implementation of destructProjectUrl since it's not exported
  function destructProjectUrl(url: string): {
    forge: 'github';
    ownerName: string;
    repoName: string;
  } {
    const pattern =
      /^(?:https?:\/\/)?(?:www\.)?(github|gitlab)\.com\/([^\/]+)\/([^\/]+)/;
    const match = url.match(pattern);

    if (!match) {
      throw new Error(`Unsupported repository url: ${url}.`);
    }

    const forge = match[1];
    if (forge !== 'github') {
      throw new Error(`Unsupported forge: ${forge}. Only GitHub is supported.`);
    }

    const ownerName = match[2];
    const repoName = match[3];

    return {
      forge: 'github',
      ownerName,
      repoName,
    };
  }

  function showStatusMessage(
    message: string,
    type: 'info' | 'success' | 'error' | 'warning' = 'info',
  ) {
    updateOperationStatus({currentStep: message});
    addLog(message);
  }

  async function calculateAddressId() {
    try {
      resetOperation();
      isLoading = true;
      addressIdResult = null;
      updateOperationStatus({isRunning: true, progress: 0});

      showStatusMessage('Validating address input...', 'info');

      if (!addressInput) {
        throw new Error('Address is required');
      }

      if (!/^0x[a-fA-F0-9]{40}$/.test(addressInput)) {
        throw new Error('Address must be a valid Ethereum address (0x...)');
      }

      updateOperationStatus({progress: 30});

      showStatusMessage('Setting up blockchain adapter...', 'info');

      let adapter;
      if ($walletStore.isConnected) {
        const {walletClient} = await createViemSdk({
          useConnectedWallet: true,
          rpcUrl: 'http://localhost:8545',
          pinataJwt: 'dummy',
          pinataGateway: 'dummy',
        });
        adapter = createViemWriteAdapter(walletClient);
      } else {
        const result = await createRandomReadonlySdk({
          rpcUrl: 'http://localhost:8545',
          adapter: 'viem',
        });
        if ('publicClient' in result) {
          adapter = createViemReadAdapter(result.publicClient);
        } else if ('provider' in result) {
          const {createEthersReadAdapter} = await import('drips-sdk-test-2');
          adapter = createEthersReadAdapter(result.provider);
        } else {
          throw new Error('Unable to create adapter from readonly SDK');
        }
      }

      updateOperationStatus({progress: 60});

      showStatusMessage('Calculating address ID...', 'info');

      const accountId = await calcAddressId(
        adapter,
        addressInput as `0x${string}`,
      );
      addressIdResult = accountId;

      updateOperationStatus({progress: 100});
      showStatusMessage('Address ID calculated successfully!', 'success');

      updateOperationStatus({
        isRunning: false,
        result: {addressId: accountId.toString()},
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

  async function calculateProjectId() {
    try {
      resetOperation();
      isLoading = true;
      projectIdResult = null;
      updateOperationStatus({isRunning: true, progress: 0});

      showStatusMessage('Validating project URL...', 'info');

      if (!projectUrl) {
        throw new Error('Project URL is required');
      }

      updateOperationStatus({progress: 20});

      showStatusMessage('Parsing project URL...', 'info');

      const {forge, ownerName, repoName} = destructProjectUrl(projectUrl);

      updateOperationStatus({progress: 40});

      showStatusMessage('Setting up blockchain adapter...', 'info');

      let adapter;
      if ($walletStore.isConnected) {
        const {walletClient} = await createViemSdk({
          useConnectedWallet: true,
          rpcUrl: 'http://localhost:8545',
          pinataJwt: 'dummy',
          pinataGateway: 'dummy',
        });
        adapter = createViemWriteAdapter(walletClient);
      } else {
        const result = await createRandomReadonlySdk({
          rpcUrl: 'http://localhost:8545',
          adapter: 'viem',
        });
        if ('publicClient' in result) {
          adapter = createViemReadAdapter(result.publicClient);
        } else if ('provider' in result) {
          const {createEthersReadAdapter} = await import('drips-sdk-test-2');
          adapter = createEthersReadAdapter(result.provider);
        } else {
          throw new Error('Unable to create adapter from readonly SDK');
        }
      }

      updateOperationStatus({progress: 70});

      showStatusMessage('Calculating project ID...', 'info');

      const accountId = await calcProjectId(adapter, {
        forge,
        name: `${ownerName}/${repoName}`,
      });
      projectIdResult = accountId;

      updateOperationStatus({progress: 100});
      showStatusMessage('Project ID calculated successfully!', 'success');

      updateOperationStatus({
        isRunning: false,
        result: {
          projectId: accountId.toString(),
          forge,
          ownerName,
          repoName,
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
    } finally {
      isLoading = false;
    }
  }

  async function calculateDripListId() {
    try {
      resetOperation();
      isLoading = true;
      dripListIdResult = null;
      updateOperationStatus({isRunning: true, progress: 0});

      showStatusMessage('Validating inputs...', 'info');

      if (!minterAddress) {
        throw new Error('Minter address is required');
      }

      if (!/^0x[a-fA-F0-9]{40}$/.test(minterAddress)) {
        throw new Error(
          'Minter address must be a valid Ethereum address (0x...)',
        );
      }

      if (!saltValue) {
        throw new Error('Salt value is required');
      }

      let salt: bigint;
      try {
        salt = BigInt(saltValue);
      } catch {
        throw new Error('Salt must be a valid number');
      }

      updateOperationStatus({progress: 30});

      showStatusMessage('Setting up blockchain adapter...', 'info');

      let adapter;
      if ($walletStore.isConnected) {
        const {walletClient} = await createViemSdk({
          useConnectedWallet: true,
          rpcUrl: 'http://localhost:8545',
          pinataJwt: 'dummy',
          pinataGateway: 'dummy',
        });
        adapter = createViemWriteAdapter(walletClient);
      } else {
        const result = await createRandomReadonlySdk({
          rpcUrl: 'http://localhost:8545',
          adapter: 'viem',
        });
        if ('publicClient' in result) {
          adapter = createViemReadAdapter(result.publicClient);
        } else if ('provider' in result) {
          const {createEthersReadAdapter} = await import('drips-sdk-test-2');
          adapter = createEthersReadAdapter(result.provider);
        } else {
          throw new Error('Unable to create adapter from readonly SDK');
        }
      }

      updateOperationStatus({progress: 60});

      showStatusMessage('Calculating drip list ID...', 'info');

      const dripListId = await calcDripListId(adapter, {
        minter: minterAddress as `0x${string}`,
        salt,
      });
      dripListIdResult = dripListId;

      updateOperationStatus({progress: 100});
      showStatusMessage('Drip list ID calculated successfully!', 'success');

      updateOperationStatus({
        isRunning: false,
        result: {
          dripListId: dripListId.toString(),
          minter: minterAddress,
          salt: salt.toString(),
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
    } finally {
      isLoading = false;
    }
  }

  function generateRandomSalt() {
    const randomSalt = BigInt(Math.floor(Math.random() * 1000000000));
    saltValue = randomSalt.toString();
  }

  function encodeStreamConfig() {
    try {
      resetOperation();
      encodedStreamConfig = null;
      updateOperationStatus({isRunning: true, progress: 0});

      showStatusMessage('Validating stream config inputs...', 'info');

      if (!streamId || !amountPerSec || !start || !duration) {
        throw new Error('All stream config fields are required');
      }

      let dripId: bigint, amtPerSec: bigint, startTime: bigint, dur: bigint;
      try {
        dripId = BigInt(streamId);
        amtPerSec = BigInt(amountPerSec);
        startTime = BigInt(start);
        dur = BigInt(duration);
      } catch {
        throw new Error('All values must be valid numbers');
      }

      updateOperationStatus({progress: 50});
      showStatusMessage('Encoding stream configuration...', 'info');

      const encoded = utils.encodeStreamConfig({
        dripId,
        amountPerSec: amtPerSec,
        start: startTime,
        duration: dur,
      });

      encodedStreamConfig = encoded;
      updateOperationStatus({progress: 100});
      showStatusMessage('Stream config encoded successfully!', 'success');

      updateOperationStatus({
        isRunning: false,
        result: {
          encodedConfig: encoded.toString(),
          input: {
            dripId: dripId.toString(),
            amountPerSec: amtPerSec.toString(),
            start: startTime.toString(),
            duration: dur.toString(),
          },
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

  function decodeStreamConfig() {
    try {
      resetOperation();
      decodedStreamConfig = null;
      updateOperationStatus({isRunning: true, progress: 0});

      showStatusMessage('Validating packed stream config...', 'info');

      if (!packedStreamConfig) {
        throw new Error('Packed stream config is required');
      }

      let packed: bigint;
      try {
        packed = BigInt(packedStreamConfig);
      } catch {
        throw new Error('Packed config must be a valid number');
      }

      updateOperationStatus({progress: 50});
      showStatusMessage('Decoding stream configuration...', 'info');

      const decoded = utils.decodeStreamConfig(packed);
      decodedStreamConfig = decoded;

      updateOperationStatus({progress: 100});
      showStatusMessage('Stream config decoded successfully!', 'success');

      updateOperationStatus({
        isRunning: false,
        result: {
          decodedConfig: {
            dripId: decoded.dripId.toString(),
            amountPerSec: decoded.amountPerSec.toString(),
            start: decoded.start.toString(),
            duration: decoded.duration.toString(),
          },
          input: packedStreamConfig,
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

  function encodeMetadataKeyValue() {
    try {
      resetOperation();
      encodedMetadata = null;
      updateOperationStatus({isRunning: true, progress: 0});

      showStatusMessage('Validating metadata inputs...', 'info');

      if (!metadataKey || !metadataValue) {
        throw new Error('Both key and value are required');
      }

      updateOperationStatus({progress: 50});
      showStatusMessage('Encoding metadata key-value pair...', 'info');

      const encoded = utils.encodeMetadataKeyValue({
        key: metadataKey,
        value: metadataValue,
      });

      encodedMetadata = encoded;
      updateOperationStatus({progress: 100});
      showStatusMessage('Metadata encoded successfully!', 'success');

      updateOperationStatus({
        isRunning: false,
        result: {
          encodedMetadata: encoded,
          input: {
            key: metadataKey,
            value: metadataValue,
          },
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

<h1>🔧 Utils Module</h1>

<div class="info-box">
  <strong>🛠️ About this module:</strong><br />
  This module provides access to various utility functions from the Drips SDK. These
  utilities help you calculate IDs, parse URLs, and work with the underlying data
  structures of the Drips protocol.
</div>

{#if $walletStore.isConnected}
  <div class="wallet-status">
    ✅ Wallet Connected: {$walletStore.address?.slice(
      0,
      6,
    )}...{$walletStore.address?.slice(-4)}
    <br /><small>Using connected wallet for blockchain operations</small>
  </div>
{:else}
  <div class="wallet-status disconnected">
    ❌ No Wallet Connected - Using readonly adapter for calculations
    <br /><small>All utility functions work without wallet connection</small>
  </div>
{/if}

<div class="tabs">
  <button
    class="tab"
    class:active={activeTab === 'address-id'}
    on:click={() => (activeTab = 'address-id')}
  >
    📍 Address ID
  </button>
  <button
    class="tab"
    class:active={activeTab === 'project-id'}
    on:click={() => (activeTab = 'project-id')}
  >
    📦 Project ID
  </button>
  <button
    class="tab"
    class:active={activeTab === 'drip-list-id'}
    on:click={() => (activeTab = 'drip-list-id')}
  >
    📋 Drip List ID
  </button>
  <button
    class="tab"
    class:active={activeTab === 'stream-encode'}
    on:click={() => (activeTab = 'stream-encode')}
  >
    🔧 Stream Encode
  </button>
  <button
    class="tab"
    class:active={activeTab === 'stream-decode'}
    on:click={() => (activeTab = 'stream-decode')}
  >
    🔍 Stream Decode
  </button>
  <button
    class="tab"
    class:active={activeTab === 'metadata-encode'}
    on:click={() => (activeTab = 'metadata-encode')}
  >
    🏷️ Metadata Encode
  </button>
</div>

{#if activeTab === 'address-id'}
  <div class="tab-content">
    <h2>📍 Calculate Address ID</h2>
    <div class="info-box">
      <strong>About:</strong> Converts an Ethereum address to its corresponding account
      ID in the Drips protocol. This is used internally by the protocol to identify
      accounts.
    </div>

    <div class="form-container">
      <div class="form-group">
        <label for="addressInput">Ethereum Address:</label>
        <input
          type="text"
          id="addressInput"
          bind:value={addressInput}
          placeholder="0x1234567890123456789012345678901234567890"
        />
        <small>Enter a valid Ethereum address (0x...)</small>
      </div>

      <button
        class="button primary"
        on:click={calculateAddressId}
        disabled={isLoading || $operationStatus.isRunning}
      >
        {#if isLoading || $operationStatus.isRunning}
          🔄 Calculating...
        {:else}
          🧮 Calculate Address ID
        {/if}
      </button>

      {#if addressIdResult !== null}
        <div class="result-display">
          <h3>✅ Address ID Result</h3>
          <div class="result-value">
            <strong>Account ID:</strong>
            {addressIdResult.toString()}
          </div>
          <div class="result-value">
            <strong>Input Address:</strong>
            {addressInput}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

{#if activeTab === 'project-id'}
  <div class="tab-content">
    <h2>📦 Calculate Project ID</h2>
    <div class="info-box">
      <strong>About:</strong> Converts a project URL (like a GitHub repository) to
      its corresponding account ID in the Drips protocol. This is used for project-based
      funding.
    </div>

    <div class="form-container">
      <div class="form-group">
        <label for="projectUrl">Project URL:</label>
        <input
          type="text"
          id="projectUrl"
          bind:value={projectUrl}
          placeholder="https://github.com/owner/repository"
        />
        <small>Enter a GitHub repository URL</small>
      </div>

      <button
        class="button primary"
        on:click={calculateProjectId}
        disabled={isLoading || $operationStatus.isRunning}
      >
        {#if isLoading || $operationStatus.isRunning}
          🔄 Calculating...
        {:else}
          🧮 Calculate Project ID
        {/if}
      </button>

      {#if projectIdResult !== null}
        <div class="result-display">
          <h3>✅ Project ID Result</h3>
          <div class="result-value">
            <strong>Account ID:</strong>
            {projectIdResult.toString()}
          </div>
          <div class="result-value">
            <strong>Input URL:</strong>
            {projectUrl}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

{#if activeTab === 'drip-list-id'}
  <div class="tab-content">
    <h2>📋 Calculate Drip List ID</h2>
    <div class="info-box">
      <strong>About:</strong> Calculates the ID for a drip list based on the minter
      address and a salt value. This is used when creating new drip lists.
    </div>

    <div class="form-container">
      <div class="form-group">
        <label for="minterAddress">Minter Address:</label>
        <input
          type="text"
          id="minterAddress"
          bind:value={minterAddress}
          placeholder="0x1234567890123456789012345678901234567890"
        />
        <small>Enter the address that will mint the drip list</small>
      </div>

      <div class="form-group">
        <label for="saltValue">Salt Value:</label>
        <div class="input-with-button">
          <input
            type="text"
            id="saltValue"
            bind:value={saltValue}
            placeholder="123456789"
          />
          <button class="button secondary" on:click={generateRandomSalt}>
            🎲 Random
          </button>
        </div>
        <small>Enter a numeric salt value or generate a random one</small>
      </div>

      <button
        class="button primary"
        on:click={calculateDripListId}
        disabled={isLoading || $operationStatus.isRunning}
      >
        {#if isLoading || $operationStatus.isRunning}
          🔄 Calculating...
        {:else}
          🧮 Calculate Drip List ID
        {/if}
      </button>

      {#if dripListIdResult !== null}
        <div class="result-display">
          <h3>✅ Drip List ID Result</h3>
          <div class="result-value">
            <strong>Drip List ID:</strong>
            {dripListIdResult.toString()}
          </div>
          <div class="result-value">
            <strong>Minter:</strong>
            {minterAddress}
          </div>
          <div class="result-value">
            <strong>Salt:</strong>
            {saltValue}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

{#if activeTab === 'stream-encode'}
  <div class="tab-content">
    <h2>🔧 Encode Stream Configuration</h2>
    <div class="info-box">
      <strong>About:</strong> Encodes stream configuration parameters into a single
      packed bigint value. This is used internally by the Drips protocol to efficiently
      store stream data.
    </div>

    <div class="form-container">
      <div class="form-group">
        <label for="streamId">Stream ID (Drip ID):</label>
        <input
          type="text"
          id="streamId"
          bind:value={streamId}
          placeholder="1"
        />
        <small>Enter the stream/drip ID (numeric value)</small>
      </div>

      <div class="form-group">
        <label for="amountPerSec">Amount Per Second:</label>
        <input
          type="text"
          id="amountPerSec"
          bind:value={amountPerSec}
          placeholder="1000000000000000000"
        />
        <small
          >Enter the amount per second in wei (e.g., 1 ETH =
          1000000000000000000)</small
        >
      </div>

      <div class="form-group">
        <label for="start">Start Time:</label>
        <input
          type="text"
          id="start"
          bind:value={start}
          placeholder="1640995200"
        />
        <small>Enter the start timestamp (Unix timestamp)</small>
      </div>

      <div class="form-group">
        <label for="duration">Duration:</label>
        <input
          type="text"
          id="duration"
          bind:value={duration}
          placeholder="86400"
        />
        <small>Enter the duration in seconds</small>
      </div>

      <button
        class="button primary"
        on:click={encodeStreamConfig}
        disabled={$operationStatus.isRunning}
      >
        {#if $operationStatus.isRunning}
          🔄 Encoding...
        {:else}
          🔧 Encode Stream Config
        {/if}
      </button>

      {#if encodedStreamConfig !== null}
        <div class="result-display">
          <h3>✅ Encoded Stream Config</h3>
          <div class="result-value">
            <strong>Encoded Value:</strong>
            {encodedStreamConfig.toString()}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

{#if activeTab === 'stream-decode'}
  <div class="tab-content">
    <h2>🔍 Decode Stream Configuration</h2>
    <div class="info-box">
      <strong>About:</strong> Decodes a packed stream configuration value back into
      its individual components (stream ID, amount per second, start time, duration).
    </div>

    <div class="form-container">
      <div class="form-group">
        <label for="packedStreamConfig">Packed Stream Config:</label>
        <input
          type="text"
          id="packedStreamConfig"
          bind:value={packedStreamConfig}
          placeholder="123456789012345678901234567890"
        />
        <small>Enter the packed stream configuration value (bigint)</small>
      </div>

      <button
        class="button primary"
        on:click={decodeStreamConfig}
        disabled={$operationStatus.isRunning}
      >
        {#if $operationStatus.isRunning}
          🔄 Decoding...
        {:else}
          🔍 Decode Stream Config
        {/if}
      </button>

      {#if decodedStreamConfig !== null}
        <div class="result-display">
          <h3>✅ Decoded Stream Config</h3>
          <div class="result-value">
            <strong>Stream ID (Drip ID):</strong>
            {decodedStreamConfig.dripId.toString()}
          </div>
          <div class="result-value">
            <strong>Amount Per Second:</strong>
            {decodedStreamConfig.amountPerSec.toString()}
          </div>
          <div class="result-value">
            <strong>Start Time:</strong>
            {decodedStreamConfig.start.toString()}
          </div>
          <div class="result-value">
            <strong>Duration:</strong>
            {decodedStreamConfig.duration.toString()}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

{#if activeTab === 'metadata-encode'}
  <div class="tab-content">
    <h2>🏷️ Encode Metadata Key-Value</h2>
    <div class="info-box">
      <strong>About:</strong> Encodes metadata key-value pairs for use in the Drips
      protocol. This converts string keys and values into the proper hex format required
      by the blockchain.
    </div>

    <div class="form-container">
      <div class="form-group">
        <label for="metadataKey">Metadata Key:</label>
        <input
          type="text"
          id="metadataKey"
          bind:value={metadataKey}
          placeholder="ipfs"
        />
        <small>Enter the metadata key (max 31 bytes)</small>
      </div>

      <div class="form-group">
        <label for="metadataValue">Metadata Value:</label>
        <input
          type="text"
          id="metadataValue"
          bind:value={metadataValue}
          placeholder="QmYourIPFSHashHere"
        />
        <small>Enter the metadata value (any string)</small>
      </div>

      <button
        class="button primary"
        on:click={encodeMetadataKeyValue}
        disabled={$operationStatus.isRunning}
      >
        {#if $operationStatus.isRunning}
          🔄 Encoding...
        {:else}
          🏷️ Encode Metadata
        {/if}
      </button>

      {#if encodedMetadata !== null}
        <div class="result-display">
          <h3>✅ Encoded Metadata</h3>
          <div class="result-value">
            <strong>Encoded Key:</strong>
            {encodedMetadata.key}
          </div>
          <div class="result-value">
            <strong>Encoded Value:</strong>
            {encodedMetadata.value}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<div class="step-indicator">Operation Status</div>

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
  {:else if $operationStatus.result}
    <div class="success-message">
      <strong>✅ Operation Completed Successfully!</strong>
    </div>

    <div class="json-display">
      <h3>📋 Result JSON</h3>
      <pre class="json-content">{JSON.stringify(
          $operationStatus.result,
          null,
          2,
        )}</pre>
    </div>
  {:else}
    <strong>Operation results will appear here...</strong>
    <br /><br />
    <em
      >Select a utility function above and provide the required inputs to get
      started.</em
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
  <strong>ℹ️ Note:</strong> These utility functions help you work with the
  underlying data structures of the Drips protocol. Most of these operations are
  read-only and don't require gas fees, though they do need to interact with the
  blockchain to get the latest contract state.
  <br /><br />
  <strong>Use Cases:</strong>
  <ul>
    <li>
      <strong>Address ID:</strong> Convert wallet addresses to account IDs for use
      in other SDK functions
    </li>
    <li>
      <strong>Project ID:</strong> Get account IDs for GitHub projects to set up
      project funding
    </li>
    <li>
      <strong>Drip List ID:</strong> Calculate IDs for drip lists before creating
      them
    </li>
    <li>
      <strong>Stream Encode:</strong> Pack stream configuration parameters into a
      single value for efficient storage
    </li>
    <li>
      <strong>Stream Decode:</strong> Unpack stream configuration values back into
      individual components
    </li>
    <li>
      <strong>Metadata Encode:</strong> Convert metadata key-value pairs into blockchain-compatible
      hex format
    </li>
  </ul>
</div>

<style>
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

  .info-box ul {
    margin: 10px 0;
    padding-left: 20px;
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

  .tabs {
    display: flex;
    margin: 20px 0;
    border-bottom: 2px solid #c0c0c0;
  }

  .tab {
    background-color: #e0e0e0;
    border: 2px outset #c0c0c0;
    border-bottom: none;
    padding: 10px 20px;
    font-family: 'Courier New', monospace;
    font-weight: bold;
    cursor: pointer;
    margin-right: 2px;
  }

  .tab:hover {
    background-color: #f0f0f0;
  }

  .tab.active {
    background-color: #ffffff;
    border: 2px inset #c0c0c0;
    border-bottom: 2px solid #ffffff;
    margin-bottom: -2px;
  }

  .tab-content {
    background-color: #ffffff;
    border: 2px inset #c0c0c0;
    padding: 20px;
    margin-bottom: 20px;
  }

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

  .input-with-button {
    display: flex;
    gap: 10px;
  }

  .input-with-button input {
    flex: 1;
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

  .button.secondary {
    background-color: #ff8800;
    color: white;
  }

  .button.secondary:hover {
    background-color: #cc6600;
  }

  .button:disabled {
    background-color: #808080;
    color: #c0c0c0;
    cursor: not-allowed;
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

  .result-display {
    background-color: #ffffff;
    border: 2px inset #c0c0c0;
    padding: 15px;
    margin: 15px 0;
  }

  .result-display h3 {
    color: #000080;
    margin: 0 0 15px 0;
  }

  .result-value {
    margin: 8px 0;
    padding: 5px;
    background-color: #f8f8f8;
    border: 1px solid #e0e0e0;
    font-family: 'Courier New', monospace;
    word-break: break-all;
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
    max-height: 300px;
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
