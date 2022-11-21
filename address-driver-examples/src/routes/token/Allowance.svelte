<script lang="ts">
	import type { AddressDriverClient } from 'radicle-drips';
	import { isConnected } from '$lib/stores';

	export let addressDriverClient: AddressDriverClient | undefined;

	let tokenInput: string;
	let allowance: bigint | undefined;
	let errorMessage: string | undefined;

	async function getAllowance(tokenAddress: string) {
		try {
			allowance = undefined;
			errorMessage = undefined;

			allowance = await addressDriverClient?.getAllowance(tokenAddress);
			console.log(`Allowance: ${allowance}`);
		} catch (error: any) {
			allowance = undefined;
			errorMessage = error.message;

			console.error(error);
		}
	}
</script>

<h2>Allowance</h2>

<form class="allowance">
	<fieldset>
		<legend>Parameters</legend>

		<label for="token">ERC20 Token Address:</label>
		<div class="form-group">
			<input
				name="token"
				type="text"
				placeholder="0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6"
				bind:value={tokenInput}
			/>
		</div>

		<div class="form-group">
			<button
				class="btn btn-default"
				disabled={!$isConnected}
				type="button"
				on:click={() => getAllowance(tokenInput)}>Get Allowance</button
			>
		</div>

		{#if !$isConnected}
			<div class="terminal-alert terminal-alert-error">[Not Connected]</div>
		{:else if errorMessage}
			<div class="terminal-alert terminal-alert-error">
				<p>{errorMessage}</p>
			</div>
		{:else if allowance !== undefined && allowance >= 0}
			<div class="terminal-alert terminal-alert-primary">
				<p>Token {tokenInput} allowance: {allowance}</p>
			</div>
		{/if}
	</fieldset>
</form>

<hr />
