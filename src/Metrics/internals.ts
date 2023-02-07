import type { Millis } from './AccountEstimator/types';

export const calcScheduledEnd = (timestamp: Millis, start?: Millis, duration?: Millis): Millis | undefined =>
	duration ? (start ?? timestamp) + duration : undefined;

export const minMax = (mode: 'min' | 'max', ...args: (number | undefined)[]) => {
	const filtered: number[] = args.filter((a): a is number => a !== undefined);

	return Math[mode](...filtered);
};
