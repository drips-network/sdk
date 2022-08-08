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
			const { code } = DripsErrors.invalidAddress('');

			// Assert.
			assert.equal(code, DripsErrorCode.INVALID_ADDRESS);
		});
	});

	describe('invalidOperation()', () => {
		it('should return expected error details', () => {
			// Act.
			const { code } = DripsErrors.invalidOperation('');

			// Assert.
			assert.equal(code, DripsErrorCode.INVALID_OPERATION);
		});
	});

	describe('invalidArgument()', () => {
		it('should return expected error details', () => {
			// Act.
			const { code } = DripsErrors.invalidArgument('');

			// Assert.
			assert.equal(code, DripsErrorCode.INVALID_ARGUMENT);
		});
	});

	describe('subgraphQueryFailed()', () => {
		it('should return expected error details', () => {
			// Act.
			const { code } = DripsErrors.userNotFound('');

			// Assert.
			assert.equal(code, DripsErrorCode.USER_NOT_FOUND);
		});
	});
});
