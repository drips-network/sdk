<script lang="ts">
	import type { AddressAppClient, DripsSubgraphClient } from 'radicle-drips';

	export let addressAppClient: AddressAppClient;
	export let dripsSubgraphClient: DripsSubgraphClient;

	$: isConnected = Boolean(addressAppClient) && Boolean(dripsSubgraphClient);
	$: if (isConnected) getClientsDetails();

	let userId: string;

	const getClientsDetails = async () => {
		userId = await addressAppClient.getUserId();
	};

	$: if (!isConnected) reset();

	const reset = () => {
		userId = null;
	};
</script>

<div class="container">
	<section>
		<header>
			<h2>Properties</h2>
		</header>

		<table class="table">
			<thead>
				<tr>
					<th>Property</th>
					<th>Value</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<th>Network</th>
					<td>{addressAppClient?.network?.name || '[Not Connected]'}</td>
				</tr>
				<tr>
					<th>Chain ID</th>
					<td>{addressAppClient?.network?.chainId || '[Not Connected]'}</td>
				</tr>
				<tr>
					<th>Signer Address</th>
					<td>{addressAppClient?.signerAddress || '[Not Connected]'}</td>
				</tr>
				<tr>
					<th>User ID</th>
					<td>{isConnected ? (userId ? userId : 'Getting user ID...') : '[Not Connected]'}</td>
				</tr>
				<tr>
					<th>DripbHub Contract</th>
					<td>{addressAppClient?.chainDripsMetadata?.CONTRACT_DRIPS_HUB || '[Not Connected]'}</td>
				</tr>
				<tr>
					<th>AddressApp Contract</th>
					<td>{addressAppClient?.chainDripsMetadata?.CONTRACT_ADDRESS_APP || '[Not Connected]'}</td>
				</tr>
				<tr>
					<th>AddressAppLogic Contract</th>
					<td>{addressAppClient?.chainDripsMetadata?.CONTRACT_ADDRESS_APP_LOGIC || '[Not Connected]'}</td>
				</tr>
				<tr>
					<th>DripbHubLogic Contract</th>
					<td>{addressAppClient?.chainDripsMetadata?.CONTRACT_DRIPS_HUB_LOGIC || '[Not Connected]'}</td>
				</tr>
				<tr>
					<th>Subgraph URL</th>
					{#if dripsSubgraphClient}
						<td><a href={dripsSubgraphClient.apiUrl} target="__blank">{dripsSubgraphClient.apiUrl}</a></td>
					{:else}
						<td>[Not Connected]</td>
					{/if}
				</tr>
			</tbody>
		</table>
	</section>
	<hr />
</div>

<style>
	.table {
		max-width: var(--page-width);
	}

	.table td {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
