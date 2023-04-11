import type { Network } from '@ethersproject/networks';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import { assert } from 'chai';
import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubObject, stubInterface } from 'ts-sinon';
import { BigNumber, Wallet } from 'ethers';
import type { GitDriver } from '../../contracts';
import { GitDriver__factory } from '../../contracts';
import Utils from '../../src/utils';
import GitDriverTxFactory from '../../src/GitDriver/GitDriverTxFactory';
import * as validators from '../../src/common/validators';
import type { SplitsReceiverStruct, DripsReceiverStruct, UserMetadataStruct } from '../../src/common/types';
import { formatDripsReceivers } from '../../src/common/internals';

describe('GitDriverTxFactory', () => {
	const TEST_CHAIN_ID = 5; // Goerli.

	let networkStub: StubbedInstance<Network>;
	let signerStub: StubbedInstance<JsonRpcSigner>;
	let signerWithProviderStub: StubbedInstance<JsonRpcSigner>;
	let providerStub: sinon.SinonStubbedInstance<JsonRpcProvider>;
	let gitDriverContractStub: StubbedInstance<GitDriver>;

	let testGitDriverTxFactory: GitDriverTxFactory;

	// Acts also as the "base Arrange step".
	beforeEach(async () => {
		providerStub = sinon.createStubInstance(JsonRpcProvider);

		signerStub = sinon.createStubInstance(JsonRpcSigner);
		signerStub.getAddress.resolves(Wallet.createRandom().address);

		networkStub = stubObject<Network>({ chainId: TEST_CHAIN_ID } as Network);

		providerStub.getNetwork.resolves(networkStub);

		signerWithProviderStub = { ...signerStub, provider: providerStub };
		signerStub.connect.withArgs(providerStub).returns(signerWithProviderStub);

		gitDriverContractStub = stubInterface<GitDriver>();
		sinon
			.stub(GitDriver__factory, 'connect')
			.withArgs(Utils.Network.configs[TEST_CHAIN_ID].GIT_DRIVER, signerWithProviderStub)
			.returns(gitDriverContractStub);

		testGitDriverTxFactory = await GitDriverTxFactory.create(signerWithProviderStub);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('create', async () => {
		it('should validate the signer', async () => {
			// Arrange
			const validateClientSignerStub = sinon.stub(validators, 'validateClientSigner');

			// Act
			await GitDriverTxFactory.create(signerWithProviderStub);

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
			const client = await GitDriverTxFactory.create(signerWithProviderStub, customDriverAddress);

			// Assert
			assert.equal(client.driverAddress, customDriverAddress);
		});

		it('should create a fully initialized client instance', async () => {
			// Assert
			assert.equal(
				testGitDriverTxFactory.driverAddress,
				Utils.Network.configs[(await providerStub.getNetwork()).chainId].GIT_DRIVER
			);
			assert.equal(testGitDriverTxFactory.signer, signerWithProviderStub);
		});
	});

	describe('collect', () => {
		it('should return the expected transaction', async () => {
			// Arrange
			const projectId = '0x12345';
			const stub = sinon.stub();
			const expectedTx = { from: '0x1234' };
			gitDriverContractStub.populateTransaction.collect = stub.resolves(expectedTx);
			const overrides = {};

			// Act
			const tx = await testGitDriverTxFactory.collect(projectId, '0x1234', '0x5678', overrides);

			// Assert
			assert(stub.calledOnceWithExactly(projectId, '0x1234', '0x5678', overrides));
			assert.deepEqual(tx.from, expectedTx.from);
			assert.isTrue(tx.value!.toNumber() === 0);
		});
	});

	describe('give', () => {
		it('should return the expected transaction', async () => {
			// Arrange
			const projectId = '0x12345';
			const stub = sinon.stub();
			const expectedTx = { from: '0x1234' };
			gitDriverContractStub.populateTransaction.give = stub.resolves(expectedTx);
			const overrides = {};

			// Act
			const tx = await testGitDriverTxFactory.give(projectId, '0x1234', '0x5678', '0x9abc', overrides);

			// Assert
			assert(stub.calledOnceWithExactly(projectId, '0x1234', '0x5678', '0x9abc', overrides));
			assert.deepEqual(tx.from, expectedTx.from);
			assert.isTrue(tx.value!.toNumber() === 0);
		});
	});

	describe('setSplits', () => {
		it('should return the expected transaction', async () => {
			// Arrange
			const projectId = '0x12345';
			const stub = sinon.stub();
			const expectedTx = { from: '0x1234' };
			gitDriverContractStub.populateTransaction.setSplits = stub.resolves(expectedTx);
			const receivers = [] as SplitsReceiverStruct[];
			const overrides = {};

			// Act
			const tx = await testGitDriverTxFactory.setSplits(projectId, receivers, overrides);

			// Assert
			assert(stub.calledOnceWithExactly(projectId, receivers, overrides));
			assert.deepEqual(tx.from, expectedTx.from);
			assert.isTrue(tx.value!.toNumber() === 0);
		});
	});

	describe('setDrips', () => {
		it('should return the expected transaction', async () => {
			// Arrange
			const projectId = '0x12345';
			const stub = sinon.stub();
			const expectedTx = { from: '0x1234' };
			gitDriverContractStub.populateTransaction.setDrips = stub.resolves(expectedTx);
			const currReceivers = [{ userId: 2 }, { userId: 1 }] as DripsReceiverStruct[];
			const newReceivers = [{ userId: 2 }, { userId: 1 }] as DripsReceiverStruct[];

			gitDriverContractStub.estimateGas.setDrips = sinon.stub().resolves(BigNumber.from(100));

			// Act
			const tx = await testGitDriverTxFactory.setDrips(
				projectId,
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
					projectId,
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
			const projectId = '0x12345';
			const stub = sinon.stub();
			const expectedTx = { from: '0x1234' };
			gitDriverContractStub.populateTransaction.emitUserMetadata = stub.resolves(expectedTx);
			const userMetadata = [] as UserMetadataStruct[];
			const overrides = {};

			// Act
			const tx = await testGitDriverTxFactory.emitUserMetadata(projectId, userMetadata, overrides);

			// Assert
			assert(stub.calledOnceWithExactly(projectId, userMetadata, overrides));
			assert.deepEqual(tx.from, expectedTx.from);
			assert.isTrue(tx.value!.toNumber() === 0);
		});
	});
});
