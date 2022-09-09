<script lang="ts">
	import type { AddressApp, AddressAppClient, DripsSubgraphClient } from 'radicle-drips';
	import type { ContractReceipt, ContractTransaction } from 'ethers';
	import { createEventDispatcher } from 'svelte';

	export let addressAppClient: AddressAppClient;
	export let dripsSubgraphClient: DripsSubgraphClient;

	const dispatch = createEventDispatcher();

	let collectStarted = false;
	let collectErrorMessage: string;
	let collectTx: ContractTransaction;
	let collectTokenAddressInput: string;
	let collectTxReceipt: ContractReceipt;

	$: isConnected = Boolean(addressAppClient);

	const collect = async (erc20TokenAddress: string) => {
		collectTx = null;
		collectStarted = true;
		collectTxReceipt = null;
		collectErrorMessage = null;

		try {
			collectTx = await addressAppClient.collect(erc20TokenAddress);
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

	const collectAll = async (erc20TokenAddress: string) => {
		collectTx = null;
		collectStarted = true;
		collectTxReceipt = null;
		collectErrorMessage = null;

		try {
			const userId = await addressAppClient.getUserId();

			const splitsConfig = await dripsSubgraphClient.getSplitsConfig(userId);

			const currentReceivers: AddressApp.SplitsReceiverStruct[] = splitsConfig.map((s) => ({
				weight: s.weight,
				userId: s.receiverUserId
			}));

			collectTx = await addressAppClient.collectAll(erc20TokenAddress, currentReceivers);
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

	let collectForAddressStarted = false;
	let collectForAddressErrorMessage: string;
	let collectForAddressTx: ContractTransaction;
	let collectForAddressUserAddressInput: string;
	let collectForAddressTokenAddressInput: string;
	let collectForAddressTxReceipt: ContractReceipt;

	const collectForAddress = async (userAddress: string, erc20TokenAddress: string) => {
		collectForAddressTx = null;
		collectForAddressStarted = true;
		collectForAddressTxReceipt = null;
		collectForAddressErrorMessage = null;

		try {
			collectForAddressTx = await addressAppClient.collectForAddress(userAddress, erc20TokenAddress);
			console.log(collectForAddressTx);

			collectForAddressTxReceipt = await collectForAddressTx.wait();
			console.log(collectForAddressTxReceipt);

			dispatch('collected');
		} catch (error: any) {
			collectForAddressErrorMessage = error.message;

			console.error(error);
		}

		collectForAddressStarted = false;
	};

	const collectAllForAddress = async (userAddress: string, erc20TokenAddress: string) => {
		collectForAddressTx = null;
		collectForAddressStarted = true;
		collectForAddressTxReceipt = null;
		collectForAddressErrorMessage = null;

		try {
			const userId = await addressAppClient.getUserIdByAddress(userAddress);

			const splitsConfig = await dripsSubgraphClient.getSplitsConfig(userId);

			const currentReceivers: AddressApp.SplitsReceiverStruct[] = splitsConfig.map((s) => ({
				weight: s.weight,
				userId: s.receiverUserId
			}));

			collectForAddressTx = await addressAppClient.collectAllForAddress(
				userAddress,
				erc20TokenAddress,
				currentReceivers
			);
			console.log(collectForAddressTx);

			collectForAddressTxReceipt = await collectForAddressTx.wait();
			console.log(collectForAddressTxReceipt);

			dispatch('collected');
		} catch (error: any) {
			collectForAddressErrorMessage = error.message;

			console.error(error);
		}

		collectForAddressStarted = false;
	};

	$: if (!isConnected) reset();

	const reset = () => {
		collectTx = null;
		collectStarted = false;
		collectTxReceipt = null;
		collectErrorMessage = null;
		collectForAddressTx = null;
		collectTokenAddressInput = null;
		collectForAddressStarted = false;
		collectForAddressTxReceipt = null;
		collectForAddressErrorMessage = null;
		collectForAddressUserAddressInput = null;
		collectForAddressTokenAddressInput = null;
	};
</script>

<div class="container">
	<section>
		<header>
			<h2>Collect</h2>
		</header>

		<!-- Collect Form -->
		<form>
			<fieldset>
				<legend>Collect For Client Signer</legend>
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
					<button
						class="btn btn-default"
						disabled={!isConnected}
						type="button"
						on:click={() => collect(collectTokenAddressInput)}>Collect</button
					>
					<button
						class="btn btn-default"
						disabled={!isConnected}
						type="button"
						on:click={() => collectAll(collectTokenAddressInput)}>Collect All</button
					>
				</div>
				<div>
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
				</div>
			</fieldset>
		</form>

		<!-- Collect For Address Form -->
		<form class="collect">
			<fieldset>
				<legend>Collect For Address</legend>
				<div class="form-group">
					<label for="token">ERC20 Token:</label>
					<input
						placeholder="ERC20 Token Address (e.g. 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984)"
						type="text"
						name="token"
						bind:value={collectForAddressTokenAddressInput}
					/>
				</div>
				<div class="form-group">
					<label for="address">User Address:</label>
					<input
						type="text"
						name="address"
						placeholder="User Address (e.g. 0x945AFA63507e56748368D3F31ccC35043efDbd4b)"
						bind:value={collectForAddressUserAddressInput}
					/>
				</div>
				<div class="form-group">
					<button
						class="btn btn-default"
						disabled={!isConnected}
						type="button"
						on:click={() => collectForAddress(collectForAddressTokenAddressInput, collectForAddressUserAddressInput)}
						>Collect</button
					>
					<button
						class="btn btn-default"
						disabled={!isConnected}
						type="button"
						on:click={() => collectAllForAddress(collectForAddressTokenAddressInput, collectForAddressUserAddressInput)}
						>Collect All</button
					>
				</div>
				{#if collectForAddressErrorMessage}
					<div class="terminal-alert terminal-alert-error">
						<p>{collectForAddressErrorMessage}</p>
					</div>
				{:else if collectForAddressTxReceipt}
					<div class="terminal-alert terminal-alert-primary">
						<p>Collected successfully ✅</p>
					</div>
				{:else if collectForAddressTx}
					<div class="terminal-alert">
						<p>Awaiting confirmations... ⏳</p>
					</div>
				{:else if collectForAddressStarted}
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
