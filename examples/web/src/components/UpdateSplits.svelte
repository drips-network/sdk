<script lang="ts">
	import type { AddressApp, AddressAppClient, DripsSubgraphClient } from 'drips-sdk';
	import type { BigNumber, BigNumberish, ContractReceipt, ContractTransaction } from 'ethers';
	import { createEventDispatcher } from 'svelte';

	export let addressAppClient: AddressAppClient;

	const dispatch = createEventDispatcher();

	const splitsInputs = [
		{ address: '', weight: null as BigNumber },
		{ address: '', weight: null as BigNumber }
	];

	let started = false;
	let configId: string;
	let errorMessage: string;
	let tx: ContractTransaction;
	let txReceipt: ContractReceipt;

	$: isConnected = Boolean(addressAppClient);

	const setSplits = async () => {
		tx = null;
		started = true;
		txReceipt = null;
		errorMessage = null;

		try {
			const receivers: AddressApp.SplitsReceiverStruct[] = await Promise.all(
				splitsInputs.map(async (s) => ({
					weight: s.weight,
					userId: await addressAppClient.getUserIdForAddress(s.address)
				}))
			);

			console.log(receivers);

			tx = await addressAppClient.setSplits(receivers);
			console.log(tx);

			txReceipt = await tx.wait();
			console.log(txReceipt);

			dispatch('userAssetConfigUpdated', {});
		} catch (error) {
			errorMessage = error.message;

			console.log(error);
		}

		started = false;
	};
</script>

<div class="container">
	<section>
		<header>
			<h2>Update Splits</h2>
		</header>

		<form>
			<fieldset>
				<legend>Splits Configuration</legend>

				<div class="form-group">
					{#each splitsInputs as splitInput, i}
						<div class="input-row form-group">
							<span>{i + 1}# Splits Receiver:</span>
							<input
								type="text"
								placeholder="User Address (e.g. 0x945AFA63507e56748368D3F31ccC35043efDbd4b)"
								bind:value={splitInput.address}
							/>
							<input type="text" placeholder="Amount per second" bind:value={splitInput.weight} />
						</div>
					{/each}
				</div>

				<div class="form-group">
					<div>
						<button class="btn btn-default" type="button" disabled={!isConnected} on:click={setSplits}>Update</button>
						{#if errorMessage}
							<p>{errorMessage}</p>
						{:else if txReceipt}
							<p>Updated ✅</p>
						{:else if tx}
							<p>Awaiting confirmations... ⏳</p>
						{:else if started}
							<p>Confirm the transaction 👉</p>
						{/if}
					</div>
				</div>
			</fieldset>
		</form>
	</section>
	<hr />
</div>
