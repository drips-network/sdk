import { assert } from 'chai';
import type { BigNumberish } from 'ethers';
import { Wallet } from 'ethers';
import sinon, { stubObject } from 'ts-sinon';
import { JsonRpcSigner, JsonRpcProvider } from '@ethersproject/providers';
import type { Network } from '@ethersproject/networks';
import * as validators from '../../src/common/validators';
import { DripsErrorCode } from '../../src/common/DripsError';
import type { StreamsHistoryStruct, StreamReceiver, StreamConfig, AccountMetadata } from '../../src/common/types';
import type { SplitsReceiverStruct } from '../../contracts/AddressDriver';
import Utils from '../../src/utils';

describe('validators', () => {
	afterEach(() => {
		sinon.restore();
	});

	describe('validateSetStreamsInput', () => {
		it('should validate all inputs', () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;
			const currentReceivers: {
				accountId: string;
				config: StreamConfig;
			}[] = [];
			const newReceivers: {
				accountId: string;
				config: StreamConfig;
			}[] = [];
			const balanceDelta = 1;

			const validateAddressStub = sinon.stub(validators, 'validateAddress');
			const validateStreamReceiversStub = sinon.stub(validators, 'validateStreamReceivers');

			// Act
			validators.validateSetStreamsInput(tokenAddress, currentReceivers, newReceivers, transferToAddress, balanceDelta);

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

			assert(validateStreamReceiversStub.calledTwice);
			assert(
				validateStreamReceiversStub.calledWithExactly(newReceivers),
				'Expected method to be called with different arguments'
			);
			assert(
				validateStreamReceiversStub.calledWithExactly(currentReceivers),
				'Expected method to be called with different arguments'
			);
		});

		it('should throw an argumentMissingError when balanceDelta is missing', () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;
			const currentReceivers: {
				accountId: string;
				config: StreamConfig;
			}[] = [];
			const newReceivers: {
				accountId: string;
				config: StreamConfig;
			}[] = [];

			let threw = false;

			// Act
			try {
				// Act
				validators.validateSetStreamsInput(
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
			const accountId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const currentReceivers: SplitsReceiverStruct[] = [];

			const validateAddressStub = sinon.stub(validators, 'validateAddress');
			const validateSplitsReceiversStub = sinon.stub(validators, 'validateSplitsReceivers');

			// Act
			validators.validateSplitInput(accountId, tokenAddress, currentReceivers);

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

		it('should throw an argumentMissingError when accountId is missing', () => {
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

	describe('validateEmitAccountMetadataInput', () => {
		it('should throw an argumentError when metadata are missing', () => {
			// Arrange
			let threw = false;

			// Act
			try {
				// Act
				validators.validateEmitAccountMetadataInput(undefined as unknown as AccountMetadata[]);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw an argumentError when key is missing in a metadata entry', () => {
			// Arrange
			let threw = false;

			// Act
			try {
				// Act
				validators.validateEmitAccountMetadataInput([{ key: undefined as unknown as string, value: 'value' }]);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw an argumentError when value is missing in a metadata entry', () => {
			// Arrange
			let threw = false;

			// Act
			try {
				// Act
				validators.validateEmitAccountMetadataInput([{ key: 'key', value: undefined as unknown as string }]);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});
	});

	describe('validateReceiveDripsInput', () => {
		it('should validate the tokenAddress', () => {
			// Arrange
			const accountId = '1';
			const maxCycles = 1;
			const tokenAddress = Wallet.createRandom().address;

			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			// Act
			validators.validateReceiveDripsInput(accountId, tokenAddress, maxCycles);

			// Assert
			assert(
				validateAddressStub.calledOnceWithExactly(tokenAddress),
				'Expected method to be called with different arguments'
			);
		});

		it('should throw an argumentMissingError when accountId is missing', () => {
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
			const accountId = '1';
			const tokenAddress = Wallet.createRandom().address;
			let threw = false;

			// Act
			try {
				// Act
				validators.validateReceiveDripsInput(accountId, tokenAddress, undefined as unknown as BigNumberish);
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
			const accountId = '1';
			const maxCycles = -1;
			const tokenAddress = Wallet.createRandom().address;
			let threw = false;

			// Act
			try {
				// Act
				validators.validateReceiveDripsInput(accountId, tokenAddress, maxCycles);
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

	describe('validateStreamConfig()', () => {
		it('should throw argumentMissingError when config is missing', () => {
			// Arrange
			let threw = false;

			// Act
			try {
				validators.validateStreamConfig(undefined as unknown as StreamConfig);
			} catch (error: any) {
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw streamsReceiverError when drips receiver configuration dripId is less than 0', () => {
			// Arrange
			let threw = false;

			// Act
			try {
				validators.validateStreamConfig({ dripId: -1n, start: 1n, duration: 1n, amountPerSec: 1n });
			} catch (error: any) {
				assert.equal(error.code, DripsErrorCode.INVALID_DRIPS_RECEIVER_CONFIG);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw streamsReceiverError when drips receiver configuration start is less than 0', () => {
			// Arrange
			let threw = false;

			// Act
			try {
				validators.validateStreamConfig({ dripId: 1n, start: -1n, duration: 1n, amountPerSec: 1n });
			} catch (error: any) {
				assert.equal(error.code, DripsErrorCode.INVALID_DRIPS_RECEIVER_CONFIG);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw streamsReceiverError when drips receiver configuration duration is less than 0', () => {
			// Arrange
			let threw = false;

			// Act
			try {
				validators.validateStreamConfig({ dripId: 1n, start: 1n, duration: -1n, amountPerSec: 1n });
			} catch (error: any) {
				assert.equal(error.code, DripsErrorCode.INVALID_DRIPS_RECEIVER_CONFIG);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw streamsReceiverError when drips receiver configuration amountPerSec is equal to 0', () => {
			// Arrange
			let threw = false;

			// Act
			try {
				validators.validateStreamConfig({ dripId: 1n, start: 1n, duration: 1n, amountPerSec: 0n });
			} catch (error: any) {
				assert.equal(error.code, DripsErrorCode.INVALID_DRIPS_RECEIVER_CONFIG);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw streamsReceiverError when drips receiver configuration amountPerSec is less than 0', () => {
			// Arrange
			let threw = false;

			// Act
			try {
				validators.validateStreamConfig({ dripId: 1n, start: 1n, duration: 1n, amountPerSec: -1n });
			} catch (error: any) {
				assert.equal(error.code, DripsErrorCode.INVALID_DRIPS_RECEIVER_CONFIG);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});
	});

	describe('validateStreamReceivers()', () => {
		it('should throw argumentMissingError when receivers are missing', () => {
			// Arrange
			let threw = false;

			try {
				// Act
				validators.validateStreamReceivers(undefined as unknown as StreamReceiver[]);
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
				accountId: undefined as unknown as number,
				config: { amountPerSec: 1n, duration: 1n, start: 1n }
			});

			try {
				// Act
				validators.validateStreamReceivers(receivers);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw streamsReceiverError when receiver accountId is missing', () => {
			// Arrange
			let threw = false;
			const receivers = [
				{
					accountId: undefined as unknown as string,
					config: { dripId: 1n, amountPerSec: 1n, duration: 1n, start: 1n }
				}
			];

			try {
				// Act
				validators.validateStreamReceivers(receivers);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_DRIPS_RECEIVER);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw streamsReceiverError when receiver config is missing', () => {
			// Arrange
			let threw = false;
			const receivers: StreamReceiver[] = [
				{
					accountId: '123',
					config: undefined as unknown as StreamConfig
				}
			];

			try {
				// Act
				validators.validateStreamReceivers(receivers);
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
			const receivers: StreamReceiver[] = [
				{
					accountId: '123',
					config: { dripId: 1n, amountPerSec: 1n, duration: 1n, start: 1n }
				}
			];

			const validateStreamConfigObjStub = sinon.stub(validators, 'validateStreamConfig');

			// Act
			validators.validateStreamReceivers(receivers);

			// Assert
			assert(
				validateStreamConfigObjStub.calledWithExactly(
					sinon.match(
						(config: StreamConfig) =>
							Utils.StreamConfiguration.toUint256(config) === Utils.StreamConfiguration.toUint256(receivers[0].config)
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
				accountId: undefined as unknown as number,
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

		it('should throw splitsReceiverError when receiver accountId is missing', () => {
			// Arrange
			let threw = false;
			const receivers: SplitsReceiverStruct[] = [
				{
					weight: 123,
					accountId: undefined as unknown as string
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
					accountId: 123,
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
					accountId: 123n,
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
					accountId: 123n,
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
				assert.equal(error.code, DripsErrorCode.INITIALIZATION_FAILURE);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
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
				assert.equal(error.code, DripsErrorCode.INITIALIZATION_FAILURE);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});
	});

	describe('validateClientSigner', () => {
		it('should throw the expected error when the signer is missing', async () => {
			// Arrange
			let threw = false;

			try {
				// Act
				await validators.validateClientSigner(undefined as unknown as JsonRpcSigner, Utils.Network.SUPPORTED_CHAINS);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INITIALIZATION_FAILURE);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});
	});

	describe('validateSqueezeDripsInput', () => {
		it('should throw an argumentError when accountId is missing', () => {
			// Arrange
			let threw = false;

			// Act
			try {
				// Act
				validators.validateSqueezeDripsInput(
					undefined as unknown as string,
					Wallet.createRandom().address,
					'1',
					'0x00',
					[]
				);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should validate the tokenAddress', () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;

			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			// Act
			validators.validateSqueezeDripsInput('1', tokenAddress, '1', '0x00', []);
			// Assert
			assert(
				validateAddressStub.calledOnceWithExactly(tokenAddress),
				'Expected method to be called with different arguments'
			);
		});

		it('should throw an argumentError when senderId is missing', () => {
			// Arrange
			let threw = false;

			// Act
			try {
				// Act
				validators.validateSqueezeDripsInput(
					'1',
					Wallet.createRandom().address,
					undefined as unknown as string,
					'0x00',
					[]
				);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw an argumentError when historyHash is missing in a metadata entry', () => {
			// Arrange
			let threw = false;

			// Act
			try {
				// Act
				validators.validateSqueezeDripsInput(
					'1',
					Wallet.createRandom().address,
					'1',
					undefined as unknown as string,
					[]
				);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw an argumentError when streamsHistory is missing in a metadata entry', () => {
			// Arrange
			let threw = false;

			// Act
			try {
				// Act
				validators.validateSqueezeDripsInput(
					'1',
					Wallet.createRandom().address,
					'1',
					'0x00',
					undefined as unknown as StreamsHistoryStruct[]
				);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});
	});
});
