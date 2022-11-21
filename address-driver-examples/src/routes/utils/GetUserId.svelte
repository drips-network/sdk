<script lang="ts">
	import type { BigNumberish } from 'ethers';
	import { AddressDriverClient } from 'radicle-drips';
	import { isConnected } from '$lib/stores';

	export let addressDriverClient: AddressDriverClient | undefined;

	let userId: string;
	let userAddressInput: string;
	let getUserIdByAddressErrorMessage: string | undefined;

	const getUserIdByAddress = async (userAddress: string) => {
		getUserIdByAddressErrorMessage = undefined;

		try {
			userId = await addressDriverClient!.getUserIdByAddress(userAddress);
		} catch (error: any) {
			getUserIdByAddressErrorMessage = error.message;
			console.error(error);
		}
	};

	let userAddress: string;
	let userIdInput: string;
	let getUserAddressErrorMessage: string | undefined;

	const getUserAddress = async (userId: string) => {
		getUserAddressErrorMessage = undefined;

		try {
			userAddress = AddressDriverClient!.getUserAddress(userId);
		} catch (error: any) {
			getUserAddressErrorMessage = error.message;
			console.error(error);
		}
	};
</script>

<h2>User IDs (<code>AddressDriverClient</code>)</h2>

<form>
	<fieldset>
		<legend>Get User ID By Address</legend>
		<div class="form-group">
			<input
				type="text"
				placeholder="e.g., 0x945AFA63507e56748368D3F31ccC35043efDbd4b"
				bind:value={userAddressInput}
			/>
		</div>
		<div class="form-group">
			<button
				class="btn btn-default"
				disabled={!$isConnected}
				type="button"
				on:click={() => getUserIdByAddress(userAddressInput)}>Get User ID</button
			>
		</div>
		<div>
			{#if !$isConnected}
				<div class="terminal-alert terminal-alert-error">[Not Connected]</div>
			{:else if getUserIdByAddressErrorMessage}
				<div class="terminal-alert terminal-alert-error">
					<p>{getUserIdByAddressErrorMessage}</p>
				</div>
			{:else if userId}
				<div class="terminal-alert terminal-alert-primary">
					<p>{userId}</p>
				</div>
			{/if}
		</div>
	</fieldset>
</form>

<form class="token-address-form">
	<fieldset>
		<legend>Get User Address From User ID</legend>
		<div class="form-group">
			<input
				type="text"
				placeholder="e.g 846959513016227493489143736695218182523669298507"
				bind:value={userIdInput}
			/>
		</div>
		<div class="form-group">
			<button
				class="btn btn-default"
				disabled={!$isConnected}
				type="button"
				on:click={() => getUserAddress(userIdInput)}>Get User Address</button
			>
		</div>
		<div>
			{#if !$isConnected}
				<div class="terminal-alert terminal-alert-error">[Not Connected]</div>
			{:else if getUserAddressErrorMessage}
				<div class="terminal-alert terminal-alert-error">
					<p>{getUserAddressErrorMessage}</p>
				</div>
			{:else if userAddress}
				<div class="terminal-alert terminal-alert-primary">
					<p>{userAddress}</p>
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
