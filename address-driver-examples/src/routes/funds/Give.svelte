<script lang="ts">
	import type { BigNumberish, ContractReceipt, ContractTransaction } from 'ethers';
	import type { AddressDriverClient } from 'radicle-drips';
	import { isConnected } from '$lib/stores';

	export let addressDriverClient: AddressDriverClient | undefined;

	let giving = false;
	let tokenAddressInput: string;
	let receiverUserIdInput: string;
	let amountInput: string;
	let errorMessage: string | undefined;
	let tx: ContractTransaction | undefined;
	let txReceipt: ContractReceipt | undefined;

	async function give(receiverUserId: string, tokenAddress: string, amount: BigNumberish) {
		try {
			console.log('Giving...');

			giving = true;
			errorMessage = undefined;

			tx = await addressDriverClient?.give(receiverUserId, tokenAddress, amount);
			console.log(tx);

			txReceipt = await tx?.wait();
			console.log(txReceipt);
		} catch (error: any) {
			console.error(error);
			errorMessage = error.message;
		}

		giving = false;
	}
</script>

<h2>Give</h2>

<div>
	<form class="collect">
		<fieldset>
			<legend>Give</legend>
			<div class="form-group">
				<label for="receiver">Receiver user ID:</label>
				<input
					placeholder="e.g., 26959946667150639794667015087019630673637144422540572481103610249218"
					type="text"
					name="receiver"
					bind:value={receiverUserIdInput}
				/>
			</div>
			<div class="form-group">
				<label for="token">ERC20 Token Address:</label>
				<input
					placeholder="e.g., 0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6"
					type="text"
					name="token"
					bind:value={tokenAddressInput}
				/>
			</div>
			<div class="form-group">
				<label for="amount">Amount:</label>
				<input
					type="text"
					name="amount"
					placeholder="e.g., 50000000000000000 (in the smallest unit, e.g., Wei)"
					bind:value={amountInput}
				/>
			</div>
			<div class="form-group">
				<button
					class="btn btn-default"
					disabled={!$isConnected}
					type="button"
					on:click={() => give(receiverUserIdInput, tokenAddressInput, amountInput)}>Give</button
				>
			</div>
			{#if !$isConnected}
				<div class="terminal-alert terminal-alert-error">[Not Connected]</div>
			{:else if errorMessage}
				<div class="terminal-alert terminal-alert-error">
					<p>{errorMessage}</p>
				</div>
			{:else if txReceipt}
				<div class="terminal-alert terminal-alert-primary">
					<p>Gave successfully ✅</p>
				</div>
			{:else if tx}
				<div class="terminal-alert">
					<p>Awaiting confirmations... ⏳</p>
				</div>
			{:else if giving}
				<div class="terminal-alert">
					<p>Confirm the transaction 👉</p>
				</div>
			{/if}
		</fieldset>
	</form>
</div>

<hr />
