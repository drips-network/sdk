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

describe('CallerClient', () => {
	const TEST_CHAIN_ID = 5; // Goerli.

	let networkStub: StubbedInstance<Network>;
	let signerStub: StubbedInstance<JsonRpcSigner>;
	let callerContractStub: StubbedInstance<Caller>;
	let providerStub: sinon.SinonStubbedInstance<JsonRpcProvider>;

	let testCallerClient: CallerClient;

	// Acts also as the "base Arrange step".
	beforeEach(async () => {
		providerStub = sinon.createStubInstance(JsonRpcProvider);

		signerStub = sinon.createStubInstance(JsonRpcSigner);
		signerStub.getAddress.resolves(Wallet.createRandom().address);

		networkStub = stubObject<Network>({ chainId: TEST_CHAIN_ID } as Network);

		providerStub.getSigner.returns(signerStub);
		providerStub.getNetwork.resolves(networkStub);

		callerContractStub = stubInterface<Caller>();
		sinon
			.stub(Caller__factory, 'connect')
			.withArgs(Utils.Network.configs[TEST_CHAIN_ID].CONTRACT_CALLER, signerStub)
			.returns(callerContractStub);

		testCallerClient = await CallerClient.create(providerStub);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('create()', () => {
		it('should validate the provider', async () => {
			// Arrange
			const validateClientProviderStub = sinon.stub(validators, 'validateClientProvider');

			// Act
			CallerClient.create(providerStub);

			// Assert
			assert(
				validateClientProviderStub.calledOnceWithExactly(providerStub, Utils.Network.SUPPORTED_CHAINS),
				'Expected method to be called with different arguments'
			);
		});

		it('should set the custom caller address when provided', async () => {
			// Arrange
			const customDriverAddress = Wallet.createRandom().address;

			// Act
			const client = await CallerClient.create(providerStub, customDriverAddress);

			// Assert
			assert.equal(client.callerAddress, customDriverAddress);
		});

		it('should create a fully initialized client instance', async () => {
			// Assert
			assert.equal(testCallerClient.provider, providerStub);
			assert.equal(testCallerClient.provider.getSigner(), providerStub.getSigner());
			assert.equal(
				await testCallerClient.provider.getSigner().getAddress(),
				await providerStub.getSigner().getAddress()
			);
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
