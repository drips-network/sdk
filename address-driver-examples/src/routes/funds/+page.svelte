<script lang="ts">
	import { dripsClients } from '$lib/stores';
	import { goto } from '$app/navigation';
	import Collect from './Collect.svelte';
	import Give from './Give.svelte';

	$: addressDriverClient = $dripsClients?.addressDriverClient;
</script>

<svelte:head>
	<title>Send & Receive</title>
	<meta name="description" content="Mint a new sub account token" />
</svelte:head>

<div class="container">
	<h1>Send & Receive</h1>
	<Collect {addressDriverClient} />
	<Give {addressDriverClient} />
	<button class="btn btn-default btn-block" on:click={() => goto('/')}>Back to API explorer</button>
</div>
