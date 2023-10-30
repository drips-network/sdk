import { assert } from 'chai';
import type { ContractReceipt } from 'ethers';
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

	describe('initializationError()', () => {
		it('should return expected error details', () => {
			// Arrange
			const expectedMessage = 'Error';

			// Act
			const { code, message } = DripsErrors.initializationError(expectedMessage);

			// Assert
			assert.equal(message, expectedMessage);
			assert.equal(code, DripsErrorCode.INITIALIZATION_FAILURE);
		});
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

	describe('streamsReceiverError()', () => {
		it('should return expected error details', () => {
			// Act
			const expectedMessage = 'Error';
			const expectedInvalidPropertyValue = 'Value';
			const expectedInvalidPropertyName = 'Property';

			// Act
			const { code, message, context } = DripsErrors.streamsReceiverError(
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

	describe('streamsReceiverError()', () => {
		it('should return expected error details', () => {
			// Act
			const eventName = 'Event';
			const expectedMessage = 'Error';
			const txReceipt = {} as ContractReceipt;

			// Act
			const { code, message, context } = DripsErrors.txEventNotFound(expectedMessage, eventName, txReceipt);

			// Assert
			assert.equal(message, expectedMessage);
			assert.equal((context as any).txReceipt, txReceipt);
			assert.equal((context as any).eventName, eventName);
			assert.equal(code, DripsErrorCode.TX_EVENT_NOT_FOUND);
		});
	});

	describe('subgraphQueryError()', () => {
		it('should return expected error details', () => {
			// Act
			const expectedMessage = 'Error';

			// Act
			const { code, message } = DripsErrors.subgraphQueryError(expectedMessage);

			// Assert
			assert.equal(message, expectedMessage);
			assert.equal(code, DripsErrorCode.SUBGRAPH_QUERY_ERROR);
		});
	});

	describe('streamConfigError()', () => {
		it('should return expected error details', () => {
			// Act
			const expectedMessage = 'Error';
			const expectedInvalidPropertyValue = 'Value';
			const expectedInvalidPropertyName = 'Property';

			// Act
			const { code, message, context } = DripsErrors.streamConfigError(
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
