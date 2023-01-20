import type { Provider } from '@ethersproject/providers';
import type { BigNumberish, Signer } from 'ethers';
import { ethers } from 'ethers';
import { DripsErrors } from './DripsError';
import { isNullOrUndefined, nameOf } from './internals';
import type { DripsReceiverConfig, SplitsReceiverStruct, DripsHistoryStruct, UserMetadata } from './types';

const MAX_DRIPS_RECEIVERS = 100;
const MAX_SPLITS_RECEIVERS = 200;

/** @internal */
export const validateAddress = (address: string) => {
	if (!ethers.utils.isAddress(address)) {
		throw DripsErrors.addressError(`Address validation failed: address '${address}' is not valid.`, address);
	}
};

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

/** @internal */
export const validateSplitsReceivers = (receivers: SplitsReceiverStruct[]) => {
	if (!receivers) {
		throw DripsErrors.argumentMissingError(
			`Splits receivers validation failed: '${nameOf({ receivers })}' is missing.`,
			nameOf({ receivers })
		);
	}

	if (receivers.length > MAX_SPLITS_RECEIVERS) {
		throw DripsErrors.argumentError(
			`Splits receivers validation failed: max number of drips receivers exceeded. Max allowed ${MAX_SPLITS_RECEIVERS} but were ${receivers.length}.`,
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

			if (weight <= 0) {
				throw DripsErrors.splitsReceiverError(
					`Splits receiver config validation failed: : '${nameOf({ weight })}' must be greater than 0.`,
					nameOf({ weight }),
					weight
				);
			}
		});
	}
};

/** @internal */
export const validateClientProvider = async (provider: Provider, supportedChains: readonly number[]) => {
	if (!provider) {
		throw DripsErrors.argumentError(`'${nameOf({ provider })}' is missing.`);
	}

	const network = await provider.getNetwork();
	if (!supportedChains.includes(network?.chainId)) {
		throw DripsErrors.unsupportedNetworkError(
			`The provider is connected to an unsupported network with chain ID '${network?.chainId}' ('${network?.name}'). Supported chain IDs are: ${supportedChains}.`,
			network?.chainId
		);
	}
};

/** @internal */
export const validateClientSigner = async (signer: Signer) => {
	if (!signer) {
		throw DripsErrors.argumentError(`'${nameOf({ signer })}' is missing.`);
	}

	validateAddress(await signer.getAddress());
};

/** @internal */
export const validateSetDripsInput = (
	tokenAddress: string,
	currentReceivers: {
		userId: string;
		config: DripsReceiverConfig;
	}[],
	newReceivers: {
		userId: string;
		config: DripsReceiverConfig;
	}[],
	transferToAddress: string,
	balanceDelta: BigNumberish
) => {
	validateAddress(tokenAddress);
	validateAddress(transferToAddress);
	validateDripsReceivers(newReceivers);
	validateDripsReceivers(currentReceivers);
	if (isNullOrUndefined(balanceDelta)) {
		throw DripsErrors.argumentMissingError(
			`Could not set drips: '${nameOf({ balanceDelta })}' is missing.`,
			nameOf({ balanceDelta })
		);
	}
};

/** @internal */
export const validateEmitUserMetadataInput = (metadata: UserMetadata[]) => {
	if (!metadata) {
		throw DripsErrors.argumentError(`Invalid user metadata: '${nameOf({ metadata })}' is missing.`);
	}

	metadata.forEach((meta) => {
		const { key, value } = meta;

		if (!key) {
			throw DripsErrors.argumentError(`Invalid user metadata: '${nameOf({ key })}' is missing.`);
		}

		if (!value) {
			throw DripsErrors.argumentError(`Invalid user metadata: '${nameOf({ value })}' is missing.`);
		}
	});
};

/** @internal */
export const validateReceiveDripsInput = (userId: string, tokenAddress: string, maxCycles: BigNumberish) => {
	validateAddress(tokenAddress);

	if (isNullOrUndefined(userId)) {
		throw DripsErrors.argumentMissingError(
			`Could not receive drips: '${nameOf({ userId })}' is missing.`,
			nameOf({ userId })
		);
	}

	if (!maxCycles || maxCycles < 0) {
		throw DripsErrors.argumentError(
			`Could not receive drips: '${nameOf({ maxCycles })}' must be greater than 0.`,
			nameOf({ maxCycles }),
			maxCycles
		);
	}
};

/** @internal */
export const validateSplitInput = (
	userId: BigNumberish,
	tokenAddress: string,
	currentReceivers: SplitsReceiverStruct[]
) => {
	validateAddress(tokenAddress);
	validateSplitsReceivers(currentReceivers);

	if (isNullOrUndefined(userId)) {
		throw DripsErrors.argumentMissingError(`Could not split: '${nameOf({ userId })}' is missing.`, nameOf({ userId }));
	}
};

/** @internal */
export const validateCollectInput = (tokenAddress: string, transferToAddress: string) => {
	validateAddress(tokenAddress);
	validateAddress(transferToAddress);
};

/** @internal */
export const validateSqueezeDripsInput = (
	userId: string,
	tokenAddress: string,
	senderId: BigNumberish,
	historyHash: string,
	dripsHistory: DripsHistoryStruct[]
) => {
	validateAddress(tokenAddress);

	if (!userId) {
		throw DripsErrors.argumentError(`Invalid input for squeezing: '${nameOf({ userId })}' is missing.`);
	}

	if (!senderId) {
		throw DripsErrors.argumentError(`Invalid input for squeezing: '${nameOf({ senderId })}' is missing.`);
	}

	if (!historyHash) {
		throw DripsErrors.argumentError(`Invalid input for squeezing: '${nameOf({ historyHash })}' is missing.`);
	}

	if (!dripsHistory) {
		throw DripsErrors.argumentError(`Invalid input for squeezing: '${nameOf({ dripsHistory })}' is missing.`);
	}
};
