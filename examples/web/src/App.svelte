<script lang="ts">
	import type { AddressAppClient, DripsSubgraphClient } from 'drips-sdk';
	import ClientProperties from './components/ClientProperties.svelte';
	import Footer from './components/Footer.svelte';
	import Header from './components/Header.svelte';
	import SplitEntries from './components/SplitEntries.svelte';
	import TokenApproval from './components/TokenApproval.svelte';
	import TopUp from './components/TopUp.svelte';
	import UpdateUserAssetConfig from './components/UpdateUserAssetConfig.svelte';
	import UpdateSplits from './components/UpdateSplits.svelte';
	import UserAssetConfigs from './components/UserAssetConfigs.svelte';

	let errorMessage: string;
	let addressAppClient: AddressAppClient;
	let dripsSubgraphClient: DripsSubgraphClient;
	let refresh: () => Promise<void>;

	const handleConnected = (event: {
		detail: { addressAppClient: AddressAppClient; dripsSubgraphClient: DripsSubgraphClient };
	}) => {
		errorMessage = null;
		addressAppClient = event.detail.addressAppClient;
		dripsSubgraphClient = event.detail.dripsSubgraphClient;
	};

	const handleDisconnected = (event: {
		detail: { addressAppClient: AddressAppClient; dripsSubgraphClient: DripsSubgraphClient };
	}) => {
		errorMessage = null;
		addressAppClient = null;
		dripsSubgraphClient = null;
	};

	const handleConnectionFailed = (event: { detail: { errorMessage: string } }) => {
		addressAppClient = null;
		dripsSubgraphClient = null;
		errorMessage = event.detail.errorMessage;
	};
</script>

<main class="terminal">
	<Header
		on:connected={handleConnected}
		on:disconnected={handleDisconnected}
		on:connectionFailed={handleConnectionFailed}
	/>

	<ClientProperties {addressAppClient} {dripsSubgraphClient} />

	{#if errorMessage}
		<div class="container">
			<div class="terminal-alert terminal-alert-error">{errorMessage}</div>
		</div>
	{/if}

	<TokenApproval {addressAppClient} />

	<TopUp {addressAppClient} {dripsSubgraphClient} />

	<UserAssetConfigs {addressAppClient} {dripsSubgraphClient} bind:getUserAssetConfigs={refresh} />

	<UpdateUserAssetConfig {addressAppClient} {dripsSubgraphClient} on:userAssetConfigUpdated={refresh} />

	<SplitEntries {addressAppClient} {dripsSubgraphClient} bind:getSplitEntries={refresh} />

	<UpdateSplits {addressAppClient} on:userAssetConfigUpdated={refresh} />

	<Footer />
</main>
