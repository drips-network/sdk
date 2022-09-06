<script lang="ts">
	import { debug } from 'console';

	import { AddressAppClient, DripsReceiverConfig, utils } from 'drips-sdk';
	import { BigNumber } from 'ethers';

	export let addressAppClient: AddressAppClient;

	$: isConnected = Boolean(addressAppClient);

	let configAsUint256: string;
	let debugConfigErrorMessage: string;
	let dripsReceiverConfig: DripsReceiverConfig;

	const debugConfig = async (config: string) => {
		debugConfigErrorMessage = null;

		try {
			dripsReceiverConfig = DripsReceiverConfig.fromUint256(toBN(config));
		} catch (error) {
			debugConfigErrorMessage = error.message;

			console.log(error);
		}
	};

	let assetId: string;
	let erc20TokenAddress: string;
	let assetIdErrorMessage: string;

	const getAssetId = async (token: string) => {
		debugConfigErrorMessage = null;

		try {
			assetId = utils.getAssetIdFromAddress(token);
		} catch (error) {
			assetIdErrorMessage = error.message;

			console.log(error);
		}
	};

	$: if (!isConnected) reset();

	const reset = () => {
		assetId = null;
		configAsUint256 = null;
		erc20TokenAddress = null;
		dripsReceiverConfig = null;
		assetIdErrorMessage = null;
		debugConfigErrorMessage = null;
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
					<input type="text" placeholder="Configuration as uint256" bind:value={configAsUint256} />
				</div>
				<div class="form-group">
					<button
						class="btn btn-default"
						disabled={!isConnected}
						type="button"
						on:click={() => debugConfig(configAsUint256)}>Debug</button
					>
				</div>
				<div>
					{#if debugConfigErrorMessage}
						<div class="terminal-alert terminal-alert-error">
							<p>{debugConfigErrorMessage}</p>
						</div>
					{:else if dripsReceiverConfig}
						<div class="terminal-alert terminal-alert-primary">
							<p>Amount/Sec: {dripsReceiverConfig.amountPerSec}</p>
							<p>Duration: {dripsReceiverConfig.duration}</p>
							<p>Start: {dripsReceiverConfig.start}</p>
						</div>
					{/if}
				</div>
			</fieldset>
		</form>

		<!-- Asset ID Form-->
		<form class="assetId">
			<fieldset>
				<legend>Get Asset ID from Address</legend>
				<div class="form-group">
					<input
						type="text"
						placeholder="ERC20 Token Address (e.g. 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984)"
						bind:value={erc20TokenAddress}
					/>
				</div>
				<div class="form-group">
					<button
						class="btn btn-default"
						disabled={!isConnected}
						type="button"
						on:click={() => getAssetId(erc20TokenAddress)}>Get Asset ID</button
					>
				</div>
				<div>
					{#if assetIdErrorMessage}
						<div class="terminal-alert terminal-alert-error">
							<p>{assetIdErrorMessage}</p>
						</div>
					{:else if assetId}
						<div class="terminal-alert terminal-alert-primary">
							<p>{assetId}</p>
						</div>
					{/if}
				</div>
			</fieldset>
		</form>
	</section>
	<hr />
</div>

<style>
	.assetId {
		margin: calc(var(--global-space) * 2) 0;
	}
</style>
