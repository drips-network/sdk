/* eslint-disable no-restricted-syntax */
import type { CycleInfo } from 'src/common/types';
import type { SqueezedDripsEvent } from 'src/DripsSubgraph/types';
import { calcScheduledEnd, minMax } from '../internals';
import type {
	Account,
	AssetConfig,
	AssetConfigHistoryItem,
	Stream,
	AccountEstimate,
	AssetConfigEstimate,
	AssetConfigEstimates,
	Millis,
	StreamEstimate,
	TimeWindow
} from '../types';

/** @internal */
export default class EstimatorEngine {
	public estimateAccount(
		account: Account,
		currentCycle: CycleInfo,
		excludingSqueezes: SqueezedDripsEvent[] = []
	): AccountEstimate {
		return Object.fromEntries(
			account.assetConfigs.map((assetConfig) => [
				assetConfig.tokenAddress,
				this.#buildAssetConfigEstimates(assetConfig, currentCycle, account.userId, excludingSqueezes)
			])
		);
	}

	#estimateAssetConfig(
		assetConfig: AssetConfig,
		window: TimeWindow,
		userId: string,
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

			return this.#estimateHistoryItem(
				window,
				historyItem,
				nextHistoryItem,
				assetConfig.tokenAddress,
				userId,
				excludingSqueezes
			);
		});

		const streamTotals = historyItemEstimates.reduce<{ [stream: string]: StreamEstimate }>(
			(acc, historyItemEstimate) => {
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
			},
			{}
		);

		const streams = Object.entries(streamTotals).map(([id, value]) => ({ ...value, id }));

		const totalStreamed = this.#sumEstimates('totalStreamed', streams);
		const totalAmountPerSecond = this.#sumEstimates('currentAmountPerSecond', streams);
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

	#buildAssetConfigEstimates(
		assetConfig: AssetConfig,
		currentCycle: CycleInfo,
		userId: string,
		excludingSqueezes: SqueezedDripsEvent[]
	): AssetConfigEstimates {
		/*
			TODO: Avoid processing the current cycle twice by bounding totalEstimate to before the current cycle,
			and adding the estimates up.
		*/
		const totalEstimate = this.#estimateAssetConfig(assetConfig, { from: 0, to: Number.MAX_SAFE_INTEGER }, userId);
		const currentCycleEstimate = this.#estimateAssetConfig(
			assetConfig,
			{
				from: currentCycle.currentCycleStartDate.getTime(),
				to: currentCycle.currentCycleStartDate.getTime() + Number(currentCycle.cycleDurationSecs)
			},
			userId,
			excludingSqueezes
		);

		return {
			total: totalEstimate,
			currentCycle: currentCycleEstimate
		};
	}

	#estimateHistoryItem(
		window: TimeWindow,
		historyItem: AssetConfigHistoryItem,
		nextHistoryItem: AssetConfigHistoryItem,
		tokenAddress: string,
		senderId: string,
		excludingSqueezes: SqueezedDripsEvent[]
	): AssetConfigEstimate {
		const streamEstimates = historyItem.streams.map((stream) => {
			const estimate = this.#streamedByStream(
				window,
				stream,
				senderId,
				historyItem,
				excludingSqueezes,
				nextHistoryItem
			);

			return {
				id: stream.id,
				totalStreamed: estimate.streamed,
				currentAmountPerSecond: estimate.currentAmountPerSecond,
				receiverId: stream.receiverId,
				senderId,
				tokenAddress
			};
		});

		const totalStreamed = this.#sumEstimates('totalStreamed', streamEstimates);
		const totalAmountPerSecond = this.#sumEstimates('currentAmountPerSecond', streamEstimates);
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

	#streamedByStream(
		window: TimeWindow,
		receiver: Stream,
		senderId: string,
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
				squeezeEvent.senderId === senderId && squeezeEvent.dripsHistoryHashes.includes(historyItem.historyHash)
		)?.blockTimestamp;
		const squeezedAt: Millis | undefined = squeezedAtBlockTimestamp
			? Number(squeezedAtBlockTimestamp) * 1000
			: undefined;

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

	#sumEstimates(mode: 'totalStreamed' | 'currentAmountPerSecond', streamEstimates: StreamEstimate[]): bigint {
		const res = streamEstimates.reduce<bigint>((acc, streamEstimate) => acc + streamEstimate[mode], 0n);
		return res;
	}
}
