import { assert } from 'chai';
import { Interface } from 'ethers/lib/utils';
import sinon from 'ts-sinon';
import AddressDriverEncoder from '../../src/AddressDriver/AddressDriverEncoder';

describe('AddressDriverEncoder', () => {
	describe('encodeFunctionData', () => {
		it('should call encodeFunctionData on Interface', () => {
			// Arrange
			const encoder = new AddressDriverEncoder();
			const encoded = '0x111';
			const stub = sinon
				.stub(Interface.prototype, 'encodeFunctionData')
				.withArgs('calcUserId', ['0x123'])
				.returns(encoded);

			// Act
			const data = encoder.encodeFunctionData('calcUserId', ['0x123']);

			// Assert
			assert.equal(data, encoded);
			assert(stub.calledOnceWithExactly('calcUserId', ['0x123']));
		});
	});
});
