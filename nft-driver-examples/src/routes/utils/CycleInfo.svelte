<script lang="ts">
	import type { NFTDriverClient } from 'radicle-drips';
	import { isConnected } from '$lib/stores';
	import { Utils } from 'radicle-drips';
	import type { CycleInfo as CycleInfoDTO } from 'radicle-drips';

	export let nftDriverClient: NFTDriverClient | undefined;

	let cycleInfo: CycleInfoDTO;

	$: if (nftDriverClient?.network.chainId) {
		getCycleInfo();
	}

	async function getCycleInfo() {
		const chainId = nftDriverClient!.network.chainId;

		cycleInfo = Utils.Cycle.getInfo(chainId);
	}
</script>

<h2>Cycle Info (<code>Utils.Cycle</code>)</h2>

<div>
	<p>
		<strong>Cycle Duration Secs</strong>: {$isConnected
			? cycleInfo?.cycleDurationSecs
			: '[Not Connected]'}
	</p>
	<p>
		<strong>Current Cycle Secs</strong>: {$isConnected
			? cycleInfo?.currentCycleSecs
			: '[Not Connected]'}
	</p>
	<p>
		<strong>Current Cycle Start Date</strong>: {$isConnected
			? cycleInfo?.currentCycleStartDate
			: '[Not Connected]'}
	</p>
	<p>
		<strong>Next Cycle Start Date</strong>: {$isConnected
			? cycleInfo?.nextCycleStartDate
			: '[Not Connected]'}
	</p>
</div>

<hr />
