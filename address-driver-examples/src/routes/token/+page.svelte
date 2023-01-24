<script>
	import { goto } from '$app/navigation';
	import Approval from './Approval.svelte';
	import { dripsClients } from '$lib/stores';
	import Allowance from './Allowance.svelte';
	import TopUp from './TopUp.svelte';

	$: addressDriverClient = $dripsClients?.addressDriverClient;
	$: subgraphClient = $dripsClients?.subgraphClient;
</script>

<svelte:head>
	<title>Tokens</title>
	<meta name="description" content="Manage token approval" />
</svelte:head>

<div class="container">
	<h1>Tokens</h1>
	<TopUp {addressDriverClient} {subgraphClient} />
	<Approval {addressDriverClient} />
	<Allowance {addressDriverClient} />
	<button class="btn btn-default btn-block" on:click={() => goto('/')}>Back to API explorer</button>
</div>
