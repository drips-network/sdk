import { assert } from 'chai';
import { Interface } from 'ethers/lib/utils';
import sinon from 'ts-sinon';
import DripsHubEncoder from '../../src/DripsHub/DripsHubEncoder';

describe('DripsHubEncoder', () => {
	describe('encodeFunctionData', () => {
		it('should call encodeFunctionData on Interface', () => {
			// Arrange
			const encoder = new DripsHubEncoder();
			const encoded = '0x111';
			const stub = sinon
				.stub(Interface.prototype, 'encodeFunctionData')
				.withArgs('unpause', undefined)
				.returns(encoded);

			// Act
			const data = encoder.encodeFunctionData('unpause', undefined);

			// Assert
			assert.equal(data, encoded);
			assert(stub.calledOnceWithExactly('unpause', undefined));
		});
	});
});
