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

	describe('connectionFailed()', () => {
		it('should return CONNECTION_FAILED error code', () => {
			// Act.
			const { code } = DripsErrors.connectionFailed('');

			// Assert.
			assert.equal(code, DripsErrorCode.CONNECTION_FAILED);
		});
	});

	describe('addressNotValid()', () => {
		it('should return ADDRESS_NOT_VALID error code', () => {
			// Act.
			const { code } = DripsErrors.invalidAddress('');

			// Assert.
			assert.equal(code, DripsErrorCode.INVALID_ADDRESS);
		});
	});

	describe('unknownClientError()', () => {
		it('should return UNKNOWN_CLIENT_ERROR error code', () => {
			// Act.
			const { code } = DripsErrors.unknownClientError('');

			// Assert.
			assert.equal(code, DripsErrorCode.UNKNOWN_CLIENT_ERROR);
		});
	});

	describe('invalidOperation()', () => {
		it('should return INVALID_OPERATION error code', () => {
			// Act.
			const { code } = DripsErrors.invalidOperation('');

			// Assert.
			assert.equal(code, DripsErrorCode.INVALID_OPERATION);
		});
	});
});
