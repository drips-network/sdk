<script lang="ts">
	import type { AddressDriverClient, DripsSubgraphClient, DripsSubgraphTypes } from 'radicle-drips';
	import JSONTree from 'svelte-json-tree';

	export let addressDriverClient: AddressDriverClient;
	export let dripsSubgraphClient: DripsSubgraphClient;

	let errorMessage: string;
	let splitEntries: DripsSubgraphTypes.SplitsEntry[];

	$: isConnected = Boolean(addressDriverClient) && Boolean(dripsSubgraphClient);
	$: if (isConnected) getSplitsConfig();

	export const getSplitsConfig = async () => {
		try {
			errorMessage = null;
			splitEntries = null;

			const userId = await addressDriverClient.getUserId();

			splitEntries = await dripsSubgraphClient.getSplitsConfigByUserId(userId);
		} catch (error: any) {
			errorMessage = error.message;

			console.error(error);
		}
	};

	$: if (!isConnected) reset();

	const reset = () => {
		errorMessage = null;
		splitEntries = null;
	};
</script>

<div class="container">
	<section>
		<header>
			<h2>Split Entries</h2>
		</header>
		<div>
			{#if errorMessage}
				<div class="terminal-alert terminal-alert-error">
					<p>{errorMessage}</p>
				</div>
			{:else if isConnected}
				<div class="json">
					{#if splitEntries?.length}
						<JSONTree value={splitEntries} defaultExpandedLevel={1} />
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
