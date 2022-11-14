/* eslint-disable no-nested-ternary */

import type { JsonRpcSigner } from '@ethersproject/providers';
import { BigNumber } from 'ethers';
import { DripsErrors } from './DripsError';
import type { DripsReceiverStruct, SplitsReceiverStruct } from './types';

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
export function ensureSignerExists(signer: JsonRpcSigner | undefined): asserts signer is NonNullable<JsonRpcSigner> {
	if (isNullOrUndefined(signer)) {
		throw DripsErrors.signerMissingError();
	}
}
