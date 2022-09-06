import { assert } from 'chai';
import type { BigNumberish } from 'ethers';
import { BigNumber } from 'ethers';
import sinon from 'ts-sinon';
import type { DripsReceiverStruct, SplitsReceiverStruct } from '../../contracts/AddressApp';
import * as addressAppValidators from '../../src/AddressApp/addressAppValidators';
import { DripsErrorCode } from '../../src/common/DripsError';
import Utils from '../../src/utils';
import * as internals from '../../src/common/internals';

describe('addressAppClientValidators', () => {
	afterEach(() => {
		sinon.restore();
	});

	describe('validateDripsReceivers()', () => {
		it('should throw argumentMissingError when receivers are missing', () => {
			// Arrange
			let threw = false;

			try {
				// Act
				addressAppValidators.validateDripsReceivers(undefined as unknown as DripsReceiverStruct[]);
			} catch (error) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw argumentError error when receivers are more than the max allowed', async () => {
			// Arrange
			let threw = false;
			const receivers: DripsReceiverStruct[] = Array(101).fill({
				userId: undefined as unknown as number,
				config: Utils.DripsReceiverConfiguration.toUint256({ amountPerSec: 1, duration: 1, start: 1 })
			});

			try {
				// Act
				addressAppValidators.validateDripsReceivers(receivers);
			} catch (error) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw dripsReceiverError when receiver userId is missing', () => {
			// Arrange
			let threw = false;
			const receivers: DripsReceiverStruct[] = [
				{
					config: 123,
					userId: undefined as unknown as string
				}
			];

			try {
				// Act
				addressAppValidators.validateDripsReceivers(receivers);
			} catch (error) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_DRIPS_RECEIVER);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw dripsReceiverError when receiver config is missing', () => {
			// Arrange
			let threw = false;
			const receivers: DripsReceiverStruct[] = [
				{
					userId: '123',
					config: undefined as unknown as BigNumberish
				}
			];

			try {
				// Act
				addressAppValidators.validateDripsReceivers(receivers);
			} catch (error) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_DRIPS_RECEIVER);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it("should validate receivers' configs", () => {
			// Arrange
			const receivers: DripsReceiverStruct[] = [
				{
					userId: '123',
					config: 123
				}
			];

			const validateDripsReceiverConfigBNStub = sinon.stub(internals, 'validateDripsReceiverConfigBN');

			// Act
			addressAppValidators.validateDripsReceivers(receivers);

			// Assert
			assert(
				validateDripsReceiverConfigBNStub.calledWithExactly(receivers[0].config),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('validateSplitsReceivers()', () => {
		it('should throw argumentMissingError when receivers are missing', () => {
			// Arrange
			let threw = false;

			try {
				// Act
				addressAppValidators.validateSplitsReceivers(undefined as unknown as SplitsReceiverStruct[]);
			} catch (error) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw argumentError error when receivers are more than the max allowed', async () => {
			// Arrange
			let threw = false;
			const receivers: SplitsReceiverStruct[] = Array(201).fill({
				userId: undefined as unknown as number,
				weight: 1
			});

			try {
				// Act
				addressAppValidators.validateSplitsReceivers(receivers);
			} catch (error) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw splitsReceiverError when receiver userId is missing', () => {
			// Arrange
			let threw = false;
			const receivers: SplitsReceiverStruct[] = [
				{
					userId: 123,
					weight: undefined as unknown as BigNumberish
				}
			];

			try {
				// Act
				addressAppValidators.validateSplitsReceivers(receivers);
			} catch (error) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_SPLITS_RECEIVER);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw splitsReceiverError when receiver weight is missing', () => {
			// Arrange
			let threw = false;
			const receivers: SplitsReceiverStruct[] = [
				{
					userId: '123',
					weight: undefined as unknown as BigNumberish
				}
			];

			try {
				// Act
				addressAppValidators.validateSplitsReceivers(receivers);
			} catch (error) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_SPLITS_RECEIVER);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw splitsReceiverError when receiver weight is equal to 0', () => {
			// Arrange
			let threw = false;
			const receivers: SplitsReceiverStruct[] = [
				{
					userId: '123',
					weight: 0
				}
			];

			try {
				// Act
				addressAppValidators.validateSplitsReceivers(receivers);
			} catch (error) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_SPLITS_RECEIVER);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw splitsReceiverError when receiver weight is less than 0', () => {
			// Arrange
			let threw = false;
			const receivers: SplitsReceiverStruct[] = [
				{
					userId: '123',
					weight: -1
				}
			];

			try {
				// Act
				addressAppValidators.validateSplitsReceivers(receivers);
			} catch (error) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_SPLITS_RECEIVER);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});
	});
});
