import type { Network } from '@ethersproject/networks';
import { JsonRpcProvider } from '@ethersproject/providers';
import { assert } from 'chai';
import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubObject, stubInterface } from 'ts-sinon';
import { Wallet } from 'ethers';
import type { AddressDriver } from '../../contracts';
import { AddressDriver__factory } from '../../contracts';
import Utils from '../../src/utils';
import AddressDriverTxFactory from '../../src/AddressDriver/AddressDriverTxFactory';
import { DripsErrorCode } from '../../src/common/DripsError';
import * as validators from '../../src/common/validators';
import type { SplitsReceiverStruct, DripsReceiverStruct, UserMetadataStruct } from '../../src/common/types';

describe('AddressDriverTxFactory', () => {
	const TEST_CHAIN_ID = 5; // Goerli.

	let networkStub: StubbedInstance<Network>;
	let providerStub: sinon.SinonStubbedInstance<JsonRpcProvider>;
	let addressDriverContractStub: StubbedInstance<AddressDriver>;

	let testAddressDriverTxFactory: AddressDriverTxFactory;

	// Acts also as the "base Arrange step".
	beforeEach(async () => {
		providerStub = sinon.createStubInstance(JsonRpcProvider);
		networkStub = stubObject<Network>({ chainId: TEST_CHAIN_ID } as Network);
		providerStub.getNetwork.resolves(networkStub);

		addressDriverContractStub = stubInterface<AddressDriver>();
		sinon
			.stub(AddressDriver__factory, 'connect')
			.withArgs(Utils.Network.configs[TEST_CHAIN_ID].CONTRACT_ADDRESS_DRIVER, providerStub)
			.returns(addressDriverContractStub);

		testAddressDriverTxFactory = await AddressDriverTxFactory.create(providerStub);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('create', async () => {
		it('should validate the provider', async () => {
			// Arrange
			const validateClientProviderStub = sinon.stub(validators, 'validateClientProvider');

			// Act
			await AddressDriverTxFactory.create(providerStub);

			// Assert
			assert(
				validateClientProviderStub.calledOnceWithExactly(providerStub, Utils.Network.SUPPORTED_CHAINS),
				'Expected method to be called with different arguments'
			);
		});

		it('should should throw a clientInitializationError when client cannot be initialized', async () => {
			// Arrange
			let threw = false;

			try {
				// Act
				await AddressDriverTxFactory.create(undefined as any);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.CLIENT_INITIALIZATION_FAILURE);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should set the custom driver address when provided', async () => {
			// Arrange
			const customDriverAddress = Wallet.createRandom().address;

			// Act
			const client = await AddressDriverTxFactory.create(providerStub, customDriverAddress);

			// Assert
			assert.equal(client.driverAddress, customDriverAddress);
		});

		it('should create a fully initialized client instance', async () => {
			// Assert
			assert.equal(
				testAddressDriverTxFactory.driverAddress,
				Utils.Network.configs[(await providerStub.getNetwork()).chainId].CONTRACT_ADDRESS_DRIVER
			);
		});
	});

	describe('collect', () => {
		it('should return the expected transaction', async () => {
			// Arrange
			const stub = sinon.stub();
			addressDriverContractStub.populateTransaction.collect = stub;

			// Act
			await testAddressDriverTxFactory.collect('0x1234', '0x5678');

			// Assert
			assert(stub.calledOnceWithExactly('0x1234', '0x5678'));
		});
	});

	describe('give', () => {
		it('should return the expected transaction', async () => {
			// Arrange
			const stub = sinon.stub();
			addressDriverContractStub.populateTransaction.give = stub;

			// Act
			await testAddressDriverTxFactory.give('0x1234', '0x5678', '0x9abc');

			// Assert
			assert(stub.calledOnceWithExactly('0x1234', '0x5678', '0x9abc'));
		});
	});

	describe('setSplits', () => {
		it('should return the expected transaction', async () => {
			// Arrange
			const stub = sinon.stub();
			addressDriverContractStub.populateTransaction.setSplits = stub;
			const receivers = [] as SplitsReceiverStruct[];

			// Act
			await testAddressDriverTxFactory.setSplits(receivers);

			// Assert
			assert(stub.calledOnceWithExactly(receivers));
		});
	});

	describe('setDrips', () => {
		it('should return the expected transaction', async () => {
			// Arrange
			const stub = sinon.stub();
			addressDriverContractStub.populateTransaction.setDrips = stub;
			const currReceivers = [] as DripsReceiverStruct[];
			const newReceivers = [] as DripsReceiverStruct[];

			// Act
			await testAddressDriverTxFactory.setDrips('0x1234', currReceivers, '0x5678', newReceivers, '0x9abc');

			// Assert
			assert(stub.calledOnceWithExactly('0x1234', currReceivers, '0x5678', newReceivers, 0, 0, '0x9abc'));
		});
	});

	describe('emitUserMetadata', () => {
		it('should return the expected transaction', async () => {
			// Arrange
			const stub = sinon.stub();
			addressDriverContractStub.populateTransaction.emitUserMetadata = stub;
			const userMetadata = [] as UserMetadataStruct[];

			// Act
			await testAddressDriverTxFactory.emitUserMetadata(userMetadata);

			// Assert
			assert(stub.calledOnceWithExactly(userMetadata));
		});
	});
});
