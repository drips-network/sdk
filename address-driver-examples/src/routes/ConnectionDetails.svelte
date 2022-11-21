<script lang="ts">
	import { dripsClients } from '$lib/stores';
	import type { JsonRpcSigner, Network } from '@ethersproject/providers';

	let network: Network;
	let signer: JsonRpcSigner;
	let signerAddress: string;
	let userId: string;

	$: addressDriverClient = $dripsClients?.addressDriverClient;
	$: subgraphClient = $dripsClients?.subgraphClient;
	$: if (addressDriverClient) getConnectionDetails();

	async function getConnectionDetails() {
		signer = addressDriverClient!.signer!;
		network = await addressDriverClient!.provider.getNetwork();
		signerAddress = await signer.getAddress();
		userId = await addressDriverClient!.getUserId();
	}
</script>

<div class="terminal-card">
	<header>Connection Details</header>
	<div>
		<strong>Network</strong>: {network ? network.name : '[Not Connected]'}
		<br />
		<strong>Chain ID</strong>:{network ? network.chainId : '[Not Connected]'}
		<br />
		<strong>Account Address (client signer)</strong>: {signerAddress || '[Not Connected]'}
		<br />
		<strong>Signer's User ID</strong>: {userId || '[Not Connected]'}
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
