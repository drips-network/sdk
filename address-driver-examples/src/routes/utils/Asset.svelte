<script lang="ts">
	import type { BigNumberish } from 'ethers';
	import { Utils } from 'radicle-drips';
	import { isConnected } from '$lib/stores';

	let assetId: bigint;
	let tokenAddressInput: string;
	let getAssetIdErrorMessage: string | undefined;

	const getAssetId = async (address: string) => {
		getAssetIdErrorMessage = undefined;

		try {
			assetId = Utils.Asset.getIdFromAddress(address);
		} catch (error: any) {
			getAssetIdErrorMessage = error.message;
			console.error(error);
		}
	};

	let tokenAddress: string;
	let tokenIdInput: string;
	let getTokenAddressErrorMessage: string | undefined;

	const getTokenAddress = async (tokenId: BigNumberish) => {
		getTokenAddressErrorMessage = undefined;

		try {
			tokenAddress = Utils.Asset.getAddressFromId(tokenId);
		} catch (error: any) {
			getTokenAddressErrorMessage = error.message;

			console.error(error);
		}
	};
</script>

<h2>Asset Helpers (<code>Utils.Asset</code>)</h2>

<form>
	<fieldset>
		<legend>Get Asset ID from Address</legend>
		<div class="form-group">
			<input
				type="text"
				placeholder="e.g., 0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6"
				bind:value={tokenAddressInput}
			/>
		</div>
		<div class="form-group">
			<button
				class="btn btn-default"
				disabled={!$isConnected}
				type="button"
				on:click={() => getAssetId(tokenAddressInput)}>Get Asset ID</button
			>
		</div>
		<div>
			{#if !$isConnected}
				<div class="terminal-alert terminal-alert-error">[Not Connected]</div>
			{:else if getAssetIdErrorMessage}
				<div class="terminal-alert terminal-alert-error">
					<p>{getAssetIdErrorMessage}</p>
				</div>
			{:else if assetId}
				<div class="terminal-alert terminal-alert-primary">
					<p>{assetId}</p>
				</div>
			{/if}
		</div>
	</fieldset>
</form>

<form class="token-address-form">
	<fieldset>
		<legend>Get Token Address from Asset (Token) ID</legend>
		<div class="form-group">
			<input
				type="text"
				placeholder="e.g 1033236945445138540915192691692934361059155904726"
				bind:value={tokenIdInput}
			/>
		</div>
		<div class="form-group">
			<button
				class="btn btn-default"
				disabled={!$isConnected}
				type="button"
				on:click={() => getTokenAddress(tokenIdInput)}>Get Asset ID</button
			>
		</div>
		<div>
			{#if !$isConnected}
				<div class="terminal-alert terminal-alert-error">[Not Connected]</div>
			{:else if getTokenAddressErrorMessage}
				<div class="terminal-alert terminal-alert-error">
					<p>{getTokenAddressErrorMessage}</p>
				</div>
			{:else if tokenAddress}
				<div class="terminal-alert terminal-alert-primary">
					<p>{tokenAddress}</p>
				</div>
			{/if}
		</div>
	</fieldset>
</form>

<hr />

<style>
	.token-address-form {
		margin: calc(var(--global-space) * 2) 0;
	}
</style>
