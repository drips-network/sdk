<script lang="ts">
	import type { AddressDriverClient, DripsSubgraphClient } from 'radicle-drips';
	import type { ContractReceipt, ContractTransaction } from 'ethers';
	import { createEventDispatcher } from 'svelte';

	export let addressDriverClient: AddressDriverClient;
	export let dripsSubgraphClient: DripsSubgraphClient;

	const dispatch = createEventDispatcher();

	let collectStarted = false;
	let collectErrorMessage: string;
	let collectTx: ContractTransaction;
	let collectTokenAddressInput: string;
	let collectTxReceipt: ContractReceipt;
	let collectTokenTransferToInput: string;

	$: isConnected = Boolean(addressDriverClient);

	const collect = async (erc20TokenAddress: string, transferToAddress: string) => {
		collectTx = null;
		collectStarted = false;
		collectTxReceipt = null;
		collectErrorMessage = null;

		try {
			collectTx = await addressDriverClient.collect(erc20TokenAddress, transferToAddress);
			console.log(collectTx);

			collectTxReceipt = await collectTx.wait();
			console.log(collectTxReceipt);

			dispatch('collected');
		} catch (error: any) {
			collectErrorMessage = error.message;

			console.error(error);
		}

		collectStarted = false;
	};

	$: if (!isConnected) reset();

	const reset = () => {
		collectTx = null;
		collectStarted = false;
		collectTxReceipt = null;
		collectErrorMessage = null;
		collectTokenAddressInput = null;
		collectTokenTransferToInput = null;
	};
</script>

<div class="container">
	<section>
		<header>
			<h2>Collect</h2>
		</header>

		<!-- Collect Form -->
		<form class="collect">
			<fieldset>
				<legend>Collect</legend>
				<div class="form-group">
					<label for="token">ERC20 Token:</label>
					<input
						placeholder="ERC20 Token Address (e.g. 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984)"
						type="text"
						name="token"
						bind:value={collectTokenAddressInput}
					/>
				</div>
				<div class="form-group">
					<label for="address">User Address:</label>
					<input
						type="text"
						name="address"
						placeholder="User Address (e.g. 0x945AFA63507e56748368D3F31ccC35043efDbd4b)"
						bind:value={collectTokenTransferToInput}
					/>
				</div>
				<div class="form-group">
					<button
						class="btn btn-default"
						disabled={!isConnected}
						type="button"
						on:click={() => collect(collectTokenAddressInput, collectTokenTransferToInput)}>Collect</button
					>
				</div>
				{#if collectErrorMessage}
					<div class="terminal-alert terminal-alert-error">
						<p>{collectErrorMessage}</p>
					</div>
				{:else if collectTxReceipt}
					<div class="terminal-alert terminal-alert-primary">
						<p>Collected successfully ✅</p>
					</div>
				{:else if collectTx}
					<div class="terminal-alert">
						<p>Awaiting confirmations... ⏳</p>
					</div>
				{:else if collectStarted}
					<div class="terminal-alert">
						<p>Confirm the transaction 👉</p>
					</div>
				{/if}
			</fieldset>
		</form>
	</section>
	<hr />
</div>

<style>
	.collect {
		margin: calc(var(--global-space) * 2) 0;
	}
</style>
