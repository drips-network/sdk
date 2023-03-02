import { JsonRpcSigner } from '@ethersproject/providers';
import { assert } from 'chai';
import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubInterface } from 'ts-sinon';
import { Wallet } from 'ethers';
import type { IERC20 } from '../../contracts';
import { IERC20__factory } from '../../contracts';
import ERC20TxFactory from '../../src/ERC20/ERC20TxFactory';
import * as validators from '../../src/common/validators';

describe('ERC20TxFactory', () => {
	const TOKEN_ADDRESS = Wallet.createRandom().address;

	let signerStub: sinon.SinonStubbedInstance<JsonRpcSigner>;
	let IERC20ContractStub: StubbedInstance<IERC20>;

	let testERC20TxFactory: ERC20TxFactory;

	// Acts also as the "base Arrange step".
	beforeEach(async () => {
		signerStub = sinon.createStubInstance(JsonRpcSigner);
		signerStub.getAddress.resolves(Wallet.createRandom().address);

		IERC20ContractStub = stubInterface<IERC20>();
		sinon.stub(IERC20__factory, 'connect').withArgs(TOKEN_ADDRESS, signerStub).returns(IERC20ContractStub);

		testERC20TxFactory = await ERC20TxFactory.create(signerStub, TOKEN_ADDRESS);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('create', async () => {
		it('should validate the signer', async () => {
			// Arrange
			const validateClientSignerStub = sinon.stub(validators, 'validateClientSigner');

			// Act
			await ERC20TxFactory.create(signerStub, TOKEN_ADDRESS);

			// Assert
			assert(
				validateClientSignerStub.calledOnceWithExactly(signerStub),
				'Expected method to be called with different arguments'
			);
		});

		it('should create a fully initialized client instance', async () => {
			// Assert
			assert.equal(testERC20TxFactory.tokenAddress, TOKEN_ADDRESS);
		});
	});

	describe('approve', () => {
		it('should return the expected transaction', async () => {
			// Arrange
			const stub = sinon.stub();
			IERC20ContractStub.populateTransaction.approve = stub;

			// Act
			await testERC20TxFactory.approve('0x1234', '0x5678');

			// Assert
			assert(stub.calledOnceWithExactly('0x1234', '0x5678'));
		});
	});
});
