/* eslint-disable max-classes-per-file */

export enum DripsErrorCode {
	SIGNER_NOT_FOUND = 'SIGNER_NOT_FOUND',
	CONNECTION_FAILED = 'CONNECTION_FAILED',
	ADDRESS_NOT_VALID = 'ADDRESS_NOT_VALID',
	PROVIDER_NOT_FOUND = 'PROVIDER_NOT_FOUND',
	UNKNOWN_CLIENT_ERROR = 'UNKNOWN_CLIENT_ERROR'
}

export class DripsError {
	readonly code: string;
	readonly message: string;
	readonly context?: unknown;

	constructor(code: DripsErrorCode, message: string, context?: unknown) {
		this.code = code;
		this.message = message;
		this.context = context;
	}
}

export class DripsErrors {
	static signerNotFound = (debugMessage: string) => new DripsError(DripsErrorCode.SIGNER_NOT_FOUND, debugMessage);
	static connectionFailed = (debugMessage: string, context?: unknown) =>
		new DripsError(DripsErrorCode.CONNECTION_FAILED, debugMessage, context);
	static providerNotFound = (debugMessage: string) => new DripsError(DripsErrorCode.PROVIDER_NOT_FOUND, debugMessage);
	static addressNotValid = (debugMessage: string, address?: string) =>
		new DripsError(DripsErrorCode.ADDRESS_NOT_VALID, debugMessage, address);
	static unknownClientError = (debugMessage: string, context?: unknown) =>
		new DripsError(DripsErrorCode.UNKNOWN_CLIENT_ERROR, debugMessage, context);
}
