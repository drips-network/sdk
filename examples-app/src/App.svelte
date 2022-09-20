<script lang="ts">
	import type { AddressAppClient, DripsSubgraphClient } from 'radicle-drips';
	import ClientProperties from './components/ClientProperties.svelte';
	import Footer from './components/Footer.svelte';
	import Header from './components/Header.svelte';
	import SplitEntries from './components/SplitEntries.svelte';
	import TokenApproval from './components/TokenApproval.svelte';
	import TopUp from './components/TopUp.svelte';
	import SetUserAssetConfig from './components/SetUserAssetConfig.svelte';
	import SetSplits from './components/SetSplits.svelte';
	import UserAssetConfigs from './components/UserAssetConfigs.svelte';
	import UserId from './components/UserId.svelte';
	import Give from './components/Give.svelte';
	import Collect from './components/Collect.svelte';
	import Squeeze from './components/Squeeze.svelte';
	import { Tabs, TabList, TabPanel, Tab } from './components/tabs/tabs.js';
	import Utils from './components/Utils.svelte';

	let errorMessage: string;
	let refresh: () => Promise<void>;
	let addressAppClient: AddressAppClient;
	let dripsSubgraphClient: DripsSubgraphClient;

	console.log(
		'\r\n\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557     \u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557    \u2588\u2588\u2557   \u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \r\n\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D     \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D    \u2588\u2588\u2551   \u2588\u2588\u2551\u255A\u2550\u2550\u2550\u2550\u2588\u2588\u2557\r\n\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557     \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557    \u2588\u2588\u2551   \u2588\u2588\u2551 \u2588\u2588\u2588\u2588\u2588\u2554\u255D\r\n\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2588\u2588\u2551\u2588\u2588   \u2588\u2588\u2551\u255A\u2550\u2550\u2550\u2550\u2588\u2588\u2551    \u255A\u2588\u2588\u2557 \u2588\u2588\u2554\u255D\u2588\u2588\u2554\u2550\u2550\u2550\u255D \r\n\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2551\u2588\u2588\u2551     \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551\u255A\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551     \u255A\u2588\u2588\u2588\u2588\u2554\u255D \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\r\n\u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u255D  \u255A\u2550\u255D\u255A\u2550\u255D\u255A\u2550\u255D     \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D      \u255A\u2550\u2550\u2550\u255D  \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D\r\n                                                                        \r\n'
	);
	console.log('Hey there! Welcome to the DripsJS SDK v2.0 examples app!');

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

	<div>
		<Tabs>
			<TabList>
				<Tab>Drips & Splits</Tab>
				<Tab>Send & Receive</Tab>
				<Tab>Other</Tab>
			</TabList>

			<TabPanel>
				<UserAssetConfigs {addressAppClient} {dripsSubgraphClient} />
				<SetUserAssetConfig {addressAppClient} {dripsSubgraphClient} on:userAssetConfigUpdated={refresh} />
				<SplitEntries {addressAppClient} {dripsSubgraphClient} />
				<SetSplits {addressAppClient} on:userAssetConfigUpdated={refresh} />
				<TopUp {addressAppClient} {dripsSubgraphClient} on:topUpDone={refresh} />
			</TabPanel>

			<TabPanel>
				<Give {addressAppClient} />
				<Collect {addressAppClient} {dripsSubgraphClient} />
				<Squeeze {addressAppClient} {dripsSubgraphClient} />
			</TabPanel>

			<TabPanel>
				<Utils {addressAppClient} />
				<UserId {addressAppClient} />
				<TokenApproval {addressAppClient} />
			</TabPanel>
		</Tabs>
	</div>

	<Footer />
</main>
