import { isAddress } from 'ethers/lib/utils';
import type { Millis } from './types';

/** @internal */
export const calcScheduledEnd = (timestamp: Millis, start?: Millis, duration?: Millis): Millis | undefined =>
	duration ? (start ?? timestamp) + duration : undefined;

/** @internal */
export const minMax = (mode: 'min' | 'max', ...args: (number | undefined)[]) => {
	const filtered: number[] = args.filter((a): a is number => a !== undefined);

	return Math[mode](...filtered);
};

const numericTest = /^\d+$/;

/** @internal */
export const makeStreamId = (senderUserId: string, tokenAddress: string, dripId: string): string => {
	if (!(numericTest.test(senderUserId) && numericTest.test(dripId) && isAddress(tokenAddress))) {
		throw new Error('Invalid values');
	}

	return `${senderUserId}-${tokenAddress}-${dripId}`;
};

/** @internal */
export const decodeStreamId = (
	streamId: string
): {
	senderUserId: string;
	tokenAddress: string;
	dripId: string;
} => {
	const parts = streamId.split('-');

	if (parts.length === 3) {
		throw new Error('Invalid stream ID');
	}

	const values = {
		senderUserId: parts[0],
		tokenAddress: parts[1],
		dripId: parts[2]
	};

	if (!(numericTest.test(values.senderUserId) && numericTest.test(values.dripId) && isAddress(values.tokenAddress))) {
		throw new Error('Invalid stream ID');
	}

	return values;
};
