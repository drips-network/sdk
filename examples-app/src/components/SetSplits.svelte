<script lang="ts">
	import type { AddressApp, AddressAppClient } from 'radicle-drips';
	import type { BigNumber, ContractReceipt, ContractTransaction } from 'ethers';

	export let addressAppClient: AddressAppClient;

	const splitsInputs = [
		{ address: '', weight: undefined as BigNumber },
		{ address: '', weight: undefined as BigNumber }
	];

	let started = false;
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
			const splits: AddressApp.SplitsReceiverStruct[] = await Promise.all(
				splitsInputs
					.filter((s) => s.address && s.weight)
					.map(async (s) => ({
						userId: await addressAppClient.getUserIdByAddress(s.address),
						weight: s.weight
					}))
			);

			tx = await addressAppClient.setSplits(splits);
			console.log(tx);

			txReceipt = await tx.wait();
			console.log(txReceipt);
		} catch (error: any) {
			errorMessage = error.message;

			console.error(error);
		}

		started = false;
	};

	$: if (!isConnected) reset();

	const reset = () => {
		tx = null;
		started = false;
		txReceipt = null;
		errorMessage = null;
	};
</script>

<div class="container">
	<section>
		<header>
			<h2>Set Splits</h2>
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
							<input type="text" placeholder="Weight" bind:value={splitInput.weight} />
						</div>
					{/each}
				</div>

				<div class="form-group">
					<button class="btn btn-default" type="button" disabled={!isConnected} on:click={setSplits}>Set</button>
				</div>

				{#if errorMessage}
					<div class="terminal-alert terminal-alert-error">
						<p>{errorMessage}</p>
					</div>
				{:else if txReceipt}
					<div class="terminal-alert terminal-alert-primary">
						<p>Updated ✅</p>
						<p>Wait for a few seconds and refresh to see the updated configuration.</p>
					</div>
				{:else if tx}
					<div class="terminal-alert terminal-alert-primary">
						<p>Awaiting confirmations... ⏳</p>
					</div>
				{:else if started}
					<div class="terminal-alert terminal-alert-primary">
						<p>Confirm the transaction 👉</p>
					</div>
				{/if}
			</fieldset>
		</form>
	</section>
	<hr />
</div>
