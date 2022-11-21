<script lang="ts">
	import type { BigNumberish, ContractReceipt, ContractTransaction } from 'ethers';
	import type { NFTDriverClient } from 'radicle-drips';
	import { isConnected } from '$lib/stores';

	export let nftDriverClient: NFTDriverClient | undefined;

	let collecting = false;
	let tokenAddressInput: string;
	let tokenIdInput: string;
	let trasferToAddressInput: string;
	let errorMessage: string | undefined;
	let tx: ContractTransaction | undefined;
	let txReceipt: ContractReceipt | undefined;

	async function collect(tokenId: BigNumberish, tokenAddress: string, transferToAddress: string) {
		try {
			console.log('Collecting...');

			collecting = true;
			errorMessage = undefined;

			tx = await nftDriverClient?.collect(tokenId, tokenAddress, transferToAddress);
			console.log(tx);

			txReceipt = await tx?.wait();
			console.log(txReceipt);
		} catch (error: any) {
			console.error(error);
			errorMessage = error.message;
		}

		collecting = false;
	}
</script>

<h2>Collect</h2>

<p>
	Calls the <code
		>collect( tokenId: BigNumberish, tokenAddress: string, transferToAddress: string )</code
	>
	on the
	<code>NFTDriverClient</code> and collects the received and already split funds and transfers them from
	the `DripsHub` smart contract to the specified address.
</p>

<div>
	<form class="collect">
		<fieldset>
			<legend>Collect</legend>
			<div class="form-group">
				<label for="tokenId">Collecting user ID:</label>
				<input
					placeholder="e.g., 26959946667150639794667015087019630673637144422540572481103610249216"
					type="text"
					name="tokenId"
					bind:value={tokenIdInput}
				/>
			</div>
			<div class="form-group">
				<label for="token">ERC20 Token Address:</label>
				<input
					placeholder="e.g., 0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6"
					type="text"
					name="token"
					bind:value={tokenAddressInput}
				/>
			</div>
			<div class="form-group">
				<label for="address">Transfer To Address:</label>
				<input
					type="text"
					name="address"
					placeholder="e.g., 0x945AFA63507e56748368D3F31ccC35043efDbd4b"
					bind:value={trasferToAddressInput}
				/>
			</div>
			<div class="form-group">
				<button
					class="btn btn-default"
					disabled={!$isConnected}
					type="button"
					on:click={() => collect(tokenIdInput, tokenAddressInput, trasferToAddressInput)}
					>Collect</button
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
					<p>Collected successfully ✅</p>
				</div>
			{:else if tx}
				<div class="terminal-alert">
					<p>Awaiting confirmations... ⏳</p>
				</div>
			{:else if collecting}
				<div class="terminal-alert">
					<p>Confirm the transaction 👉</p>
				</div>
			{/if}
		</fieldset>
	</form>
</div>

<hr />
