<script lang="ts">
	import { dripsClients } from '$lib/stores';
	import { goto } from '$app/navigation';
	import ListDrips from './ListDrips.svelte';
	import SetDrips from './SetDrips.svelte';
	import SplitsConfiguration from './SplitsConfiguration.svelte';
	import SetSplits from './SetSplits.svelte';

	$: addressDriverClient = $dripsClients?.addressDriverClient;
	$: subgraphClient = $dripsClients?.subgraphClient;
</script>

<svelte:head>
	<title>Drips & Splits</title>
	<meta name="description" content="Drips & Splits" />
</svelte:head>

<div class="container">
	<h1>Drips & Splits</h1>
	<ListDrips {subgraphClient} />
	<SetDrips {addressDriverClient} {subgraphClient} />
	<SplitsConfiguration {subgraphClient} />
	<SetSplits {addressDriverClient} />
	<button class="btn btn-default btn-block" on:click={() => goto('/')}>Back to API explorer</button>
</div>
