<script lang="ts">
	import type { SubgraphClient, DripsClient } from 'drips-sdk';
	import { BigNumberish, utils } from 'ethers';

	// clip to nearest hundredth (dont round up)
	export const round = (num: number, dec = 2) => (Math.floor(num * 100) / 100).toFixed(dec);

	export const toDAI = (wei: BigNumberish, roundTo: number, format = 'pretty') => {
		const dai = utils.formatEther(wei);
		if (format === 'exact') {
			return dai;
		}
		return round(parseFloat(dai), roundTo);
	};

	export let dripsClient: DripsClient;
	export let subgraphClient: SubgraphClient;

	let address = '';
	let networkId = 0;
	let daiApproved = '';
	let daiCollectable: Awaited<ReturnType<DripsClient['getAmountCollectableWithSplits']>>;

	$: if (Boolean(dripsClient) && subgraphClient) displayWalletAndAddressStats();

	async function displayWalletAndAddressStats() {
		address = await dripsClient.signer.getAddress();
		daiApproved = toDAI(await dripsClient.getAllowance(), 2, 'pretty');
		const splits = await subgraphClient.getSplitsBySender(address.toLowerCase());
		daiCollectable = await dripsClient.getAmountCollectableWithSplits(address, splits);
	}
</script>

<div>Address: {address || '[Not Connected]'}</div>
<div>Network: {networkId || '[Not Connected]'}</div>
<div>DAI Approved: {daiApproved || '[Not Connected]'}</div>
<div>DAI Collectable (after splits): {daiCollectable ? daiCollectable.collected : '[Not Connected]'}</div>
<div>DAI to be Split to others: {daiCollectable ? daiCollectable.split : '[Not Connected]'}</div>
