<script lang="ts">
	import { dripsClients } from '$lib/stores';
	import { goto } from '$app/navigation';
	import Mint from './Mint.svelte';
	import SubAccountsList from './SubAccountsList.svelte';
	import type { NftSubAccount } from 'radicle-drips';

	$: nftDriverClient = $dripsClients?.nftDriverClient;
	$: subgraphClient = $dripsClients?.subgraphClient;

	let subAccounts: NftSubAccount[] = [];

	$: if (nftDriverClient?.signerAddress) {
		getSubAccounts();
	}

	async function getSubAccounts() {
		const ownerAddress = nftDriverClient!.signerAddress;

		subAccounts = (await subgraphClient?.getNftSubAccountsByOwner(ownerAddress)) ?? [];
	}
</script>

<svelte:head>
	<title>Sub Accounts</title>
	<meta name="description" content="Mint a new sub account token" />
</svelte:head>

<div class="container">
	<h1>Sub accounts</h1>
	<SubAccountsList bind:subAccounts />
	<Mint on:tokenMinted={getSubAccounts} {nftDriverClient} />
	<button class="btn btn-default btn-block" on:click={() => goto('/')}>Back to API explorer</button>
</div>
