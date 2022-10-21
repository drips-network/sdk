<script lang="ts">
	import type { BigNumberish } from 'ethers';
	import { AddressDriverClient, DripsReceiverConfig, Utils } from 'radicle-drips';

	export let addressDriverClient: AddressDriverClient;

	$: isConnected = Boolean(addressDriverClient);

	let debugConfigInput: BigNumberish;
	let debugConfigErrorMessage: string;
	let debugConfigResult: DripsReceiverConfig;

	const debugConfig = async (config: BigNumberish) => {
		debugConfigErrorMessage = null;

		try {
			debugConfigResult = Utils.DripsReceiverConfiguration.fromUint256(config);
		} catch (error: any) {
			debugConfigErrorMessage = error.message;

			console.error(error);
		}
	};

	let getAssetIdResult: bigint;
	let getAssetIdInput: string;
	let getAssetIdErrorMessage: string;

	const getAssetId = async (getTokenAddressResult: string) => {
		getAssetIdErrorMessage = null;

		try {
			getAssetIdResult = Utils.Asset.getIdFromAddress(getTokenAddressResult);
		} catch (error: any) {
			getAssetIdErrorMessage = error.message;

			console.error(error);
		}
	};

	let getTokenAddressResult: string;
	let getTokenAddressInput: string;
	let getTokenAddressErrorMessage: string;

	const getTokenAddress = async (getTokenAddressInput: BigNumberish) => {
		getTokenAddressErrorMessage = null;

		try {
			getTokenAddressResult = Utils.Asset.getAddressFromId(getTokenAddressInput);
		} catch (error: any) {
			getTokenAddressErrorMessage = error.message;

			console.error(error);
		}
	};

	$: if (!isConnected) reset();

	const reset = () => {
		debugConfigInput = null;
		debugConfigResult = null;
		debugConfigErrorMessage = null;

		getAssetIdResult = null;
		getAssetIdInput = null;
		getAssetIdErrorMessage = null;

		getTokenAddressResult = null;
		getTokenAddressInput = null;
		getTokenAddressErrorMessage = null;
	};
</script>

<div class="container">
	<section>
		<header>
			<h2>Utils</h2>
		</header>

		<!-- DripsReceiverConfig Form-->
		<form>
			<fieldset>
				<legend>Debug Drips Receiver Configuration</legend>
				<div class="form-group">
					<input type="text" placeholder="Configuration as uint256" bind:value={debugConfigInput} />
				</div>
				<div class="form-group">
					<button
						class="btn btn-default"
						disabled={!isConnected}
						type="button"
						on:click={() => debugConfig(debugConfigInput)}>Debug</button
					>
				</div>
				<div>
					{#if debugConfigErrorMessage}
						<div class="terminal-alert terminal-alert-error">
							<p>{debugConfigErrorMessage}</p>
						</div>
					{:else if debugConfigResult}
						<div class="terminal-alert terminal-alert-primary">
							<p>Amount/Sec: {debugConfigResult.amountPerSec}</p>
							<p>Duration: {debugConfigResult.duration}</p>
							<p>Start: {debugConfigResult.start}</p>
						</div>
					{/if}
				</div>
			</fieldset>
		</form>

		<!-- Asset ID Form-->
		<form class="utils-form">
			<fieldset>
				<legend>Get Asset ID from Address</legend>
				<div class="form-group">
					<input
						type="text"
						placeholder="ERC20 Token Address (e.g. 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984)"
						bind:value={getAssetIdInput}
					/>
				</div>
				<div class="form-group">
					<button
						class="btn btn-default"
						disabled={!isConnected}
						type="button"
						on:click={() => getAssetId(getAssetIdInput)}>Get Asset ID</button
					>
				</div>
				<div>
					{#if getAssetIdErrorMessage}
						<div class="terminal-alert terminal-alert-error">
							<p>{getAssetIdErrorMessage}</p>
						</div>
					{:else if getAssetIdResult}
						<div class="terminal-alert terminal-alert-primary">
							<p>{getAssetIdResult}</p>
						</div>
					{/if}
				</div>
			</fieldset>
		</form>

		<!-- Token Address Form-->
		<form class="utils-form">
			<fieldset>
				<legend>Get Token Address from Asset ID</legend>
				<div class="form-group">
					<input type="text" placeholder="Asset ID" bind:value={getTokenAddressInput} />
				</div>
				<div class="form-group">
					<button
						class="btn btn-default"
						disabled={!isConnected}
						type="button"
						on:click={() => getTokenAddress(getTokenAddressInput)}>Get Asset ID</button
					>
				</div>
				<div>
					{#if getTokenAddressErrorMessage}
						<div class="terminal-alert terminal-alert-error">
							<p>{getTokenAddressErrorMessage}</p>
						</div>
					{:else if getTokenAddressResult}
						<div class="terminal-alert terminal-alert-primary">
							<p>{getTokenAddressResult}</p>
						</div>
					{/if}
				</div>
			</fieldset>
		</form>
	</section>
	<hr />
</div>

<style>
	.utils-form {
		margin: calc(var(--global-space) * 2) 0;
	}
</style>
