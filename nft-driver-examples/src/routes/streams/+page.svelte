<script lang="ts">
	import { dripsClients } from '$lib/stores';
	import { goto } from '$app/navigation';
	import ListDrips from './ListDrips.svelte';
	import SetDrips from './SetDrips.svelte';
	import SplitsConfiguration from './SplitsConfiguration.svelte';
	import SetSplits from './SetSplits.svelte';

	$: nftDriverClient = $dripsClients?.nftDriverClient;
	$: subgraphClient = $dripsClients?.subgraphClient;
</script>

<svelte:head>
	<title>Drips & Splits</title>
	<meta name="description" content="Mint a new sub account token" />
</svelte:head>

<div class="container">
	<h1>Drips & Splits</h1>
	<ListDrips {subgraphClient} />
	<SetDrips {nftDriverClient} {subgraphClient} />
	<SplitsConfiguration {subgraphClient} />
	<SetSplits {nftDriverClient} />
	<button class="btn btn-default btn-block" on:click={() => goto('/')}>Back to API explorer</button>
</div>
