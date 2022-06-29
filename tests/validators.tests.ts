import { assert } from 'chai';
import { Wallet } from 'ethers';
import { areValidDripsReceivers, areValidSplitsReceivers } from '../src/validators';

describe('validators', () => {
	describe('areValidDripsReceivers()', () => {
		it('should return false when receivers is empty', () => {
			// Arrange.
			assert.isFalse(
				// Act.
				areValidDripsReceivers([])
			);
		});

		it('should return false when at least one receiver is invalid', () => {
			// Arrange.
			assert.isFalse(
				// Act.
				areValidDripsReceivers([
					{ receiver: Wallet.createRandom().address, amtPerSec: 3 },
					{ receiver: 'invalid address', amtPerSec: 3 }
				])
			);
		});

		it('should return true when all receivers are valid', () => {
			// Arrange.
			assert.isTrue(
				// Act.
				areValidDripsReceivers([
					{ receiver: Wallet.createRandom().address, amtPerSec: 3 },
					{ receiver: Wallet.createRandom().address, amtPerSec: 3 }
				])
			);
		});
	});

	describe('areValidSplitsReceivers()', () => {
		it('should return false when receivers is empty', () => {
			// Arrange.
			assert.isFalse(
				// Act.
				areValidSplitsReceivers([])
			);
		});

		it('should return false when at least one receiver is invalid', () => {
			// Arrange.
			assert.isFalse(
				// Act.
				areValidSplitsReceivers([
					{ receiver: Wallet.createRandom().address, weight: 3 },
					{ receiver: 'invalid address', weight: 3 }
				])
			);
		});

		it('should return true when all receivers are valid', () => {
			// Arrange.
			assert.isTrue(
				// Act.
				areValidSplitsReceivers([
					{ receiver: Wallet.createRandom().address, weight: 3 },
					{ receiver: Wallet.createRandom().address, weight: 3 }
				])
			);
		});
	});
});
