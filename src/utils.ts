import type { BigNumberish, Event } from 'ethers';
import { BigNumber, utils, constants } from 'ethers';
import type { DripsReceiverStruct, SplitsReceiverStruct } from '../contracts/DaiDripsHub';
import { DripsConfig } from './subgraph';

export const oneMonth = 30 * 24 * 60 * 60;
export const TOTAL_SPLITS_WEIGHT = 1000000;

export const fromWei = (wei: BigNumberish) => {
	const weiAsBigNum = BigNumber.isBigNumber(wei) ? wei : BigNumber.from(wei);
	return weiAsBigNum.div(constants.WeiPerEther);
};

export const toWei = (dai: BigNumberish) => utils.parseUnits(dai.toString());

// clip to nearest hundredth (dont round up)
export const round = (num, dec = 2) => (Math.floor(num * 100) / 100).toFixed(dec);

export const toDAI = (wei: BigNumberish, roundTo: number, format = 'pretty') => {
	const dai = utils.formatEther(wei);
	if (format === 'exact') {
		return dai;
	}
	return round(parseFloat(dai), roundTo);
};

export const toDAIPerMo = (wei: BigNumberish) => {
	const weiAsBigNum = BigNumber.isBigNumber(wei) ? wei : BigNumber.from(wei);
	const dai = utils.formatEther(weiAsBigNum.mul(oneMonth));

	// round to nearest hundredth
	return Math.round(parseFloat(dai) * 100) / 100;
};

export const toWeiPerSec = (dai: BigNumberish = 0) =>
	// warning! BN will clip off the decimal...
	// (but maybe good for when setting minAmtPerSec)
	utils.parseUnits(dai.toString()).div(oneMonth);

export type PercentageSplit = {
	address: string;
	percent: number;
};

/*
 * Formats splits for contract method input.
 */
export const formatSplits = (splits: PercentageSplit[] = []): SplitsReceiverStruct[] => {
	const validSplits = splits.filter((s) => s.address.length && s.percent > 0);
	return validSplits
		.map((s) => ({
			receiver: s.address.toLowerCase(),
			weight: (s.percent / 100) * TOTAL_SPLITS_WEIGHT
		}))
		.sort((a, b) => (a < b ? -1 : 1));
};

export function validateDrips(drips: DripsReceiverStruct[]) {
	if (!drips?.length) {
		return;
	}

	for (let i = 0; i < drips.length; i++) {
		const { receiver } = drips[i];
		if (!utils.isAddress(receiver)) {
			throw new Error(`Invalid recipient: "${receiver}" is not an Ethereum address`);
		}
	}
}

export function validateSplits(splits: SplitsReceiverStruct[]) {
	if (!splits?.length) {
		return;
	}

	for (let i = 0; i < splits.length; i++) {
		const { receiver } = splits[i];
		if (!utils.isAddress(receiver)) {
			throw new Error(`Invalid recipient: "${receiver}" is not an Ethereum address`);
		}
	}
}

export const getDripsWithdrawable = (config: DripsConfig) => {
	// https://discord.com/channels/841318878125490186/875668327614255164/918094059732623411
	// - Look at the latest user's DripsUpdated, it has a timestamp, uint128 balance and DripsReceiver[] receivers
	// - Add up all the receiers' amtPerSec, it's totalAmtPerSec
	// - withdrawable = eventBalance - (currTimestamp - eventTimestamp) * totalAmtPerSec
	// - if withdrawable < 0, withdrawable = eventBalance % totalAmtPerSec
	try {
		const currTimestamp = Math.floor(new Date().getTime() / 1000); // sec
		const totalAmtPerSec = config.receivers.reduce((acc, curr) => acc.add(curr.amtPerSec), BigNumber.from(0));
		const eventBalance = BigNumber.from(config.balance);
		let withdrawable = eventBalance.sub(totalAmtPerSec.mul(currTimestamp - parseInt(config.timestamp, 10)));
		if (withdrawable.lt(0)) {
			withdrawable = eventBalance.mod(totalAmtPerSec);
		}
		return withdrawable;
	} catch (e) {
		return null;
	}
};

export const getDripsWithdrawableFromEvent = async (event: Event) => {
	// https://discord.com/channels/841318878125490186/875668327614255164/918094059732623411
	// - Look at the latest user's DripsUpdated, it has a timestamp, uint128 balance and DripsReceiver[] receivers
	// - Add up all the receiers' amtPerSec, it's totalAmtPerSec
	// - withdrawable = eventBalance - (currTimestamp - eventTimestamp) * totalAmtPerSec
	// - if withdrawable < 0, withdrawable = eventBalance % totalAmtPerSec
	try {
		const currTimestamp = Math.floor(new Date().getTime() / 1000); // sec
		const eventTimestamp = (await event.getBlock()).timestamp; // sec
		const receivers = event.args[2] as [number, number][]; // TODO (typing);
		const totalAmtPerSec = receivers.reduce<BigNumber>((acc, curr) => acc.add(curr[1]), BigNumber.from(0));
		const eventBalance = event.args[1] as BigNumber;
		let withdrawable = eventBalance.sub(totalAmtPerSec.mul(currTimestamp - eventTimestamp));
		if (withdrawable.lt(0)) {
			withdrawable = eventBalance.mod(totalAmtPerSec);
		}
		return withdrawable;
	} catch (e) {
		return null;
	}
};

export const validateAddressInput = (input: string) => {
	if (!utils.isAddress(input)) {
		throw new Error(`"${input}" does not resolve to an Ethereum address`);
	}
};
