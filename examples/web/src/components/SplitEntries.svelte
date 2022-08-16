<script lang="ts">
	import type { AddressAppClient, DripsSubgraphClient, SplitEntry } from 'drips-sdk';
	import JSONTree from 'svelte-json-tree';

	export let addressAppClient: AddressAppClient;
	export let dripsSubgraphClient: DripsSubgraphClient;

	let errorMessage: string;
	let splitEntries: SplitEntry[];

	$: isConnected = Boolean(addressAppClient) && Boolean(dripsSubgraphClient);
	$: if (isConnected) getSplitEntries();

	export const getSplitEntries = async () => {
		try {
			errorMessage = null;
			splitEntries = null;

			const userId = await addressAppClient.getUserId();

			splitEntries = await dripsSubgraphClient.getSplitEntries(userId);
		} catch (error) {
			errorMessage = error.message;

			console.log(error);
		}
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
					<JSONTree value={splitEntries} defaultExpandedLevel={2} />
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
