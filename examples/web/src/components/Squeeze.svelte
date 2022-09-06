<script lang="ts">
	import type { AddressAppClient, DripsHubLogic, DripsSubgraphClient } from 'drips-sdk';
	import type { BigNumber, BytesLike } from 'ethers';
	import { createEventDispatcher } from 'svelte';

	export let addressAppClient: AddressAppClient;
	export let dripsSubgraphClient: DripsSubgraphClient;

	const dispatch = createEventDispatcher();

	let userId: string;
	let senderId: string;
	let errorMessage: string;
	let erc20TokenAddress: string;
	let squeezableDrips: { amt: BigNumber; nextSqueezed: number };

	$: isConnected = Boolean(addressAppClient) && Boolean(dripsSubgraphClient);
	$: if (isConnected) getUserId();

	const getUserId = async () => {
		userId = await addressAppClient.getUserId();
	};

	const getSqueezableDrips = async (userId: string, senderId: string) => {
		errorMessage = null;

		try {
			const dripsHubClient = addressAppClient.dripsHub;

			// TODO: Implement this.
			const { historyHash: BytesLike } = await dripsSubgraphClient.getDripsHistoryBySender(senderId);
			const dripsHistory: DripsHubLogic.DripsHistoryStruct[] = [];

			squeezableDrips = await dripsHubClient.getSqueezableDrips(
				userId,
				erc20TokenAddress,
				senderId,
				historyHash,
				dripsHistory
			);
		} catch (error) {
			errorMessage = error.message;
			console.log(error);
		}
	};

	$: if (!isConnected) reset();

	const reset = () => {
		userId = null;
		senderId = null;
		errorMessage = null;
		squeezableDrips = null;
		erc20TokenAddress = null;
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
					{:else if squeezableDrips}
						<div class="terminal-alert terminal-alert-primary">
							<p>Token {squeezableDrips} approved ✅</p>
						</div>
					{/if}
				</div>
			</fieldset>
		</form>
	</section>
	<hr />
</div>
