import { assert } from 'chai';
import { BigNumber } from 'ethers';
import { DripsErrorCode } from '../src/DripsError';
import DripsReceiverConfig from '../src/DripsReceiverConfig';

describe('DripsReceiverConfig', () => {
	describe('create()', () => {
		it('should throw invalidArgument error when the amountPerSec is 0', () => {
			// Arrange.
			let threw = false;

			try {
				// Act.
				DripsReceiverConfig.create(0, 1, 2);
			} catch (error) {
				// Assert.
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert.
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it('should create a DripsReceiverConfig with the expected properties', () => {
			// Arrange.
			const start = 1;
			const duration = 2;
			const amountPerSec = 3;

			let configAsUint192 = BigNumber.from(amountPerSec);
			configAsUint192 = configAsUint192.shl(32).or(start);
			configAsUint192 = configAsUint192.shl(32).or(duration);

			// Act.
			const config = DripsReceiverConfig.create(amountPerSec, duration, start);

			// Assert.
			assert(BigNumber.from(config.start).eq(BigNumber.from(start)));
			assert(BigNumber.from(config.duration).eq(BigNumber.from(duration)));
			assert(BigNumber.from(config.amountPerSec).eq(BigNumber.from(amountPerSec)));
			assert(BigNumber.from(config.asUint192).eq(BigNumber.from(configAsUint192)));
		});
	});

	describe('fromUint192()', () => {
		it('should parse correctly from a uint192', () => {
			// Arrange.
			const expectedConfig = DripsReceiverConfig.create(1, 2, 3);

			// Act.
			const actualConfig = DripsReceiverConfig.fromUint192(expectedConfig.asUint192);

			// Assert.
			assert(BigNumber.from(actualConfig.start).eq(BigNumber.from(expectedConfig.start)));
			assert(BigNumber.from(actualConfig.duration).eq(BigNumber.from(expectedConfig.duration)));
			assert(BigNumber.from(actualConfig.asUint192).eq(BigNumber.from(expectedConfig.asUint192)));
			assert(BigNumber.from(actualConfig.amountPerSec).eq(BigNumber.from(expectedConfig.amountPerSec)));
		});
	});
});
