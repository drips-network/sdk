import type { DripsReceiverStruct, SplitsReceiverStruct } from 'contracts/AddressDriver';
import { isNullOrUndefined, nameOf, toBN, validateDripsReceiverConfigObj } from '../common/internals';
import { DripsErrors } from '../common/DripsError';
import Utils from '../utils';

/** @internal */
export const validateDripsReceivers = (receivers: DripsReceiverStruct[]) => {
	if (!receivers) {
		throw DripsErrors.argumentMissingError(
			`Drips receivers validation failed: '${nameOf({ receivers })}' is missing.`,
			nameOf({ receivers })
		);
	}

	if (receivers.length > Utils.Constants.MAX_DRIPS_RECEIVERS) {
		throw DripsErrors.argumentError(
			`Drips receivers validation failed: max number of drips receivers exceeded. Max allowed ${Utils.Constants.MAX_DRIPS_RECEIVERS} but were ${receivers.length}.`,
			nameOf({ receivers }),
			receivers
		);
	}

	if (receivers.length) {
		receivers.forEach((receiver) => {
			const { userId, config } = receiver;

			if (!userId) {
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

			validateDripsReceiverConfigObj(Utils.DripsReceiverConfiguration.fromUint256(config));
		});
	}
};

/** @internal */
export const validateSplitsReceivers = (receivers: SplitsReceiverStruct[]) => {
	if (!receivers) {
		throw DripsErrors.argumentMissingError(
			`Splits receivers validation failed: '${nameOf({ receivers })}' is missing.`,
			nameOf({ receivers })
		);
	}

	if (receivers.length > Utils.Constants.MAX_SPLITS_RECEIVERS) {
		throw DripsErrors.argumentError(
			`Splits receivers validation failed: max number of drips receivers exceeded. Max allowed ${Utils.Constants.MAX_SPLITS_RECEIVERS} but were ${receivers.length}.`,
			nameOf({ receivers }),
			receivers
		);
	}

	if (receivers.length) {
		receivers.forEach((receiver) => {
			const { userId, weight } = receiver;

			if (!userId) {
				throw DripsErrors.splitsReceiverError(
					`Splits receivers validation failed: '${nameOf({ userId })}' is missing.`,
					nameOf({ userId }),
					userId
				);
			}

			if (isNullOrUndefined(weight)) {
				throw DripsErrors.splitsReceiverError(
					`Splits receivers validation failed: '${nameOf({ weight })}' is missing.`,
					nameOf({ weight }),
					weight
				);
			}

			if (toBN(weight).lte(0)) {
				throw DripsErrors.splitsReceiverError(
					`Splits receiver config validation failed: : '${nameOf({ weight })}' must be greater than 0.`,
					nameOf({ weight }),
					weight
				);
			}
		});
	}
};
