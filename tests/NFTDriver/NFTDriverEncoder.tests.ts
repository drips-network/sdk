import { assert } from 'chai';
import { Interface } from 'ethers/lib/utils';
import sinon from 'ts-sinon';
import NFTDriverEncoder from '../../src/NFTDriver/NFTDriverEncoder';

describe('NFTDriverEncoder', () => {
	describe('encodeFunctionData', () => {
		it('should call encodeFunctionData on Interface', () => {
			// Arrange
			const encoder = new NFTDriverEncoder();
			const encoded = '0x111';
			const stub = sinon
				.stub(Interface.prototype, 'encodeFunctionData')
				.withArgs('balanceOf', ['0x123'])
				.returns(encoded);

			// Act
			const data = encoder.encodeFunctionData('balanceOf', ['0x123']);

			// Assert
			assert.equal(data, encoded);
			assert(stub.calledOnceWithExactly('balanceOf', ['0x123']));
		});
	});
});
