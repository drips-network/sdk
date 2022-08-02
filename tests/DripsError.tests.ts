import { assert } from 'chai';
import { DripsErrorCode, DripsErrors } from '../src/DripsError';

describe('DripsErrors', () => {
	it('should have unique error codes', () => {
		// Arrange.
		const methods = Object.keys(DripsErrors);
		const getErrorCode = (methodName: string): DripsErrorCode => DripsErrors[methodName]().code;
		const uniqueCodes = [...new Set(Object.keys(DripsErrors).map((error) => getErrorCode(error)))];

		// Assert.
		assert.equal(uniqueCodes.length, methods.length);
	});

	describe('invalidAddress()', () => {
		it('should return expected error details', () => {
			// Act.
			const { code, message } = DripsErrors.invalidAddress('');

			// Assert.
			assert.equal(code, DripsErrorCode.INVALID_ADDRESS);
			assert.isTrue(message.includes(DripsErrorCode.INVALID_ADDRESS));
		});
	});

	describe('invalidOperation()', () => {
		it('should return expected error details', () => {
			// Act.
			const { code, message } = DripsErrors.invalidOperation('');

			// Assert.
			assert.equal(code, DripsErrorCode.INVALID_OPERATION);
			assert.isTrue(message.includes(DripsErrorCode.INVALID_OPERATION));
		});
	});

	describe('invalidArgument()', () => {
		it('should return expected error details', () => {
			// Act.
			const { code, message } = DripsErrors.invalidArgument('');

			// Assert.
			assert.equal(code, DripsErrorCode.INVALID_ARGUMENT);
			assert.isTrue(message.includes(DripsErrorCode.INVALID_ARGUMENT));
		});
	});

	describe('subgraphQueryFailed()', () => {
		it('should return expected error details', () => {
			// Act.
			const { code, message } = DripsErrors.subgraphQueryFailed('');

			// Assert.
			assert.equal(code, DripsErrorCode.SUBGRAPH_QUERY_FAILED);
			assert.isTrue(message.includes(DripsErrorCode.SUBGRAPH_QUERY_FAILED));
		});
	});
});
