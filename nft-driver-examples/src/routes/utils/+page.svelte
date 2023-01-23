<script lang="ts">
	import DripsReceiverConfig from './DripsReceiverConfig.svelte';
	import { dripsClients } from '$lib/stores';

	import CycleInfo from './CycleInfo.svelte';
	import { goto } from '$app/navigation';
	import Asset from './Asset.svelte';

	$: nftDriverClient = $dripsClients?.nftDriverClient;
</script>

<svelte:head>
	<title>Utilities</title>
	<meta name="description" content="Utilities" />
</svelte:head>

<div class="container">
	<h1>Utilities</h1>
	<Asset />
	<CycleInfo {nftDriverClient} />
	<DripsReceiverConfig />
	<button class="btn btn-default btn-block" on:click={() => goto('/')}>Back to API explorer</button>
</div>
