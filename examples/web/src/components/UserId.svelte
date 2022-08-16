<script lang="ts">
	import type { AddressAppClient } from 'drips-sdk';

	export let addressAppClient: AddressAppClient;

	let errorMessage: string;

	$: isConnected = Boolean(addressAppClient);

	let userId: string;
	let userAddress: string;

	const getUserIdForAddress = async (userAddress: string) => {
		try {
			userId = null;
			errorMessage = null;

			userId = await addressAppClient.getUserIdForAddress(userAddress);
		} catch (error) {
			userId = null;
			errorMessage = error.message;

			console.log(error);
		}
	};
</script>

<div class="container">
	<section>
		<header>
			<h2>User ID</h2>
		</header>

		<form class="userid-form">
			<fieldset>
				<legend>User Address</legend>
				<div class="form-group">
					<input
						type="text"
						placeholder="User Address (e.g. 0x945AFA63507e56748368D3F31ccC35043efDbd4b)"
						bind:value={userAddress}
					/>
				</div>
				<div class="form-group">
					<button
						class="btn btn-default"
						disabled={!isConnected}
						type="button"
						on:click={() => getUserIdForAddress(userAddress)}>Get User ID</button
					>
				</div>
				{#if errorMessage}
					<div class="terminal-alert terminal-alert-error">
						<p>{errorMessage}</p>
					</div>
				{:else if userId}
					<div class="terminal-alert terminal-alert-primary">
						<p>{userId}</p>
					</div>
				{/if}
			</fieldset>
		</form>
	</section>
	<hr />
</div>

<style>
	.userid-form {
		margin: calc(var(--global-space) * 2) 0;
	}
</style>
