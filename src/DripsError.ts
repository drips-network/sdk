/* eslint-disable max-classes-per-file */

export enum DripsErrorCode {
	UNKNOWN_ERROR = 'UNKNOWN_ERROR',
	INVALID_ADDRESS = 'INVALID_ADDRESS',
	INVALID_ARGUMENT = 'INVALID_ARGUMENT',
	INVALID_OPERATION = 'INVALID_OPERATION',
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
		new DripsError(
			DripsErrorCode.INVALID_CONFIGURATION,
			`Code: ${DripsErrorCode.INVALID_CONFIGURATION} - Message: ${debugMessage}`,
			context
		);
	static invalidOperation = (debugMessage: string, context?: unknown) =>
		new DripsError(
			DripsErrorCode.INVALID_OPERATION,
			`Code: ${DripsErrorCode.INVALID_OPERATION} - Message: ${debugMessage}`,
			context
		);
	static invalidArgument = (debugMessage: string, context?: unknown) =>
		new DripsError(
			DripsErrorCode.INVALID_ARGUMENT,
			`Code: ${DripsErrorCode.INVALID_ARGUMENT} - Message: ${debugMessage}`,
			context
		);
	static invalidAddress = (debugMessage: string, address?: string) =>
		new DripsError(
			DripsErrorCode.INVALID_ADDRESS,
			`Code: ${DripsErrorCode.INVALID_ADDRESS} - Message: ${debugMessage}`,
			address
		);
	static unknownError = (debugMessage: string, context?: unknown) =>
		new DripsError(
			DripsErrorCode.UNKNOWN_ERROR,
			`Code: ${DripsErrorCode.UNKNOWN_ERROR} - Message: ${debugMessage}`,
			context
		);
}
