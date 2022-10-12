import type { Network } from '@ethersproject/networks';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import { assert } from 'chai';
import { Wallet } from 'ethers';
import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubInterface, stubObject } from 'ts-sinon';
import { ImmutableSplitsDriver__factory } from '../../contracts/factories/ImmutableSplitsDriver__factory';
import type {
	ImmutableSplitsDriver,
	SplitsReceiverStruct,
	UserMetadataStruct
} from '../../contracts/ImmutableSplitsDriver';
import { DripsErrorCode } from '../../dist';
import DripsHubClient from '../../src/DripsHub/DripsHubClient';
import ImmutableSplitsDriverClient from '../../src/ImmutableSplits/ImmutableSplitsDriver';
import Utils from '../../src/utils';
import * as internals from '../../src/common/internals';

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
			.withArgs(Utils.Network.dripsMetadata[TEST_CHAIN_ID].CONTRACT_IMMUTABLE_SPLITS_DRIVER, signerStub)
			.returns(immutableSplitsDriverContractStub);

		dripsHubClientStub = stubInterface<DripsHubClient>();
		sinon.stub(DripsHubClient, 'create').resolves(dripsHubClientStub);

		testImmutableSplitsDriverClient = await ImmutableSplitsDriverClient.create(providerStub);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('create()', () => {
		it('should throw argumentMissingError error when the provider is missing', async () => {
			// Arrange
			let threw = false;

			try {
				// Act
				await ImmutableSplitsDriverClient.create(undefined as unknown as JsonRpcProvider);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it("should throw argumentMissingError error when the provider's signer is missing", async () => {
			// Arrange
			let threw = false;
			providerStub.getSigner.returns(undefined as unknown as JsonRpcSigner);

			try {
				// Act
				await ImmutableSplitsDriverClient.create(providerStub);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it("should validate the provider's signer address", async () => {
			// Arrange
			const validateAddressStub = sinon.stub(internals, 'validateAddress');

			// Act
			ImmutableSplitsDriverClient.create(providerStub);

			// Assert
			assert(
				validateAddressStub.calledOnceWithExactly(await signerStub.getAddress()),
				'Expected method to be called with different arguments'
			);
		});

		it('should throw unsupportedNetworkError error when the provider is connected to an unsupported network', async () => {
			// Arrange
			let threw = false;
			providerStub.getNetwork.resolves({ chainId: TEST_CHAIN_ID + 1 } as Network);

			try {
				// Act
				await ImmutableSplitsDriverClient.create(providerStub);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.UNSUPPORTED_NETWORK);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should create a fully initialized client instance', async () => {
			// Assert
			assert.equal(await testImmutableSplitsDriverClient.signer.getAddress(), await signerStub.getAddress());
			assert.equal(testImmutableSplitsDriverClient.network.chainId, networkStub.chainId);
			assert.equal(
				await testImmutableSplitsDriverClient.provider.getSigner().getAddress(),
				await providerStub.getSigner().getAddress()
			);
			assert.equal(
				testImmutableSplitsDriverClient.dripsMetadata,
				Utils.Network.dripsMetadata[(await providerStub.getNetwork()).chainId]
			);
			assert.equal(testImmutableSplitsDriverClient.signerAddress, await signerStub.getAddress());
		});
	});

	describe('createSplits()', () => {
		it('should throw argumentMissingError error when receivers are missing', async () => {
			// Arrange
			let threw = false;
			providerStub.getSigner.returns(undefined as unknown as JsonRpcSigner);

			try {
				// Act
				await testImmutableSplitsDriverClient.createSplits(undefined as unknown as SplitsReceiverStruct[], []);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should validate the ERC20 address', async () => {
			// Arrange
			const receivers: SplitsReceiverStruct[] = [];

			const validateSplitsReceiversStub = sinon.stub(internals, 'validateSplitsReceivers');

			// Act
			await testImmutableSplitsDriverClient.createSplits(receivers, []);

			// Assert
			assert(validateSplitsReceiversStub.calledOnceWithExactly(receivers));
		});

		it('should throw argumentMissingError error when metadata are missing', async () => {
			// Arrange
			let threw = false;
			providerStub.getSigner.returns(undefined as unknown as JsonRpcSigner);

			try {
				// Act
				await testImmutableSplitsDriverClient.createSplits([], undefined as unknown as UserMetadataStruct[]);
			} catch (error: any) {
				// MISSING_ARGUMENT
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should call the createSplits() method of the AddressDriver contract', async () => {
			// Arrange
			const receivers: SplitsReceiverStruct[] = [];
			const metadata: UserMetadataStruct[] = [];

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
