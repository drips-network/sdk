<script lang="ts">
	import type { BytesLike } from 'ethers';
	import { Utils } from 'radicle-drips';
	import { isConnected } from '$lib/stores';

	let createKeyInput: string;
	let createKeyOutput: BytesLike;
	let createKeyErrorMessage: string | undefined;

	async function createKey(key: string) {
		createKeyErrorMessage = undefined;

		try {
			createKeyOutput = Utils.UserMetadata.keyFromString(key);
		} catch (error: any) {
			console.error(error);
			createKeyErrorMessage = error.message;
		}
	}

	let createValueInput: string;
	let createValueOutput: BytesLike;
	let createValueErrorMessage: string | undefined;

	async function createValue(value: string) {
		createValueErrorMessage = undefined;

		try {
			createValueOutput = Utils.UserMetadata.valueFromString(value);
		} catch (error: any) {
			console.error(error);
			createValueErrorMessage = error.message;
		}
	}

	let readKeyInput: string;
	let readKeyOutput: BytesLike;
	let readKeyErrorMessage: string | undefined;

	async function readKey(key: string) {
		readKeyErrorMessage = undefined;

		try {
			// We don't need the value, pass and arbitrary value.
			const value = Utils.UserMetadata.valueFromString('');
			readKeyOutput = Utils.UserMetadata.toHumanReadable({ key, value }).key;
		} catch (error: any) {
			console.error(error);
			readKeyErrorMessage = error.message;
		}
	}

	let readValueInput: string;
	let readValueOutput: BytesLike;
	let readValueErrorMessage: string | undefined;

	async function readValue(value: string) {
		readValueErrorMessage = undefined;

		try {
			// We don't need the key, pass and arbitrary value.
			const key = Utils.UserMetadata.keyFromString('');
			readValueOutput = Utils.UserMetadata.toHumanReadable({ key, value }).value;
		} catch (error: any) {
			console.error(error);
			readValueErrorMessage = error.message;
		}
	}
</script>

<h2>User Metadata (<code>Utils.UserMetadata</code>)</h2>

<form>
	<fieldset>
		<legend>Create Metadata Key From String</legend>
		<div class="form-group">
			<label for="config">Key as string:</label>
			<input
				id="config"
				name="config"
				type="text"
				placeholder="e.g., my-key"
				bind:value={createKeyInput}
			/>
		</div>
		<div class="form-group">
			<button
				class="btn btn-default"
				disabled={!$isConnected}
				type="button"
				on:click={() => createKey(createKeyInput)}>Create Key</button
			>
		</div>

		<div>
			{#if !$isConnected}
				<div class="terminal-alert terminal-alert-error">[Not Connected]</div>
			{:else if createKeyErrorMessage}
				<div class="terminal-alert terminal-alert-error">
					<p>{createKeyErrorMessage}</p>
				</div>
			{:else if createKeyOutput}
				<div class="terminal-alert terminal-alert-primary">
					<p>{createKeyOutput}</p>
				</div>
			{/if}
		</div>
	</fieldset>
</form>

<form class="form">
	<fieldset>
		<legend>Create Metadata Value From String</legend>
		<div class="form-group">
			<label for="config">Value as string:</label>
			<input
				id="config"
				name="config"
				type="text"
				placeholder="e.g., my-value"
				bind:value={createValueInput}
			/>
		</div>
		<div class="form-group">
			<button
				class="btn btn-default"
				disabled={!$isConnected}
				type="button"
				on:click={() => createValue(createValueInput)}>Create Value</button
			>
		</div>

		<div>
			{#if !$isConnected}
				<div class="terminal-alert terminal-alert-error">[Not Connected]</div>
			{:else if createValueErrorMessage}
				<div class="terminal-alert terminal-alert-error">
					<p>{createValueErrorMessage}</p>
				</div>
			{:else if createValueOutput}
				<div class="terminal-alert terminal-alert-primary">
					<p>{createValueOutput}</p>
				</div>
			{/if}
		</div>
	</fieldset>
</form>

<form class="form">
	<fieldset>
		<legend>Read Metadata Key From BytesLike</legend>
		<div class="form-group">
			<label for="config">Key as BytesLike:</label>
			<input
				id="config"
				name="config"
				type="text"
				placeholder="e.g., 0x6d792d6b65790000000000000000000000000000000000000000000000000000"
				bind:value={readKeyInput}
			/>
		</div>
		<div class="form-group">
			<button
				class="btn btn-default"
				disabled={!$isConnected}
				type="button"
				on:click={() => readKey(readKeyInput)}>Read Key</button
			>
		</div>

		<div>
			{#if !$isConnected}
				<div class="terminal-alert terminal-alert-error">[Not Connected]</div>
			{:else if readKeyErrorMessage}
				<div class="terminal-alert terminal-alert-error">
					<p>{readKeyErrorMessage}</p>
				</div>
			{:else if readKeyOutput}
				<div class="terminal-alert terminal-alert-primary">
					<p>{readKeyOutput}</p>
				</div>
			{/if}
		</div>
	</fieldset>
</form>

<form class="form">
	<fieldset>
		<legend>Read Metadata Value From BytesLike</legend>
		<div class="form-group">
			<label for="config">Value as BytesLike:</label>
			<input
				id="config"
				name="config"
				type="text"
				placeholder="e.g., 0x6d792d76616c"
				bind:value={readValueInput}
			/>
		</div>
		<div class="form-group">
			<button
				class="btn btn-default"
				disabled={!$isConnected}
				type="button"
				on:click={() => readValue(readValueInput)}>Read Value</button
			>
		</div>

		<div>
			{#if !$isConnected}
				<div class="terminal-alert terminal-alert-error">[Not Connected]</div>
			{:else if readValueErrorMessage}
				<div class="terminal-alert terminal-alert-error">
					<p>{readValueErrorMessage}</p>
				</div>
			{:else if readValueOutput}
				<div class="terminal-alert terminal-alert-primary">
					<p>{readValueOutput}</p>
				</div>
			{/if}
		</div>
	</fieldset>
</form>

<hr />

<style>
	.form {
		margin: calc(var(--global-space) * 2) 0;
	}
</style>
