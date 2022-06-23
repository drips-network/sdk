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

	describe('addressNotValid()', () => {
		it('should return expected error details', () => {
			// Act.
			const { code, message } = DripsErrors.invalidAddress('');

			// Assert.
			assert.equal(code, DripsErrorCode.INVALID_ADDRESS);
			assert.isTrue(message.includes(DripsErrorCode.INVALID_ADDRESS));
		});
	});

	describe('invalidConfiguration()', () => {
		it('should return expected error details', () => {
			// Act.
			const { code, message } = DripsErrors.invalidConfiguration('');

			// Assert.
			assert.equal(code, DripsErrorCode.INVALID_CONFIGURATION);
			assert.isTrue(message.includes(DripsErrorCode.INVALID_CONFIGURATION));
		});
	});

	describe('unknownError()', () => {
		it('should return expected error details', () => {
			// Act.
			const { code, message } = DripsErrors.unknownError('');

			// Assert.
			assert.equal(code, DripsErrorCode.UNKNOWN_ERROR);
			assert.isTrue(message.includes(DripsErrorCode.UNKNOWN_ERROR));
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
});
