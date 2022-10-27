<script lang="ts">
	import type { AddressDriverClient } from 'radicle-drips';
	import type { BigNumber, ContractReceipt, ContractTransaction } from 'ethers';

	export let addressDriverClient: AddressDriverClient;

	$: isConnected = Boolean(addressDriverClient);

	let started = false;
	let tokenToApprove: string;
	let tx: ContractTransaction;
	let txReceipt: ContractReceipt;
	let approvalErrorMessage: string;

	const approve = async (tokenAddress: string) => {
		tx = null;
		started = true;
		txReceipt = null;
		approvalErrorMessage = null;

		try {
			tx = await addressDriverClient.approve(tokenAddress);
			console.log(tx);

			txReceipt = await tx.wait();
			console.log(txReceipt);
		} catch (error: any) {
			approvalErrorMessage = error.message;

			console.error(error);
		}

		started = false;
	};

	let allowance: bigint;
	let tokenToGetAllowance: string;
	let allowanceErrorMessage: string;

	const getAllowance = async (tokenAddress: string) => {
		try {
			allowance = null;
			allowanceErrorMessage = null;

			allowance = await addressDriverClient.getAllowance(tokenAddress);
			console.log(allowance);
		} catch (error: any) {
			allowance = null;
			allowanceErrorMessage = error.message;

			console.error(error);
		}
	};

	$: if (!isConnected) reset();

	const reset = () => {
		tx = null;
		allowance = null;
		started = false;
		txReceipt = null;
		tokenToApprove = null;
		tokenToGetAllowance = null;
		approvalErrorMessage = null;
		allowanceErrorMessage = null;
	};
</script>

<div class="container">
	<section>
		<header>
			<h2>Token Approval</h2>
		</header>

		<!-- Approval Form -->
		<form>
			<fieldset>
				<legend>Approve</legend>
				<div class="form-group">
					<input
						type="text"
						placeholder="ERC20 Token Address (e.g. 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984)"
						bind:value={tokenToApprove}
					/>
				</div>
				<div class="form-group">
					<button class="btn btn-default" disabled={!isConnected} type="button" on:click={() => approve(tokenToApprove)}
						>Approve</button
					>
				</div>
				<div>
					{#if approvalErrorMessage}
						<div class="terminal-alert terminal-alert-error">
							<p>{approvalErrorMessage}</p>
						</div>
					{:else if txReceipt}
						<div class="terminal-alert terminal-alert-primary">
							<p>Token {tokenToApprove} approved ✅</p>
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

		<!-- Allowance Form -->
		<form class="allowance">
			<fieldset>
				<legend>Allowance</legend>

				<div class="form-group">
					<input
						type="text"
						placeholder="ERC20 Token Address (e.g. 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984)"
						bind:value={tokenToGetAllowance}
					/>
				</div>

				<div class="form-group">
					<button
						class="btn btn-default"
						disabled={!isConnected}
						type="button"
						on:click={() => getAllowance(tokenToGetAllowance)}>Get Allowance</button
					>
				</div>

				{#if allowanceErrorMessage}
					<div class="terminal-alert terminal-alert-error">
						<p>{allowanceErrorMessage}</p>
					</div>
				{:else if allowance >= 0}
					<div class="terminal-alert terminal-alert-primary">
						<p>Token {tokenToGetAllowance} allowance: {allowance}</p>
					</div>
				{/if}
			</fieldset>
		</form>
	</section>
	<hr />
</div>

<style>
	.allowance {
		margin: calc(var(--global-space) * 2) 0;
	}
</style>
