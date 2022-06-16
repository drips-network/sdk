import { assert } from 'chai';
import { DripsErrorCode, DripsErrors } from '../src/errors';

describe('DripsErrors', () => {
	it('should have unique error codes', () => {
		// Arrange.
		const methods = Object.keys(DripsErrors);
		const getErrorCode = (methodName: string): DripsErrorCode => DripsErrors[methodName]().code;
		const uniqueCodes = [...new Set(Object.keys(DripsErrors).map((error) => getErrorCode(error)))];

		// Assert.
		assert.equal(uniqueCodes.length, methods.length);
	});

	describe('signerNotFound()', () => {
		it('should return SIGNER_NOT_FOUND error code', () => {
			// Act.
			const { code } = DripsErrors.signerNotFound('');

			// Assert.
			assert.equal(code, DripsErrorCode.SIGNER_NOT_FOUND);
		});
	});

	describe('connectionFailed()', () => {
		it('should return CONNECTION_FAILED error code', () => {
			// Act.
			const { code } = DripsErrors.connectionFailed('');

			// Assert.
			assert.equal(code, DripsErrorCode.CONNECTION_FAILED);
		});
	});

	describe('providerNotFound()', () => {
		it('should return PROVIDER_NOT_FOUND error code', () => {
			// Act.
			const { code } = DripsErrors.providerNotFound('');

			// Assert.
			assert.equal(code, DripsErrorCode.PROVIDER_NOT_FOUND);
		});
	});

	describe('addressNotValid()', () => {
		it('should return ADDRESS_NOT_VALID error code', () => {
			// Act.
			const { code } = DripsErrors.addressNotValid('');

			// Assert.
			assert.equal(code, DripsErrorCode.ADDRESS_NOT_VALID);
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
});
