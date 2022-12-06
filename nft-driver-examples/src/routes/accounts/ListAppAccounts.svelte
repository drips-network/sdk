<script lang="ts">
	import { isConnected } from '$lib/stores';
	import { ethers } from 'ethers';
	import type { DripsSubgraphClient } from 'radicle-drips';

	export let subgraphClient: DripsSubgraphClient | undefined;

	let associatedApp: string;
	let accounts: string[] | undefined;
	let errorMessage: string | undefined;

	async function getAccounts(app: string) {
		try {
			accounts = undefined;
			errorMessage = undefined;

			const appIdBytes = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(app));

			accounts = (await subgraphClient!.getNftSubAccountIdsByApp(appIdBytes)) ?? [];
		} catch (error: any) {
			console.error(error);
			errorMessage = error.message;
		}
	}
</script>

<h2>List An App's Accounts</h2>

<div>
	<form>
		<fieldset>
			<legend>Parameters</legend>

			<div class="form-group">
				<label for="to">Associated App ID:</label>
				<input
					bind:value={associatedApp}
					name="to"
					type="text"
					required
					placeholder="e.g., 'myApp'"
				/>
			</div>

			<div class="form-group">
				<button
					on:click={() => getAccounts(associatedApp)}
					disabled={!$isConnected}
					class="btn btn-default"
					type="button">Get Accounts</button
				>
			</div>
			<div>
				{#if !$isConnected}
					<div class="terminal-alert terminal-alert-error">[Not Connected]</div>
				{:else if errorMessage}
					<div class="terminal-alert terminal-alert-error">
						{errorMessage}
					</div>
				{:else if accounts?.length}
					<div class="terminal-alert terminal-alert-primary">
						<ol>
							{#each accounts as id}
								<li>{id}</li>
							{/each}
						</ol>
					</div>
				{:else if accounts?.length === 0}
					<div class="terminal-alert terminal-alert-primary">
						No accounts found for the given App ID.
					</div>
				{/if}
			</div>
		</fieldset>
	</form>
</div>

<hr />
