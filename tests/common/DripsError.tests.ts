import { assert } from 'chai';
import { DripsErrorCode, DripsErrors } from '../../src/common/DripsError';

describe('DripsErrors', () => {
	it('should have unique error codes', () => {
		// Arrange
		const methods = Object.keys(DripsErrors);
		const getErrorCode = (methodName: string): DripsErrorCode => {
			const method = DripsErrors[methodName as keyof typeof DripsErrors] as any;
			return method().code;
		};
		const uniqueCodes = [...new Set(Object.keys(DripsErrors).map((error) => getErrorCode(error)))];

		// Assert
		assert.equal(uniqueCodes.length, methods.length);
	});

	describe('addressError()', () => {
		it('should return expected error details', () => {
			// Arrange
			const expectedMessage = 'Error';
			const expectedAddress = 'Address';

			// Act
			const { code, message, context } = DripsErrors.addressError(expectedMessage, expectedAddress);

			// Assert
			assert.equal(message, expectedMessage);
			assert.equal(code, DripsErrorCode.INVALID_ADDRESS);
			assert.equal((context as any).invalidAddress, expectedAddress);
		});
	});

	describe('signerMissingError()', () => {
		it('should return expected error details', () => {
			// Arrange
			const expectedMessage = 'Error';

			// Act
			const { code, message } = DripsErrors.signerMissingError(expectedMessage);

			// Assert
			assert.equal(message, expectedMessage);
			assert.equal(code, DripsErrorCode.MISSING_SIGNER);
		});
	});

	describe('argumentMissingError()', () => {
		it('should return expected error details', () => {
			// Arrange
			const expectedMessage = 'Error';
			const expectedArgName = 'Argument';

			// Act
			const { code, message, context } = DripsErrors.argumentMissingError(expectedMessage, expectedArgName);

			// Assert
			assert.equal(message, expectedMessage);
			assert.equal(code, DripsErrorCode.MISSING_ARGUMENT);
			assert.equal((context as any).missingArgumentName, expectedArgName);
		});
	});

	describe('unsupportedNetworkError()', () => {
		it('should return expected error details', () => {
			// Arrange
			const expectedChainId = 100;
			const expectedMessage = 'Error';

			// Act
			const { code, message, context } = DripsErrors.unsupportedNetworkError(expectedMessage, expectedChainId);

			// Assert
			assert.equal(message, expectedMessage);
			assert.equal(code, DripsErrorCode.UNSUPPORTED_NETWORK);
			assert.equal((context as any).unsupportedChainId, expectedChainId);
		});
	});

	describe('argumentError()', () => {
		it('should return expected error details', () => {
			// Arrange
			const expectedArgName = 'Arg';
			const expectedMessage = 'Error';
			const expectedArgValue = 'Value';

			// Act
			const { code, message, context } = DripsErrors.argumentError(expectedMessage, expectedArgName, expectedArgValue);

			// Assert
			assert.equal(message, expectedMessage);
			assert.equal(code, DripsErrorCode.INVALID_ARGUMENT);
			assert.equal((context as any).invalidArgument.name, expectedArgName);
			assert.equal((context as any).invalidArgument.value, expectedArgValue);
		});
	});

	describe('splitsReceiverError()', () => {
		it('should return expected error details', () => {
			// Act
			const expectedMessage = 'Error';
			const expectedInvalidPropertyValue = 'Value';
			const expectedInvalidPropertyName = 'Property';

			// Act
			const { code, message, context } = DripsErrors.splitsReceiverError(
				expectedMessage,
				expectedInvalidPropertyName,
				expectedInvalidPropertyValue
			);

			// Assert
			assert.equal(message, expectedMessage);
			assert.equal(code, DripsErrorCode.INVALID_SPLITS_RECEIVER);
			assert.equal((context as any).invalidProperty.name, expectedInvalidPropertyName);
			assert.equal((context as any).invalidProperty.value, expectedInvalidPropertyValue);
		});
	});

	describe('dripsReceiverError()', () => {
		it('should return expected error details', () => {
			// Act
			const expectedMessage = 'Error';
			const expectedInvalidPropertyValue = 'Value';
			const expectedInvalidPropertyName = 'Property';

			// Act
			const { code, message, context } = DripsErrors.dripsReceiverError(
				expectedMessage,
				expectedInvalidPropertyName,
				expectedInvalidPropertyValue
			);

			// Assert
			assert.equal(message, expectedMessage);
			assert.equal(code, DripsErrorCode.INVALID_DRIPS_RECEIVER);
			assert.equal((context as any).invalidProperty.name, expectedInvalidPropertyName);
			assert.equal((context as any).invalidProperty.value, expectedInvalidPropertyValue);
		});
	});

	describe('subgraphQueryError()', () => {
		it('should return expected error details', () => {
			// Act
			const expectedMessage = 'Error';

			// Act
			const { code, message, context } = DripsErrors.subgraphQueryError(expectedMessage);

			// Assert
			assert.isUndefined(context);
			assert.equal(message, expectedMessage);
			assert.equal(code, DripsErrorCode.SUBGRAPH_QUERY_ERROR);
		});
	});

	describe('dripsReceiverConfigError()', () => {
		it('should return expected error details', () => {
			// Act
			const expectedMessage = 'Error';
			const expectedInvalidPropertyValue = 'Value';
			const expectedInvalidPropertyName = 'Property';

			// Act
			const { code, message, context } = DripsErrors.dripsReceiverConfigError(
				expectedMessage,
				expectedInvalidPropertyName,
				expectedInvalidPropertyValue
			);

			// Assert
			assert.equal(message, expectedMessage);
			assert.equal(code, DripsErrorCode.INVALID_DRIPS_RECEIVER_CONFIG);
			assert.equal((context as any).invalidProperty.name, expectedInvalidPropertyName);
			assert.equal((context as any).invalidProperty.value, expectedInvalidPropertyValue);
		});
	});
});
