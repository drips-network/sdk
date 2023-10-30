import type { Provider } from '@ethersproject/providers';
import type { BigNumberish, Signer } from 'ethers';
import { BigNumber, ethers } from 'ethers';
import { DripsErrors } from './DripsError';
import { isNullOrUndefined, nameOf } from './internals';
import type { StreamConfig, SplitsReceiverStruct, StreamsHistoryStruct, AccountMetadata } from './types';

const MAX_DRIPS_RECEIVERS = 100;
const MAX_SPLITS_RECEIVERS = 200;

/** @internal */
export const validateAddress = (address: string) => {
	if (!ethers.utils.isAddress(address)) {
		throw DripsErrors.addressError(`Address validation failed: address '${address}' is not valid.`, address);
	}
};

/** @internal */
export const validateStreamConfig = (streamConfig: StreamConfig): void => {
	if (!streamConfig) {
		throw DripsErrors.argumentMissingError(
			`Drips receiver config validation failed: '${nameOf({ streamConfig })}' is missing.`,
			nameOf({ streamConfig })
		);
	}

	const { dripId, start, duration, amountPerSec } = streamConfig;

	if (isNullOrUndefined(dripId) || dripId < 0) {
		throw DripsErrors.streamConfigError(
			`Drips receiver config validation failed: '${nameOf({ dripId })}' must be greater than or equal to 0`,
			nameOf({ start }),
			start
		);
	}

	if (isNullOrUndefined(start) || start < 0) {
		throw DripsErrors.streamConfigError(
			`Drips receiver config validation failed: '${nameOf({ start })}' must be greater than or equal to 0`,
			nameOf({ start }),
			start
		);
	}

	if (isNullOrUndefined(duration) || duration < 0) {
		throw DripsErrors.streamConfigError(
			`Drips receiver config validation failed: '${nameOf({ duration })}' must be greater than or equal to 0`,
			nameOf({ duration }),
			duration
		);
	}

	if (isNullOrUndefined(amountPerSec) || amountPerSec <= 0) {
		throw DripsErrors.streamConfigError(
			`Drips receiver config validation failed: '${nameOf({ amountPerSec })}' must be greater than 0.`,
			nameOf({ amountPerSec }),
			amountPerSec
		);
	}
};

/** @internal */
export const validateStreamReceivers = (receivers: { accountId: string; config: StreamConfig }[]) => {
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
			const { accountId, config } = receiver;

			if (isNullOrUndefined(accountId)) {
				throw DripsErrors.streamsReceiverError(
					`Drips receivers validation failed: '${nameOf({ accountId })}' is missing.`,
					nameOf({ accountId }),
					accountId
				);
			}
			if (isNullOrUndefined(config)) {
				throw DripsErrors.streamsReceiverError(
					`Drips receivers validation failed: '${nameOf({ config })}' is missing.`,
					nameOf({ config }),
					config
				);
			}

			validateStreamConfig(config);
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
			const { accountId, weight } = receiver;

			if (!accountId) {
				throw DripsErrors.splitsReceiverError(
					`Splits receivers validation failed: '${nameOf({ accountId })}' is missing.`,
					nameOf({ accountId }),
					accountId
				);
			}

			if (isNullOrUndefined(weight)) {
				throw DripsErrors.splitsReceiverError(
					`Splits receivers validation failed: '${nameOf({ weight })}' is missing.`,
					nameOf({ weight }),
					weight
				);
			}

			if (BigNumber.from(weight).lte(0)) {
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
		throw DripsErrors.initializationError(`The provider is missing.`);
	}

	const network = await provider.getNetwork();
	if (!supportedChains.includes(network?.chainId)) {
		throw DripsErrors.initializationError(
			`The provider is connected to an unsupported network with chain ID '${network?.chainId}' ('${network?.name}'). Supported chain IDs are: ${supportedChains}.`
		);
	}
};

/** @internal */
export const validateClientSigner = async (signer: Signer, supportedChains: readonly number[]) => {
	if (!signer) {
		throw DripsErrors.initializationError(`The singer is missing.`);
	}

	const address = await signer.getAddress();
	if (!ethers.utils.isAddress(address)) {
		throw DripsErrors.initializationError(`Signer's address ('${address}') is not valid.`);
	}

	const { provider } = signer;
	if (!provider) {
		throw DripsErrors.initializationError(`The signer has no provider.`);
	}

	const network = await provider.getNetwork();
	if (!supportedChains.includes(network?.chainId)) {
		throw DripsErrors.initializationError(
			`The signer's provider is connected to an unsupported network with chain ID '${network?.chainId}' ('${network?.name}'). Supported chain IDs are: ${supportedChains}.`
		);
	}
};

/** @internal */
export const validateSetStreamsInput = (
	tokenAddress: string,
	currentReceivers: {
		accountId: string;
		config: StreamConfig;
	}[],
	newReceivers: {
		accountId: string;
		config: StreamConfig;
	}[],
	transferToAddress: string,
	balanceDelta: BigNumberish
) => {
	validateAddress(tokenAddress);
	validateAddress(transferToAddress);
	validateStreamReceivers(newReceivers);
	validateStreamReceivers(currentReceivers);
	if (isNullOrUndefined(balanceDelta)) {
		throw DripsErrors.argumentMissingError(
			`Could not set drips: '${nameOf({ balanceDelta })}' is missing.`,
			nameOf({ balanceDelta })
		);
	}
};

/** @internal */
export const validateEmitAccountMetadataInput = (metadata: AccountMetadata[]) => {
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
export const validateReceiveDripsInput = (accountId: string, tokenAddress: string, maxCycles: BigNumberish) => {
	validateAddress(tokenAddress);

	if (isNullOrUndefined(accountId)) {
		throw DripsErrors.argumentMissingError(
			`Could not receive drips: '${nameOf({ accountId })}' is missing.`,
			nameOf({ accountId })
		);
	}

	if (!maxCycles || BigNumber.from(maxCycles).lte(0)) {
		throw DripsErrors.argumentError(
			`Could not receive drips: '${nameOf({ maxCycles })}' must be greater than 0.`,
			nameOf({ maxCycles }),
			maxCycles
		);
	}
};

/** @internal */
export const validateSplitInput = (
	accountId: BigNumberish,
	tokenAddress: string,
	currentReceivers: SplitsReceiverStruct[]
) => {
	validateAddress(tokenAddress);
	validateSplitsReceivers(currentReceivers);

	if (isNullOrUndefined(accountId)) {
		throw DripsErrors.argumentMissingError(
			`Could not split: '${nameOf({ accountId })}' is missing.`,
			nameOf({ accountId })
		);
	}
};

/** @internal */
export const validateCollectInput = (tokenAddress: string, transferToAddress: string) => {
	validateAddress(tokenAddress);
	validateAddress(transferToAddress);
};

/** @internal */
export const validateSqueezeDripsInput = (
	accountId: string,
	tokenAddress: string,
	senderId: BigNumberish,
	historyHash: string,
	streamsHistory: StreamsHistoryStruct[]
) => {
	validateAddress(tokenAddress);

	if (!accountId) {
		throw DripsErrors.argumentError(`Invalid input for squeezing: '${nameOf({ accountId })}' is missing.`);
	}

	if (!senderId) {
		throw DripsErrors.argumentError(`Invalid input for squeezing: '${nameOf({ senderId })}' is missing.`);
	}

	if (!historyHash) {
		throw DripsErrors.argumentError(`Invalid input for squeezing: '${nameOf({ historyHash })}' is missing.`);
	}

	if (!streamsHistory) {
		throw DripsErrors.argumentError(`Invalid input for squeezing: '${nameOf({ streamsHistory })}' is missing.`);
	}
};
