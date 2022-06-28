<script lang="ts">
	import type { DripsReceiverStruct, SubgraphClient, DripsClient, DripsConfig } from 'drips-sdk';
	import { BigNumber, BigNumberish, ContractReceipt, ContractTransaction, utils } from 'ethers';
	import { createEventDispatcher } from 'svelte';

	export let dripsClient: DripsClient;
	export let subgraphClient: SubgraphClient;

	const dispatch = createEventDispatcher<{ updated: void }>();

	let topUpDai = 0;
	let error: string = null;

	let transaction: ContractTransaction;
	let txReceipt: ContractReceipt;
	let started = false;

	async function checkTopUpWithdrawal(amt: BigNumber, userDrips: DripsConfig): Promise<string> {
		if (amt.gt(0)) {
			const allowance = await dripsClient.getAllowance();
			if (allowance.lt(amt)) {
				return 'You do not have enough DAI, or must first approve DAI for your addres.';
			}
		} else if (amt.lt(0)) {
			const withdrawable = userDrips.withdrawable;
			// !! can't withdraw that much
			if (amt.abs().gt(withdrawable)) {
				return `You can't withdraw that much DAI.`;
			}
		}
	}

	export const oneMonth = 30 * 24 * 60 * 60;
	export const toWei = (dai: BigNumberish) => utils.parseUnits(dai.toString());
	export const toWeiPerSec = (dai: BigNumberish = 0) =>
		// warning! BN will clip off the decimal...
		// (but maybe good for when setting minAmtPerSec)
		utils.parseUnits(dai.toString()).div(oneMonth);

	async function updateDripsWithInputs() {
		const topUpWei = topUpDai ? toWei(topUpDai) : BigNumber.from(0);
		const userDrips = await subgraphClient.getDripsBySender(await dripsClient.signer.getAddress());

		error = await checkTopUpWithdrawal(topUpWei, userDrips);
		if (error) return;

		const newReceivers = dripsInputs
			.filter(({ address, amount }) => address.length && amount)
			.map<DripsReceiverStruct>(({ address, amount }) => ({
				receiver: address.toLowerCase(),
				amtPerSec: toWeiPerSec(amount)
			}));

		started = true;
		transaction = await dripsClient.updateUserDrips(
			userDrips.timestamp || 0,
			userDrips.balance || 0,
			userDrips.receivers || [],
			topUpWei,
			newReceivers
		);
		txReceipt = await transaction.wait();
		dispatch('updated');
	}

	const dripsInputs = [
		{ address: '', amount: null as number },
		{ address: '', amount: null as number },
		{ address: '', amount: null as number }
	];
</script>

<label
	>Top-Up/Withdrawal:
	<input type="number" bind:value={topUpDai} />
</label>

<h3>Drips Entries (address / DAI amount):</h3>

<div class="inputs">
	{#each dripsInputs as dripsInput, i}
		<div class="input-row">
			<span>{i + 1}.</span>
			<input size="46" type="text" bind:value={dripsInput.address} />
			<input type="number" bind:value={dripsInput.amount} />
		</div>
	{/each}
</div>

<div class="button-container">
	<button on:click={updateDripsWithInputs} disabled={!Boolean(dripsClient)}>Update Drips</button>
	<div class="status">
		{#if error}
			{error}
		{:else if txReceipt}
			Updated!
		{:else if transaction}
			Awaiting confirmations
		{:else if started}
			Confirm the transaction
		{/if}
	</div>
</div>

<style>
	.status {
		color: #333;
	}
	.inputs {
		display: grid;
		grid-template-columns: 15px auto 100px;
		grid-gap: 10px;
		padding-bottom: 10px;
	}
	.input-row {
		display: contents;
	}
	.input-row > * {
		display: flex;
		align-items: center;
		margin: 0;
	}
	.button-container {
		display: flex;
		align-items: center;
		column-gap: 10px;
	}
</style>
