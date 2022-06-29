import { utils } from 'ethers';
import type { DripsReceiverStruct, SplitsReceiverStruct } from '../contracts/DaiDripsHub';

export function areValidDripsReceivers(drips: DripsReceiverStruct[]): boolean {
	if (!drips?.length) {
		return false;
	}

	for (let i = 0; i < drips.length; i++) {
		const { receiver } = drips[i];
		if (!utils.isAddress(receiver)) {
			return false;
		}
	}

	return true;
}

export function areValidSplitsReceivers(splits: SplitsReceiverStruct[]): boolean {
	if (!splits?.length) {
		return false;
	}

	for (let i = 0; i < splits.length; i++) {
		const { receiver } = splits[i];
		if (!utils.isAddress(receiver)) {
			return false;
		}
	}

	return true;
}
