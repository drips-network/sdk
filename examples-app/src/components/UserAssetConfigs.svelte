<script lang="ts">
	import type { AddressDriverClient, DripsSubgraphClient, UserAssetConfig } from 'radicle-drips';
	import JSONTree from 'svelte-json-tree';

	export let addressDriverClient: AddressDriverClient;
	export let dripsSubgraphClient: DripsSubgraphClient;

	let errorMessage: string;
	let userAssetConfigs: UserAssetConfig[];

	$: isConnected = Boolean(addressDriverClient) && Boolean(dripsSubgraphClient);
	$: if (isConnected) getAllDripsConfigurations();

	export const getAllDripsConfigurations = async () => {
		try {
			errorMessage = null;
			userAssetConfigs = null;

			const userId = await addressDriverClient.getUserId();

			userAssetConfigs = await dripsSubgraphClient.getAllUserAssetConfigs(userId);
		} catch (error: any) {
			errorMessage = error.message;

			console.error(error);
		}
	};

	$: if (!isConnected) reset();

	const reset = () => {
		errorMessage = null;
		userAssetConfigs = null;
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
					{#if userAssetConfigs?.length}
						<JSONTree value={userAssetConfigs} defaultExpandedLevel={1} />
					{:else}
						<p>No Entries Found</p>
					{/if}
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
