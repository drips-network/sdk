<script lang="ts">
	import { isConnected } from '$lib/stores';
	import type { DripsSubgraphClient, UserAssetConfig } from 'radicle-drips';
	import JSONTree from 'svelte-json-tree';

	export let subgraphClient: DripsSubgraphClient | undefined;

	let userIdInput: string;
	let errorMessage: string | undefined;
	let userAssetConfigs: UserAssetConfig[] | undefined;

	async function getAllUserAssetConfigsByUserId(userId: string) {
		try {
			errorMessage = undefined;

			userAssetConfigs = await subgraphClient?.getAllUserAssetConfigsByUserId(userId);
		} catch (error: any) {
			errorMessage = error.message;
			console.error(error);
		}
	}
</script>

<h2>List Drips Configurations</h2>

<form>
	<fieldset>
		<legend>Parameters</legend>
		<div class="form-group">
			<label for="config">User ID:</label>
			<input
				id="config"
				name="config"
				type="text"
				placeholder="e.g., 846959513016227493489143736695218182523669298507"
				bind:value={userIdInput}
			/>
		</div>
		<div class="form-group">
			<button
				class="btn btn-default"
				disabled={!$isConnected}
				type="button"
				on:click={() => getAllUserAssetConfigsByUserId(userIdInput)}>Get</button
			>
		</div>
		<div>
			{#if !$isConnected}
				<div class="terminal-alert terminal-alert-error">[Not Connected]</div>
			{:else if errorMessage}
				<div class="terminal-alert terminal-alert-error">
					<p>{errorMessage}</p>
				</div>
			{:else if userAssetConfigs}
				<div class="json">
					{#if userAssetConfigs?.length}
						<JSONTree value={userAssetConfigs} defaultExpandedLevel={1} />
					{:else}
						<p>No Entries Found</p>
					{/if}
				</div>
			{/if}
		</div>
	</fieldset>
</form>

<hr />

<style>
	.json {
		--json-tree-font-size: 1em;
		--json-tree-li-indentation: 2em;
		--json-tree-font-family: font-family: var(--font-stack);
	}
</style>
