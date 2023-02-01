/* eslint-disable no-restricted-syntax */
import type { SqueezedDripsEvent } from 'src/DripsSubgraph/types';
import type {
	Account,
	AccountEstimate,
	AssetConfig,
	AssetConfigEstimate,
	AssetConfigEstimates,
	AssetConfigHistoryItem,
	Cycle,
	Millis,
	Receiver,
	StreamEstimate,
	TimeWindow,
	User
} from './types';

export function estimateAccount(
	account: Account,
	currentCycle: Cycle,
	excludingSqueezes: SqueezedDripsEvent[] = []
): AccountEstimate {
	return Object.fromEntries(
		account.assetConfigs.map((assetConfig) => [
			assetConfig.tokenAddress,
			buildAssetConfigEstimates(assetConfig, currentCycle, account.user, excludingSqueezes)
		])
	);
}

function buildAssetConfigEstimates(
	assetConfig: AssetConfig,
	currentCycle: Cycle,
	user: User,
	excludingSqueezes: SqueezedDripsEvent[]
): AssetConfigEstimates {
	/*
    TODO: Avoid processing the current cycle twice by bounding totalEstimate to before the current cycle,
    and adding the estimates up.
  */
	const totalEstimate = estimateAssetConfig(assetConfig, { from: 0, to: Number.MAX_SAFE_INTEGER }, user);
	const currentCycleEstimate = estimateAssetConfig(
		assetConfig,
		{
			from: currentCycle.start.getTime(),
			to: currentCycle.start.getTime() + currentCycle.duration
		},
		user,
		excludingSqueezes
	);

	return {
		total: totalEstimate,
		currentCycle: currentCycleEstimate
	};
}

export function estimateAssetConfig(
	assetConfig: AssetConfig,
	window: TimeWindow,
	user: User,
	excludingSqueezes: SqueezedDripsEvent[] = []
): AssetConfigEstimate {
	// Filter out any history items not relevant to the current time window.
	const relevantHistoryItems = assetConfig.history.filter((hi) => {
		const timestamp = hi.timestamp.getTime();
		const nextTimestamp = assetConfig.history[assetConfig.history.indexOf(hi)]?.timestamp.getTime();

		const startsWithinWindow = timestamp <= window.to && timestamp >= window.from;
		const windowIsAfterLastEvent = !nextTimestamp && timestamp < window.from;
		const endsWithinWindow = nextTimestamp && nextTimestamp >= window.from;

		return startsWithinWindow || windowIsAfterLastEvent || endsWithinWindow;
	});

	const historyItemEstimates = relevantHistoryItems.map((historyItem, index, historyItems) => {
		const nextHistoryItem = historyItems[index + 1];

		return estimateHistoryItem(window, historyItem, nextHistoryItem, assetConfig.tokenAddress, user, excludingSqueezes);
	});

	const streamTotals = historyItemEstimates.reduce<{ [stream: string]: StreamEstimate }>((acc, historyItemEstimate) => {
		const nextItem = historyItemEstimates[historyItemEstimates.indexOf(historyItemEstimate) + 1];
		const { streams } = historyItemEstimate;

		for (const stream of streams) {
			const currentVal = acc[stream.id];

			acc[stream.id] = {
				...stream,
				...acc[stream.id],
				totalStreamed: (currentVal?.totalStreamed ?? 0n) + stream.totalStreamed,
				currentAmountPerSecond: nextItem ? 0n : stream.currentAmountPerSecond
			};
		}

		return acc;
	}, {});

	const streams = Object.entries(streamTotals).map(([id, value]) => ({ ...value, id }));

	const totalStreamed = sumEstimates('totalStreamed', streams);
	const totalAmountPerSecond = sumEstimates('currentAmountPerSecond', streams);
	const { remainingBalance } = historyItemEstimates[historyItemEstimates.length - 1]?.totals ?? 0n;

	return {
		streams,
		totals: {
			totalStreamed,
			totalAmountPerSecond,
			remainingBalance
		}
	};
}

function estimateHistoryItem(
	window: TimeWindow,
	historyItem: AssetConfigHistoryItem,
	nextHistoryItem: AssetConfigHistoryItem,
	tokenAddress: string,
	sender: User,
	excludingSqueezes: SqueezedDripsEvent[]
): AssetConfigEstimate {
	const streamEstimates = historyItem.streams.map((receiver) => {
		const estimate = streamedByStream(window, receiver, sender, historyItem, excludingSqueezes, nextHistoryItem);

		return {
			id: receiver.streamId,
			totalStreamed: estimate.streamed,
			currentAmountPerSecond: estimate.currentAmountPerSecond,
			receiver: receiver.receiver,
			sender,
			tokenAddress
		};
	});

	const totalStreamed = sumEstimates('totalStreamed', streamEstimates);
	const totalAmountPerSecond = sumEstimates('currentAmountPerSecond', streamEstimates);
	const remainingBalance = historyItem.balance - totalStreamed;

	return {
		streams: streamEstimates,
		totals: {
			totalStreamed,
			remainingBalance,
			totalAmountPerSecond
		}
	};
}

function streamedByStream(
	window: TimeWindow,
	receiver: Receiver,
	sender: User,
	historyItem: AssetConfigHistoryItem,
	excludingSqueezes: SqueezedDripsEvent[],
	nextHistoryItem?: AssetConfigHistoryItem
): {
	streamed: bigint;
	currentAmountPerSecond: bigint;
} {
	// Undefined dripsConfig means the stream was paused.
	if (!receiver.dripsConfig) {
		return {
			streamed: 0n,
			currentAmountPerSecond: 0n
		};
	}

	const { timestamp: nextTimestampDate } = nextHistoryItem ?? {};
	const nextTimestamp: Millis = nextTimestampDate ? nextTimestampDate.getTime() : new Date().getTime();

	const { runsOutOfFunds: runsOutOfFundsTimestamp, timestamp: timestampDate } = historyItem;
	const runsOutOfFunds: Millis | undefined = runsOutOfFundsTimestamp ? runsOutOfFundsTimestamp.getTime() : undefined;
	const timestamp: Millis = timestampDate.getTime();

	const durationSeconds = receiver.dripsConfig.duration > 0n ? Number(receiver.dripsConfig.duration) : undefined;
	const amountPerSecond = receiver.dripsConfig.amountPerSec;
	const startDate = receiver.dripsConfig.start > 0n ? new Date(Number(receiver.dripsConfig.start) * 1000) : undefined;

	const duration: Millis | undefined = durationSeconds ? durationSeconds * 1000 : undefined;
	const start: Millis = startDate ? startDate.getTime() : timestamp;

	const squeezedAtBlockTimestamp = excludingSqueezes.find(
		(squeezeEvent) =>
			squeezeEvent.senderId === sender.userId && squeezeEvent.dripsHistoryHashes.includes(historyItem.historyHash)
	)?.blockTimestamp;
	const squeezedAt: Millis | undefined = squeezedAtBlockTimestamp ? Number(squeezedAtBlockTimestamp) * 1000 : undefined;

	const streamingFrom = minMax('max', timestamp, start, window.from, squeezedAt);
	const scheduledToEndAt = calcScheduledEnd(streamingFrom, start, duration);
	const streamingUntil = minMax('min', runsOutOfFunds, scheduledToEndAt, nextTimestamp, window.to);
	const validForMillis = minMax('max', streamingUntil - streamingFrom, 0);

	const streamed = (BigInt(validForMillis) * amountPerSecond) / 1000n;
	const currentAmountPerSecond =
		streamingUntil >= nextTimestamp && streamingFrom < nextTimestamp ? amountPerSecond : 0n;

	return {
		streamed,
		currentAmountPerSecond
	};
}

function sumEstimates(mode: 'totalStreamed' | 'currentAmountPerSecond', streamEstimates: StreamEstimate[]): bigint {
	const res = streamEstimates.reduce<bigint>((acc, streamEstimate) => acc + streamEstimate[mode], 0n);
	return res;
}

function calcScheduledEnd(timestamp: Millis, start?: Millis, duration?: Millis): Millis | undefined {
	return duration ? (start ?? timestamp) + duration : undefined;
}

function minMax(mode: 'min' | 'max', ...args: (number | undefined)[]) {
	const filtered: number[] = args.filter((a): a is number => a !== undefined);

	return Math[mode](...filtered);
}
