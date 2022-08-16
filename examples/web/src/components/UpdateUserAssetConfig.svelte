<script lang="ts">
	import {
		AddressApp,
		AddressAppClient,
		DripsReceiver,
		DripsReceiverConfig,
		DripsSubgraphClient,
		utils
	} from 'drips-sdk';
	import type { BigNumber, BigNumberish, ContractReceipt, ContractTransaction } from 'ethers';
	import { createEventDispatcher } from 'svelte';

	export let addressAppClient: AddressAppClient;
	export let dripsSubgraphClient: DripsSubgraphClient;

	const dispatch = createEventDispatcher();

	const dripsInputs = [
		{
			userAddress: '',
			erc20TokenAddress: '',
			config: {
				start: null as BigNumber,
				duration: null as BigNumber,
				amountPerSec: null as BigNumber
			}
		},
		{
			userAddress: '',
			erc20TokenAddress: '',
			config: {
				start: null as BigNumber,
				duration: null as BigNumber,
				amountPerSec: null as BigNumber
			}
		}
	];

	let started = false;
	let configId: string;
	let errorMessage: string;
	let tx: ContractTransaction;
	let topUpAmount: BigNumberish;
	let txReceipt: ContractReceipt;

	$: isConnected = Boolean(addressAppClient) && Boolean(dripsSubgraphClient);

	const setDrips = async () => {
		tx = null;
		started = true;
		txReceipt = null;
		errorMessage = null;

		try {
			const configToUpdate = await dripsSubgraphClient.getUserAssetConfigById(configId);

			if (!configToUpdate) {
				throw new Error(`User asset configuration for the specified ID (${configId}) not found.`);
			}

			const currentReceivers: AddressApp.DripsReceiverStruct[] = utils.mapDripEntriesToStructs(
				configToUpdate.dripsEntries
			);

			const balanceDelta = topUpAmount || 0;

			const newReceivers: DripsReceiver[] = await Promise.all(
				dripsInputs
					.filter((d) => d.config.amountPerSec && d.userAddress.length)
					.map(async (d) => ({
						userId: await addressAppClient.getUserIdForAddress(d.userAddress),
						config: new DripsReceiverConfig(d.config.amountPerSec, d.config?.duration, d.config?.start)
					}))
			);

			const { assetId } = utils.destructUserAssetConfigId(configId);
			const erc20TokenAddress = utils.getTokenAddressFromAssetId(assetId);

			tx = await addressAppClient.setDrips(erc20TokenAddress, currentReceivers, balanceDelta, newReceivers);
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
			<h2>Update User Asset Configuration</h2>
		</header>

		<form>
			<fieldset>
				<legend>Drips Configuration</legend>

				<label for="configId">User Asset Configuration ID:</label>
				<div class="form-group">
					<input type="text" name="configId" placeholder="<User ID>-<Asset ID>" bind:value={configId} />
				</div>

				<div class="form-group">
					{#each dripsInputs as dripInput, i}
						<div class="input-row form-group">
							<span>{i + 1}# Drips Receiver:</span>
							<input
								type="text"
								placeholder="User Address (e.g. 0x945AFA63507e56748368D3F31ccC35043efDbd4b)"
								bind:value={dripInput.userAddress}
							/>
							<input type="text" placeholder="Amount per second" bind:value={dripInput.config.amountPerSec} />
							<input type="text" placeholder="Duration (in seconds)" bind:value={dripInput.config.duration} />
							<input type="text" placeholder="Start (UNIX timestamp)" bind:value={dripInput.config.start} />
						</div>
					{/each}
				</div>

				<div class="form-group">
					<div>
						<button class="btn btn-default" type="button" disabled={!isConnected} on:click={setDrips}>Update</button>
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
