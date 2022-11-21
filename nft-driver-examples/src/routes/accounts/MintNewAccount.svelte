<script lang="ts">
	import { isConnected } from '$lib/stores';
	import type { NFTDriverClient } from 'radicle-drips';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let nftDriverClient: NFTDriverClient | undefined;

	let minting = false;
	let transferToAddressInput: string;
	let errorMessage: string | undefined;
	let mintedToken: string | undefined;

	async function mint(transferToAddress: string) {
		try {
			console.log('Minting...');

			minting = true;
			errorMessage = undefined;

			mintedToken = await nftDriverClient?.safeCreateAccount(transferToAddress);

			console.log('Minted account token ID: ' + mintedToken);

			dispatch('tokenMinted', {
				token: mintedToken
			});
		} catch (error: any) {
			console.error(error);
			errorMessage = error.message;
		}

		minting = false;
	}
</script>

<h2>Create a New Account</h2>

<div>
	<form>
		<fieldset>
			<legend>Parameters</legend>

			<div class="form-group">
				<label for="to">Transfer To Address:</label>
				<input
					bind:value={transferToAddressInput}
					name="to"
					type="text"
					minlength="42"
					required
					placeholder="e.g., 0x945AFA63507e56748368D3F31ccC35043efDbd4b"
				/>
			</div>

			<div class="form-group">
				<button
					on:click={() => mint(transferToAddressInput)}
					disabled={!$isConnected}
					class="btn btn-default"
					type="button">Mint</button
				>
			</div>
			<div>
				{#if !$isConnected}
					<div class="terminal-alert terminal-alert-error">[Not Connected]</div>
				{:else if errorMessage}
					<div class="terminal-alert terminal-alert-error">
						{errorMessage}
					</div>
				{:else if mintedToken}
					<div class="terminal-alert terminal-alert-primary">
						<p>Minted account token ID: {mintedToken}</p>
					</div>
				{:else if minting}
					<div class="terminal-alert terminal-alert-primary">
						<p>Minting...</p>
					</div>
				{/if}
			</div>
		</fieldset>
	</form>
</div>

<hr />