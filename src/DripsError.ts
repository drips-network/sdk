/* eslint-disable max-classes-per-file */

export enum DripsErrorCode {
	USER_NOT_FOUND = 'USER_NOT_FOUND',
	INVALID_ADDRESS = 'INVALID_ADDRESS',
	INVALID_ARGUMENT = 'INVALID_ARGUMENT',
	INVALID_OPERATION = 'INVALID_OPERATION',
	UNSUPPORTED_NETWORK = 'UNSUPPORTED_NETWORK',
	INVALID_DRIPS_RECEIVER = 'INVALID_DRIPS_RECEIVER',
	INVALID_SPLITS_RECEIVER = 'INVALID_SPLITS_RECEIVER'
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
	static invalidOperation = (message: string, context?: unknown) =>
		new DripsError(DripsErrorCode.INVALID_OPERATION, `${message}`, context);
	static invalidArgument = (message: string, context?: unknown) =>
		new DripsError(DripsErrorCode.INVALID_ARGUMENT, `${message}`, context);
	static invalidAddress = (message: string, context?: string) =>
		new DripsError(DripsErrorCode.INVALID_ADDRESS, `${message}`, context);
	static userNotFound = (message: string, context?: unknown) =>
		new DripsError(DripsErrorCode.USER_NOT_FOUND, `${message}`, context);
	static unsupportedNetwork = (message: string, context?: unknown) =>
		new DripsError(DripsErrorCode.UNSUPPORTED_NETWORK, `${message}`, context);
	static invalidDripsReceiver = (message: string, context?: unknown) =>
		new DripsError(DripsErrorCode.INVALID_DRIPS_RECEIVER, `${message}`, context);
	static invalidSplitsReceiver = (message: string, context?: unknown) =>
		new DripsError(DripsErrorCode.INVALID_SPLITS_RECEIVER, `${message}`, context);
}
