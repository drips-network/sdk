<script lang="ts">
	import type { BigNumberish } from 'ethers';
	import { Utils, type DripsReceiverConfig } from 'radicle-drips';
	import { isConnected } from '$lib/stores';

	let configAsNum: string;
	let errorMessage: string | undefined;
	let configAsObj: DripsReceiverConfig;

	async function debugConfig(config: BigNumberish) {
		errorMessage = undefined;

		try {
			configAsObj = Utils.DripsReceiverConfiguration.fromUint256(config);
		} catch (error: any) {
			console.error(error);
			errorMessage = error.message;
		}
	}
</script>

<h2>Drips Receiver Configuration (<code>Utils.DripsReceiverConfiguration</code>)</h2>

<form>
	<fieldset>
		<legend>Debug</legend>
		<div class="form-group">
			<label for="config">Configuration as uint256:</label>
			<input
				id="config"
				name="config"
				type="text"
				placeholder="e.g. 269599466671506397946670150870196306736371444226143594574070383902750000"
				bind:value={configAsNum}
			/>
		</div>
		<div class="form-group">
			<button
				class="btn btn-default"
				disabled={!$isConnected}
				type="button"
				on:click={() => debugConfig(configAsNum)}>Debug</button
			>
		</div>
		<div>
			{#if !$isConnected}
				<div class="terminal-alert terminal-alert-error">[Not Connected]</div>
			{:else if errorMessage}
				<div class="terminal-alert terminal-alert-error">
					<p>{errorMessage}</p>
				</div>
			{:else if configAsObj}
				<div class="terminal-alert terminal-alert-primary">
					<p>Amount/Sec: {configAsObj.amountPerSec}</p>
					<p>Duration: {configAsObj.duration}</p>
					<p>Start: {configAsObj.start}</p>
					<p>Drip ID: {configAsObj.dripId}</p>
				</div>
			{/if}
		</div>
	</fieldset>
</form>

<hr />
