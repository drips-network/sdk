<script lang="ts">
	import { isConnected } from '$lib/stores';
	import type { DripsSubgraphClient, NftSubAccount } from 'radicle-drips';

	export let subgraphClient: DripsSubgraphClient | undefined;

	let ownerAddress: string;
	let accounts: NftSubAccount[] | undefined;
	let errorMessage: string | undefined;

	async function getAccounts(owner: string) {
		try {
			accounts = undefined;
			errorMessage = undefined;

			accounts = (await subgraphClient!.getNftSubAccountsByOwner(owner!)) ?? [];
		} catch (error: any) {
			console.error(error);
			errorMessage = error.message;
		}
	}
</script>

<h2>List An Owner's Accounts</h2>

<div>
	<form>
		<fieldset>
			<legend>Parameters</legend>

			<div class="form-group">
				<label for="to">Owner Address:</label>
				<input
					bind:value={ownerAddress}
					name="to"
					type="text"
					minlength="42"
					required
					placeholder="e.g., 0x945AFA63507e56748368D3F31ccC35043efDbd4b"
				/>
			</div>

			<div class="form-group">
				<button
					on:click={() => getAccounts(ownerAddress)}
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
							{#each accounts as subAccount}
								<li>{subAccount.tokenId}</li>
							{/each}
						</ol>
					</div>
				{:else if accounts?.length === 0}
					<div class="terminal-alert terminal-alert-primary">
						No accounts found for the given owner address.
					</div>
				{/if}
			</div>
		</fieldset>
	</form>
</div>

<hr />
