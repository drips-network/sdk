<script lang="ts">
	import { isConnected } from '$lib/stores';
	import type { NftSubAccount } from 'radicle-drips';

	export let subAccounts: NftSubAccount[];
</script>

<h2>List Sub Accounts</h2>

<p>
	Calls the <code>getNftSubAccountsByOwner(ownerAddress: string)</code> on the
	<code>DripsSubgraphClient</code> and returns the connected user's sub accounts.
</p>

{#if !$isConnected}
	[Not Connected]
{:else if subAccounts.length === 0}
	No sub accounts found. Mint one now! 👇
{:else}
	<ol>
		{#each subAccounts as subAccount}
			<li>{subAccount.tokenId}</li>
		{/each}
	</ol>
{/if}

<hr />
