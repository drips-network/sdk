import { assert } from 'chai';
import sinon from 'ts-sinon';
import * as internals from '../../src/common/internals';
import Utils from '../../src/utils';
import type { StreamReceiverStruct, SplitsReceiverStruct } from '../../src/common/types';
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
				{ accountId: 100, weight: 1 },
				{ accountId: 1, weight: 100 }
			];

			// Act
			const formattedReceivers = internals.formatSplitReceivers(receivers);

			// Assert
			assert.isTrue(formattedReceivers[0].accountId < formattedReceivers[1].accountId);
		});

		it('should sort by the expected order when userID1<userID2', async () => {
			// Arrange
			const receivers: SplitsReceiverStruct[] = [
				{ accountId: 1, weight: 100 },
				{ accountId: 100, weight: 1 }
			];

			// Act
			const formattedReceivers = internals.formatSplitReceivers(receivers);

			// Assert
			assert.isTrue(formattedReceivers[0].accountId < formattedReceivers[1].accountId);
		});

		it('should remove duplicates', async () => {
			// Arrange
			const receivers: SplitsReceiverStruct[] = [
				{ accountId: 1, weight: 100 },
				{ accountId: 1, weight: 100 },
				{ accountId: 100, weight: 1 }
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
				{ accountId: 100, weight: 1 },
				{ accountId: 1, weight: 100 }
			];

			// Act
			const formattedReceivers = internals.formatSplitReceivers(receivers);

			// Assert
			assert.isTrue(formattedReceivers[0].accountId < formattedReceivers[1].accountId);
		});

		it('should sort by the expected order when userID1<userID2', async () => {
			// Arrange
			const receivers: SplitsReceiverStruct[] = [
				{ accountId: 1, weight: 100 },
				{ accountId: 100, weight: 1 }
			];

			// Act
			const formattedReceivers = internals.formatSplitReceivers(receivers);

			// Assert
			assert.isTrue(formattedReceivers[0].accountId < formattedReceivers[1].accountId);
		});

		it('should remove duplicates', async () => {
			// Arrange
			const receivers: SplitsReceiverStruct[] = [
				{ accountId: 1, weight: 100 },
				{ accountId: 1, weight: 100 },
				{ accountId: 100, weight: 1 }
			];

			// Act
			const formattedReceivers = internals.formatSplitReceivers(receivers);

			// Assert
			assert.equal(formattedReceivers.length, 2);
		});
	});

	describe('formatStreamReceivers()', () => {
		it('should sort by the expected order when userID1=userID2 but config1<config2', async () => {
			// Arrange
			const receivers: StreamReceiverStruct[] = [
				{
					accountId: 2,
					config: Utils.StreamConfiguration.toUint256({ dripId: 1n, amountPerSec: 1n, duration: 1n, start: 1n })
				},
				{
					accountId: 2,
					config: Utils.StreamConfiguration.toUint256({
						dripId: 1n,
						amountPerSec: 1n,
						duration: 1n,
						start: 200n
					})
				}
			];

			// Act
			const formattedReceivers = internals.formatStreamReceivers(receivers);

			// Assert
			assert.isTrue(formattedReceivers[0].config < formattedReceivers[1].config);
		});

		it('should sort by the expected order when userID1=userID2 but config1>config2', async () => {
			// Arrange
			const receivers: StreamReceiverStruct[] = [
				{
					accountId: 2,
					config: Utils.StreamConfiguration.toUint256({
						dripId: 1n,
						amountPerSec: 1n,
						duration: 1n,
						start: 200n
					})
				},
				{
					accountId: 2,
					config: Utils.StreamConfiguration.toUint256({ dripId: 1n, amountPerSec: 1n, duration: 1n, start: 1n })
				}
			];

			// Act
			const formattedReceivers = internals.formatStreamReceivers(receivers);

			// Assert
			assert.isTrue(formattedReceivers[0].config < formattedReceivers[1].config);
		});

		it('should remove duplicates', async () => {
			// Arrange
			const receivers: StreamReceiverStruct[] = [
				{
					accountId: 2,
					config: Utils.StreamConfiguration.toUint256({ dripId: 1n, amountPerSec: 1n, duration: 1n, start: 2n })
				},
				{
					accountId: 2,
					config: Utils.StreamConfiguration.toUint256({ dripId: 1n, amountPerSec: 1n, duration: 1n, start: 1n })
				},
				{
					accountId: 2,
					config: Utils.StreamConfiguration.toUint256({ dripId: 1n, amountPerSec: 1n, duration: 1n, start: 1n })
				},
				{
					accountId: 2,
					config: Utils.StreamConfiguration.toUint256({ dripId: 1n, amountPerSec: 2n, duration: 1n, start: 1n })
				},
				{
					accountId: 2,
					config: Utils.StreamConfiguration.toUint256({ dripId: 1n, amountPerSec: 2n, duration: 1n, start: 2n })
				},
				{
					accountId: 2,
					config: Utils.StreamConfiguration.toUint256({ dripId: 1n, amountPerSec: 2n, duration: 1n, start: 2n })
				}
			];

			// Act
			const formattedReceivers = internals.formatStreamReceivers(receivers);

			// Assert
			assert.equal(formattedReceivers.length, 4);
		});

		it('should sort by the expected order when userID1>userID2', async () => {
			// Arrange
			const receivers: StreamReceiverStruct[] = [
				{
					accountId: 100,
					config: Utils.StreamConfiguration.toUint256({
						dripId: 1n,
						amountPerSec: 100n,
						duration: 1n,
						start: 1n
					})
				},
				{
					accountId: 1,
					config: Utils.StreamConfiguration.toUint256({
						dripId: 1n,
						amountPerSec: 1n,
						duration: 1n,
						start: 200n
					})
				}
			];

			// Act
			const formattedReceivers = internals.formatStreamReceivers(receivers);

			// Assert
			assert.isTrue(formattedReceivers[0].accountId < formattedReceivers[1].accountId);
		});

		it('should sort by the expected order when userID1<userID2', async () => {
			// Arrange
			const receivers: StreamReceiverStruct[] = [
				{
					accountId: 1,
					config: Utils.StreamConfiguration.toUint256({
						dripId: 1n,
						amountPerSec: 1n,
						duration: 1n,
						start: 200n
					})
				},
				{
					accountId: 100,
					config: Utils.StreamConfiguration.toUint256({
						dripId: 1n,
						amountPerSec: 100n,
						duration: 1n,
						start: 1n
					})
				}
			];

			// Act
			const formattedReceivers = internals.formatStreamReceivers(receivers);

			// Assert
			assert.isTrue(formattedReceivers[0].accountId < formattedReceivers[1].accountId);
		});
	});
});
