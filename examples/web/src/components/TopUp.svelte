<script lang="ts">
	import { AddressAppClient, DripsReceiverConfig, DripsSubgraphClient, utils } from 'drips-sdk';
	import type { ContractReceipt, ContractTransaction } from 'ethers';
	import { createEventDispatcher } from 'svelte';

	export let addressAppClient: AddressAppClient;
	export let dripsSubgraphClient: DripsSubgraphClient;

	const dispatch = createEventDispatcher();

	$: isConnected = Boolean(addressAppClient) && Boolean(dripsSubgraphClient);
	$: if (isConnected) getUserId();

	let userId: string;
	let started = false;
	let topUpToken: string;
	let topUpAmount: string;
	let errorMessage: string;
	let tx: ContractTransaction;
	let txReceipt: ContractReceipt;

	const getUserId = async () => {
		userId = await addressAppClient.getUserId();
	};

	const topUp = async (token: string) => {
		tx = null;
		started = true;
		txReceipt = null;
		errorMessage = null;

		try {
			const assetId = utils.getAssetIdFromAddress(topUpToken);

			const userAssetConfigId = `${userId}-${assetId}`;

			const userAssetConfig = await dripsSubgraphClient.getUserAssetConfigById(userAssetConfigId);

			if (!userAssetConfig) {
				throw new Error(
					'User asset configuration for the specifed ERC20 Token not found: Make sure you have approved first.'
				);
			}

			tx = await addressAppClient.setDrips(
				topUpToken,
				utils.mapDripEntriesToStructs(userAssetConfig.dripsEntries),
				topUpAmount,
				userAssetConfig.dripsEntries.map((r) => ({
					config: DripsReceiverConfig.fromUint256(r.config),
					userId: r.receiverUserId
				}))
			);
			console.log(tx);

			txReceipt = await tx.wait();
			console.log(txReceipt);

			dispatch('topUpDone');
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
			<h2>TopUp User Asset Configuration</h2>
		</header>

		<p>Make sure the ERC20 Token is approved first, or else the transaction will fail.</p>

		<form>
			<fieldset>
				<legend>TopUp</legend>
				<div class="form-group">
					<label for="topUp-token">Token:</label>
					<input
						name="topUp-token"
						type="text"
						placeholder="ERC20 Token Address (e.g. 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984)"
						bind:value={topUpToken}
					/>
				</div>
				<div class="form-group">
					<label for="amount">Amount:</label>
					<input name="amount" type="text" placeholder="Amount" bind:value={topUpAmount} />
				</div>
				<div class="form-group">
					<button disabled={!isConnected} class="btn btn-default" type="button" on:click={() => topUp(topUpAmount)}
						>TopUp</button
					>
				</div>
				<div>
					{#if errorMessage}
						<div class="terminal-alert terminal-alert-error">
							{errorMessage}
						</div>
					{:else if txReceipt}
						<div class="terminal-alert terminal-alert-primary">
							<p>TopUp successfull ✅</p>
						</div>
					{:else if tx}
						<div class="terminal-alert">
							<p>Awaiting confirmations... ⏳</p>
						</div>
					{:else if started}
						<div class="terminal-alert">
							<p>Confirm the transaction 👉</p>
						</div>
					{/if}
				</div>
			</fieldset>
		</form>
	</section>
	<hr />
</div>
