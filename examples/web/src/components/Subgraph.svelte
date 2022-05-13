<script lang="ts">
  import type { SubgraphClient } from "drips-sdk";

  export let subgraphClient: SubgraphClient;
  let subgraphResponse: unknown;
  let queryAddress = '';

  async function displayQueryBySenderDrips () {
    subgraphResponse = await subgraphClient.getDripsBySender(queryAddress.toLowerCase())
  }

  async function displayQueryByReceiverDrips () {
    subgraphResponse = await subgraphClient.getDripsByReceiver(queryAddress.toLowerCase());
  }
</script>

<div class="buttons">
  <button on:click={displayQueryBySenderDrips} disabled={!queryAddress.length}>Query By Sender</button>
  <button on:click={displayQueryByReceiverDrips} disabled={!queryAddress.length}>Query By Receiver</button>
</div>

<label>Address:
  <input size="46" type="text" bind:value={queryAddress}/>
</label>

{#if subgraphResponse}
<div class="response">
    {JSON.stringify(subgraphResponse, null, 2)}
  </div>
{/if}

<style>
  .buttons {
    margin-bottom: 10px;
  }
  .response {
    margin-right: 20px;
  }
</style>