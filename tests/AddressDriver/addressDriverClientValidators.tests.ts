import { assert } from 'chai';
import type { BigNumberish } from 'ethers';
import sinon from 'ts-sinon';
import type { DripsReceiverStruct, SplitsReceiverStruct } from '../../contracts/AddressDriver';
import * as addressDriverValidators from '../../src/AddressDriver/addressDriverValidators';
import { DripsErrorCode } from '../../src/common/DripsError';
import Utils from '../../src/utils';
import * as internals from '../../src/common/internals';

describe('addressDriverClientValidators', () => {
	afterEach(() => {
		sinon.restore();
	});

	describe('validateDripsReceivers()', () => {
		it('should throw argumentMissingError when receivers are missing', () => {
			// Arrange
			let threw = false;

			try {
				// Act
				addressDriverValidators.validateDripsReceivers(undefined as unknown as DripsReceiverStruct[]);
			} catch (error: any) {
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
				config: Utils.DripsReceiverConfiguration.toUint256String({ amountPerSec: 1, duration: 1, start: 1 })
			});

			try {
				// Act
				addressDriverValidators.validateDripsReceivers(receivers);
			} catch (error: any) {
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
				addressDriverValidators.validateDripsReceivers(receivers);
			} catch (error: any) {
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
				addressDriverValidators.validateDripsReceivers(receivers);
			} catch (error: any) {
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

			const validateDripsReceiverConfigObjStub = sinon.stub(internals, 'validateDripsReceiverConfigObj');

			// Act
			addressDriverValidators.validateDripsReceivers(receivers);

			// Assert
			assert(
				validateDripsReceiverConfigObjStub.calledWithExactly(
					Utils.DripsReceiverConfiguration.fromUint256(receivers[0].config)
				),
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
				addressDriverValidators.validateSplitsReceivers(undefined as unknown as SplitsReceiverStruct[]);
			} catch (error: any) {
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
				addressDriverValidators.validateSplitsReceivers(receivers);
			} catch (error: any) {
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
					weight: 123,
					userId: undefined as unknown as string
				}
			];

			try {
				// Act
				addressDriverValidators.validateSplitsReceivers(receivers);
			} catch (error: any) {
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
				addressDriverValidators.validateSplitsReceivers(receivers);
			} catch (error: any) {
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
				addressDriverValidators.validateSplitsReceivers(receivers);
			} catch (error: any) {
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
				addressDriverValidators.validateSplitsReceivers(receivers);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_SPLITS_RECEIVER);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});
	});
});
