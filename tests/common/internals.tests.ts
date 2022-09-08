import { assert } from 'chai';
import type { BigNumberish } from 'ethers';
import { Wallet } from 'ethers';
import sinon from 'ts-sinon';
import * as internals from '../../src/common/internals';
import { DripsErrorCode } from '../../src/common/DripsError';
import type { DripsReceiverConfig } from '../../src/common/types';

describe('internals', () => {
	afterEach(() => {
		sinon.restore();
	});

	describe('nameOf()', () => {
		it('should return the expected result', () => {
			// Arrange
			const test1 = 1234;
			const test2 = '1234';
			const test3 = false;
			const test4 = { inner: [] };

			// Assert
			assert.equal(
				// Act
				internals.nameOf({ test1 }),
				'test1'
			);
			// Assert
			assert.equal(
				// Act
				internals.nameOf({ test2 }),
				'test2'
			);
			// Assert
			assert.equal(
				// Act
				internals.nameOf({ test3 }),
				'test3'
			);
			// Assert
			assert.equal(
				// Act
				internals.nameOf({ test4 }),
				'test4'
			);
		});
	});

	describe('isNullOrUndefined', () => {
		it('should return true when input is null', () => {
			// Assert
			assert.isTrue(
				// Act
				internals.isNullOrUndefined(null)
			);
		});

		it('should return true when input is undefined', () => {
			// Assert
			assert.isTrue(
				// Act
				internals.isNullOrUndefined(undefined)
			);
		});
	});

	describe('toBN()', () => {
		it('should return the expected result', async () => {
			// Arrange
			const num1 = 123;
			const num2 = '123';
			const num3 = await Wallet.createRandom().getAddress();

			// Act
			const bn1 = internals.toBN(num1);
			const bn2 = internals.toBN(num2);
			const bn3 = internals.toBN(num3);

			// Assert
			assert(bn1.eq(internals.toBN(num1)), `Expected big number to be ${bn1} but was ${internals.toBN(num1)}`);
			assert(bn2.eq(internals.toBN(num2)), `Expected big number to be ${bn2} but was ${internals.toBN(num2)}`);
			assert(bn3.eq(internals.toBN(num3)), `Expected big number to be ${bn3} but was ${internals.toBN(num3)}`);
		});
	});

	describe('validateAddress()', () => {
		it('should throw addressError error when the input is null', () => {
			// Arrange
			let threw = false;

			// Act
			try {
				// Act
				internals.validateAddress(null as unknown as string);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ADDRESS);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw addressError error when the input is undefined', () => {
			// Arrange
			let threw = false;

			// Act
			try {
				// Act
				internals.validateAddress(undefined as unknown as string);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ADDRESS);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw addressError error when the address is not valid', () => {
			// Arrange
			let threw = false;
			const address = 'invalid address';

			// Act
			try {
				// Act
				internals.validateAddress(address);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ADDRESS);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});
	});

	describe('validateDripsReceiverConfigBN()', () => {
		it('should throw argumentMissingError when config is missing', () => {
			// Arrange
			let threw = false;

			// Act
			try {
				internals.validateDripsReceiverConfigBN(undefined as unknown as BigNumberish);
			} catch (error: any) {
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw dripsReceiverError when drips receiver configuration is equal to 0', () => {
			// Arrange
			let threw = false;

			// Act
			try {
				internals.validateDripsReceiverConfigBN(0);
			} catch (error: any) {
				assert.equal(error.code, DripsErrorCode.INVALID_DRIPS_RECEIVER);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw dripsReceiverError when drips receiver configuration is less than 0', () => {
			// Arrange
			let threw = false;

			// Act
			try {
				internals.validateDripsReceiverConfigBN(-1);
			} catch (error: any) {
				assert.equal(error.code, DripsErrorCode.INVALID_DRIPS_RECEIVER);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});
	});

	describe('validateDripsReceiverConfigObj()', () => {
		it('should throw argumentMissingError when config is missing', () => {
			// Arrange
			let threw = false;

			// Act
			try {
				internals.validateDripsReceiverConfigObj(undefined as unknown as DripsReceiverConfig);
			} catch (error: any) {
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw dripsReceiverError when drips receiver configuration start is less than 0', () => {
			// Arrange
			let threw = false;

			// Act
			try {
				internals.validateDripsReceiverConfigObj({ start: -1, duration: 1, amountPerSec: 1 });
			} catch (error: any) {
				assert.equal(error.code, DripsErrorCode.INVALID_DRIPS_RECEIVER);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw dripsReceiverError when drips receiver configuration duration is less than 0', () => {
			// Arrange
			let threw = false;

			// Act
			try {
				internals.validateDripsReceiverConfigObj({ start: 1, duration: -1, amountPerSec: 1 });
			} catch (error: any) {
				assert.equal(error.code, DripsErrorCode.INVALID_DRIPS_RECEIVER);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw dripsReceiverError when drips receiver configuration amountPerSec is equal to 0', () => {
			// Arrange
			let threw = false;

			// Act
			try {
				internals.validateDripsReceiverConfigObj({ start: 1, duration: 1, amountPerSec: 0 });
			} catch (error: any) {
				assert.equal(error.code, DripsErrorCode.INVALID_DRIPS_RECEIVER);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw dripsReceiverError when drips receiver configuration amountPerSec is less than 0', () => {
			// Arrange
			let threw = false;

			// Act
			try {
				internals.validateDripsReceiverConfigObj({ start: 1, duration: 1, amountPerSec: -1 });
			} catch (error: any) {
				assert.equal(error.code, DripsErrorCode.INVALID_DRIPS_RECEIVER);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});
	});
});
