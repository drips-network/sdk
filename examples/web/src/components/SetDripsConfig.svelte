<script lang="ts">
	import { AddressApp, AddressAppClient, DripsReceiverConfig, DripsSubgraphClient, utils } from 'drips-sdk';
	import type { BigNumber, ContractReceipt, ContractTransaction } from 'ethers';

	export let addressAppClient: AddressAppClient;
	export let dripsSubgraphClient: DripsSubgraphClient;

	const dripsInputs = [
		{
			userAddress: '',
			config: {
				start: undefined as BigNumber,
				duration: undefined as BigNumber,
				amountPerSec: undefined as BigNumber
			}
		},
		{
			userAddress: '',
			config: {
				start: undefined as BigNumber,
				duration: undefined as BigNumber,
				amountPerSec: undefined as BigNumber
			}
		}
	];

	let started = false;
	let errorMessage: string;
	let tx: ContractTransaction;
	let erc20TokenAddress: string;
	let txReceipt: ContractReceipt;

	$: isConnected = Boolean(addressAppClient) && Boolean(dripsSubgraphClient);

	const setDrips = async () => {
		tx = null;
		started = true;
		txReceipt = null;
		errorMessage = null;

		try {
			// Setting a drips configurationrequires the following information:
			// 1. Token address
			// 2. Current Eeceivers
			// 3. Balance Delta
			// 4. New Receivers

			// 1. Getting the asset ID
			const assetId = utils.getAssetIdFromAddress(erc20TokenAddress);

			// 2. Getting the Current Receivers
			const userId = await addressAppClient.getUserId();
			const configToUpdate = await dripsSubgraphClient.getDripsConfiguration(userId, assetId);
			let currentReceivers: AddressApp.DripsReceiverStruct[] =
				utils.mappers.mapDripsReceiverDtosToStructs(configToUpdate?.dripsReceivers) || [];

			currentReceivers = currentReceivers.map((r) => ({ userId: r.userId, config: r.config.toString() }));

			// 3. Getting the Balance Delta
			// The setDrips() method allows configuring drips receivers and updating the balance in one go.
			// For simplicity, in this example, we'll configure the drips receivers without updating the balance.
			// See "TopUp Drips Configuration", which uses the same method for modifying the balance.
			const balanceDelta = 0;

			// 4. Getting the New Receivers
			const newReceivers: AddressApp.DripsReceiverStruct[] = await Promise.all(
				dripsInputs
					// Ignore inputs without values.
					.filter((d) => d.config.amountPerSec && d.userAddress.length)
					.map(async (d) => {
						const userId = await addressAppClient.getUserIdByAddress(d.userAddress);

						// Watch out for 'null' `duration` and `start` values.
						// Passing 'undefined' is OK and will set the parameters to the default values.
						// 'null' will result in an Error.
						const config = new DripsReceiverConfig(d.config.amountPerSec, d.config.duration, d.config.start).asUint256;

						return {
							userId,
							config
						};
					})
			);

			tx = await addressAppClient.setDrips(erc20TokenAddress, currentReceivers, newReceivers, balanceDelta);
			console.log(tx);

			txReceipt = await tx.wait();
			console.log(txReceipt);
		} catch (error) {
			errorMessage = error.message;

			console.log(error);
		}

		started = false;
	};

	$: if (!isConnected) reset();

	const reset = () => {
		tx = null;
		started = false;
		txReceipt = null;
		errorMessage = null;
		erc20TokenAddress = null;
	};
</script>

<div class="container">
	<section>
		<header>
			<h2>Set Drips Configuration</h2>
		</header>

		<form>
			<fieldset>
				<legend>Drips Configuration</legend>

				<label for="assetId">Token:</label>
				<div class="form-group">
					<input
						type="text"
						name="assetId"
						placeholder="ERC20 Token Address (e.g. 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984)"
						bind:value={erc20TokenAddress}
					/>
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

				<div>
					<div class="form-group">
						<button class="btn btn-default" type="button" disabled={!isConnected} on:click={setDrips}>Set</button>
					</div>

					{#if errorMessage}
						<div class="terminal-alert terminal-alert-error">
							<p>{errorMessage}</p>
						</div>
					{:else if txReceipt}
						<div class="terminal-alert terminal-alert-primary">
							<p>Updated ✅</p>
							<p>Wait for a few seconds to disconnect and connect again to see the updated drips.</p>
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
				</div>
			</fieldset>
		</form>
	</section>
	<hr />
</div>
