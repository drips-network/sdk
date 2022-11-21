<script lang="ts">
	import { isConnected } from '$lib/stores';
	import type { ContractReceipt, ContractTransaction } from 'ethers';
	import type { AddressDriverClient } from 'radicle-drips';

	export let addressDriverClient: AddressDriverClient | undefined;

	let approving = false;
	let tokenInput: string;
	let errorMessage: string | undefined;
	let tx: ContractTransaction | undefined;
	let txReceipt: ContractReceipt | undefined;

	async function approve(tokenAddress: string) {
		tx = undefined;
		approving = true;
		txReceipt = undefined;
		errorMessage = undefined;

		try {
			tx = await addressDriverClient?.approve(tokenAddress);
			console.log(tx);

			txReceipt = await tx?.wait();
			console.log(txReceipt);
		} catch (error: any) {
			errorMessage = error.message;
			console.error(error);
		}

		approving = false;
	}
</script>

<h2>Approve</h2>

<form>
	<fieldset>
		<legend>Parameters</legend>
		<div class="form-group">
			<label for="token">ERC20 Token Address:</label>
			<input
				name="token"
				type="text"
				placeholder="e.g., 0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6"
				bind:value={tokenInput}
			/>
		</div>
		<div class="form-group">
			<button
				class="btn btn-default"
				disabled={!$isConnected}
				type="button"
				on:click={() => approve(tokenInput)}>Approve</button
			>
		</div>
		<div>
			{#if !$isConnected}
				<div class="terminal-alert terminal-alert-error">[Not Connected]</div>
			{:else if errorMessage}
				<div class="terminal-alert terminal-alert-error">
					<p>{errorMessage}</p>
				</div>
			{:else if txReceipt}
				<div class="terminal-alert terminal-alert-primary">
					<p>Token {tokenInput} approved ✅</p>
				</div>
			{:else if tx}
				<div class="terminal-alert">
					<p>Awaiting confirmations... ⏳</p>
				</div>
			{:else if approving}
				<div class="terminal-alert">
					<p>Confirm the transaction 👉</p>
				</div>
			{/if}
		</div>
	</fieldset>
</form>

<hr />
