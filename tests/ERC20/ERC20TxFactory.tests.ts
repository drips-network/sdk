import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import { assert } from 'chai';
import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubObject, stubInterface } from 'ts-sinon';
import { Wallet } from 'ethers';
import type { Network } from '@ethersproject/networks';
import type { IERC20 } from '../../contracts';
import { IERC20__factory } from '../../contracts';
import ERC20TxFactory from '../../src/ERC20/ERC20TxFactory';
import * as validators from '../../src/common/validators';
import Utils from '../../src/utils';

describe('ERC20TxFactory', () => {
	const TOKEN_ADDRESS = Wallet.createRandom().address;

	let networkStub: StubbedInstance<Network>;
	let IERC20ContractStub: StubbedInstance<IERC20>;
	let signerStub: sinon.SinonStubbedInstance<JsonRpcSigner>;
	let signerWithProviderStub: StubbedInstance<JsonRpcSigner>;
	let providerStub: sinon.SinonStubbedInstance<JsonRpcProvider>;

	let testERC20TxFactory: ERC20TxFactory;

	// Acts also as the "base Arrange step".
	beforeEach(async () => {
		const TEST_CHAIN_ID = 11155111; // Sepolia.

		providerStub = sinon.createStubInstance(JsonRpcProvider);

		signerStub = sinon.createStubInstance(JsonRpcSigner);
		signerStub.getAddress.resolves(Wallet.createRandom().address);

		networkStub = stubObject<Network>({ chainId: TEST_CHAIN_ID } as Network);

		providerStub.getNetwork.resolves(networkStub);

		signerWithProviderStub = { ...signerStub, provider: providerStub };
		signerStub.connect.withArgs(providerStub).returns(signerWithProviderStub);

		IERC20ContractStub = stubInterface<IERC20>();
		sinon.stub(IERC20__factory, 'connect').withArgs(TOKEN_ADDRESS, signerWithProviderStub).returns(IERC20ContractStub);

		testERC20TxFactory = await ERC20TxFactory.create(signerWithProviderStub, TOKEN_ADDRESS);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('create', async () => {
		it('should validate the signer', async () => {
			// Arrange
			const validateClientSignerStub = sinon.stub(validators, 'validateClientSigner');

			// Act
			await ERC20TxFactory.create(signerWithProviderStub, TOKEN_ADDRESS);

			// Assert
			assert(
				validateClientSignerStub.calledOnceWithExactly(signerWithProviderStub, Utils.Network.SUPPORTED_CHAINS),
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
			const expectedTx = { from: '0x1234' };
			IERC20ContractStub.populateTransaction.approve = stub.resolves(expectedTx);

			// Act
			const tx = await testERC20TxFactory.approve('0x1234', '0x5678');

			// Assert
			assert(stub.calledOnceWithExactly('0x1234', '0x5678'));
			assert.deepEqual(tx.from, expectedTx.from);
			assert.isTrue(tx.value!.toNumber() === 0);
		});
	});
});
