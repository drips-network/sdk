/* eslint-disable max-classes-per-file */

export enum DripsErrorCode {
	INVALID_ADDRESS = 'INVALID_ADDRESS',
	INVALID_ARGUMENT = 'INVALID_ARGUMENT',
	INVALID_OPERATION = 'INVALID_OPERATION',
	SUBGRAPH_QUERY_FAILED = 'SUBGRAPH_QUERY_FAILED'
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
	static subgraphQueryFailed = (message: string, context?: unknown) =>
		new DripsError(
			DripsErrorCode.SUBGRAPH_QUERY_FAILED,
			`Code: ${DripsErrorCode.SUBGRAPH_QUERY_FAILED} - Message: ${message}`,
			context
		);
}
