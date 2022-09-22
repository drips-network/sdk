<script lang="ts">
	import type { AddressDriverClient, DripsSubgraphClient } from 'radicle-drips';

	export let addressDriverClient: AddressDriverClient;
	export let dripsSubgraphClient: DripsSubgraphClient;

	$: isConnected = Boolean(addressDriverClient) && Boolean(dripsSubgraphClient);
	$: if (isConnected) getClientsDetails();

	let userId: string;

	const getClientsDetails = async () => {
		userId = await addressDriverClient.getUserId();
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
					<td>{addressDriverClient?.network?.name || '[Not Connected]'}</td>
				</tr>
				<tr>
					<th>Chain ID</th>
					<td>{addressDriverClient?.network?.chainId || '[Not Connected]'}</td>
				</tr>
				<tr>
					<th>Signer Address</th>
					<td>{addressDriverClient?.signerAddress || '[Not Connected]'}</td>
				</tr>
				<tr>
					<th>User ID</th>
					<td>{isConnected ? (userId ? userId : 'Getting user ID...') : '[Not Connected]'}</td>
				</tr>
				<tr>
					<th>DripbHub Contract</th>
					<td>{addressDriverClient?.chainDripsMetadata?.CONTRACT_DRIPS_HUB || '[Not Connected]'}</td>
				</tr>
				<tr>
					<th>AddressApp Contract</th>
					<td>{addressDriverClient?.chainDripsMetadata?.CONTRACT_ADDRESS_DRIVER || '[Not Connected]'}</td>
				</tr>
				<tr>
					<th>AddressAppLogic Contract</th>
					<td>{addressDriverClient?.chainDripsMetadata?.CONTRACT_ADDRESS_DRIVER_LOGIC || '[Not Connected]'}</td>
				</tr>
				<tr>
					<th>DripbHubLogic Contract</th>
					<td>{addressDriverClient?.chainDripsMetadata?.CONTRACT_DRIPS_HUB_LOGIC || '[Not Connected]'}</td>
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
