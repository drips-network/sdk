/* eslint-disable no-promise-executor-return */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-nested-ternary */

import type { PopulatedTransaction, Signer } from 'ethers';
import { BigNumber } from 'ethers';
import { DripsErrors } from './DripsError';
import type { StreamReceiverStruct, SplitsReceiverStruct } from './types';

/** @internal */
export const nameOf = (obj: any) => Object.keys(obj)[0];

/** @internal */
export const isNullOrUndefined = (obj: any) => obj == null;

/** @internal */
export const formatStreamReceivers = (receivers: StreamReceiverStruct[]) => {
	// Drips receivers must be sorted by user ID and config, deduplicated, and without amount per second <= 0.

	const uniqueReceivers = receivers.reduce((unique: StreamReceiverStruct[], o) => {
		if (
			!unique.some(
				(obj: StreamReceiverStruct) =>
					obj.accountId === o.accountId && BigNumber.from(obj.config).eq(BigNumber.from(o.config))
			)
		) {
			unique.push(o);
		}
		return unique;
	}, []);

	const sortedReceivers = uniqueReceivers
		// Sort by accountId.
		.sort((a, b) =>
			BigNumber.from(a.accountId).gt(BigNumber.from(b.accountId))
				? 1
				: BigNumber.from(a.accountId).lt(BigNumber.from(b.accountId))
				? -1
				: // Sort by config.
				BigNumber.from(a.config).gt(BigNumber.from(b.config))
				? 1
				: BigNumber.from(a.config).lt(BigNumber.from(b.config))
				? -1
				: 0
		);
	return sortedReceivers;
};

/** @internal */
export const formatSplitReceivers = (receivers: SplitsReceiverStruct[]): SplitsReceiverStruct[] => {
	// Splits receivers must be sorted by user ID, deduplicated, and without weights <= 0.

	const uniqueReceivers = receivers.reduce((unique: SplitsReceiverStruct[], o) => {
		if (!unique.some((obj: SplitsReceiverStruct) => obj.accountId === o.accountId && obj.weight === o.weight)) {
			unique.push(o);
		}
		return unique;
	}, []);

	const sortedReceivers = uniqueReceivers.sort((a, b) =>
		// Sort by user ID.
		BigNumber.from(a.accountId).gt(BigNumber.from(b.accountId))
			? 1
			: BigNumber.from(a.accountId).lt(BigNumber.from(b.accountId))
			? -1
			: 0
	);

	return sortedReceivers;
};

/** @internal */
export function ensureSignerExists(signer: Signer | undefined): asserts signer is NonNullable<Signer> {
	if (isNullOrUndefined(signer)) {
		throw DripsErrors.signerMissingError();
	}
}

/**
 * Source: https://github.com/radicle-dev/drips-app-v2/blob/main/src/lib/utils/expect.ts
 *
 * Function `func` will be called roughly every `checkingEvery` milliseconds, up to roughly
 * `within` milliseconds total. Every time, its returned value is compared with `toMatchCondition`.
 * If it's a match, returns the return value of `func`. If after all tries are exceeded
 * the condition still doesn't match, a `FailedExpectation` is returned.
 * @param func The function to execute every `checkingEvery` for `within` millis total.
 * @param toMatchCondition The comparator function to run against `func`'s return value
 * on every try.
 * @param within How many milliseconds we should keep on trying for. Keep in mind that
 * if `func` is a slow-resolving promise, we may end up waiting for a bit longer than
 * this value.
 * @param checkingEvery How much time we should wait between each attempt.
 * @returns Return type of `func` matching `toMatchCondition`, or a `FailedExpectation`
 * if it never did.
 */
export async function expect<T extends (() => any) | (() => Promise<any>)>(
	func: T,
	toMatchCondition: (result: Awaited<ReturnType<T>>) => boolean,
	within = 5000,
	checkingEvery = 1000
): Promise<
	| ReturnType<T>
	| {
			failed: true;
	  }
> {
	const numberOfChecks = Math.floor(within / checkingEvery);

	const checks = Array.from(Array(numberOfChecks).keys()).map(() => func);

	for (const check of checks) {
		const result = await check();

		if (toMatchCondition(result)) {
			return result;
		}

		await new Promise((r) => setTimeout(r, checkingEvery));
	}

	return {
		failed: true
	};
}

/** @internal */
export const safeDripsTx = (tx: PopulatedTransaction): PopulatedTransaction => {
	if (isNullOrUndefined(tx.value)) {
		// eslint-disable-next-line no-param-reassign
		tx.value = BigNumber.from(0);
	}

	return tx;
};
