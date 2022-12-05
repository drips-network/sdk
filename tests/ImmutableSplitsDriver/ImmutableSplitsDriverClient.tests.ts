import type { Network } from '@ethersproject/networks';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import { assert } from 'chai';
import type { ContractReceipt, ContractTransaction } from 'ethers';
import { Wallet } from 'ethers';
import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubInterface, stubObject } from 'ts-sinon';
import { ImmutableSplitsDriver__factory } from '../../contracts/factories/ImmutableSplitsDriver__factory';
import type { ImmutableSplitsDriver, SplitsReceiverStruct } from '../../contracts/ImmutableSplitsDriver';
import DripsHubClient from '../../src/DripsHub/DripsHubClient';
import ImmutableSplitsDriverClient from '../../src/ImmutableSplits/ImmutableSplitsDriver';
import Utils from '../../src/utils';
import * as validators from '../../src/common/validators';
import type { UserMetadataStruct } from '../../src/common/types';
import { DripsErrorCode } from '../../src/common/DripsError';

describe('ImmutableSplitsDriverClient', () => {
	const TEST_CHAIN_ID = 5; // Goerli.

	let networkStub: StubbedInstance<Network>;
	let signerStub: StubbedInstance<JsonRpcSigner>;
	let providerStub: StubbedInstance<JsonRpcProvider>;
	let dripsHubClientStub: StubbedInstance<DripsHubClient>;
	let immutableSplitsDriverContractStub: StubbedInstance<ImmutableSplitsDriver>;

	let testImmutableSplitsDriverClient: ImmutableSplitsDriverClient;

	// Acts also as the "base Arrange step".
	beforeEach(async () => {
		providerStub = sinon.createStubInstance(JsonRpcProvider);

		signerStub = sinon.createStubInstance(JsonRpcSigner);
		signerStub.getAddress.resolves(Wallet.createRandom().address);

		networkStub = stubObject<Network>({ chainId: TEST_CHAIN_ID } as Network);

		providerStub.getSigner.returns(signerStub);
		providerStub.getNetwork.resolves(networkStub);

		immutableSplitsDriverContractStub = stubInterface<ImmutableSplitsDriver>();
		sinon
			.stub(ImmutableSplitsDriver__factory, 'connect')
			.withArgs(Utils.Network.configs[TEST_CHAIN_ID].CONTRACT_IMMUTABLE_SPLITS_DRIVER, signerStub)
			.returns(immutableSplitsDriverContractStub);

		dripsHubClientStub = stubInterface<DripsHubClient>();
		sinon.stub(DripsHubClient, 'create').resolves(dripsHubClientStub);

		testImmutableSplitsDriverClient = await ImmutableSplitsDriverClient.create(providerStub);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('create()', () => {
		it('should validate the provider', async () => {
			// Arrange
			const validateClientProviderStub = sinon.stub(validators, 'validateClientProvider');

			// Act
			ImmutableSplitsDriverClient.create(providerStub);

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
			const client = await ImmutableSplitsDriverClient.create(providerStub, customDriverAddress);

			// Assert
			assert.equal(client.driverAddress, customDriverAddress);
		});

		it('should create a fully initialized client instance', async () => {
			// Assert
			assert.equal(testImmutableSplitsDriverClient.provider, providerStub);
			assert.equal(testImmutableSplitsDriverClient.provider.getSigner(), providerStub.getSigner());
			assert.equal(
				await testImmutableSplitsDriverClient.provider.getSigner().getAddress(),
				await providerStub.getSigner().getAddress()
			);
			assert.equal(
				testImmutableSplitsDriverClient.driverAddress,
				Utils.Network.configs[(await providerStub.getNetwork()).chainId].CONTRACT_IMMUTABLE_SPLITS_DRIVER
			);
		});
	});

	describe('createSplits()', () => {
		it('should validate the splits receivers', async () => {
			// Arrange
			const expectedUserId = '1';
			const receivers: SplitsReceiverStruct[] = [];
			const metadata: UserMetadataStruct[] = [{ key: 'key', value: 'value' }];

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'CreatedSplits', args: { userId: expectedUserId } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			immutableSplitsDriverContractStub.createSplits.withArgs(receivers, metadata).resolves(txResponse);

			const validateSplitsReceiversStub = sinon.stub(validators, 'validateSplitsReceivers');

			// Act
			await testImmutableSplitsDriverClient.createSplits(receivers, metadata);

			// Assert
			assert(validateSplitsReceiversStub.calledOnceWithExactly(receivers));
		});

		it('should validate the user metadata', async () => {
			// Arrange
			const expectedUserId = '1';
			const receivers: SplitsReceiverStruct[] = [];
			const metadata: UserMetadataStruct[] = [{ key: 'key', value: 'value' }];

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'CreatedSplits', args: { userId: expectedUserId } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			immutableSplitsDriverContractStub.createSplits.withArgs(receivers, metadata).resolves(txResponse);

			const validateEmitUserMetadataInputStub = sinon.stub(validators, 'validateEmitUserMetadataInput');

			// Act
			await testImmutableSplitsDriverClient.createSplits(receivers, metadata);

			// Assert
			assert(validateEmitUserMetadataInputStub.calledOnceWithExactly(metadata));
		});

		it('should throw a txEventNotFound when a transfer event is not found in the transaction', async () => {
			let threw = false;
			const receivers: SplitsReceiverStruct[] = [];
			const metadata: UserMetadataStruct[] = [{ key: 'key', value: 'value' }];

			const waitFake = async () =>
				Promise.resolve({
					events: []
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			immutableSplitsDriverContractStub.createSplits.withArgs(receivers, metadata).resolves(txResponse);

			try {
				// Act
				await testImmutableSplitsDriverClient.createSplits(receivers, metadata);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.TX_EVENT_NOT_FOUND);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should call the createSplits() method of the AddressDriver contract', async () => {
			// Arrange
			const expectedUserId = '1';
			const receivers: SplitsReceiverStruct[] = [];
			const metadata: UserMetadataStruct[] = [{ key: 'key', value: 'value' }];

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'CreatedSplits', args: { userId: expectedUserId } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			immutableSplitsDriverContractStub.createSplits.withArgs(receivers, metadata).resolves(txResponse);

			// Act
			await testImmutableSplitsDriverClient.createSplits(receivers, metadata);

			// Assert
			assert(
				immutableSplitsDriverContractStub.createSplits.calledOnceWithExactly(receivers, metadata),
				'Expected method to be called with different arguments'
			);
		});
	});
});
