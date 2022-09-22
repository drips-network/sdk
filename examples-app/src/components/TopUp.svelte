<script lang="ts">
	import { AddressDriverClient, DripsSubgraphClient, Utils } from 'radicle-drips';
	import { BigNumber, ContractReceipt, ContractTransaction } from 'ethers';

	export let addressDriverClient: AddressDriverClient;
	export let dripsSubgraphClient: DripsSubgraphClient;

	$: isConnected = Boolean(addressDriverClient) && Boolean(dripsSubgraphClient);

	let started = false;
	let topUpToken: string;
	let topUpAmount: string;
	let errorMessage: string;
	let tx: ContractTransaction;
	let txReceipt: ContractReceipt;

	const topUp = async (token: string) => {
		tx = null;
		started = true;
		txReceipt = null;
		errorMessage = null;

		try {
			const userId = await addressDriverClient.getUserId();
			const assetId = Utils.Asset.getIdFromAddress(topUpToken);
			const configToUpdate = await dripsSubgraphClient.getUserAssetConfig(userId, assetId);

			const currentReceivers =
				configToUpdate?.dripsEntries.map((r) => ({
					config: r.config,
					userId: r.receiverUserId
				})) || [];

			const balanceDelta = BigNumber.from(topUpAmount);

			tx = await addressDriverClient.setDrips(topUpToken, currentReceivers, currentReceivers, balanceDelta);
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
		topUpToken = null;
		topUpAmount = null;
		errorMessage = null;
	};
</script>

<div class="container">
	<section>
		<header>
			<h2>TopUp Drips Configuration</h2>
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
