<script lang="ts">
	import { isConnected } from '$lib/stores';
	import type { ContractReceipt, ContractTransaction } from 'ethers';
	import type { NFTDriverClient } from 'radicle-drips';

	export let nftDriverClient: NFTDriverClient | undefined;

	type SplitsInput = {
		receiverUserId: string;
		weight: string | undefined;
	};

	const splitsInputs = [
		{ receiverUserId: '', weight: undefined },
		{ receiverUserId: '', weight: undefined }
	];

	let settingDrips = false;
	let configuredUserId: string;
	let errorMessage: string | undefined;
	let tx: ContractTransaction | undefined;
	let txReceipt: ContractReceipt | undefined;

	async function setSplits() {
		tx = undefined;
		settingDrips = true;
		txReceipt = undefined;
		errorMessage = undefined;

		try {
			const splits = await Promise.all(
				splitsInputs
					.filter((s) => s.receiverUserId?.length && s.weight)
					.map(async (s) => ({
						userId: s.receiverUserId,
						weight: s.weight
					}))
			);

			tx = await nftDriverClient?.setSplits(configuredUserId, splits);
			console.log(tx);

			txReceipt = await tx.wait();
			console.log(txReceipt);
		} catch (error: any) {
			errorMessage = error.message;
			console.error(error);
		}

		settingDrips = false;
	}
</script>

<h2>Set Splits Configuration</h2>

<p>
	Calls the <code>setSplits(tokenId: BigNumberish, receivers: SplitsReceiverStruct[])</code>
	on the
	<code>NFTDriverClient</code> and sets the user's splits configuration.
</p>

<form>
	<fieldset>
		<legend>Parameters</legend>

		<label for="configuredUserId">Configured user ID:</label>
		<div class="form-group">
			<input
				type="text"
				name="configuredUserId"
				placeholder="e.g. 26959946667150639794667015087019630673637144422540572481103610249216"
				bind:value={configuredUserId}
			/>
		</div>

		<div class="form-group">
			{#each splitsInputs as splitInput, i}
				<div class="input-row form-group">
					<span>{i + 1}# Splits Receiver:</span>
					<input
						type="text"
						placeholder="Receiver user ID"
						bind:value={splitInput.receiverUserId}
					/>
					<input type="text" placeholder="Weight" bind:value={splitInput.weight} />
				</div>
			{/each}
		</div>

		<div>
			<div class="form-group">
				<button class="btn btn-default" type="button" disabled={!$isConnected} on:click={setSplits}
					>Set</button
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
					<p>Updated ✅</p>
					<p>
						Wait for a few seconds and refresh to see the updated configuration. Sometimes the
						Subgraph takes some time to update.
					</p>
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
