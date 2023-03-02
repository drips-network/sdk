import type { Network } from '@ethersproject/networks';
import { JsonRpcProvider } from '@ethersproject/providers';
import { assert } from 'chai';
import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubObject, stubInterface } from 'ts-sinon';
import { Wallet } from 'ethers';
import type { NFTDriver } from '../../contracts';
import { NFTDriver__factory } from '../../contracts';
import Utils from '../../src/utils';
import NFTDriverTxFactory from '../../src/NFTDriver/NFTDriverTxFactory';
import * as validators from '../../src/common/validators';
import type { SplitsReceiverStruct, DripsReceiverStruct, UserMetadataStruct } from '../../src/common/types';

describe('NFTDriverTxFactory', () => {
	const TEST_CHAIN_ID = 5; // Goerli.

	let networkStub: StubbedInstance<Network>;
	let providerStub: sinon.SinonStubbedInstance<JsonRpcProvider>;
	let nftDriverContractStub: StubbedInstance<NFTDriver>;

	let testNFTDriverTxFactory: NFTDriverTxFactory;

	// Acts also as the "base Arrange step".
	beforeEach(async () => {
		providerStub = sinon.createStubInstance(JsonRpcProvider);
		networkStub = stubObject<Network>({ chainId: TEST_CHAIN_ID } as Network);
		providerStub.getNetwork.resolves(networkStub);

		nftDriverContractStub = stubInterface<NFTDriver>();
		sinon
			.stub(NFTDriver__factory, 'connect')
			.withArgs(Utils.Network.configs[TEST_CHAIN_ID].CONTRACT_ADDRESS_DRIVER, providerStub)
			.returns(nftDriverContractStub);

		testNFTDriverTxFactory = await NFTDriverTxFactory.create(providerStub);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('create', async () => {
		it('should validate the provider', async () => {
			// Arrange
			const validateClientProviderStub = sinon.stub(validators, 'validateClientProvider');

			// Act
			await NFTDriverTxFactory.create(providerStub);

			// Assert
			assert(
				validateClientProviderStub.calledOnceWithExactly(providerStub, Utils.Network.SUPPORTED_CHAINS),
				'Expected method to be called with different arguments'
			);
		});

		it('should set the custom driver address when provided', async () => {
			// Arrange
			const customDriverAddress = Wallet.createRandom().address;

			// Act
			const client = await NFTDriverTxFactory.create(providerStub, customDriverAddress);

			// Assert
			assert.equal(client.driverAddress, customDriverAddress);
		});

		it('should create a fully initialized client instance', async () => {
			// Assert
			assert.equal(
				testNFTDriverTxFactory.driverAddress,
				Utils.Network.configs[(await providerStub.getNetwork()).chainId].CONTRACT_ADDRESS_DRIVER
			);
		});
	});

	describe('collect', () => {
		it('should return the expected transaction', async () => {
			// Arrange
			const stub = sinon.stub();
			nftDriverContractStub.populateTransaction.safeMint = stub;
			const userMetadata = [] as UserMetadataStruct[];

			// Act
			await testNFTDriverTxFactory.safeMint('0x1234', userMetadata);

			// Assert
			assert(stub.calledOnceWithExactly('0x1234', userMetadata));
		});
	});

	describe('collect', () => {
		it('should return the expected transaction', async () => {
			// Arrange
			const stub = sinon.stub();
			nftDriverContractStub.populateTransaction.collect = stub;

			// Act
			await testNFTDriverTxFactory.collect('0x1234', '0x5678', '0x9abc');

			// Assert
			assert(stub.calledOnceWithExactly('0x1234', '0x5678', '0x9abc'));
		});
	});

	describe('give', () => {
		it('should return the expected transaction', async () => {
			// Arrange
			const stub = sinon.stub();
			nftDriverContractStub.populateTransaction.give = stub;

			// Act
			await testNFTDriverTxFactory.give('0x1234', '0x5678', '0x9abc', '0xdef0');

			// Assert
			assert(stub.calledOnceWithExactly('0x1234', '0x5678', '0x9abc', '0xdef0'));
		});
	});

	describe('setSplits', () => {
		it('should return the expected transaction', async () => {
			// Arrange
			const stub = sinon.stub();
			nftDriverContractStub.populateTransaction.setSplits = stub;
			const receivers = [] as SplitsReceiverStruct[];

			// Act
			await testNFTDriverTxFactory.setSplits('0x1234', receivers);

			// Assert
			assert(stub.calledOnceWithExactly('0x1234', receivers));
		});
	});

	describe('setDrips', () => {
		it('should return the expected transaction', async () => {
			// Arrange
			const stub = sinon.stub();
			nftDriverContractStub.populateTransaction.setDrips = stub;
			const currReceivers = [] as DripsReceiverStruct[];
			const newReceivers = [] as DripsReceiverStruct[];

			// Act
			await testNFTDriverTxFactory.setDrips('0x1234', '0xdef0', currReceivers, '0x5678', newReceivers, '0x9abc');

			// Assert
			assert(stub.calledOnceWithExactly('0x1234', '0xdef0', currReceivers, '0x5678', newReceivers, 0, 0, '0x9abc'));
		});
	});

	describe('emitUserMetadata', () => {
		it('should return the expected transaction', async () => {
			// Arrange
			const stub = sinon.stub();
			nftDriverContractStub.populateTransaction.emitUserMetadata = stub;
			const userMetadata = [] as UserMetadataStruct[];

			// Act
			await testNFTDriverTxFactory.emitUserMetadata('0xdef0', userMetadata);

			// Assert
			assert(stub.calledOnceWithExactly('0xdef0', userMetadata));
		});
	});
});
