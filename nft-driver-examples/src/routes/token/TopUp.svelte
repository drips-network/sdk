<script lang="ts">
	import { Utils, type DripsSubgraphClient, type NFTDriverClient } from 'radicle-drips';
	import { isConnected } from '$lib/stores';
	import type { ContractReceipt, ContractTransaction } from 'ethers';

	export let nftDriverClient: NFTDriverClient | undefined;
	export let subgraphClient: DripsSubgraphClient | undefined;

	let settingDrips = false;
	let amount: string;
	let tokenAddress: string;
	let configuredUserId: string;
	let errorMessage: string | undefined;
	let tx: ContractTransaction | undefined;
	let txReceipt: ContractReceipt | undefined;

	async function setDrips() {
		tx = undefined;
		settingDrips = true;
		txReceipt = undefined;
		errorMessage = undefined;

		try {
			const currentReceivers = await subgraphClient!.getCurrentDripsReceivers(
				configuredUserId,
				tokenAddress
			);

			const newReceivers = currentReceivers;

			const tranferTo = await nftDriverClient!.signer.getAddress();

			tx = await nftDriverClient?.setDrips(
				configuredUserId,
				tokenAddress,
				currentReceivers,
				newReceivers,
				tranferTo,
				amount
			);
			console.log(tx);

			txReceipt = await tx?.wait();
			console.log(txReceipt);
		} catch (error: any) {
			errorMessage = error.message;
			console.error(error);
		}

		settingDrips = false;
	}
</script>

<h2>TopUp</h2>

<p>
	<strong>Make sure the ERC20 Token is approved first</strong>, or else the transaction will fail.
</p>

<form>
	<fieldset>
		<legend>Parameters</legend>

		<label for="configuredUserId">Configured Account Token ID:</label>
		<div class="form-group">
			<input
				type="text"
				name="configuredUserId"
				placeholder="e.g., 26959946667150639794667015087019630673637144422540572481103610249216"
				bind:value={configuredUserId}
			/>
		</div>

		<label for="assetId">ERC20 Token Address:</label>
		<div class="form-group">
			<input
				type="text"
				name="assetId"
				placeholder="e.g., 0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6"
				bind:value={tokenAddress}
			/>
		</div>

		<label for="amount">Amount:</label>
		<div class="form-group">
			<input
				type="text"
				name="amount"
				placeholder="Amount in the smallest unit, e.g., Wei"
				bind:value={amount}
			/>
		</div>

		<div>
			<div class="form-group">
				<button class="btn btn-default" type="button" disabled={!$isConnected} on:click={setDrips}
					>TopUp</button
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
					<p>TopUp successfull ✅</p>
				</div>
			{:else if tx}
				<div class="terminal-alert terminal-alert-primary">
					<p>Awaiting confirmations... ⏳</p>
				</div>
			{:else if settingDrips}
				<div class="terminal-alert terminal-alert-primary">
					<p>Confirm the transaction 👉</p>
				</div>
			{/if}
		</div>
	</fieldset>
</form>

<hr />
