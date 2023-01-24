<script lang="ts">
	import { dripsClients } from '$lib/stores';
	import { goto } from '$app/navigation';
	import MintNewAccount from './MintNewAccount.svelte';
	import ListAccounts from './ListAccounts.svelte';
	import ListAppAccounts from './ListAppAccounts.svelte';

	$: nftDriverClient = $dripsClients?.nftDriverClient;
	$: subgraphClient = $dripsClients?.subgraphClient;
</script>

<svelte:head>
	<title>Accounts</title>
	<meta name="description" content="Manage SubAccounts" />
</svelte:head>

<div class="container">
	<h1>Accounts</h1>
	<ListAccounts {subgraphClient} />
	<ListAppAccounts {subgraphClient} />
	<MintNewAccount {nftDriverClient} />
	<button class="btn btn-default btn-block" on:click={() => goto('/')}>Back to API explorer</button>
</div>
