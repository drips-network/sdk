<script lang="ts">
	import { dripsClients } from '$lib/stores';
	import { goto } from '$app/navigation';
	import Emit from './Emit.svelte';

	$: nftDriverClient = $dripsClients?.nftDriverClient;
</script>

<svelte:head>
	<title>Metadata</title>
	<meta name="description" content="Emit user metadata" />
</svelte:head>

<div class="container">
	<h1>Metadata</h1>
	<Emit {nftDriverClient} />
	<button class="btn btn-default btn-block" on:click={() => goto('/')}>Back to API explorer</button>
</div>
