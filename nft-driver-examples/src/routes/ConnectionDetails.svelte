<script lang="ts">
	import { dripsClients, isConnected } from '$lib/stores';

	$: nftDriverClient = $dripsClients?.nftDriverClient;
	$: subgraphClient = $dripsClients?.subgraphClient;
</script>

<div class="terminal-card">
	<header>Connection Details</header>
	<div>
		<strong>Network</strong>: {$isConnected ? nftDriverClient?.network?.name : '[Not Connected]'}
		<br />
		<strong>Chain ID</strong>:{$isConnected ? nftDriverClient?.network?.chainId : '[Not Connected]'}
		<br />
		<strong>Signer Address</strong>: {$isConnected
			? nftDriverClient?.signerAddress
			: '[Not Connected]'}
		<br />
		<div>
			<strong>Subgraph URL</strong>:
			{#if subgraphClient}
				<td><a href={subgraphClient.apiUrl}>{subgraphClient.apiUrl}</a></td>
			{:else}
				<td>[Not Connected]</td>
			{/if}
		</div>
	</div>
</div>

<hr />

<style>
	.terminal-card {
		margin-bottom: var(--global-line-height);
	}
</style>
