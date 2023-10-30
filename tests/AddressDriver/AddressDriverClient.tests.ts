import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubObject, stubInterface } from 'ts-sinon';
import { assert } from 'chai';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import type { Network } from '@ethersproject/networks';
import { BigNumber, constants, ethers, Wallet } from 'ethers';
import type { AddressDriver, IERC20 } from '../../contracts';
import { IERC20__factory, AddressDriver__factory } from '../../contracts';
import type { SplitsReceiverStruct, StreamReceiverStruct, AccountMetadata } from '../../src/common/types';
import AddressDriverClient from '../../src/AddressDriver/AddressDriverClient';
import Utils from '../../src/utils';
import { DripsErrorCode } from '../../src/common/DripsError';
import * as validators from '../../src/common/validators';
import * as internals from '../../src/common/internals';
import AddressDriverTxFactory from '../../src/AddressDriver/AddressDriverTxFactory';

describe('AddressDriverClient', () => {
	const TEST_CHAIN_ID = 11155111; // Sepolia.

	let networkStub: StubbedInstance<Network>;
	let signerStub: StubbedInstance<JsonRpcSigner>;
	let providerStub: sinon.SinonStubbedInstance<JsonRpcProvider>;
	let addressDriverContractStub: StubbedInstance<AddressDriver>;
	let addressDriverTxFactoryStub: StubbedInstance<AddressDriverTxFactory>;
	let signerWithProviderStub: StubbedInstance<JsonRpcSigner>;

	let testAddressDriverClient: AddressDriverClient;

	// Acts also as the "base Arrange step".
	beforeEach(async () => {
		providerStub = sinon.createStubInstance(JsonRpcProvider);

		signerStub = sinon.createStubInstance(JsonRpcSigner);
		signerStub.getAddress.resolves(Wallet.createRandom().address);

		networkStub = stubObject<Network>({ chainId: TEST_CHAIN_ID } as Network);

		providerStub.getNetwork.resolves(networkStub);

		signerWithProviderStub = { ...signerStub, provider: providerStub };
		signerStub.connect.withArgs(providerStub).returns(signerWithProviderStub);

		addressDriverContractStub = stubInterface<AddressDriver>();
		sinon
			.stub(AddressDriver__factory, 'connect')
			.withArgs(Utils.Network.configs[TEST_CHAIN_ID].ADDRESS_DRIVER, signerWithProviderStub)
			.returns(addressDriverContractStub);

		addressDriverTxFactoryStub = stubInterface<AddressDriverTxFactory>();
		sinon
			.stub(AddressDriverTxFactory, 'create')
			.withArgs(signerStub, Utils.Network.configs[TEST_CHAIN_ID].ADDRESS_DRIVER)
			.resolves(addressDriverTxFactoryStub);

		testAddressDriverClient = await AddressDriverClient.create(
			providerStub,
			signerStub,
			undefined,
			addressDriverTxFactoryStub
		);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('create()', () => {
		it('should validate the provider', async () => {
			// Arrange
			const validateClientProviderStub = sinon.stub(validators, 'validateClientProvider');

			// Act
			await AddressDriverClient.create(providerStub, signerStub);

			// Assert
			assert(
				validateClientProviderStub.calledWithExactly(providerStub, Utils.Network.SUPPORTED_CHAINS),
				'Expected method to be called with different arguments'
			);
		});

		it('should validate the signer', async () => {
			// Arrange
			const validateClientSignerStub = sinon.stub(validators, 'validateClientSigner');

			// Act
			await AddressDriverClient.create(providerStub, signerStub);

			// Assert
			assert(
				validateClientSignerStub.calledWithExactly(signerWithProviderStub, Utils.Network.SUPPORTED_CHAINS),
				'Expected method to be called with different arguments'
			);
		});

		it('should set the custom driver address when provided', async () => {
			// Arrange
			const customDriverAddress = Wallet.createRandom().address;

			// Act
			const client = await AddressDriverClient.create(providerStub, signerStub, customDriverAddress);

			// Assert
			assert.equal(client.driverAddress, customDriverAddress);
		});

		it('should create a fully initialized client instance', async () => {
			// Assert
			assert.equal(testAddressDriverClient.signer, signerWithProviderStub);
			assert.equal(testAddressDriverClient.provider, providerStub);
			assert.equal(testAddressDriverClient.signer!.provider, providerStub);
			assert.equal(
				testAddressDriverClient.driverAddress,
				Utils.Network.configs[(await providerStub.getNetwork()).chainId].ADDRESS_DRIVER
			);
		});
	});

	describe('getAllowance()', () => {
		it('should ensure the signer exists', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;
			const ensureSignerExistsStub = sinon.stub(internals, 'ensureSignerExists');

			const erc20ContractStub = stubInterface<IERC20>();

			erc20ContractStub.allowance
				.withArgs(await signerStub.getAddress(), testAddressDriverClient.driverAddress)
				.resolves(BigNumber.from(1));

			sinon.stub(IERC20__factory, 'connect').withArgs(tokenAddress, signerWithProviderStub).returns(erc20ContractStub);

			// Act
			await testAddressDriverClient.getAllowance(tokenAddress);

			// Assert
			assert(
				ensureSignerExistsStub.calledOnceWithExactly(testAddressDriverClient.signer),
				'Expected method to be called with different arguments'
			);
		});

		it('should validate the ERC20 address', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			const erc20ContractStub = stubInterface<IERC20>();

			erc20ContractStub.allowance
				.withArgs(await signerStub.getAddress(), testAddressDriverClient.driverAddress)
				.resolves(BigNumber.from(1));

			sinon.stub(IERC20__factory, 'connect').withArgs(tokenAddress, signerWithProviderStub).returns(erc20ContractStub);

			// Act
			await testAddressDriverClient.getAllowance(tokenAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should call the getAllowance() method of the ERC20 contract', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;

			const erc20ContractStub = stubInterface<IERC20>();

			erc20ContractStub.allowance
				.withArgs(await signerStub.getAddress(), testAddressDriverClient.driverAddress)
				.resolves(BigNumber.from(1));

			sinon.stub(IERC20__factory, 'connect').withArgs(tokenAddress, signerWithProviderStub).returns(erc20ContractStub);

			// Act
			const allowance = await testAddressDriverClient.getAllowance(tokenAddress);

			// Assert
			assert.equal(allowance, 1n);
			assert(
				erc20ContractStub.allowance.calledOnceWithExactly(
					await signerWithProviderStub.getAddress(),
					testAddressDriverClient.driverAddress
				),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('approve()', () => {
		it('should ensure the signer exists', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;
			const ensureSignerExistsStub = sinon.stub(internals, 'ensureSignerExists');

			const erc20ContractStub = stubInterface<IERC20>();

			sinon.stub(IERC20__factory, 'connect').withArgs(tokenAddress, signerWithProviderStub).returns(erc20ContractStub);

			// Act
			await testAddressDriverClient.approve(tokenAddress);

			// Assert
			assert(
				ensureSignerExistsStub.calledOnceWithExactly(testAddressDriverClient.signer),
				'Expected method to be called with different arguments'
			);
		});

		it('should validate the ERC20 address', async () => {
			// Arrange
			const tokenAddress = 'invalid address';
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			const erc20ContractStub = stubInterface<IERC20>();

			sinon.stub(IERC20__factory, 'connect').withArgs(tokenAddress, signerWithProviderStub).returns(erc20ContractStub);

			// Act
			await testAddressDriverClient.approve(tokenAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should call the approve() method of the ERC20 contract', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;

			const erc20ContractStub = stubInterface<IERC20>();

			sinon.stub(IERC20__factory, 'connect').withArgs(tokenAddress, signerWithProviderStub).returns(erc20ContractStub);

			// Act
			await testAddressDriverClient.approve(tokenAddress);

			// Assert
			assert(
				erc20ContractStub.approve.calledOnceWithExactly(testAddressDriverClient.driverAddress, constants.MaxUint256),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getAccountId()', () => {
		it('should ensure the signer exists', async () => {
			// Arrange
			const ensureSignerExistsStub = sinon.stub(internals, 'ensureSignerExists');

			addressDriverContractStub.calcAccountId
				.withArgs(await signerWithProviderStub.getAddress())
				.resolves(BigNumber.from(111));

			// Act
			await testAddressDriverClient.getAccountId();

			// Assert
			assert(
				ensureSignerExistsStub.calledOnceWithExactly(testAddressDriverClient.signer),
				'Expected method to be called with different arguments'
			);
		});

		it('should call the calcAccountId() method of the AddressDriver contract', async () => {
			// Arrange
			addressDriverContractStub.calcAccountId
				.withArgs(await signerWithProviderStub.getAddress())
				.resolves(BigNumber.from(111));

			// Act
			await testAddressDriverClient.getAccountId();

			// Assert
			assert(
				addressDriverContractStub.calcAccountId.calledOnceWithExactly(await signerWithProviderStub.getAddress()),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getAccountIdByAddress()', () => {
		it('should validate the user address', async () => {
			// Arrange
			const userAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');
			addressDriverContractStub.calcAccountId.resolves(BigNumber.from(1));

			// Act
			await testAddressDriverClient.getAccountIdByAddress(userAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(userAddress));
		});

		it('should call the calcAccountId() method of the AddressDriver contract', async () => {
			// Arrange
			const userAddress = Wallet.createRandom().address;
			addressDriverContractStub.calcAccountId.withArgs(userAddress).resolves(BigNumber.from(111));

			// Act
			await testAddressDriverClient.getAccountIdByAddress(userAddress);

			// Assert
			assert(
				addressDriverContractStub.calcAccountId.calledOnceWithExactly(userAddress),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('collect()', () => {
		it('should ensure the signer exists', async () => {
			// Arrange
			const ensureSignerExistsStub = sinon.stub(internals, 'ensureSignerExists');

			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;

			// Act
			await testAddressDriverClient.collect(tokenAddress, transferToAddress);

			// Assert
			assert(
				ensureSignerExistsStub.calledOnceWithExactly(testAddressDriverClient.signer),
				'Expected method to be called with different arguments'
			);
		});

		it('should validate the input', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;
			const validateCollectInputStub = sinon.stub(validators, 'validateCollectInput');

			// Act
			await testAddressDriverClient.collect(tokenAddress, transferToAddress);

			// Assert
			assert(
				validateCollectInputStub.calledOnceWithExactly(tokenAddress, transferToAddress),
				'Expected method to be called with different arguments'
			);
		});

		it('should send the expected transaction', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;

			const tx = {};
			addressDriverTxFactoryStub.collect.withArgs(tokenAddress, transferToAddress).resolves(tx);

			// Act
			await testAddressDriverClient.collect(tokenAddress, transferToAddress);

			// Assert
			assert(signerStub?.sendTransaction.calledOnceWithExactly(tx), 'Did not send the expected tx.');
		});
	});

	describe('give()', () => {
		it('should ensure the signer exists', async () => {
			// Arrange
			const ensureSignerExistsStub = sinon.stub(internals, 'ensureSignerExists');
			const tokenAddress = Wallet.createRandom().address;

			// Act
			await testAddressDriverClient.give('1', tokenAddress, 1n);

			// Assert
			assert(
				ensureSignerExistsStub.calledOnceWithExactly(testAddressDriverClient.signer),
				'Expected method to be called with different arguments'
			);
		});

		it('should throw argumentMissingError when receiverAccountId is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;

			try {
				// Act
				await testAddressDriverClient.give(undefined as unknown as string, tokenAddress, 1n);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw argumentMissingError when amount is less than or equal to 0', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;

			try {
				// Act
				await testAddressDriverClient.give('1', tokenAddress, -1n);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should validate the ERC20 address', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			// Act
			await testAddressDriverClient.give('1', tokenAddress, 1n);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should send the expected transaction', async () => {
			// Arrange
			const amount = 100n;
			const receiverAccountId = '1';
			const tokenAddress = Wallet.createRandom().address;

			const tx = {};
			addressDriverTxFactoryStub.give.withArgs(receiverAccountId, tokenAddress, amount).resolves(tx);

			// Act
			await testAddressDriverClient.give(receiverAccountId, tokenAddress, amount);

			// Assert
			assert(signerStub?.sendTransaction.calledOnceWithExactly(tx), 'Did not send the expected tx.');
		});
	});

	describe('setSplits()', () => {
		it('should ensure the signer exists', async () => {
			// Arrange
			const ensureSignerExistsStub = sinon.stub(internals, 'ensureSignerExists');

			// Act
			await testAddressDriverClient.setSplits([]);

			// Assert
			assert(
				ensureSignerExistsStub.calledOnceWithExactly(testAddressDriverClient.signer),
				'Expected method to be called with different arguments'
			);
		});

		it('should validate the splits receivers', async () => {
			// Arrange
			const receivers: SplitsReceiverStruct[] = [
				{ accountId: 1, weight: 1 },
				{ accountId: 2, weight: 2 }
			];

			const validateSplitsReceiversStub = sinon.stub(validators, 'validateSplitsReceivers');

			// Act
			await testAddressDriverClient.setSplits(receivers);

			// Assert
			assert(validateSplitsReceiversStub.calledOnceWithExactly(receivers));
		});

		it('should send the expected transaction', async () => {
			const receivers: SplitsReceiverStruct[] = [
				{ accountId: 2, weight: 100 },
				{ accountId: 1, weight: 1 },
				{ accountId: 1, weight: 1 }
			];

			const tx = {};
			addressDriverTxFactoryStub.setSplits.withArgs(receivers).resolves(tx);

			// Act
			await testAddressDriverClient.setSplits(receivers);

			// Assert
			assert(signerStub?.sendTransaction.calledOnceWithExactly(tx), 'Did not send the expected tx.');
		});
	});

	describe('setStreams()', () => {
		it('should ensure the signer exists', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;
			const ensureSignerExistsStub = sinon.stub(internals, 'ensureSignerExists');

			// Act
			await testAddressDriverClient.setStreams(tokenAddress, [], [], transferToAddress, undefined as unknown as bigint);

			// Assert
			assert(
				ensureSignerExistsStub.calledOnceWithExactly(testAddressDriverClient.signer),
				'Expected method to be called with different arguments'
			);
		});

		it('should validate the input', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;

			const currentReceivers: StreamReceiverStruct[] = [
				{
					accountId: '3',
					config: Utils.StreamConfiguration.toUint256({ dripId: 1n, amountPerSec: 3n, duration: 3n, start: 3n })
				}
			];
			const receivers: StreamReceiverStruct[] = [
				{
					accountId: '2',
					config: Utils.StreamConfiguration.toUint256({ dripId: 1n, amountPerSec: 1n, duration: 1n, start: 1n })
				},
				{
					accountId: '2',
					config: Utils.StreamConfiguration.toUint256({ dripId: 1n, amountPerSec: 1n, duration: 1n, start: 1n })
				},
				{
					accountId: '1',
					config: Utils.StreamConfiguration.toUint256({ dripId: 1n, amountPerSec: 2n, duration: 2n, start: 2n })
				}
			];

			const validateSetDripsInputStub = sinon.stub(validators, 'validateSetStreamsInput');

			// Act
			await testAddressDriverClient.setStreams(tokenAddress, currentReceivers, receivers, transferToAddress, 1n);

			// Assert
			assert(
				validateSetDripsInputStub.calledOnceWithExactly(
					tokenAddress,
					sinon.match.array.deepEquals(
						currentReceivers?.map((r) => ({
							accountId: r.accountId.toString(),
							config: Utils.StreamConfiguration.fromUint256(BigNumber.from(r.config).toBigInt())
						}))
					),
					sinon.match.array.deepEquals(
						receivers?.map((r) => ({
							accountId: r.accountId.toString(),
							config: Utils.StreamConfiguration.fromUint256(BigNumber.from(r.config).toBigInt())
						}))
					),
					transferToAddress,
					1n
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should send the expected transaction', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;
			const currentReceivers: StreamReceiverStruct[] = [
				{
					accountId: 3n,
					config: Utils.StreamConfiguration.toUint256({ dripId: 1n, amountPerSec: 3n, duration: 3n, start: 3n })
				}
			];
			const receivers: StreamReceiverStruct[] = [
				{
					accountId: 2n,
					config: Utils.StreamConfiguration.toUint256({ dripId: 1n, amountPerSec: 1n, duration: 1n, start: 1n })
				},
				{
					accountId: 2n,
					config: Utils.StreamConfiguration.toUint256({ dripId: 1n, amountPerSec: 1n, duration: 1n, start: 1n })
				},
				{
					accountId: 1n,
					config: Utils.StreamConfiguration.toUint256({ dripId: 1n, amountPerSec: 2n, duration: 2n, start: 2n })
				}
			];

			const balance = 1n;

			const tx = {};
			addressDriverTxFactoryStub.setStreams
				.withArgs(tokenAddress, currentReceivers, balance, receivers, 0, 0, transferToAddress)
				.resolves(tx);

			// Act
			await testAddressDriverClient.setStreams(tokenAddress, currentReceivers, receivers, transferToAddress, balance);

			// Assert
			assert(signerStub?.sendTransaction.calledOnceWithExactly(tx), 'Did not send the expected tx.');
		});
	});

	describe('getUserAddress', () => {
		it('should return the correct Ethereum address for valid inputs', () => {
			assert.equal(AddressDriverClient.getUserAddress('0'), ethers.constants.AddressZero);
			assert.equal(AddressDriverClient.getUserAddress('1'), '0x0000000000000000000000000000000000000001');
			assert.equal(
				AddressDriverClient.getUserAddress(
					BigNumber.from('0x000000000000000000000000AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA').toString()
				),
				'0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa'
			);
			assert.equal(
				AddressDriverClient.getUserAddress('12345678901234567890'),
				'0x000000000000000000000000AB54a98CeB1F0AD2'
			);
			assert.equal(
				AddressDriverClient.getUserAddress('846959513016227493489143736695218182523669298507'),
				'0x945AFA63507e56748368D3F31ccC35043efDbd4b'
			);
		});

		it('should throw an error for a negative user ID', () => {
			const invalidAccountId = '-1234';

			try {
				AddressDriverClient.getUserAddress(invalidAccountId);
				assert.fail('Error was not thrown');
			} catch (error: any) {
				assert.strictEqual(error.code, DripsErrorCode.INVALID_ARGUMENT);
			}
		});

		it('should throw an error for an out-of-bounds user ID', () => {
			const invalidAccountId =
				'12324123241234123412342123241232412341234123421232412324123412341234212324123241234123412342';

			try {
				AddressDriverClient.getUserAddress(invalidAccountId);
				assert.fail('Error was not thrown');
			} catch (error: any) {
				assert.strictEqual(error.code, DripsErrorCode.INVALID_ARGUMENT);
			}
		});

		it('should throw an error for an invalid user ID', () => {
			try {
				AddressDriverClient.getUserAddress(
					BigNumber.from('0xBBBBBBBB0000009990000000AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA').toString()
				);
				assert.fail('Error was not thrown');
			} catch (error: any) {
				assert.strictEqual(error.code, DripsErrorCode.INVALID_ARGUMENT);
			}

			assert.doesNotThrow(
				() =>
					AddressDriverClient.getUserAddress(
						BigNumber.from('0xBBBBBBBB0000000000000000AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA').toString()
					),
				'Error was thrown'
			);
		});

		it('should throw an error for a non-numeric user ID', () => {
			const invalidAccountId = 'notanumber';

			try {
				AddressDriverClient.getUserAddress(invalidAccountId);
				assert.fail('Error was not thrown');
			} catch (error: any) {
				assert.strictEqual(error.code, DripsErrorCode.INVALID_ARGUMENT);
			}
		});
	});

	describe('emitAccountMetadata()', () => {
		it('should ensure the signer exists', async () => {
			// Arrange
			const ensureSignerExistsStub = sinon.stub(internals, 'ensureSignerExists');

			// Act
			await testAddressDriverClient.emitAccountMetadata([]);

			// Assert
			assert(
				ensureSignerExistsStub.calledOnceWithExactly(testAddressDriverClient.signer),
				'Expected method to be called with different arguments'
			);
		});

		it('should validate the input', async () => {
			// Arrange
			const metadata: AccountMetadata[] = [];
			const validateEmitAccountMetadataInputStub = sinon.stub(validators, 'validateEmitAccountMetadataInput');

			// Act
			await testAddressDriverClient.emitAccountMetadata(metadata);

			// Assert
			assert(validateEmitAccountMetadataInputStub.calledOnceWithExactly(metadata));
		});

		it('should send the expected transaction', async () => {
			// Arrange
			const metadata: AccountMetadata[] = [{ key: 'key', value: 'value' }];
			const metadataAsBytes = metadata.map((m) => Utils.Metadata.createFromStrings(m.key, m.value));

			const tx = {};
			addressDriverTxFactoryStub.emitAccountMetadata.withArgs(metadataAsBytes).resolves(tx);

			// Act
			await testAddressDriverClient.emitAccountMetadata(metadata);

			// Assert
			assert(signerStub?.sendTransaction.calledOnceWithExactly(tx), 'Did not send the expected tx.');
		});
	});
});
