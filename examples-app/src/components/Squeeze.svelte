<!-- <script lang="ts">
	import type { ContractReceipt, ContractTransaction } from 'ethers';
	import type { AddressDriverClient, DripsSubgraphClient } from 'radicle-drips';

	export let addressDriverClient: AddressDriverClient;
	export let dripsSubgraphClient: DripsSubgraphClient;

	$: isConnected = Boolean(addressDriverClient) && Boolean(dripsSubgraphClient);

	let started = false;
	let senderId: string;
	let errorMessage: string;
	let tx: ContractTransaction;
	let tokenAddress: string;
	let txReceipt: ContractReceipt;

	const squeezeDrips = async (token: string, sender: string) => {
		tx = null;
		started = true;
		txReceipt = null;
		errorMessage = null;

		try {
			tx = await addressDriverClient.squeezeDrips(token, sender);
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
		senderId = null;
		started = false;
		txReceipt = null;
		errorMessage = null;
		tokenAddress = null;
	};
</script>

<div class="container">
	<section>
		<header>
			<h2>Squeeze</h2>
		</header>

		<form>
			<fieldset>
				<legend>Get Squeezable Drips</legend>
				<div class="form-group">
					<label for="token">ERC20 Token:</label>
					<input
						name="token"
						type="text"
						placeholder="ERC20 Token Address (e.g. 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984)"
						bind:value={tokenAddress}
					/>
				</div>
				<div class="form-group">
					<label for="senderId">Sender ID:</label>
					<input
						name="senderId"
						type="text"
						placeholder="User Address (e.g. 0x945AFA63507e56748368D3F31ccC35043efDbd4b)"
						bind:value={senderId}
					/>
				</div>
				<div class="form-group">
					<button
						disabled={!isConnected}
						class="btn btn-default"
						type="button"
						on:click={() => squeezeDrips(tokenAddress, senderId)}>TopUp</button
					>
				</div>

				{#if errorMessage}
					<div class="terminal-alert terminal-alert-error">
						<p>{errorMessage}</p>
					</div>
				{:else if txReceipt}
					<div class="terminal-alert terminal-alert-primary">
						<p>Squeezed ✅</p>
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
</div> -->
