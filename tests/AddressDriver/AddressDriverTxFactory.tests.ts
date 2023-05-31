import type { Network } from '@ethersproject/networks';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import { assert } from 'chai';
import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubObject, stubInterface } from 'ts-sinon';
import { BigNumber, Wallet } from 'ethers';
import type { AddressDriver } from '../../contracts';
import { AddressDriver__factory } from '../../contracts';
import Utils from '../../src/utils';
import AddressDriverTxFactory from '../../src/AddressDriver/AddressDriverTxFactory';
import * as validators from '../../src/common/validators';
import type { SplitsReceiverStruct, DripsReceiverStruct, UserMetadataStruct } from '../../src/common/types';
import { formatDripsReceivers } from '../../src/common/internals';

describe('AddressDriverTxFactory', () => {
	const TEST_CHAIN_ID = 11155111; // Sepolia.

	let networkStub: StubbedInstance<Network>;
	let signerStub: StubbedInstance<JsonRpcSigner>;
	let signerWithProviderStub: StubbedInstance<JsonRpcSigner>;
	let providerStub: sinon.SinonStubbedInstance<JsonRpcProvider>;
	let addressDriverContractStub: StubbedInstance<AddressDriver>;

	let testAddressDriverTxFactory: AddressDriverTxFactory;

	// Acts also as the "base Arrange step".
	beforeEach(async () => {
		providerStub = sinon.createStubInstance(JsonRpcProvider);

		signerStub = sinon.createStubInstance(JsonRpcSigner);
		signerStub.getAddress.resolves(Wallet.createRandom().address);

		networkStub = stubObject<Network>({ chainId: TEST_CHAIN_ID } as Network);

		providerStub.getNetwork.resolves(networkStub);

		signerWithProviderStub = { ...signerStub, provider: providerStub };
		signerStub.connect.withArgs(providerStub).returns(signerWithProviderStub);

		addressDriverContractStub = stubInterface<AddressDriver>();
		sinon
			.stub(AddressDriver__factory, 'connect')
			.withArgs(Utils.Network.configs[TEST_CHAIN_ID].ADDRESS_DRIVER, signerWithProviderStub)
			.returns(addressDriverContractStub);

		testAddressDriverTxFactory = await AddressDriverTxFactory.create(signerWithProviderStub);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('create', async () => {
		it('should validate the signer', async () => {
			// Arrange
			const validateClientSignerStub = sinon.stub(validators, 'validateClientSigner');

			// Act
			await AddressDriverTxFactory.create(signerWithProviderStub);

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
			const client = await AddressDriverTxFactory.create(signerWithProviderStub, customDriverAddress);

			// Assert
			assert.equal(client.driverAddress, customDriverAddress);
		});

		it('should create a fully initialized client instance', async () => {
			// Assert
			assert.equal(
				testAddressDriverTxFactory.driverAddress,
				Utils.Network.configs[(await providerStub.getNetwork()).chainId].ADDRESS_DRIVER
			);
			assert.equal(testAddressDriverTxFactory.signer, signerWithProviderStub);
		});
	});

	describe('collect', () => {
		it('should return the expected transaction', async () => {
			// Arrange
			const stub = sinon.stub();
			const expectedTx = { from: '0x1234' };
			addressDriverContractStub.populateTransaction.collect = stub.resolves(expectedTx);
			const overrides = {};

			// Act
			const tx = await await testAddressDriverTxFactory.collect('0x1234', '0x5678', overrides);

			// Assert
			assert(stub.calledOnceWithExactly('0x1234', '0x5678', overrides));
			assert.deepEqual(tx.from, expectedTx.from);
			assert.isTrue(tx.value!.toNumber() === 0);
		});
	});

	describe('give', () => {
		it('should return the expected transaction', async () => {
			// Arrange
			const stub = sinon.stub();
			const expectedTx = { from: '0x1234' };
			addressDriverContractStub.populateTransaction.give = stub.resolves(expectedTx);
			const overrides = {};

			// Act
			const tx = await testAddressDriverTxFactory.give('0x1234', '0x5678', '0x9abc', overrides);

			// Assert
			assert(stub.calledOnceWithExactly('0x1234', '0x5678', '0x9abc', overrides));
			assert.deepEqual(tx.from, expectedTx.from);
			assert.isTrue(tx.value!.toNumber() === 0);
		});
	});

	describe('setSplits', () => {
		it('should return the expected transaction', async () => {
			// Arrange
			const stub = sinon.stub();
			const expectedTx = { from: '0x1234' };
			addressDriverContractStub.populateTransaction.setSplits = stub.resolves(expectedTx);
			const receivers = [] as SplitsReceiverStruct[];
			const overrides = {};

			// Act
			const tx = await testAddressDriverTxFactory.setSplits(receivers, overrides);

			// Assert
			assert(stub.calledOnceWithExactly(receivers, overrides));
			assert.deepEqual(tx.from, expectedTx.from);
			assert.isTrue(tx.value!.toNumber() === 0);
		});
	});

	describe('setDrips', () => {
		it('should return the expected transaction', async () => {
			// Arrange
			const stub = sinon.stub();
			const expectedTx = { from: '0x1234' };
			addressDriverContractStub.populateTransaction.setDrips = stub.resolves(expectedTx);
			const currReceivers = [{ userId: 2 }, { userId: 1 }] as DripsReceiverStruct[];
			const newReceivers = [{ userId: 2 }, { userId: 1 }] as DripsReceiverStruct[];

			addressDriverContractStub.estimateGas.setDrips = sinon.stub().resolves(BigNumber.from(100));

			// Act
			const tx = await testAddressDriverTxFactory.setDrips(
				'0x1234',
				currReceivers,
				'0x5678',
				newReceivers,
				0,
				0,
				'0x9abc'
			);

			// Assert
			assert(
				stub.calledOnceWithExactly(
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
			assert.deepEqual(tx.from, expectedTx.from);
			assert.isTrue(tx.value!.toNumber() === 0);
		});
	});

	describe('emitUserMetadata', () => {
		it('should return the expected transaction', async () => {
			// Arrange
			const stub = sinon.stub();
			const expectedTx = { from: '0x1234' };
			addressDriverContractStub.populateTransaction.emitUserMetadata = stub.resolves(expectedTx);
			const userMetadata = [] as UserMetadataStruct[];
			const overrides = {};

			// Act
			const tx = await testAddressDriverTxFactory.emitUserMetadata(userMetadata, overrides);

			// Assert
			assert(stub.calledOnceWithExactly(userMetadata, overrides));
			assert.deepEqual(tx.from, expectedTx.from);
			assert.isTrue(tx.value!.toNumber() === 0);
		});
	});
});
