/* eslint-disable max-classes-per-file */

import type { ContractReceipt } from 'ethers';

export enum DripsErrorCode {
	MISSING_SIGNER = 'MISSING_SIGNER',
	INVALID_ADDRESS = 'INVALID_ADDRESS',
	INVALID_ARGUMENT = 'INVALID_ARGUMENT',
	MISSING_ARGUMENT = 'MISSING_ARGUMENT',
	TX_EVENT_NOT_FOUND = 'TX_EVENT_NOT_FOUND',
	UNSUPPORTED_NETWORK = 'UNSUPPORTED_NETWORK',
	SUBGRAPH_QUERY_ERROR = 'SUBGRAPH_QUERY_ERROR',
	INVALID_DRIPS_RECEIVER = 'INVALID_DRIPS_RECEIVER',
	INITIALIZATION_FAILURE = 'INITIALIZATION_FAILURE',
	INVALID_SPLITS_RECEIVER = 'INVALID_SPLITS_RECEIVER',
	INVALID_DRIPS_RECEIVER_CONFIG = 'INVALID_DRIPS_RECEIVER_CONFIG'
}

export class DripsError extends Error {
	public readonly context?: unknown;
	public readonly code: DripsErrorCode;

	constructor(code: DripsErrorCode, message: string, context?: unknown) {
		super(message);

		this.code = code;
		this.context = context;
	}
}

export class DripsErrors {
	static initializationError = (message: string) => new DripsError(DripsErrorCode.INITIALIZATION_FAILURE, message);

	static addressError = (message: string, address: string) =>
		new DripsError(DripsErrorCode.INVALID_ADDRESS, message, {
			invalidAddress: address
		});

	static txEventNotFound = (message: string, eventName: string, txReceipt: ContractReceipt) =>
		new DripsError(DripsErrorCode.TX_EVENT_NOT_FOUND, message, {
			eventName,
			txReceipt
		});

	static signerMissingError = (
		message: string = 'Tried to perform an operation that requires a signer but a signer was not found.'
	) => new DripsError(DripsErrorCode.MISSING_SIGNER, message);

	static argumentMissingError = (message: string, argName: string) =>
		new DripsError(DripsErrorCode.MISSING_ARGUMENT, message, {
			missingArgumentName: argName
		});

	static unsupportedNetworkError = (message: string, chainId: number) =>
		new DripsError(DripsErrorCode.UNSUPPORTED_NETWORK, message, {
			unsupportedChainId: chainId
		});

	static argumentError = (message: string, argName?: string, argValue?: unknown) =>
		new DripsError(
			DripsErrorCode.INVALID_ARGUMENT,
			message,
			argName
				? {
						invalidArgument: { name: argName, value: argValue }
				  }
				: undefined
		);

	static splitsReceiverError = (message: string, invalidPropertyName: string, invalidPropertyValue: unknown) =>
		new DripsError(DripsErrorCode.INVALID_SPLITS_RECEIVER, message, {
			invalidProperty: {
				name: invalidPropertyName,
				value: invalidPropertyValue
			}
		});

	static streamsReceiverError = (message: string, invalidPropertyName: string, invalidPropertyValue: unknown) =>
		new DripsError(DripsErrorCode.INVALID_DRIPS_RECEIVER, message, {
			invalidProperty: {
				name: invalidPropertyName,
				value: invalidPropertyValue
			}
		});

	static streamConfigError = (message: string, invalidPropertyName: string, invalidPropertyValue: unknown) =>
		new DripsError(DripsErrorCode.INVALID_DRIPS_RECEIVER_CONFIG, message, {
			invalidProperty: {
				name: invalidPropertyName,
				value: invalidPropertyValue
			}
		});

	static subgraphQueryError = (message: string) => new DripsError(DripsErrorCode.SUBGRAPH_QUERY_ERROR, message);
}
