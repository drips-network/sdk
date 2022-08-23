<script lang="ts">
	import type { AddressAppClient, DripsHubLogic, DripsSubgraphClient } from 'drips-sdk';
	import type { BytesLike } from 'ethers';
	import { createEventDispatcher } from 'svelte';

	export let addressAppClient: AddressAppClient;
	export let dripsSubgraphClient: DripsSubgraphClient;

	const dispatch = createEventDispatcher();

	$: isConnected = Boolean(addressAppClient) && Boolean(dripsSubgraphClient);
	$: if (isConnected) getUserId();

	let userId: string;
	let senderId: string;
	let errorMessage: string;
	let erc20TokenAddress: string;

	const getUserId = async () => {
		userId = await addressAppClient.getUserId();
	};

	const getSqueezableDrips = async (userId: string, senderId: string) => {
		errorMessage = null;

		try {
			const dripsHubClient = addressAppClient.dripsHub;

			const historyHash: BytesLike = '';
			const dripsHistory: DripsHubLogic.DripsHistoryStruct[] = [];

			await dripsHubClient.getSqueezableDrips(userId, erc20TokenAddress, senderId, historyHash, dripsHistory);
		} catch (error) {
			errorMessage = error.message;
			console.log(error);
		}
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
					<label for="userId">User ID:</label>
					<input name="userId" type="text" bind:value={userId} />
				</div>
				<div class="form-group">
					<label for="senderId">Sender ID:</label>
					<input name="senderId" type="text" bind:value={senderId} />
				</div>
				<div class="form-group">
					<button
						disabled={!isConnected}
						class="btn btn-default"
						type="button"
						on:click={() => getSqueezableDrips(userId, senderId)}>TopUp</button
					>
				</div>
				<div>
					{#if errorMessage}
						<div class="terminal-alert terminal-alert-error">
							{errorMessage}
						</div>
					{/if}
				</div>
			</fieldset>
		</form>
	</section>
	<hr />
</div>
