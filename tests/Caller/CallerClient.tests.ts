import type { Network } from '@ethersproject/networks';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import { assert } from 'chai';
import type { ContractTransaction, PopulatedTransaction } from 'ethers';
import { BigNumber, Wallet } from 'ethers';
import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubInterface, stubObject } from 'ts-sinon';
import type { Caller } from '../../contracts';
import { Caller__factory } from '../../contracts';
import CallerClient from '../../src/Caller/CallerClient';
import Utils from '../../src/utils';
import * as validators from '../../src/common/validators';
import type { CallStruct } from '../../contracts/Caller';
import type { Preset } from '../../src/common/types';
import { DripsErrorCode } from '../../src/common/DripsError';

describe('CallerClient', () => {
	const TEST_CHAIN_ID = 11155111; // Sepolia.

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
			.withArgs(Utils.Network.configs[TEST_CHAIN_ID].CALLER, signerWithProviderStub)
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
				validateClientSignerStub.calledOnceWithExactly(signerWithProviderStub, Utils.Network.SUPPORTED_CHAINS),
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
				Utils.Network.configs[(await providerStub.getNetwork()).chainId].CALLER
			);
		});
	});

	describe('callBatched', () => {
		it('should call callBatched with the correct input for Preset', async () => {
			const input: Preset = [
				{
					to: '0x111',
					data: '0x222',
					value: BigNumber.from(10)
				}
			];

			const expectedCallStructs: CallStruct[] = [
				{
					target: '0x111',
					data: '0x222',
					value: BigNumber.from(10)
				}
			];

			callerContractStub.callBatched.resolves({} as ContractTransaction);

			await testCallerClient.callBatched(input);

			assert(callerContractStub.callBatched.calledOnceWithExactly(expectedCallStructs, {}));
		});

		it('should call callBatched with the correct input for CallStruct[]', async () => {
			const input: CallStruct[] = [
				{
					target: '0x111',
					data: '0x222',
					value: 10
				}
			];

			callerContractStub.callBatched.resolves({} as ContractTransaction);

			await testCallerClient.callBatched(input);

			assert(callerContractStub.callBatched.calledOnceWithExactly(input, {}));
		});

		it('should set value to 0 when value is not provided', async () => {
			const input: PopulatedTransaction[] = [
				{
					to: '0x111',
					data: '0x222'
				}
			];

			callerContractStub.callBatched.resolves({} as ContractTransaction);

			await testCallerClient.callBatched(input, {});

			assert(callerContractStub.callBatched.calledOnceWithExactly([{ target: '0x111', data: '0x222', value: 0 }], {}));
		});

		it('should call callBatched with the correct input for PopulatedTransaction[]', async () => {
			const input: PopulatedTransaction[] = [
				{
					to: '0x111',
					data: '0x222',
					value: BigNumber.from(10)
				}
			];

			const expectedCallStructs: CallStruct[] = [
				{
					target: '0x111',
					data: '0x222',
					value: BigNumber.from(10)
				}
			];

			callerContractStub.callBatched.resolves({} as ContractTransaction);

			await testCallerClient.callBatched(input);

			assert(callerContractStub.callBatched.calledOnceWithExactly(expectedCallStructs, {}));
		});

		it('should throw an error for empty input array', async () => {
			const input: CallStruct[] = [];

			try {
				await testCallerClient.callBatched(input);
				assert.fail('Expected error was not thrown');
			} catch (error: any) {
				assert.strictEqual(error.code, DripsErrorCode.INVALID_ARGUMENT);
			}
		});

		it('should throw an error for invalid object input', async () => {
			const input: CallStruct[] = [
				{
					prop: 'invalid'
				} as any
			];

			try {
				await testCallerClient.callBatched(input);
				assert.fail('Expected error was not thrown');
			} catch (error: any) {
				assert.strictEqual(error.code, DripsErrorCode.INVALID_ARGUMENT);
			}
		});

		it('should throw an error for invalid PopulatedTransaction[] input', async () => {
			const input: CallStruct[] = [
				{
					to: 'invalid'
				} as any
			];

			try {
				await testCallerClient.callBatched(input);
				assert.fail('Expected error was not thrown');
			} catch (error: any) {
				assert.strictEqual(error.code, DripsErrorCode.INVALID_ARGUMENT);
			}
		});

		it('should throw an error for invalid input type', async () => {
			const input: any = 'invalid input';

			try {
				await testCallerClient.callBatched(input);
				assert.fail('Expected error was not thrown');
			} catch (error: any) {
				assert.strictEqual(error.code, DripsErrorCode.INVALID_ARGUMENT);
			}
		});
	});
});
