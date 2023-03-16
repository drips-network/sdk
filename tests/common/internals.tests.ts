import { assert } from 'chai';
import sinon from 'ts-sinon';
import type { BytesLike } from 'ethers';
import { ethers } from 'ethers';
import * as internals from '../../src/common/internals';
import Utils from '../../src/utils';
import type { DripsReceiverStruct, SplitsReceiverStruct } from '../../src/common/types';
import { DripsErrorCode } from '../../src/common/DripsError';

describe('internals', () => {
	afterEach(() => {
		sinon.restore();
	});

	describe('safeDripsTx', () => {
		it('should return the expected tx', () => {
			// Act
			const tx = internals.safeDripsTx({ to: 'to', data: 'data' });

			// Assert
			assert.isTrue(tx.to === 'to');
			assert.isTrue(tx.data === 'data');
			assert.isTrue(tx.value!.toNumber() === 0);
		});
	});

	describe('keyFromString', () => {
		it('should return the expected result', () => {
			// Act
			const key = internals.keyFromString('key');

			// Assert
			assert.equal(key, ethers.utils.formatBytes32String('key'));
		});
	});

	describe('valueFromString', () => {
		it('should return the expected result', () => {
			// Act
			const value = internals.valueFromString('value');

			// Assert
			assert.equal(value, ethers.utils.hexlify(ethers.utils.toUtf8Bytes('value')));
		});
	});

	describe('createFromStrings', () => {
		it('should return the expected result', () => {
			// Act
			const metadata = internals.createFromStrings('key', 'value');

			// Assert
			assert.equal(metadata.key, internals.keyFromString('key'));
			assert.equal(metadata.value, internals.valueFromString('value'));
		});
	});

	describe('parseMetadataAsString', () => {
		it('should throw argumentError user metadata key is not a valid BytesLike object', async () => {
			// Arrange
			let threw = false;

			// Act
			try {
				internals.parseMetadataAsString({ key: undefined as unknown as string, value: 'value' });
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw argumentError user metadata value is not a valid BytesLike object', async () => {
			// Arrange
			let threw = false;

			// Act
			try {
				internals.parseMetadataAsString({ key: 'key', value: undefined as unknown as string });
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return the expected result', () => {
			// Act
			const key: BytesLike = internals.keyFromString('key');
			const value: BytesLike = internals.valueFromString('value');

			const metadata = internals.parseMetadataAsString({ key, value });

			// Assert
			assert.equal(metadata.key, 'key');
			assert.equal(metadata.value, 'value');
		});
	});

	describe('ensureSignerExists()', () => {
		it('throw a signerMissingError when the signer is missing', () => {
			// Arrange
			let threw = false;

			try {
				// Act
				internals.ensureSignerExists(undefined);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_SIGNER);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});
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

	describe('formatSplitReceivers', () => {
		it('should sort by the expected order when userID1>userID2', async () => {
			// Arrange
			const receivers: SplitsReceiverStruct[] = [
				{ userId: 100, weight: 1 },
				{ userId: 1, weight: 100 }
			];

			// Act
			const formattedReceivers = internals.formatSplitReceivers(receivers);

			// Assert
			assert.isTrue(formattedReceivers[0].userId < formattedReceivers[1].userId);
		});

		it('should sort by the expected order when userID1<userID2', async () => {
			// Arrange
			const receivers: SplitsReceiverStruct[] = [
				{ userId: 1, weight: 100 },
				{ userId: 100, weight: 1 }
			];

			// Act
			const formattedReceivers = internals.formatSplitReceivers(receivers);

			// Assert
			assert.isTrue(formattedReceivers[0].userId < formattedReceivers[1].userId);
		});

		it('should remove duplicates', async () => {
			// Arrange
			const receivers: SplitsReceiverStruct[] = [
				{ userId: 1, weight: 100 },
				{ userId: 1, weight: 100 },
				{ userId: 100, weight: 1 }
			];

			// Act
			const formattedReceivers = internals.formatSplitReceivers(receivers);

			// Assert
			assert.equal(formattedReceivers.length, 2);
		});
	});

	describe('formatSplitReceivers()', () => {
		it('should sort by the expected order when userID1>userID2', async () => {
			// Arrange
			const receivers: SplitsReceiverStruct[] = [
				{ userId: 100, weight: 1 },
				{ userId: 1, weight: 100 }
			];

			// Act
			const formattedReceivers = internals.formatSplitReceivers(receivers);

			// Assert
			assert.isTrue(formattedReceivers[0].userId < formattedReceivers[1].userId);
		});

		it('should sort by the expected order when userID1<userID2', async () => {
			// Arrange
			const receivers: SplitsReceiverStruct[] = [
				{ userId: 1, weight: 100 },
				{ userId: 100, weight: 1 }
			];

			// Act
			const formattedReceivers = internals.formatSplitReceivers(receivers);

			// Assert
			assert.isTrue(formattedReceivers[0].userId < formattedReceivers[1].userId);
		});

		it('should remove duplicates', async () => {
			// Arrange
			const receivers: SplitsReceiverStruct[] = [
				{ userId: 1, weight: 100 },
				{ userId: 1, weight: 100 },
				{ userId: 100, weight: 1 }
			];

			// Act
			const formattedReceivers = internals.formatSplitReceivers(receivers);

			// Assert
			assert.equal(formattedReceivers.length, 2);
		});
	});

	describe('formatDripsReceivers()', () => {
		it('should sort by the expected order when userID1=userID2 but config1<config2', async () => {
			// Arrange
			const receivers: DripsReceiverStruct[] = [
				{
					userId: 2,
					config: Utils.DripsReceiverConfiguration.toUint256({ dripId: 1n, amountPerSec: 1n, duration: 1n, start: 1n })
				},
				{
					userId: 2,
					config: Utils.DripsReceiverConfiguration.toUint256({
						dripId: 1n,
						amountPerSec: 1n,
						duration: 1n,
						start: 200n
					})
				}
			];

			// Act
			const formattedReceivers = internals.formatDripsReceivers(receivers);

			// Assert
			assert.isTrue(formattedReceivers[0].config < formattedReceivers[1].config);
		});

		it('should sort by the expected order when userID1=userID2 but config1>config2', async () => {
			// Arrange
			const receivers: DripsReceiverStruct[] = [
				{
					userId: 2,
					config: Utils.DripsReceiverConfiguration.toUint256({
						dripId: 1n,
						amountPerSec: 1n,
						duration: 1n,
						start: 200n
					})
				},
				{
					userId: 2,
					config: Utils.DripsReceiverConfiguration.toUint256({ dripId: 1n, amountPerSec: 1n, duration: 1n, start: 1n })
				}
			];

			// Act
			const formattedReceivers = internals.formatDripsReceivers(receivers);

			// Assert
			assert.isTrue(formattedReceivers[0].config < formattedReceivers[1].config);
		});

		it('should remove duplicates', async () => {
			// Arrange
			const receivers: DripsReceiverStruct[] = [
				{
					userId: 2,
					config: Utils.DripsReceiverConfiguration.toUint256({ dripId: 1n, amountPerSec: 1n, duration: 1n, start: 2n })
				},
				{
					userId: 2,
					config: Utils.DripsReceiverConfiguration.toUint256({ dripId: 1n, amountPerSec: 1n, duration: 1n, start: 1n })
				},
				{
					userId: 2,
					config: Utils.DripsReceiverConfiguration.toUint256({ dripId: 1n, amountPerSec: 1n, duration: 1n, start: 1n })
				},
				{
					userId: 2,
					config: Utils.DripsReceiverConfiguration.toUint256({ dripId: 1n, amountPerSec: 2n, duration: 1n, start: 1n })
				},
				{
					userId: 2,
					config: Utils.DripsReceiverConfiguration.toUint256({ dripId: 1n, amountPerSec: 2n, duration: 1n, start: 2n })
				},
				{
					userId: 2,
					config: Utils.DripsReceiverConfiguration.toUint256({ dripId: 1n, amountPerSec: 2n, duration: 1n, start: 2n })
				}
			];

			// Act
			const formattedReceivers = internals.formatDripsReceivers(receivers);

			// Assert
			assert.equal(formattedReceivers.length, 4);
		});

		it('should sort by the expected order when userID1>userID2', async () => {
			// Arrange
			const receivers: DripsReceiverStruct[] = [
				{
					userId: 100,
					config: Utils.DripsReceiverConfiguration.toUint256({
						dripId: 1n,
						amountPerSec: 100n,
						duration: 1n,
						start: 1n
					})
				},
				{
					userId: 1,
					config: Utils.DripsReceiverConfiguration.toUint256({
						dripId: 1n,
						amountPerSec: 1n,
						duration: 1n,
						start: 200n
					})
				}
			];

			// Act
			const formattedReceivers = internals.formatDripsReceivers(receivers);

			// Assert
			assert.isTrue(formattedReceivers[0].userId < formattedReceivers[1].userId);
		});

		it('should sort by the expected order when userID1<userID2', async () => {
			// Arrange
			const receivers: DripsReceiverStruct[] = [
				{
					userId: 1,
					config: Utils.DripsReceiverConfiguration.toUint256({
						dripId: 1n,
						amountPerSec: 1n,
						duration: 1n,
						start: 200n
					})
				},
				{
					userId: 100,
					config: Utils.DripsReceiverConfiguration.toUint256({
						dripId: 1n,
						amountPerSec: 100n,
						duration: 1n,
						start: 1n
					})
				}
			];

			// Act
			const formattedReceivers = internals.formatDripsReceivers(receivers);

			// Assert
			assert.isTrue(formattedReceivers[0].userId < formattedReceivers[1].userId);
		});
	});
});
