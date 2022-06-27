/* eslint-disable max-classes-per-file */

export enum DripsErrorCode {
	INVALID_ADDRESS = 'INVALID_ADDRESS',
	INVALID_OPERATION = 'INVALID_OPERATION',
	CONNECTION_FAILED = 'CONNECTION_FAILED',
	UNKNOWN_CLIENT_ERROR = 'UNKNOWN_CLIENT_ERROR',
	INVALID_CONFIGURATION = 'INVALID_CONFIGURATION'
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
	static invalidConfiguration = (debugMessage: string, context?: unknown) =>
		new DripsError(DripsErrorCode.INVALID_CONFIGURATION, debugMessage, context);
	static invalidOperation = (debugMessage: string, context?: unknown) =>
		new DripsError(DripsErrorCode.INVALID_OPERATION, debugMessage, context);
	static invalidAddress = (debugMessage: string, address?: string) =>
		new DripsError(DripsErrorCode.INVALID_ADDRESS, debugMessage, address);
	static unknownClientError = (debugMessage: string, context?: unknown) =>
		new DripsError(DripsErrorCode.UNKNOWN_CLIENT_ERROR, debugMessage, context);
	static connectionFailed = (debugMessage: string, context?: unknown) =>
		new DripsError(DripsErrorCode.CONNECTION_FAILED, debugMessage, context);
}
