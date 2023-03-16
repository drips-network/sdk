/* eslint-disable no-nested-ternary */

import type { BytesLike, PopulatedTransaction, Signer } from 'ethers';
import { BigNumber, ethers } from 'ethers';
import { DripsErrors } from './DripsError';
import type { DripsReceiverStruct, SplitsReceiverStruct, UserMetadataStruct } from './types';

/** @internal */
export const nameOf = (obj: any) => Object.keys(obj)[0];

/** @internal */
export const isNullOrUndefined = (obj: any) => obj == null;

/** @internal */
export const formatDripsReceivers = (receivers: DripsReceiverStruct[]) => {
	// Drips receivers must be sorted by user ID and config, deduplicated, and without amount per second <= 0.

	const uniqueReceivers = receivers.reduce((unique: DripsReceiverStruct[], o) => {
		if (
			!unique.some(
				(obj: DripsReceiverStruct) => obj.userId === o.userId && BigNumber.from(obj.config).eq(BigNumber.from(o.config))
			)
		) {
			unique.push(o);
		}
		return unique;
	}, []);

	const sortedReceivers = uniqueReceivers
		// Sort by userId.
		.sort((a, b) =>
			BigNumber.from(a.userId).gt(BigNumber.from(b.userId))
				? 1
				: BigNumber.from(a.userId).lt(BigNumber.from(b.userId))
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
		if (!unique.some((obj: SplitsReceiverStruct) => obj.userId === o.userId && obj.weight === o.weight)) {
			unique.push(o);
		}
		return unique;
	}, []);

	const sortedReceivers = uniqueReceivers.sort((a, b) =>
		// Sort by user ID.
		BigNumber.from(a.userId).gt(BigNumber.from(b.userId))
			? 1
			: BigNumber.from(a.userId).lt(BigNumber.from(b.userId))
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

/** @internal */
export const keyFromString = (key: string): BytesLike => ethers.utils.formatBytes32String(key);

/** @internal */
export const valueFromString = (value: string): BytesLike => ethers.utils.hexlify(ethers.utils.toUtf8Bytes(value));

/** @internal */
export const createFromStrings = (
	key: string,
	value: string
): {
	key: BytesLike;
	value: BytesLike;
} => ({
	key: keyFromString(key),
	value: valueFromString(value)
});

/** @internal */
export const parseMetadataAsString = (userMetadata: UserMetadataStruct): { key: string; value: string } => {
	if (!ethers.utils.isBytesLike(userMetadata?.key) || !ethers.utils.isBytesLike(userMetadata?.value)) {
		throw DripsErrors.argumentError(
			`Invalid key-value user metadata pair: key or value is not a valid BytesLike object.`
		);
	}

	return {
		key: ethers.utils.parseBytes32String(userMetadata.key),
		value: ethers.utils.toUtf8String(userMetadata.value)
	};
};

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
