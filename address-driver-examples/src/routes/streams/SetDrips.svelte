<script lang="ts">
	import {
		Utils,
		type DripsSubgraphClient,
		type AddressDriverClient,
		constants
	} from 'radicle-drips';
	import { BigNumber, type ContractReceipt, type ContractTransaction } from 'ethers';
	import { isConnected } from '$lib/stores';

	export let addressDriverClient: AddressDriverClient | undefined;
	export let subgraphClient: DripsSubgraphClient | undefined;

	type DripInput = {
		receiverUserId: string;
		config: {
			start: string | undefined;
			duration: string | undefined;
			amountPerSec: string | undefined;
		};
	};

	const dripsInputs: DripInput[] = [
		{
			receiverUserId: '',
			config: {
				start: undefined,
				duration: undefined,
				amountPerSec: undefined
			}
		},
		{
			receiverUserId: '',
			config: {
				start: undefined,
				duration: undefined,
				amountPerSec: undefined
			}
		}
	];

	let settingDrips = false;
	let tokenAddress: string;
	let errorMessage: string | undefined;
	let tx: ContractTransaction | undefined;
	let txReceipt: ContractReceipt | undefined;

	async function setDrips() {
		tx = undefined;
		settingDrips = true;
		txReceipt = undefined;
		errorMessage = undefined;

		try {
			const balanceDelta = 0; // Configure the user asset config without updating the balance.

			const userId = await addressDriverClient!.getUserId();

			const currentReceivers = await subgraphClient!.getCurrentDripsReceivers(userId, tokenAddress);

			const newReceivers = await Promise.all(
				dripsInputs
					// Ignore inputs without values.
					.filter((d) => d.config.amountPerSec && d.receiverUserId.length)
					// Map values from form input to the expected by the protocol type (`DripsReceiverStruct`).
					.map(async (d) => {
						const config = Utils.DripsReceiverConfiguration.toUint256({
							dripId: BigInt(Math.floor(Math.random() * 1_000_000_000)), // Do NOT use this in production.
							start: d.config.start ? BigInt(d.config.start) : BigInt(0),
							duration: d.config.duration ? BigInt(d.config.duration) : BigInt(0),
							// Amount Per Second must be multiplied by 10^9.
							// See `DripsReceiverConfig` type for more details.
							amountPerSec: BigNumber.from(d.config.amountPerSec)
								.mul(constants.AMT_PER_SEC_MULTIPLIER)
								.toBigInt()
						});

						return {
							userId: d.receiverUserId,
							config
						};
					})
			);

			const transferTo = await addressDriverClient!.signer!.getAddress();

			tx = await addressDriverClient!.setDrips(
				tokenAddress,
				currentReceivers,
				newReceivers,
				transferTo,
				balanceDelta
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

<h2>Set Drips Configuration</h2>

<form>
	<fieldset>
		<legend>Parameters</legend>

		<label for="assetId">Token Address:</label>
		<div class="form-group">
			<input
				type="text"
				name="assetId"
				placeholder="e.g., 0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6"
				bind:value={tokenAddress}
			/>
		</div>

		<div class="form-group">
			{#each dripsInputs as dripInput, i}
				<div class="input-row form-group">
					<span>{i + 1}# Drips Receiver:</span>
					<input
						type="text"
						placeholder="e.g., 846959513016227493489143736695218182523669298507"
						bind:value={dripInput.receiverUserId}
					/>
					<input
						type="text"
						placeholder="Amount per second (in the smallest unit, e.g., Wei)"
						bind:value={dripInput.config.amountPerSec}
					/>
					<input
						type="text"
						placeholder="Duration (in seconds)"
						bind:value={dripInput.config.duration}
					/>
					<input
						type="text"
						placeholder="Start (UNIX timestamp)"
						bind:value={dripInput.config.start}
					/>
				</div>
			{/each}
		</div>

		<div>
			<div class="form-group">
				<button class="btn btn-default" type="button" disabled={!$isConnected} on:click={setDrips}
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
