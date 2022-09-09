<script lang="ts">
	import { AddressApp, AddressAppClient, DripsSubgraphClient, Utils } from 'radicle-drips';
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

	const getCurrentReceivers = async () => {
		const assetId = Utils.Asset.getIdFromAddress(erc20TokenAddress);

		const userId = await addressAppClient.getUserId();
		const userAssetConfig = await dripsSubgraphClient.getUserAssetConfig(userId, assetId);

		return userAssetConfig.dripsEntries.map((d) => ({
			config: d.config,
			userId: d.receiverUserId
		}));
	};

	const setDrips = async () => {
		tx = null;
		started = true;
		txReceipt = null;
		errorMessage = null;

		try {
			const balanceDelta = 0; // Configure the user asset config without updating the balance.

			const currentReceivers = await getCurrentReceivers();

			const newReceivers: AddressApp.DripsReceiverStruct[] = await Promise.all(
				dripsInputs
					// Ignore inputs without values.
					.filter((d) => d.config.amountPerSec && d.userAddress.length)
					// Map from form inputs to DTOs.
					.map(async (d) => {
						const userId = await addressAppClient.getUserIdByAddress(d.userAddress);

						const config = Utils.DripsReceiverConfiguration.toUint256String({
							start: d.config.start,
							duration: d.config.duration,
							amountPerSec: d.config.amountPerSec
						});

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
		erc20TokenAddress = null;
	};
</script>

<div class="container">
	<section>
		<header>
			<h2>Set User Asset Config</h2>
		</header>

		<form>
			<fieldset>
				<legend>User Asset Config</legend>

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
				</div>
			</fieldset>
		</form>
	</section>
	<hr />
</div>
