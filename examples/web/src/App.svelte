<script lang="ts">
  import { onMount, setContext } from 'svelte';
  import { DripsClient, SubgraphClient } from 'drips-sdk'
  import { ContractReceipt, providers, type ContractTransaction } from 'ethers'
  import Web3Modal from 'web3modal'
  import WalletNetworkDetails from './components/WalletNetworkDetails.svelte';
  import UpdateDrips from './components/UpdateDrips.svelte';
  import UpdateSplits from './components/UpdateSplits.svelte';
  import UserDripsRecords from './components/UserDripsRecords.svelte';
  import Subgraph from './components/Subgraph.svelte';
  // TODO: https://github.com/WalletConnect/walletconnect-monorepo/issues/341
  import WalletConnectProvider from '@walletconnect/web3-provider/dist/umd/index.min'

  // Define network-related constants
  const networks = {
    1: { name: 'mainnet', layer: 'ethereum', infura: 'wss://mainnet.infura.io/ws/v3/1cf5614cae9f49968fe604b818804be6', explorer: { name: 'Etherscan', domain: 'https://etherscan.io' }, subgraph: 'https://api.thegraph.com/subgraphs/name/gh0stwheel/drips-on-mainnet'},
    4: { name: 'rinkeby', layer: 'ethereum', infura: 'wss://rinkeby.infura.io/ws/v3/1cf5614cae9f49968fe604b818804be6', explorer: { name: 'Etherscan', domain: 'https://rinkeby.etherscan.io' }, subgraph: 'https://api.thegraph.com/subgraphs/name/gh0stwheel/drips-on-rinkeby' },
    137: { name: 'matic', layer: 'polygon', infura: 'https://polygon-mainnet.infura.io/v3/1cf5614cae9f49968fe604b818804be6', explorer: { name: 'Polyscan', domain: 'https://polygonscan.com' }, subgraph: 'https://api.thegraph.com/subgraphs/name/gh0stwheel/drips-on-polygon' },
    80001: { name: 'mumbai', layer: 'polygon', infura: 'https://polygon-mumbai.infura.io/v3/1cf5614cae9f49968fe604b818804be6', explorer: { name: 'Polyscan', domain: 'https://mumbai.polygonscan.com' }, subgraph: 'https://api.thegraph.com/subgraphs/name/gh0stwheel/drips-on-mumbai' }
  }
  
  const networkToUse = 'rinkeby'
  const network = Object.values(networks).find(n => n.name === networkToUse)

  $: connected = dripsClient?.connected;

  // Setup web3 modal
  const web3Modal = new Web3Modal({
    //network: deployNetwork.name, // optional
    cacheProvider: true, // optional
    providerOptions: { // required
      walletconnect: {
        package: WalletConnectProvider, // required
        options: {
          infuraId: '1cf5614cae9f49968fe604b818804be6' // required
        }
      }
    },
    theme: 'dark'
  })

  let dripsClient: DripsClient;
  let subgraphClient: SubgraphClient;
  let providerNetwork: providers.Network;
  let refreshUserDrips: () => Promise<void>;
  let errorText: string;

  async function connect () {
    const walletProvider = await web3Modal.connect();
    const provider = new providers.Web3Provider(walletProvider)

    providerNetwork = await provider.getNetwork();

    dripsClient = new DripsClient(provider, networkToUse)

    await dripsClient.connect()

    dripsClient = dripsClient;
  }

  function disconnect () {
    dripsClient.disconnect()
    dripsClient = null;
    // clear so they can re-select from scratch
    web3Modal.clearCachedProvider()
    // manually clear walletconnect --- https://github.com/Web3Modal/web3modal/issues/354
    localStorage.removeItem('walletconnect')
  }

  let approvalTx: ContractTransaction;
  let approvalReceipt: ContractReceipt;
  async function approveDAIContract () {
    approvalTx = await dripsClient.approveDAIContract();
    approvalReceipt = await approvalTx.wait()
  }

  $: wrongNetwork = providerNetwork && providerNetwork.name !== network.name;

  onMount(() => subgraphClient = new SubgraphClient(network.subgraph));

</script>

<main>

  <div>

    <h1>DripsClient Example</h1>

    <div class="status">
      {#if wrongNetwork }
        Wallet is set to the wrong network. Please change wallet network or 'networkToUse' variable in App.svelte.
      {/if}

      {#if approvalReceipt }
        DAI approved!
      {:else if approvalTx }
        Awaiting confirmation...
      {/if}

      {#if errorText}
        {errorText}
      {/if}
    </div>

    <button on:click={connect} disabled={connected}>Connect</button>
    <button on:click={disconnect} disabled={!connected}>Disconnect</button>
    <button on:click={approveDAIContract} disabled={!connected}>Approve DAI</button>

    <h2>Wallet/Network Details</h2>
    <WalletNetworkDetails {dripsClient} {subgraphClient} />
    
    <h2>New Drips Config Input</h2>
    <UpdateDrips {dripsClient} {subgraphClient} on:updated={refreshUserDrips} />
    <UpdateSplits {dripsClient} {subgraphClient} on:updated={refreshUserDrips} />
    

    <h2>User's Current Drips/Splits JSON Records</h2>
    <UserDripsRecords {dripsClient} {subgraphClient} bind:refresh={refreshUserDrips} />
  </div>
  
  <div>
    <h1>Subgraph Query Example</h1>
    <Subgraph {subgraphClient} />
  </div>

</main>

<style>
    * {
      box-sizing: border-box;
    }

    main {
      padding-bottom: 50px;
      display: grid;
      grid-template-columns: 50% 50%;
      grid-gap: 20px;
    }

    .status {
      color: #333;
      margin-bottom: 10px;
    }

</style>