<script lang="ts">
  import type { DripsClient, DripsConfig, Split, SubgraphClient } from "drips-sdk";

  export let dripsClient: DripsClient;
  export let subgraphClient: SubgraphClient;

  let userDrips: DripsConfig;
  let userSplits: Split[];
  let updating = false;
  
  export async function refresh() {
    updating = true;
    userDrips = userSplits = null;
    userDrips = await subgraphClient.getDripsBySender(dripsClient.address)
    userSplits = await subgraphClient.getSplitsBySender(dripsClient.address.toLowerCase())
    updating = false;
  }

  $: dripsClient?.connected && refresh();

</script>


<button on:click={refresh} disabled={updating}>Update</button>
<h3>Drips</h3>
<div>{ userDrips ? JSON.stringify(userDrips, null, 2) : '...' }</div>
<h3>Splits</h3>
<div>{ userSplits ? JSON.stringify(userSplits, null, 2) : '...' }</div>