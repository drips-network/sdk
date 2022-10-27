<script lang="ts">
	import { isConnected } from '$lib/stores';
	import type { NFTDriverClient } from 'radicle-drips';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let nftDriverClient: NFTDriverClient | undefined;

	let minting = false;
	let transferToAddressInput: string;
	let errorMessage: string | undefined;
	let mintedToken: bigint | undefined;

	async function mint(transferToAddress: string) {
		try {
			console.log('Minting...');

			minting = true;
			errorMessage = undefined;

			mintedToken = await nftDriverClient?.safeMint(transferToAddress);

			console.log('Minted token: ' + mintedToken);

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

<h2>Mint a new identity token</h2>

<p>
	Calls the <code>safeMint(transferToAddress: string)</code> on the
	<code>NFTDriverClient</code> and mints a new identity token for the connected user.
</p>

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
					placeholder="Ethereum address"
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
						<p>Minted token: {mintedToken}</p>
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
