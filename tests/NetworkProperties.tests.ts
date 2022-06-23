import { assert } from 'chai';
import { chainIdToNetworkPropertiesMap, SUPPORTED_CHAINS } from '../src/NetworkProperties';

describe('NetworkProperties', () => {
	it('should export only unique and supported chain IDs', () => {
		const chainIds = Object.keys(chainIdToNetworkPropertiesMap).map((x) => parseInt(x, 10));

		assert.includeMembers(SUPPORTED_CHAINS as unknown as number[], chainIds);
		assert.equal([...new Set(SUPPORTED_CHAINS)].length, [...new Set(chainIds)].length);
	});
});
