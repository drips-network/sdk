<script lang="ts">
	import ConnectionDetails from './ConnectionDetails.svelte';
	import { isConnected } from '$lib/stores';
</script>

<svelte:head>
	<title>DripsJS</title>
	<meta name="description" content="NFT Driver examples app" />
</svelte:head>

<h1>NFT Driver Client Examples App</h1>

<div class="welcome">
	{#if $isConnected}
		<ConnectionDetails />

		<h2>API</h2>

		<ul>
			<li>
				Managing Accounts:
				<ul>
					<li><a href="/accounts">List an Owner's Accounts</a></li>
					<li><a href="/accounts">Create a New Account</a></li>
				</ul>
			</li>
			<li>
				Tokens:
				<ul>
					<li><a href="/token">Approve Token</a></li>
					<li><a href="/token">Get Allowance</a></li>
					<li><a href="/token">TopUp</a></li>
				</ul>
			</li>
			<li>
				Drips & Splits:
				<ul>
					<li><a href="/streams">List Drips configurations</a></li>
					<li><a href="/streams">Set Drips configuration</a></li>
					<li><a href="/streams">Get splits configuration</a></li>
					<li><a href="/streams">Set splits configuration</a></li>
				</ul>
			</li>
			<li>
				Send & Receive:
				<ul>
					<li><a href="/funds">Collect</a></li>
					<li><a href="/funds">Give</a></li>
				</ul>
			</li>
			<li>
				Utilities:
				<ul>
					<li><a href="/utils">Asset Helpers</a></li>
					<li><a href="/utils">Cycle info</a></li>
					<li><a href="/utils">Debug Drips Receiver Configuration</a></li>
				</ul>
			</li>
		</ul>
	{:else}
		<h2>Connect to start</h2>
	{/if}
</div>

<style>
	.welcome {
		display: flex;
		flex-direction: column;
		align-items: center;
		flex: 0.6;
	}

	h1 {
		width: 100%;
	}
</style>
