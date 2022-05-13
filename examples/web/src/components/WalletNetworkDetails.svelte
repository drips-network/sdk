<script lang="ts">
  import { type SubgraphClient, toDAI, type DripsClient } from "drips-sdk";

  export let dripsClient: DripsClient;
  export let subgraphClient: SubgraphClient;

  let daiApproved = '';
  let daiCollectable: Awaited<ReturnType<DripsClient['getAmountCollectableWithSplits']>>;

  $: if (dripsClient?.connected && subgraphClient) displayWalletAndAddressStats();
  
  async function displayWalletAndAddressStats () {
    daiApproved = toDAI(await dripsClient.getAllowance(), 'pretty', 2)
    const splits = await subgraphClient.getSplitsBySender(dripsClient.address.toLowerCase())
    daiCollectable = await dripsClient.getAmountCollectableWithSplits(dripsClient.address, splits)
  }
</script>

<div>Address: {dripsClient?.address || '[Not Connected]'}</div>
<div>Network: {dripsClient?.networkId || '[Not Connected]'}</div>
<div>DAI Approved: {daiApproved || '[Not Connected]'}</div>
<div>DAI Collectable (after splits): {daiCollectable ? daiCollectable.collected : '[Not Connected]'}</div>
<div>DAI to be Split to others:  {daiCollectable ? daiCollectable.split : '[Not Connected]'}</div>