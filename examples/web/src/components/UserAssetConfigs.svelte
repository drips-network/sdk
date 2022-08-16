<script lang="ts">
	import type { AddressAppClient, DripsSubgraphClient, UserAssetConfig } from 'drips-sdk';
	import JSONTree from 'svelte-json-tree';

	export let addressAppClient: AddressAppClient;
	export let dripsSubgraphClient: DripsSubgraphClient;

	let errorMessage: string;
	let userAssetConfigs: UserAssetConfig[];

	$: isConnected = Boolean(addressAppClient) && Boolean(dripsSubgraphClient);
	$: if (isConnected) getUserAssetConfigs();

	export const getUserAssetConfigs = async () => {
		try {
			errorMessage = null;
			userAssetConfigs = null;

			const userId = await addressAppClient.getUserId();

			userAssetConfigs = await dripsSubgraphClient.getUserAssetConfigs(userId);
		} catch (error) {
			errorMessage = error.message;

			console.log(error);
		}
	};
</script>

<div class="container">
	<section>
		<header>
			<h2>User Asset Configurations</h2>
		</header>
		<div>
			{#if errorMessage}
				<div class="terminal-alert terminal-alert-error">
					<p>{errorMessage}</p>
				</div>
			{:else if isConnected}
				<div class="json">
					<JSONTree value={userAssetConfigs} defaultExpandedLevel={2} />
				</div>
			{:else}
				<p>[Not Connected]</p>
			{/if}
		</div>
	</section>
	<hr />
</div>

<style>
	.json {
		--json-tree-font-size: 1em;
		--json-tree-li-indentation: 2em;
		--json-tree-font-family: font-family: var(--font-stack);
	}
</style>
