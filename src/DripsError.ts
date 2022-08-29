/* eslint-disable max-classes-per-file */

export enum DripsErrorCode {
	INVALID_ADDRESS = 'INVALID_ADDRESS',
	INVALID_ARGUMENT = 'INVALID_ARGUMENT',
	UNSUPPORTED_NETWORK = 'UNSUPPORTED_NETWORK'
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
	static invalidArgument = (message: string, context?: unknown) =>
		new DripsError(DripsErrorCode.INVALID_ARGUMENT, `${message}`, context);
	static invalidAddress = (message: string, context?: string) =>
		new DripsError(DripsErrorCode.INVALID_ADDRESS, `${message}`, context);
	static unsupportedNetwork = (message: string, context?: unknown) =>
		new DripsError(DripsErrorCode.UNSUPPORTED_NETWORK, `${message}`, context);
}
