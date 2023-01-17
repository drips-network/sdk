import type { Network } from '@ethersproject/networks';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import { assert } from 'chai';
import { Wallet } from 'ethers';
import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubInterface, stubObject } from 'ts-sinon';
import type { Caller } from '../../contracts';
import { Caller__factory } from '../../contracts';
import CallerClient from '../../src/Caller/CallerClient';
import Utils from '../../src/utils';
import * as validators from '../../src/common/validators';
import type { CallStruct } from '../../contracts/Caller';
import { DripsErrorCode } from '../../src/common/DripsError';

describe('CallerClient', () => {
	const TEST_CHAIN_ID = 5; // Goerli.

	let networkStub: StubbedInstance<Network>;
	let signerStub: StubbedInstance<JsonRpcSigner>;
	let callerContractStub: StubbedInstance<Caller>;
	let signerWithProviderStub: StubbedInstance<JsonRpcSigner>;
	let providerStub: sinon.SinonStubbedInstance<JsonRpcProvider>;

	let testCallerClient: CallerClient;

	// Acts also as the "base Arrange step".
	beforeEach(async () => {
		providerStub = sinon.createStubInstance(JsonRpcProvider);

		signerStub = sinon.createStubInstance(JsonRpcSigner);
		signerStub.getAddress.resolves(Wallet.createRandom().address);

		networkStub = stubObject<Network>({ chainId: TEST_CHAIN_ID } as Network);

		providerStub.getNetwork.resolves(networkStub);

		signerWithProviderStub = { ...signerStub, provider: providerStub };
		signerStub.connect.withArgs(providerStub).returns(signerWithProviderStub);

		callerContractStub = stubInterface<Caller>();
		sinon
			.stub(Caller__factory, 'connect')
			.withArgs(Utils.Network.configs[TEST_CHAIN_ID].CONTRACT_CALLER, signerWithProviderStub)
			.returns(callerContractStub);

		testCallerClient = await CallerClient.create(providerStub, signerStub);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('create()', () => {
		it('should validate the signer', async () => {
			// Arrange
			const validateClientSignerStub = sinon.stub(validators, 'validateClientSigner');

			// Act
			await CallerClient.create(providerStub, signerStub);

			// Assert
			assert(
				validateClientSignerStub.calledOnceWithExactly(signerStub),
				'Expected method to be called with different arguments'
			);
		});

		it('should validate the provider', async () => {
			// Arrange
			const validateClientProviderStub = sinon.stub(validators, 'validateClientProvider');

			// Act
			CallerClient.create(providerStub, signerStub);

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
				await CallerClient.create(undefined as any, undefined as any);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.CLIENT_INITIALIZATION_FAILURE);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should set the custom caller address when provided', async () => {
			// Arrange
			const customCallerAddress = Wallet.createRandom().address;

			// Act
			const client = await CallerClient.create(providerStub, signerStub, customCallerAddress);

			// Assert
			assert.equal(client.callerAddress, customCallerAddress);
		});

		it('should create a fully initialized client instance', async () => {
			// Assert
			assert.equal(testCallerClient.signer, signerWithProviderStub);
			assert.equal(testCallerClient.provider, providerStub);
			assert.equal(testCallerClient.signer.provider, providerStub);
			assert.equal(
				testCallerClient.callerAddress,
				Utils.Network.configs[(await providerStub.getNetwork()).chainId].CONTRACT_CALLER
			);
		});
	});

	describe('callBatched', () => {
		it('should call the callBatched method on the caller contract', async () => {
			// Arrange
			const calls: CallStruct[] = [
				{
					to: 'to',
					data: 'data',
					value: 100
				}
			];

			// Act
			await testCallerClient.callBatched(calls);

			// Assert
			assert(callerContractStub.callBatched.calledOnceWithExactly(calls));
		});
	});
});
