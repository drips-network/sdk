import type { DripsReceiverConfig } from '../common/types';
import { DripsErrors } from '../common/DripsError';
import { isNullOrUndefined, nameOf } from '../common/internals';

const MAX_DRIPS_RECEIVERS = 100;

/** @internal */
export const validateDripsReceiverConfig = (dripsReceiverConfig: DripsReceiverConfig): void => {
	if (!dripsReceiverConfig) {
		throw DripsErrors.argumentMissingError(
			`Drips receiver config validation failed: '${nameOf({ dripsReceiverConfig })}' is missing.`,
			nameOf({ dripsReceiverConfig })
		);
	}

	const { dripId, start, duration, amountPerSec } = dripsReceiverConfig;

	if (isNullOrUndefined(dripId) || dripId < 0) {
		throw DripsErrors.dripsReceiverConfigError(
			`Drips receiver config validation failed: '${nameOf({ dripId })}' must be greater than or equal to 0`,
			nameOf({ start }),
			start
		);
	}

	if (isNullOrUndefined(start) || start < 0) {
		throw DripsErrors.dripsReceiverConfigError(
			`Drips receiver config validation failed: '${nameOf({ start })}' must be greater than or equal to 0`,
			nameOf({ start }),
			start
		);
	}

	if (isNullOrUndefined(duration) || duration < 0) {
		throw DripsErrors.dripsReceiverConfigError(
			`Drips receiver config validation failed: '${nameOf({ duration })}' must be greater than or equal to 0`,
			nameOf({ duration }),
			duration
		);
	}

	if (isNullOrUndefined(amountPerSec) || amountPerSec <= 0) {
		throw DripsErrors.dripsReceiverConfigError(
			`Drips receiver config validation failed: '${nameOf({ amountPerSec })}' must be greater than 0.`,
			nameOf({ amountPerSec }),
			amountPerSec
		);
	}
};

/** @internal */
export const validateDripsReceivers = (receivers: { userId: string; config: DripsReceiverConfig }[]) => {
	if (!receivers) {
		throw DripsErrors.argumentMissingError(
			`Drips receivers validation failed: '${nameOf({ receivers })}' is missing.`,
			nameOf({ receivers })
		);
	}

	if (receivers.length > MAX_DRIPS_RECEIVERS) {
		throw DripsErrors.argumentError(
			`Drips receivers validation failed: max number of drips receivers exceeded. Max allowed ${MAX_DRIPS_RECEIVERS} but were ${receivers.length}.`,
			nameOf({ receivers }),
			receivers
		);
	}

	if (receivers.length) {
		receivers.forEach((receiver) => {
			const { userId, config } = receiver;

			if (isNullOrUndefined(userId)) {
				throw DripsErrors.dripsReceiverError(
					`Drips receivers validation failed: '${nameOf({ userId })}' is missing.`,
					nameOf({ userId }),
					userId
				);
			}
			if (isNullOrUndefined(config)) {
				throw DripsErrors.dripsReceiverError(
					`Drips receivers validation failed: '${nameOf({ config })}' is missing.`,
					nameOf({ config }),
					config
				);
			}

			validateDripsReceiverConfig(config);
		});
	}
};
