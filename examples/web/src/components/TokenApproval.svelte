<script lang="ts">
	import type { AddressAppClient } from 'drips-sdk';
	import type { BigNumber, ContractReceipt, ContractTransaction } from 'ethers';
	import { createEventDispatcher } from 'svelte';

	export let addressAppClient: AddressAppClient;

	const dispatch = createEventDispatcher();

	let started = false;
	let approvedToken: string;
	let tokenToApprove: string;
	let tx: ContractTransaction;
	let txReceipt: ContractReceipt;
	let approvalErrorMessage: string;

	$: isConnected = Boolean(addressAppClient);

	const approveToken = async (token: string) => {
		tx = null;
		started = true;
		txReceipt = null;
		approvalErrorMessage = null;

		try {
			tx = await addressAppClient.approve(token);
			console.log(tx);

			txReceipt = await tx.wait();
			console.log(txReceipt);

			dispatch('tokenApproved', {
				approvedToken: token
			});
		} catch (error) {
			approvalErrorMessage = error.message;

			console.log(error);
		}

		started = false;
	};

	let allowance: BigNumber;
	let tokenToGetAllowance: string;
	let allowanceErrorMessage: string;

	const getAllowance = async (token: string) => {
		try {
			allowanceErrorMessage = null;

			allowance = await addressAppClient.getAllowance(token);
		} catch (error) {
			allowanceErrorMessage = error.message;

			console.log(error);
		}
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
					<button
						class="btn btn-default"
						disabled={!isConnected}
						type="button"
						on:click={() => approveToken(tokenToApprove)}>Approve</button
					>
				</div>
				<div>
					{#if approvalErrorMessage}
						<div class="terminal-alert terminal-alert-error">
							<p>{approvalErrorMessage}</p>
						</div>
					{:else if txReceipt}
						<div class="terminal-alert terminal-alert-primary">
							<p>Token {approvedToken} approved ✅</p>
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
						placeholder="ERC20 Token Address (e.g. 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984)"
						on:click={() => getAllowance(tokenToGetAllowance)}>Get Allowance</button
					>
				</div>
				{#if allowanceErrorMessage}
					<div class="terminal-alert terminal-alert-error">
						<p>{allowanceErrorMessage}</p>
					</div>
				{:else if allowance}
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
