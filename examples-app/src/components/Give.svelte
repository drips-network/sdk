<script lang="ts">
	import type { AddressDriverClient } from 'radicle-drips';
	import type { BigNumberish, ContractReceipt, ContractTransaction } from 'ethers';

	export let addressDriverClient: AddressDriverClient;

	let amount: string;
	let started = false;
	let errorMessage: string;
	let tx: ContractTransaction;
	let receiverAddress: string;
	let erc20TokenAddress: string;
	let txReceipt: ContractReceipt;

	$: isConnected = Boolean(addressDriverClient);

	const give = async (receiverAddress: string, erc20TokenAddress: string, amount: BigNumberish) => {
		tx = null;
		started = true;
		txReceipt = null;
		errorMessage = null;

		try {
			const receiverId = await addressDriverClient.getUserIdByAddress(receiverAddress);

			tx = await addressDriverClient.give(receiverId, erc20TokenAddress, amount);
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
		amount = null;
		started = false;
		txReceipt = null;
		errorMessage = null;
		receiverAddress = null;
		erc20TokenAddress = null;
	};
</script>

<div class="container">
	<section>
		<header>
			<h2>Give</h2>
		</header>

		<form>
			<fieldset>
				<legend>Give Configuration</legend>
				<div class="form-group">
					<label for="receiver">Receiver:</label>
					<input
						name="receiver"
						type="text"
						placeholder="User Address (e.g. 0x945AFA63507e56748368D3F31ccC35043efDbd4b)"
						bind:value={receiverAddress}
					/>
				</div>
				<div class="form-group">
					<label for="token">ERC20 Token:</label>
					<input
						name="token"
						type="text"
						placeholder="ERC20 Token Address (e.g. 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984)"
						bind:value={erc20TokenAddress}
					/>
				</div>
				<div class="form-group">
					<label for="amount">Amount:</label>
					<input name="amount" type="text" placeholder="Amount" bind:value={amount} />
				</div>
				<div class="form-group">
					<button
						disabled={!isConnected}
						class="btn btn-default"
						type="button"
						on:click={() => give(receiverAddress, erc20TokenAddress, amount)}>Give</button
					>
				</div>
				<div>
					{#if errorMessage}
						<div class="terminal-alert terminal-alert-error">
							{errorMessage}
						</div>
					{:else if txReceipt}
						<div class="terminal-alert terminal-alert-primary">
							<p>Successfully gave ✅</p>
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
