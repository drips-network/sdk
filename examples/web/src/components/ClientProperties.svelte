<script lang="ts">
	import type { AddressAppClient, DripsSubgraphClient } from 'drips-sdk';

	export let addressAppClient: AddressAppClient;
	export let dripsSubgraphClient: DripsSubgraphClient;

	$: isConnected = Boolean(addressAppClient) && Boolean(dripsSubgraphClient);
	$: if (isConnected) getClientDetails();

	let userId: string;
	let signerAddress: string;

	const getClientDetails = async () => {
		userId = await addressAppClient.getUserId();
		signerAddress = await addressAppClient.signer.getAddress();
	};
</script>

<div class="container">
	<section>
		<header>
			<h2>Client Properties</h2>
		</header>

		<table>
			<thead>
				<tr>
					<th>Property</th>
					<th>Value</th>
					<th>Client</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<th>Network</th>
					<td>{addressAppClient?.network?.name || '[Not Connected]'}</td>
					<td>{isConnected ? 'AddressAppClient' : '[Not Connected]'}</td>
				</tr>
				<tr>
					<th>Chain ID</th>
					<td>{addressAppClient?.network?.chainId || '[Not Connected]'}</td>
					<td>{isConnected ? 'AddressAppClient' : '[Not Connected]'}</td>
				</tr>
				<tr>
					<th>Signer Address</th>
					<td>{isConnected ? (signerAddress ? signerAddress : 'Getting signer address...') : '[Not Connected]'}</td>
					<td>{isConnected ? 'AddressAppClient' : '[Not Connected]'}</td>
				</tr>
				<tr>
					<th>User ID</th>
					<td>{isConnected ? (userId ? userId : 'Getting user ID...') : '[Not Connected]'}</td>
					<td>{isConnected ? 'AddressAppClient' : '[Not Connected]'}</td>
				</tr>
				<tr>
					<th>DripbHub Contract</th>
					<td>{addressAppClient?.networkProperties?.CONTRACT_DRIPS_HUB || '[Not Connected]'}</td>
					<td>{isConnected ? 'AddressAppClient' : '[Not Connected]'}</td>
				</tr>
				<tr>
					<th>AddressApp Contract</th>
					<td>{addressAppClient?.networkProperties?.CONTRACT_ADDRESS_APP || '[Not Connected]'}</td>
					<td>{isConnected ? 'AddressAppClient' : '[Not Connected]'}</td>
				</tr>
				<tr>
					<th>DripbHubLogic Contract</th>
					<td>{addressAppClient?.networkProperties?.CONTRACT_DRIPS_HUB_LOGIC || '[Not Connected]'}</td>
					<td>{isConnected ? 'AddressAppClient' : '[Not Connected]'}</td>
				</tr>
				<tr>
					<th>Subgraph URL</th>
					{#if dripsSubgraphClient}
						<td><a href={dripsSubgraphClient.apiUrl} target="__blank">{dripsSubgraphClient.apiUrl}</a></td>
						<td>{isConnected ? 'DripsSubgraphClient' : '[Not Connected]'}</td>
					{:else}
						<td>[Not Connected]</td>
						<td>{isConnected ? 'DripsSubgraphClient' : '[Not Connected]'}</td>
					{/if}
				</tr>
			</tbody>
		</table>
	</section>
	<hr />
</div>
