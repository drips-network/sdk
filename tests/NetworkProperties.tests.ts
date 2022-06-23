import { assert } from 'chai';
import { supportedChains } from '../src/NetworkProperties';

describe('NetworkProperties', () => {
	it('should export only unique and supported chain IDs', () => {
		// Arrange.
		const chainIds = [1, 4, 137, 80001];

		// Assert.
		assert.includeMembers(supportedChains as number[], chainIds);
		assert.equal([...new Set(supportedChains)].length, [...new Set(chainIds)].length);
	});
});
