/* eslint-disable max-classes-per-file */

export enum DripsErrorCode {
	HTTP_ERROR = 'HTTP_ERROR',
	INVALID_ADDRESS = 'INVALID_ADDRESS',
	INVALID_ARGUMENT = 'INVALID_ARGUMENT',
	INVALID_OPERATION = 'INVALID_OPERATION',
	CONTRACT_CALL_FAILED = 'CONTRACT_CALL_FAILED',
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
	static invalidConfiguration = (message: string, context?: unknown) =>
		new DripsError(
			DripsErrorCode.INVALID_CONFIGURATION,
			`Code: ${DripsErrorCode.INVALID_CONFIGURATION} - Message: ${message}`,
			context
		);
	static invalidOperation = (message: string, context?: unknown) =>
		new DripsError(
			DripsErrorCode.INVALID_OPERATION,
			`Code: ${DripsErrorCode.INVALID_OPERATION} - Message: ${message}`,
			context
		);
	static invalidArgument = (message: string, context?: unknown) =>
		new DripsError(
			DripsErrorCode.INVALID_ARGUMENT,
			`Code: ${DripsErrorCode.INVALID_ARGUMENT} - Message: ${message}`,
			context
		);
	static invalidAddress = (message: string, address?: string) =>
		new DripsError(
			DripsErrorCode.INVALID_ADDRESS,
			`Code: ${DripsErrorCode.INVALID_ADDRESS} - Message: ${message}`,
			address
		);
	static httpError = (message: string, context?: unknown) =>
		new DripsError(DripsErrorCode.HTTP_ERROR, `Code: ${DripsErrorCode.HTTP_ERROR} - Message: ${message}`, context);
	static contractCallFailed = (promiseError?: unknown) =>
		new DripsError(
			DripsErrorCode.CONTRACT_CALL_FAILED,
			`Code: ${DripsErrorCode.CONTRACT_CALL_FAILED} - Error: ${JSON.stringify(promiseError)}`,
			context
		);
}
