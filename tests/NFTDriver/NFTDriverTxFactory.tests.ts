import type { Network } from '@ethersproject/networks';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import { assert } from 'chai';
import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubObject, stubInterface } from 'ts-sinon';
import { BigNumber, Wallet } from 'ethers';
import type { NFTDriver } from '../../contracts';
import { NFTDriver__factory } from '../../contracts';
import Utils from '../../src/utils';
import NFTDriverTxFactory from '../../src/NFTDriver/NFTDriverTxFactory';
import * as validators from '../../src/common/validators';
import type { SplitsReceiverStruct, DripsReceiverStruct, UserMetadataStruct } from '../../src/common/types';
import { formatDripsReceivers } from '../../src/common/internals';

describe('NFTDriverTxFactory', () => {
	const TEST_CHAIN_ID = 5; // Goerli.

	let networkStub: StubbedInstance<Network>;
	let signerStub: StubbedInstance<JsonRpcSigner>;
	let signerWithProviderStub: StubbedInstance<JsonRpcSigner>;
	let providerStub: sinon.SinonStubbedInstance<JsonRpcProvider>;
	let nftDriverContractStub: StubbedInstance<NFTDriver>;

	let testNftDriverTxFactory: NFTDriverTxFactory;

	// Acts also as the "base Arrange step".
	beforeEach(async () => {
		providerStub = sinon.createStubInstance(JsonRpcProvider);

		signerStub = sinon.createStubInstance(JsonRpcSigner);
		signerStub.getAddress.resolves(Wallet.createRandom().address);

		networkStub = stubObject<Network>({ chainId: TEST_CHAIN_ID } as Network);

		providerStub.getNetwork.resolves(networkStub);

		signerWithProviderStub = { ...signerStub, provider: providerStub };

		nftDriverContractStub = stubInterface<NFTDriver>();
		sinon
			.stub(NFTDriver__factory, 'connect')
			.withArgs(Utils.Network.configs[TEST_CHAIN_ID].CONTRACT_NFT_DRIVER, signerWithProviderStub)
			.returns(nftDriverContractStub);

		testNftDriverTxFactory = await NFTDriverTxFactory.create(signerWithProviderStub);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('create', async () => {
		it('should validate the signer', async () => {
			// Arrange
			const validateClientSignerStub = sinon.stub(validators, 'validateClientSigner');

			// Act
			await NFTDriverTxFactory.create(signerWithProviderStub);

			// Assert
			assert(
				validateClientSignerStub.calledOnceWithExactly(signerWithProviderStub, Utils.Network.SUPPORTED_CHAINS),
				'Expected method to be called with different arguments'
			);
		});

		it('should set the custom driver address when provided', async () => {
			// Arrange
			const customDriverAddress = Wallet.createRandom().address;

			// Act
			const client = await NFTDriverTxFactory.create(signerWithProviderStub, customDriverAddress);

			// Assert
			assert.equal(client.driverAddress, customDriverAddress);
		});

		it('should create a fully initialized client instance', async () => {
			// Assert
			assert.equal(
				testNftDriverTxFactory.driverAddress,
				Utils.Network.configs[(await providerStub.getNetwork()).chainId].CONTRACT_NFT_DRIVER
			);
			assert.equal(testNftDriverTxFactory.signer, signerWithProviderStub);
		});
	});

	describe('mint', () => {
		it('should return the expected transaction', async () => {
			// Arrange
			const stub = sinon.stub();
			nftDriverContractStub.populateTransaction.mint = stub;
			const userMetadata = [] as UserMetadataStruct[];
			const overrides = {};

			// Act
			await testNftDriverTxFactory.mint('0x1234', userMetadata, overrides);

			// Assert
			assert(stub.calledOnceWithExactly('0x1234', userMetadata, overrides));
		});
	});

	describe('safeMint', () => {
		it('should return the expected transaction', async () => {
			// Arrange
			const stub = sinon.stub();
			nftDriverContractStub.populateTransaction.safeMint = stub;
			const userMetadata = [] as UserMetadataStruct[];
			const overrides = {};

			// Act
			await testNftDriverTxFactory.safeMint('0x1234', userMetadata, overrides);

			// Assert
			assert(stub.calledOnceWithExactly('0x1234', userMetadata, overrides));
		});
	});

	describe('collect', () => {
		it('should return the expected transaction', async () => {
			// Arrange
			const stub = sinon.stub();
			nftDriverContractStub.populateTransaction.collect = stub;
			const overrides = {};

			// Act
			await testNftDriverTxFactory.collect('0x1234', '0x5678', '0x9abc', overrides);

			// Assert
			assert(stub.calledOnceWithExactly('0x1234', '0x5678', '0x9abc', overrides));
		});
	});

	describe('give', () => {
		it('should return the expected transaction', async () => {
			// Arrange
			const stub = sinon.stub();
			nftDriverContractStub.populateTransaction.give = stub;
			const overrides = {};

			// Act
			await testNftDriverTxFactory.give('0x1234', '0x5678', '0x9abc', '0xdef0', overrides);

			// Assert
			assert(stub.calledOnceWithExactly('0x1234', '0x5678', '0x9abc', '0xdef0', overrides));
		});
	});

	describe('setSplits', () => {
		it('should return the expected transaction', async () => {
			// Arrange
			const stub = sinon.stub();
			nftDriverContractStub.populateTransaction.setSplits = stub;
			const receivers = [] as SplitsReceiverStruct[];
			const overrides = {};

			// Act
			await testNftDriverTxFactory.setSplits('0x1234', receivers, overrides);

			// Assert
			assert(stub.calledOnceWithExactly('0x1234', receivers, overrides));
		});
	});

	describe('setDrips', () => {
		it('should return the expected transaction', async () => {
			// Arrange
			const stub = sinon.stub();
			nftDriverContractStub.populateTransaction.setDrips = stub;
			const currReceivers = [{ userId: 2 }, { userId: 1 }] as DripsReceiverStruct[];
			const newReceivers = [{ userId: 2 }, { userId: 1 }] as DripsReceiverStruct[];

			nftDriverContractStub.estimateGas.setDrips = sinon.stub().resolves(BigNumber.from(100));

			// Act
			await testNftDriverTxFactory.setDrips('1', '0x1234', currReceivers, '0x5678', newReceivers, 0, 0, '0x9abc');

			// Assert
			assert(
				stub.calledOnceWithExactly(
					'1',
					'0x1234',
					formatDripsReceivers(currReceivers),
					'0x5678',
					formatDripsReceivers(newReceivers),
					0,
					0,
					'0x9abc',
					{ gasLimit: 120 }
				)
			);
		});
	});

	describe('emitUserMetadata', () => {
		it('should return the expected transaction', async () => {
			// Arrange
			const stub = sinon.stub();
			nftDriverContractStub.populateTransaction.emitUserMetadata = stub;
			const userMetadata = [] as UserMetadataStruct[];
			const overrides = {};

			// Act
			await testNftDriverTxFactory.emitUserMetadata('0xdef0', userMetadata, overrides);

			// Assert
			assert(stub.calledOnceWithExactly('0xdef0', userMetadata, overrides));
		});
	});
});
