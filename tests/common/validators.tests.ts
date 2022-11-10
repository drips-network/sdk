import { assert } from 'chai';
import type { BigNumberish } from 'ethers';
import { Wallet } from 'ethers';
import sinon, { stubObject } from 'ts-sinon';
import { JsonRpcSigner, JsonRpcProvider } from '@ethersproject/providers';
import type { Network } from '@ethersproject/networks';
import * as validators from '../../src/common/validators';
import { DripsErrorCode } from '../../src/common/DripsError';
import type { DripsReceiver, DripsReceiverConfig } from '../../src/common/types';
import type { SplitsReceiverStruct } from '../../contracts/AddressDriver';
import Utils from '../../src/utils';

describe('validators', () => {
	afterEach(() => {
		sinon.restore();
	});

	describe('validateSetDripsInput', () => {
		it('should validate all inputs', () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;
			const currentReceivers: {
				userId: string;
				config: DripsReceiverConfig;
			}[] = [];
			const newReceivers: {
				userId: string;
				config: DripsReceiverConfig;
			}[] = [];
			const balanceDelta = 1;

			const validateAddressStub = sinon.stub(validators, 'validateAddress');
			const validateDripsReceiversStub = sinon.stub(validators, 'validateDripsReceivers');

			// Act
			validators.validateSetDripsInput(tokenAddress, currentReceivers, newReceivers, transferToAddress, balanceDelta);

			// Assert
			assert(validateAddressStub.calledTwice);
			assert(
				validateAddressStub.calledWithExactly(tokenAddress),
				'Expected method to be called with different arguments'
			);
			assert(
				validateAddressStub.calledWithExactly(transferToAddress),
				'Expected method to be called with different arguments'
			);

			assert(validateDripsReceiversStub.calledTwice);
			assert(
				validateDripsReceiversStub.calledWithExactly(newReceivers),
				'Expected method to be called with different arguments'
			);
			assert(
				validateDripsReceiversStub.calledWithExactly(currentReceivers),
				'Expected method to be called with different arguments'
			);
		});

		it('should throw an argumentMissingError when balanceDelta is missing', () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;
			const currentReceivers: {
				userId: string;
				config: DripsReceiverConfig;
			}[] = [];
			const newReceivers: {
				userId: string;
				config: DripsReceiverConfig;
			}[] = [];

			let threw = false;

			// Act
			try {
				// Act
				validators.validateSetDripsInput(
					tokenAddress,
					currentReceivers,
					newReceivers,
					transferToAddress,
					undefined as unknown as BigNumberish
				);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});
	});

	describe('validateSplitInput', () => {
		it('should validate all inputs', () => {
			// Arrange
			const userId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const currentReceivers: SplitsReceiverStruct[] = [];

			const validateAddressStub = sinon.stub(validators, 'validateAddress');
			const validateSplitsReceiversStub = sinon.stub(validators, 'validateSplitsReceivers');

			// Act
			validators.validateSplitInput(userId, tokenAddress, currentReceivers);

			// Assert
			assert(
				validateAddressStub.calledOnceWithExactly(tokenAddress),
				'Expected method to be called with different arguments'
			);
			assert(
				validateSplitsReceiversStub.calledOnceWithExactly(currentReceivers),
				'Expected method to be called with different arguments'
			);
		});

		it('should throw an argumentMissingError when userId is missing', () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;
			const currentReceivers: SplitsReceiverStruct[] = [];

			let threw = false;

			try {
				// Act
				validators.validateSplitInput(undefined as unknown as string, tokenAddress, currentReceivers);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});
	});

	describe('validateEmitUserMetadataInput', () => {
		it('should throw an argumentMissingError when key is missing', () => {
			// Arrange
			const value = 'value';

			let threw = false;

			// Act
			try {
				// Act
				validators.validateEmitUserMetadataInput(undefined as unknown as BigNumberish, value);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw an argumentMissingError when value is missing', () => {
			// Arrange
			const key = 1;

			let threw = false;

			// Act
			try {
				// Act
				validators.validateEmitUserMetadataInput(key, undefined as unknown as string);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});
	});

	describe('validateReceiveDripsInput', () => {
		it('should validate the tokenAddress', () => {
			// Arrange
			const userId = '1';
			const maxCycles = 1;
			const tokenAddress = Wallet.createRandom().address;

			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			// Act
			validators.validateReceiveDripsInput(userId, tokenAddress, maxCycles);

			// Assert
			assert(
				validateAddressStub.calledOnceWithExactly(tokenAddress),
				'Expected method to be called with different arguments'
			);
		});

		it('should throw an argumentMissingError when userId is missing', () => {
			// Arrange
			const maxCycles = 1;
			const tokenAddress = Wallet.createRandom().address;
			let threw = false;

			// Act
			try {
				// Act
				validators.validateReceiveDripsInput(undefined as unknown as string, tokenAddress, maxCycles);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw an argumentError when maxCycles is missing', () => {
			// Arrange
			const userId = '1';
			const tokenAddress = Wallet.createRandom().address;
			let threw = false;

			// Act
			try {
				// Act
				validators.validateReceiveDripsInput(userId, tokenAddress, undefined as unknown as BigNumberish);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw an argumentError when maxCycles is less than 0', () => {
			// Arrange
			const userId = '1';
			const maxCycles = -1;
			const tokenAddress = Wallet.createRandom().address;
			let threw = false;

			// Act
			try {
				// Act
				validators.validateReceiveDripsInput(userId, tokenAddress, maxCycles);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});
	});

	describe('validateCollectInput', () => {
		it('should validate all inputs', () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;

			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			// Act
			validators.validateCollectInput(tokenAddress, transferToAddress);

			// Assert
			assert(
				validateAddressStub.calledWithExactly(tokenAddress),
				'Expected method to be called with different arguments'
			);
			assert(
				validateAddressStub.calledWithExactly(transferToAddress),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('validateAddress()', () => {
		it('should throw addressError error when the input is missing', () => {
			// Arrange
			let threw = false;

			// Act
			try {
				// Act
				validators.validateAddress(undefined as unknown as string);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ADDRESS);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw addressError error when the address is not valid', () => {
			// Arrange
			let threw = false;
			const address = 'invalid address';

			// Act
			try {
				// Act
				validators.validateAddress(address);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ADDRESS);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});
	});

	describe('validateDripsReceiverConfig()', () => {
		it('should throw argumentMissingError when config is missing', () => {
			// Arrange
			let threw = false;

			// Act
			try {
				validators.validateDripsReceiverConfig(undefined as unknown as DripsReceiverConfig);
			} catch (error: any) {
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw dripsReceiverError when drips receiver configuration dripId is less than 0', () => {
			// Arrange
			let threw = false;

			// Act
			try {
				validators.validateDripsReceiverConfig({ dripId: -1n, start: 1n, duration: 1n, amountPerSec: 1n });
			} catch (error: any) {
				assert.equal(error.code, DripsErrorCode.INVALID_DRIPS_RECEIVER_CONFIG);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw dripsReceiverError when drips receiver configuration start is less than 0', () => {
			// Arrange
			let threw = false;

			// Act
			try {
				validators.validateDripsReceiverConfig({ dripId: 1n, start: -1n, duration: 1n, amountPerSec: 1n });
			} catch (error: any) {
				assert.equal(error.code, DripsErrorCode.INVALID_DRIPS_RECEIVER_CONFIG);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw dripsReceiverError when drips receiver configuration duration is less than 0', () => {
			// Arrange
			let threw = false;

			// Act
			try {
				validators.validateDripsReceiverConfig({ dripId: 1n, start: 1n, duration: -1n, amountPerSec: 1n });
			} catch (error: any) {
				assert.equal(error.code, DripsErrorCode.INVALID_DRIPS_RECEIVER_CONFIG);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw dripsReceiverError when drips receiver configuration amountPerSec is equal to 0', () => {
			// Arrange
			let threw = false;

			// Act
			try {
				validators.validateDripsReceiverConfig({ dripId: 1n, start: 1n, duration: 1n, amountPerSec: 0n });
			} catch (error: any) {
				assert.equal(error.code, DripsErrorCode.INVALID_DRIPS_RECEIVER_CONFIG);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw dripsReceiverError when drips receiver configuration amountPerSec is less than 0', () => {
			// Arrange
			let threw = false;

			// Act
			try {
				validators.validateDripsReceiverConfig({ dripId: 1n, start: 1n, duration: 1n, amountPerSec: -1n });
			} catch (error: any) {
				assert.equal(error.code, DripsErrorCode.INVALID_DRIPS_RECEIVER_CONFIG);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});
	});

	describe('validateDripsReceivers()', () => {
		it('should throw argumentMissingError when receivers are missing', () => {
			// Arrange
			let threw = false;

			try {
				// Act
				validators.validateDripsReceivers(undefined as unknown as DripsReceiver[]);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw argumentError error when receivers are more than the max allowed', async () => {
			// Arrange
			let threw = false;
			const receivers = Array(101).fill({
				userId: undefined as unknown as number,
				config: { amountPerSec: 1n, duration: 1n, start: 1n }
			});

			try {
				// Act
				validators.validateDripsReceivers(receivers);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw dripsReceiverError when receiver userId is missing', () => {
			// Arrange
			let threw = false;
			const receivers = [
				{
					userId: undefined as unknown as string,
					config: { dripId: 1n, amountPerSec: 1n, duration: 1n, start: 1n }
				}
			];

			try {
				// Act
				validators.validateDripsReceivers(receivers);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_DRIPS_RECEIVER);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw dripsReceiverError when receiver config is missing', () => {
			// Arrange
			let threw = false;
			const receivers: DripsReceiver[] = [
				{
					userId: '123',
					config: undefined as unknown as DripsReceiverConfig
				}
			];

			try {
				// Act
				validators.validateDripsReceivers(receivers);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_DRIPS_RECEIVER);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it("should validate receivers' configs", () => {
			// Arrange
			const receivers: DripsReceiver[] = [
				{
					userId: '123',
					config: { dripId: 1n, amountPerSec: 1n, duration: 1n, start: 1n }
				}
			];

			const validateDripsReceiverConfigObjStub = sinon.stub(validators, 'validateDripsReceiverConfig');

			// Act
			validators.validateDripsReceivers(receivers);

			// Assert
			assert(
				validateDripsReceiverConfigObjStub.calledWithExactly(
					sinon.match(
						(config: DripsReceiverConfig) =>
							Utils.DripsReceiverConfiguration.toUint256(config) ===
							Utils.DripsReceiverConfiguration.toUint256(receivers[0].config)
					)
				),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('validateSplitsReceivers()', () => {
		it('should throw argumentMissingError when receivers are missing', () => {
			// Arrange
			let threw = false;

			try {
				// Act
				validators.validateSplitsReceivers(undefined as unknown as SplitsReceiverStruct[]);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw argumentError error when receivers are more than the max allowed', async () => {
			// Arrange
			let threw = false;
			const receivers: SplitsReceiverStruct[] = Array(201).fill({
				userId: undefined as unknown as number,
				weight: 1
			});

			try {
				// Act
				validators.validateSplitsReceivers(receivers);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw splitsReceiverError when receiver userId is missing', () => {
			// Arrange
			let threw = false;
			const receivers: SplitsReceiverStruct[] = [
				{
					weight: 123,
					userId: undefined as unknown as string
				}
			];

			try {
				// Act
				validators.validateSplitsReceivers(receivers);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_SPLITS_RECEIVER);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw splitsReceiverError when receiver weight is missing', () => {
			// Arrange
			let threw = false;
			const receivers: SplitsReceiverStruct[] = [
				{
					userId: 123,
					weight: undefined as unknown as BigNumberish
				}
			];

			try {
				// Act
				validators.validateSplitsReceivers(receivers);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_SPLITS_RECEIVER);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw splitsReceiverError when receiver weight is equal to 0', () => {
			// Arrange
			let threw = false;
			const receivers: SplitsReceiverStruct[] = [
				{
					userId: 123n,
					weight: 0
				}
			];

			try {
				// Act
				validators.validateSplitsReceivers(receivers);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_SPLITS_RECEIVER);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw splitsReceiverError when receiver weight is less than 0', () => {
			// Arrange
			let threw = false;
			const receivers: SplitsReceiverStruct[] = [
				{
					userId: 123n,
					weight: -1
				}
			];

			try {
				// Act
				validators.validateSplitsReceivers(receivers);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_SPLITS_RECEIVER);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});
	});

	describe('validateClientProvider', () => {
		it('should throw the expected error when the provider is missing', async () => {
			// Arrange
			let threw = false;

			try {
				// Act
				await validators.validateClientProvider(undefined as unknown as JsonRpcProvider, []);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it("should throw the expected error when the provider's signer is missing", async () => {
			// Arrange
			let threw = false;
			const providerStub = sinon.createStubInstance(JsonRpcProvider);

			providerStub.getSigner.returns(undefined as unknown as JsonRpcSigner);

			try {
				// Act
				await validators.validateClientProvider(providerStub, []);
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
			const validateAddressStub = sinon.stub(validators, 'validateAddress');
			const providerStub = sinon.createStubInstance(JsonRpcProvider);
			const signerStub = sinon.createStubInstance(JsonRpcSigner);
			signerStub.getAddress.resolves(Wallet.createRandom().address);
			const networkStub = stubObject<Network>({ chainId: 5 } as Network);
			providerStub.getSigner.returns(signerStub);
			providerStub.getNetwork.resolves(networkStub);

			// Act
			await validators.validateClientProvider(providerStub, [5]);

			// Assert
			assert(
				validateAddressStub.calledOnceWithExactly(await signerStub.getAddress()),
				'Expected method to be called with different arguments'
			);
		});

		it('should throw unsupportedNetworkError error when the provider is connected to an unsupported network', async () => {
			// Arrange
			let threw = false;
			const providerStub = sinon.createStubInstance(JsonRpcProvider);
			const signerStub = sinon.createStubInstance(JsonRpcSigner);
			signerStub.getAddress.resolves(Wallet.createRandom().address);
			const networkStub = stubObject<Network>({ chainId: -1 } as Network);
			providerStub.getSigner.returns(signerStub);
			providerStub.getNetwork.resolves(networkStub);

			try {
				// Act
				await validators.validateClientProvider(providerStub, [5]);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.UNSUPPORTED_NETWORK);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});
	});
});
