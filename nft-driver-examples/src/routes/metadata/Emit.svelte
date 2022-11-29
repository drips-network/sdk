<script lang="ts">
	import { isConnected } from '$lib/stores';
	import { ethers, type ContractReceipt, type ContractTransaction } from 'ethers';
	import type { NFTDriverClient, UserMetadataStruct } from 'radicle-drips';

	export let nftDriverClient: NFTDriverClient | undefined;

	type UserMetadataInput = {
		key: string | undefined;
		value: string | undefined;
	};

	const metadataInputs: UserMetadataInput[] = [
		{
			key: undefined,
			value: undefined
		},
		{
			key: undefined,
			value: undefined
		}
	];

	let emitting = false;
	let tokenId: string;
	let errorMessage: string | undefined;
	let tx: ContractTransaction | undefined;
	let txReceipt: ContractReceipt | undefined;

	async function emitUserMetadata(tokenId: string) {
		tx = undefined;
		emitting = true;
		txReceipt = undefined;
		errorMessage = undefined;

		const metadata: UserMetadataStruct[] = metadataInputs
			.filter((m) => m.key?.length && m.value?.length)
			.map((m) => ({
				key: ethers.utils.formatBytes32String(m.key as string),
				value: ethers.utils.hexlify(ethers.utils.toUtf8Bytes(m.value as string))
			}));

		console.log(metadata);

		try {
			tx = await nftDriverClient?.emitUserMetadata(tokenId, metadata);
			console.log(tx);

			txReceipt = await tx?.wait();
			console.log(txReceipt);
		} catch (error: any) {
			errorMessage = error.message;
			console.error(error);
		}

		emitting = false;
	}
</script>

<h2>Emit User Metadata</h2>

<form>
	<fieldset>
		<legend>Parameters</legend>

		<label for="configuredUserId">The ID of the token representing the emitting account:</label>
		<div class="form-group">
			<input
				type="text"
				name="configuredUserId"
				placeholder="e.g., 26959946667150639794667015087019630673637144422540572481103610249216"
				bind:value={tokenId}
			/>
		</div>

		<div class="form-group">
			{#each metadataInputs as metadataInput, i}
				<div class="input-row form-group">
					<span>{i + 1}# Metadata Entry:</span>
					<input type="text" placeholder="Metadata key" bind:value={metadataInput.key} />
					<input type="text" placeholder="Metadata value" bind:value={metadataInput.value} />
				</div>
			{/each}
		</div>

		<div>
			<div class="form-group">
				<button
					class="btn btn-default"
					type="button"
					disabled={!$isConnected}
					on:click={() => emitUserMetadata(tokenId)}>Emit</button
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
			{:else if emitting}
				<div class="terminal-alert terminal-alert-primary">
					<p>Confirm the transaction 👉</p>
				</div>
			{/if}
		</div>
	</fieldset>
</form>

<hr />
