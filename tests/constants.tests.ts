import { assert } from 'chai';
import constants from '../src/constants';

describe('constants', () => {
	it('should return the expected values', () => {
		assert.equal(constants.TOTAL_SPLITS_WEIGHT, 1_000_000);
		assert.equal(constants.MAX_DRIPS_RECEIVERS, 100);
		assert.equal(constants.MAX_SPLITS_RECEIVERS, 200);
		assert.equal(constants.AMT_PER_SEC_MULTIPLIER, 1_000_000_000);
		assert.equal(constants.AMT_PER_SEC_EXTRA_DECIMALS, 9);
	});
});
