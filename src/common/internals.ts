/* eslint-disable no-useless-escape */

import type { BigNumberish } from 'ethers';
import { ethers } from 'ethers';
import { DripsErrors } from './DripsError';
import type { DripsReceiverConfig } from './types';

/**
 * internals.ts contains shared functions that are *not* meant to be publicly exposed.
 * They could, however, be consumed by other _public_ methods (e.g., in utils.ts).
 */

/** @internal */
export const nameOf = (obj: any) => Object.keys(obj)[0];

/** @internal */
export const isNullOrUndefined = (obj: any) => obj == null;

/** @internal */
export const toBN = (value: BigNumberish) => ethers.BigNumber.from(value);

/** @internal */
export const validateAddress = (address: string) => {
	if (!ethers.utils.isAddress(address)) {
		throw DripsErrors.addressError(`Address validation failed: address '${address}' is not valid.`, address);
	}
};

/** @internal */
export const validateDripsReceiverConfigBN = (dripsReceiverConfig: BigNumberish): void => {
	if (isNullOrUndefined(dripsReceiverConfig)) {
		throw DripsErrors.argumentMissingError(
			`Drips receiver config validation failed: '${nameOf({ dripsReceiverConfig })}' is missing.`,
			nameOf({ dripsReceiverConfig })
		);
	}

	const configAsBN = toBN(dripsReceiverConfig);

	if (configAsBN.lte(0)) {
		throw DripsErrors.dripsReceiverError(
			`Drips receiver config validation failed: : '${nameOf({ dripsReceiverConfig })}' must be greater than 0.`,
			nameOf({ dripsReceiverConfig }),
			dripsReceiverConfig
		);
	}
};

/** @internal */
export const validateDripsReceiverConfigObj = (dripsReceiverConfig: DripsReceiverConfig): void => {
	if (!dripsReceiverConfig) {
		throw DripsErrors.argumentMissingError(
			`Drips receiver config validation failed: '${nameOf({ dripsReceiverConfig })}' is missing.`,
			nameOf({ dripsReceiverConfig })
		);
	}

	const { start, duration, amountPerSec } = dripsReceiverConfig;

	if (toBN(start).lt(0)) {
		throw DripsErrors.dripsReceiverError(
			`Drips receiver config validation failed: '${nameOf({ start })}' must be greater than or equal to 0`,
			nameOf({ start }),
			start
		);
	}

	if (toBN(duration).lt(0)) {
		throw DripsErrors.dripsReceiverError(
			`Drips receiver config validation failed: '${nameOf({ duration })}' must be greater than or equal to 0`,
			nameOf({ duration }),
			duration
		);
	}

	if (toBN(amountPerSec).lte(0)) {
		throw DripsErrors.dripsReceiverError(
			`Drips receiver config validation failed: '${nameOf({ amountPerSec })}' must be greater than 0.`,
			nameOf({ amountPerSec }),
			amountPerSec
		);
	}
};
