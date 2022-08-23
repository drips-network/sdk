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
	import UserId from './components/UserId.svelte';
	import Give from './components/Give.svelte';
	import Collect from './components/Collect.svelte';
	import Squeeze from './components/Squeeze.svelte';

	let errorMessage: string;
	let refresh: () => Promise<void>;
	let addressAppClient: AddressAppClient;
	let dripsSubgraphClient: DripsSubgraphClient;

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

	console.log(
		"\r\n______      _              ___ _____         _____  _____ \r\n|  _  \\    (_)            |_  /  ___|       |  _  |/ __  \\\r\n| | | |_ __ _ _ __  ___     | \\ `--.  __   _| |/' |`' / /'\r\n| | | | '__| | '_ \\/ __|    | |`--. \\ \\ \\ / /  /| |  / /  \r\n| |/ /| |  | | |_) \\__ \\/\\__/ /\\__/ /  \\ V /\\ |_/ /./ /___\r\n|___/ |_|  |_| .__/|___/\\____/\\____/    \\_/  \\___(_)_____/\r\n             | |                                          \r\n             |_|                                          \r\n"
	);
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

	<UserId {addressAppClient} />

	<TokenApproval {addressAppClient} />

	<TopUp
		{addressAppClient}
		{dripsSubgraphClient}
		on:topUpDone={() => {
			setTimeout(() => refresh(), 5000);
		}}
	/>

	<UserAssetConfigs {addressAppClient} {dripsSubgraphClient} bind:getUserAssetConfigs={refresh} />

	<UpdateUserAssetConfig {addressAppClient} {dripsSubgraphClient} on:userAssetConfigUpdated={refresh} />

	<SplitEntries {addressAppClient} {dripsSubgraphClient} bind:getSplitEntries={refresh} />

	<UpdateSplits {addressAppClient} on:userAssetConfigUpdated={refresh} />

	<Give {addressAppClient} />

	<Collect {addressAppClient} {dripsSubgraphClient} />

	<Squeeze {addressAppClient} {dripsSubgraphClient} />

	<Footer />
</main>
