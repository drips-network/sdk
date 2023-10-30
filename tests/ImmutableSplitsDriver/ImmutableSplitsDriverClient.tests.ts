import type { Network } from '@ethersproject/networks';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import { assert } from 'chai';
import type { ContractReceipt, ContractTransaction } from 'ethers';
import { Wallet } from 'ethers';
import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubInterface, stubObject } from 'ts-sinon';
import { ImmutableSplitsDriver__factory } from '../../contracts/factories/ImmutableSplitsDriver__factory';
import type { ImmutableSplitsDriver, SplitsReceiverStruct } from '../../contracts/ImmutableSplitsDriver';
import DripsClient from '../../src/Drips/DripsClient';
import ImmutableSplitsDriverClient from '../../src/ImmutableSplits/ImmutableSplitsDriverClient';
import Utils from '../../src/utils';
import * as validators from '../../src/common/validators';
import type { AccountMetadata } from '../../src/common/types';
import { DripsErrorCode } from '../../src/common/DripsError';

describe('ImmutableSplitsDriverClient', () => {
	const TEST_CHAIN_ID = 11155111; // Sepolia.

	let networkStub: StubbedInstance<Network>;
	let signerStub: StubbedInstance<JsonRpcSigner>;
	let dripsHubClientStub: StubbedInstance<DripsClient>;
	let signerWithProviderStub: StubbedInstance<JsonRpcSigner>;
	let providerStub: sinon.SinonStubbedInstance<JsonRpcProvider>;
	let immutableSplitsDriverContractStub: StubbedInstance<ImmutableSplitsDriver>;

	let testImmutableSplitsDriverClient: ImmutableSplitsDriverClient;

	// Acts also as the "base Arrange step".
	beforeEach(async () => {
		providerStub = sinon.createStubInstance(JsonRpcProvider);

		signerStub = sinon.createStubInstance(JsonRpcSigner);
		signerStub.getAddress.resolves(Wallet.createRandom().address);

		networkStub = stubObject<Network>({ chainId: TEST_CHAIN_ID } as Network);

		providerStub.getNetwork.resolves(networkStub);

		signerWithProviderStub = { ...signerStub, provider: providerStub };
		signerStub.connect.withArgs(providerStub).returns(signerWithProviderStub);

		immutableSplitsDriverContractStub = stubInterface<ImmutableSplitsDriver>();
		sinon
			.stub(ImmutableSplitsDriver__factory, 'connect')
			.withArgs(Utils.Network.configs[TEST_CHAIN_ID].IMMUTABLE_SPLITS_DRIVER, signerWithProviderStub)
			.returns(immutableSplitsDriverContractStub);

		dripsHubClientStub = stubInterface<DripsClient>();
		sinon.stub(DripsClient, 'create').resolves(dripsHubClientStub);

		testImmutableSplitsDriverClient = await ImmutableSplitsDriverClient.create(providerStub, signerStub);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('create()', () => {
		it('should validate the signer', async () => {
			// Arrange
			const validateClientSignerStub = sinon.stub(validators, 'validateClientSigner');

			// Act
			await ImmutableSplitsDriverClient.create(providerStub, signerStub);

			// Assert
			assert(
				validateClientSignerStub.calledOnceWithExactly(signerWithProviderStub, Utils.Network.SUPPORTED_CHAINS),
				'Expected method to be called with different arguments'
			);
		});

		it('should validate the provider', async () => {
			// Arrange
			const validateClientProviderStub = sinon.stub(validators, 'validateClientProvider');

			// Act
			ImmutableSplitsDriverClient.create(providerStub, signerStub);

			// Assert
			assert(
				validateClientProviderStub.calledOnceWithExactly(providerStub, Utils.Network.SUPPORTED_CHAINS),
				'Expected method to be called with different arguments'
			);
		});

		it('should should throw a initializationError when client cannot be initialized', async () => {
			// Arrange
			let threw = false;

			try {
				// Act
				await ImmutableSplitsDriverClient.create(undefined as any, undefined as any);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INITIALIZATION_FAILURE);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should set the custom driver address when provided', async () => {
			// Arrange
			const customDriverAddress = Wallet.createRandom().address;

			// Act
			const client = await ImmutableSplitsDriverClient.create(providerStub, signerStub, customDriverAddress);

			// Assert
			assert.equal(client.driverAddress, customDriverAddress);
		});

		it('should create a fully initialized client instance', async () => {
			// Assert
			assert.equal(testImmutableSplitsDriverClient.signer, signerWithProviderStub);
			assert.equal(testImmutableSplitsDriverClient.provider, providerStub);
			assert.equal(testImmutableSplitsDriverClient.signer.provider, providerStub);
			assert.equal(
				testImmutableSplitsDriverClient.driverAddress,
				Utils.Network.configs[(await providerStub.getNetwork()).chainId].IMMUTABLE_SPLITS_DRIVER
			);
		});
	});

	describe('createSplits()', () => {
		it('should validate the splits receivers', async () => {
			// Arrange
			const expectedAccountId = '1';
			const receivers: SplitsReceiverStruct[] = [];
			const metadata: AccountMetadata[] = [{ key: 'key', value: 'value' }];
			const metadataAsBytes = metadata.map((m) => Utils.Metadata.createFromStrings(m.key, m.value));

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'CreatedSplits', args: { accountId: expectedAccountId } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			immutableSplitsDriverContractStub.createSplits.withArgs(receivers, metadataAsBytes).resolves(txResponse);

			const validateSplitsReceiversStub = sinon.stub(validators, 'validateSplitsReceivers');

			// Act
			await testImmutableSplitsDriverClient.createSplits(receivers, metadata);

			// Assert
			assert(validateSplitsReceiversStub.calledOnceWithExactly(receivers));
		});

		it('should validate the user metadata', async () => {
			// Arrange
			const expectedAccountId = '1';
			const receivers: SplitsReceiverStruct[] = [];
			const metadata: AccountMetadata[] = [{ key: 'key', value: 'value' }];
			const metadataAsBytes = metadata.map((m) => Utils.Metadata.createFromStrings(m.key, m.value));

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'CreatedSplits', args: { accountId: expectedAccountId } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			immutableSplitsDriverContractStub.createSplits.withArgs(receivers, metadataAsBytes).resolves(txResponse);

			const validateEmitAccountMetadataInputStub = sinon.stub(validators, 'validateEmitAccountMetadataInput');

			// Act
			await testImmutableSplitsDriverClient.createSplits(receivers, metadata);

			// Assert
			assert(validateEmitAccountMetadataInputStub.calledOnceWithExactly(metadata));
		});

		it('should throw a txEventNotFound when a transfer event is not found in the transaction', async () => {
			let threw = false;
			const receivers: SplitsReceiverStruct[] = [];
			const metadata: AccountMetadata[] = [{ key: 'key', value: 'value' }];
			const metadataAsBytes = metadata.map((m) => Utils.Metadata.createFromStrings(m.key, m.value));

			const waitFake = async () =>
				Promise.resolve({
					events: []
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			immutableSplitsDriverContractStub.createSplits.withArgs(receivers, metadataAsBytes).resolves(txResponse);

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
			const expectedAccountId = '1';
			const receivers: SplitsReceiverStruct[] = [];
			const metadata: AccountMetadata[] = [{ key: 'key', value: 'value' }];
			const metadataAsBytes = metadata.map((m) => Utils.Metadata.createFromStrings(m.key, m.value));

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'CreatedSplits', args: { accountId: expectedAccountId } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			immutableSplitsDriverContractStub.createSplits.withArgs(receivers, metadataAsBytes).resolves(txResponse);

			// Act
			await testImmutableSplitsDriverClient.createSplits(receivers, metadata);

			// Assert
			assert(
				immutableSplitsDriverContractStub.createSplits.calledOnceWithExactly(receivers, metadataAsBytes),
				'Expected method to be called with different arguments'
			);
		});
	});
});
