import type { Network } from '@ethersproject/networks';
import { JsonRpcProvider } from '@ethersproject/providers';
import { assert } from 'chai';
import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubObject, stubInterface } from 'ts-sinon';
import { Wallet } from 'ethers';
import type { DripsHub } from '../../contracts';
import { DripsHub__factory } from '../../contracts';
import Utils from '../../src/utils';
import DripsHubTxFactory from '../../src/DripsHub/DripsHubTxFactory';
import * as validators from '../../src/common/validators';
import type { SplitsReceiverStruct, DripsHistoryStruct } from '../../src/common/types';

describe('DripsHubTxFactory', () => {
	const TEST_CHAIN_ID = 5; // Goerli.

	let networkStub: StubbedInstance<Network>;
	let providerStub: sinon.SinonStubbedInstance<JsonRpcProvider>;
	let dripsHubContractStub: StubbedInstance<DripsHub>;

	let testDripsHubTxFactory: DripsHubTxFactory;

	// Acts also as the "base Arrange step".
	beforeEach(async () => {
		providerStub = sinon.createStubInstance(JsonRpcProvider);
		networkStub = stubObject<Network>({ chainId: TEST_CHAIN_ID } as Network);
		providerStub.getNetwork.resolves(networkStub);

		dripsHubContractStub = stubInterface<DripsHub>();
		sinon
			.stub(DripsHub__factory, 'connect')
			.withArgs(Utils.Network.configs[TEST_CHAIN_ID].ADDRESS_DRIVER, providerStub)
			.returns(dripsHubContractStub);

		testDripsHubTxFactory = await DripsHubTxFactory.create(providerStub);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('create', async () => {
		it('should validate the provider', async () => {
			// Arrange
			const validateClientProviderStub = sinon.stub(validators, 'validateClientProvider');

			// Act
			await DripsHubTxFactory.create(providerStub);

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
			const client = await DripsHubTxFactory.create(providerStub, customDriverAddress);

			// Assert
			assert.equal(client.driverAddress, customDriverAddress);
		});

		it('should create a fully initialized client instance', async () => {
			// Assert
			assert.equal(
				testDripsHubTxFactory.driverAddress,
				Utils.Network.configs[(await providerStub.getNetwork()).chainId].ADDRESS_DRIVER
			);
		});
	});

	describe('receiveDrips', () => {
		it('should return the expected transaction', async () => {
			// Arrange
			const stub = sinon.stub();
			dripsHubContractStub.populateTransaction.receiveDrips = stub;

			// Act
			await testDripsHubTxFactory.receiveDrips('0x1234', '0x5678', '0x9abc');

			// Assert
			assert(stub.calledOnceWithExactly('0x1234', '0x5678', '0x9abc'));
		});
	});

	describe('squeezeDrips', () => {
		it('should return the expected transaction', async () => {
			// Arrange
			const stub = sinon.stub();
			dripsHubContractStub.populateTransaction.squeezeDrips = stub;
			const dripsHistory = [] as DripsHistoryStruct[];

			// Act
			await testDripsHubTxFactory.squeezeDrips('0x1234', '0x5678', '0x9abc', '0xdef0', dripsHistory);

			// Assert
			assert(stub.calledOnceWithExactly('0x1234', '0x5678', '0x9abc', '0xdef0', dripsHistory));
		});
	});

	describe('split', () => {
		it('should return the expected transaction', async () => {
			// Arrange
			const stub = sinon.stub();
			dripsHubContractStub.populateTransaction.split = stub;
			const receivers = [] as SplitsReceiverStruct[];

			// Act
			await testDripsHubTxFactory.split('0x1234', '0x9abc', receivers);

			// Assert
			assert(stub.calledOnceWithExactly('0x1234', '0x9abc', receivers));
		});
	});
});
