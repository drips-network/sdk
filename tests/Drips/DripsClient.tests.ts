import type { Network } from '@ethersproject/networks';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubObject, stubInterface } from 'ts-sinon';
import { assert } from 'chai';
import type { BigNumberish, ethers } from 'ethers';
import { BigNumber, Wallet } from 'ethers';
import DripsClient from '../../src/Drips/DripsClient';
import type { Drips } from '../../contracts';
import { Drips__factory } from '../../contracts';
import Utils from '../../src/utils';
import { DripsErrorCode } from '../../src/common/DripsError';
import * as validators from '../../src/common/validators';
import type {
	StreamsHistoryStruct,
	StreamReceiverStruct,
	SplitsReceiverStruct,
	StreamConfig
} from '../../src/common/types';
import * as internals from '../../src/common/internals';

describe('DripsClient', () => {
	const TEST_CHAIN_ID = 11155111; // Sepolia.

	let networkStub: StubbedInstance<Network>;
	let signerStub: StubbedInstance<JsonRpcSigner>;
	let dripsContractStub: StubbedInstance<Drips>;
	let signerWithProviderStub: StubbedInstance<JsonRpcSigner>;
	let providerStub: sinon.SinonStubbedInstance<JsonRpcProvider>;

	let testDripsHubClient: DripsClient;

	beforeEach(async () => {
		providerStub = sinon.createStubInstance(JsonRpcProvider);

		signerStub = sinon.createStubInstance(JsonRpcSigner);
		signerStub.getAddress.resolves(Wallet.createRandom().address);

		networkStub = stubObject<Network>({ chainId: TEST_CHAIN_ID } as Network);

		providerStub.getNetwork.resolves(networkStub);

		signerWithProviderStub = { ...signerStub, provider: providerStub };
		signerStub.connect.withArgs(providerStub).returns(signerWithProviderStub);

		dripsContractStub = stubInterface<Drips>();
		sinon
			.stub(Drips__factory, 'connect')
			.withArgs(Utils.Network.configs[TEST_CHAIN_ID].DRIPS, signerWithProviderStub)
			.returns(dripsContractStub);

		testDripsHubClient = await DripsClient.create(providerStub, signerStub);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('create()', () => {
		it('should validate the signer', async () => {
			// Arrange
			const validateClientSignerStub = sinon.stub(validators, 'validateClientSigner');

			// Act
			await DripsClient.create(providerStub, signerStub);

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
			await DripsClient.create(providerStub, signerStub);

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
				await DripsClient.create(undefined as any, undefined as any);
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
			const client = await DripsClient.create(providerStub, signerStub, customDriverAddress);

			// Assert
			assert.equal(client.contractAddress, customDriverAddress);
		});

		it('should create a fully initialized client instance', async () => {
			// Assert
			assert.equal(testDripsHubClient.signer, signerWithProviderStub);
			assert.equal(testDripsHubClient.provider, providerStub);
			assert.equal(testDripsHubClient.signer!.provider, providerStub);
			assert.equal(
				testDripsHubClient.contractAddress,
				Utils.Network.configs[(await providerStub.getNetwork()).chainId].DRIPS
			);
		});
	});

	describe('cycleSecs()', () => {
		it('should call the cycleSecs() method of the AddressDriver contract', async () => {
			// Act
			await testDripsHubClient.cycleSecs();

			// Assert
			assert(dripsContractStub.cycleSecs.calledOnce);
		});
	});

	describe('cycleSecs()', () => {
		it('return the expected cycle seconds', async () => {
			// Arrange
			const expectedCycleSecs = 10;
			dripsContractStub.cycleSecs.resolves(expectedCycleSecs);

			// Act
			const actualCycleSecs = await testDripsHubClient.cycleSecs();

			// Assert
			assert.equal(actualCycleSecs, expectedCycleSecs);
			assert(dripsContractStub.cycleSecs.calledOnce);
		});
	});

	describe('getTokenBalance()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');
			const streamsBalance = BigNumber.from(10);
			const splitsBalance = BigNumber.from(20);

			dripsContractStub.balances.withArgs(tokenAddress).resolves({
				streamsBalance,
				splitsBalance
			} as any);

			// Act
			await testDripsHubClient.getTokenBalance(tokenAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('return the expected token balance', async () => {
			// Arrange
			const streamsBalance = BigNumber.from(10);
			const splitsBalance = BigNumber.from(20);
			const tokenAddress = Wallet.createRandom().address;

			dripsContractStub.balances.withArgs(tokenAddress).resolves({
				streamsBalance,
				splitsBalance
			} as any);

			// Act
			const actualBalance = await testDripsHubClient.getTokenBalance(tokenAddress);

			// Assert
			assert.equal(actualBalance.streamsBalance, streamsBalance.toBigInt());
			assert.equal(actualBalance.splitsBalance, splitsBalance.toBigInt());
			assert(dripsContractStub.balances.calledOnceWithExactly(tokenAddress));
		});
	});

	describe('receivableCyclesCount()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const accountId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			// Act
			await testDripsHubClient.receivableCyclesCount(accountId, tokenAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should throw argumentMissingError when accountId is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;

			try {
				// Act
				await testDripsHubClient.receivableCyclesCount(undefined as unknown as string, tokenAddress);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('return the expected count', async () => {
			// Arrange
			const accountId = '1';
			const expectedCount = 10;
			const tokenAddress = Wallet.createRandom().address;

			dripsContractStub.receivableStreamsCycles.withArgs(accountId, tokenAddress).resolves(expectedCount);

			// Act
			const actualCount = await testDripsHubClient.receivableCyclesCount(accountId, tokenAddress);

			// Assert
			assert.equal(actualCount, expectedCount);
			assert(dripsContractStub.receivableStreamsCycles.calledOnceWithExactly(accountId, tokenAddress));
		});
	});

	describe('getReceivableBalanceForUser()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const accountId = '1';
			const maxCycles = 1;
			const tokenAddress = Wallet.createRandom().address;
			const expectedBalance = BigNumber.from(1);
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			dripsContractStub.receiveStreamsResult.withArgs(accountId, tokenAddress, maxCycles).resolves(expectedBalance);

			// Act
			await testDripsHubClient.getReceivableBalanceForUser(accountId, tokenAddress, maxCycles);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should throw argumentMissingError when accountId is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;

			try {
				// Act
				await testDripsHubClient.getReceivableBalanceForUser(undefined as unknown as string, tokenAddress, 1);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw argumentMissingError when maxCycles is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;

			try {
				// Act
				await testDripsHubClient.getReceivableBalanceForUser('1', tokenAddress, undefined as unknown as number);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return the expected receivable balance', async () => {
			// Arrange
			const accountId = '1';
			const maxCycles = 1;
			const tokenAddress = Wallet.createRandom().address;
			const expectedBalance = BigNumber.from(1);

			dripsContractStub.receiveStreamsResult.withArgs(accountId, tokenAddress, maxCycles).resolves(expectedBalance);

			// Act
			const actualBalance = await testDripsHubClient.getReceivableBalanceForUser(accountId, tokenAddress, maxCycles);

			// Assert
			assert.equal(actualBalance.receivableAmount, expectedBalance.toBigInt());
			assert(dripsContractStub.receiveStreamsResult.calledOnceWithExactly(accountId, tokenAddress, maxCycles));
		});
	});

	describe('receiveStreams()', () => {
		it('should ensure the signer exists', async () => {
			// Arrange
			const accountId = '1';
			const maxCycles = 1n;
			const tokenAddress = Wallet.createRandom().address;
			const ensureSignerExistsStub = sinon.stub(internals, 'ensureSignerExists');

			// Act
			await testDripsHubClient.receiveStreams(accountId, tokenAddress, maxCycles);

			// Assert
			assert(
				ensureSignerExistsStub.calledOnceWithExactly(testDripsHubClient.signer),
				'Expected method to be called with different arguments'
			);
		});

		it('should validate the ERC20 address', async () => {
			// Arrange
			const accountId = '1';
			const maxCycles = 1n;
			const tokenAddress = Wallet.createRandom().address;
			const validateReceiveDripsInputStub = sinon.stub(validators, 'validateReceiveDripsInput');

			// Act
			await testDripsHubClient.receiveStreams(accountId, tokenAddress, maxCycles);

			// Assert
			assert(validateReceiveDripsInputStub.calledOnceWithExactly(accountId, tokenAddress, maxCycles));
		});

		it('should call the receiveStreams() method of the AddressDriver contract', async () => {
			// Arrange
			const accountId = '1';
			const maxCycles = 1n;
			const tokenAddress = Wallet.createRandom().address;

			// Act
			await testDripsHubClient.receiveStreams(accountId, tokenAddress, maxCycles);

			// Assert
			assert(dripsContractStub.receiveStreams.calledOnceWithExactly(accountId, tokenAddress, maxCycles));
		});
	});

	describe('squeezeStreams()', () => {
		it('should validate input', async () => {
			// Arrange
			const accountId = '1';
			const senderId = '1';
			const historyHash = '0x00';
			const streamsHistory: StreamsHistoryStruct[] = [];
			const tokenAddress = Wallet.createRandom().address;
			const validateSqueezeDripsInputStub = sinon.stub(validators, 'validateSqueezeDripsInput');

			// Act
			await testDripsHubClient.squeezeStreams(accountId, tokenAddress, senderId, historyHash, streamsHistory);

			// Assert
			assert(
				validateSqueezeDripsInputStub.calledOnceWithExactly(
					accountId,
					tokenAddress,
					senderId,
					historyHash,
					streamsHistory
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should call the squeezeStreams() method of the Drips contract', async () => {
			// Arrange
			const accountId = '1';
			const senderId = '1';
			const historyHash = '0x';
			const streamsHistory: StreamsHistoryStruct[] = [];
			const tokenAddress = Wallet.createRandom().address;

			// Act
			await testDripsHubClient.squeezeStreams(accountId, tokenAddress, senderId, historyHash, streamsHistory);

			// Assert
			assert(
				dripsContractStub.squeezeStreams.calledOnceWithExactly(
					accountId,
					tokenAddress,
					senderId,
					historyHash,
					streamsHistory
				)
			);
		});
	});

	describe('getSqueezableBalance()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const accountId = '1';
			const senderId = '1';
			const historyHash = '0x';
			const streamsHistory: StreamsHistoryStruct[] = [];
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			dripsContractStub.squeezeStreamsResult
				.withArgs(accountId, tokenAddress, senderId, historyHash, streamsHistory)
				.resolves(BigNumber.from(1));

			// Act
			await testDripsHubClient.getSqueezableBalance(accountId, tokenAddress, senderId, historyHash, streamsHistory);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should throw argumentMissingError when accountId is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;

			try {
				// Act
				await testDripsHubClient.getSqueezableBalance(undefined as unknown as string, tokenAddress, '1', '', []);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw argumentMissingError when senderId is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;

			try {
				// Act
				await testDripsHubClient.getSqueezableBalance('1', tokenAddress, undefined as unknown as string, '', []);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw argumentMissingError when historyHash is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;

			try {
				// Act
				await testDripsHubClient.getSqueezableBalance('1', tokenAddress, '1', undefined as unknown as string, []);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw argumentMissingError when streamsHistory is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;

			try {
				// Act
				await testDripsHubClient.getSqueezableBalance(
					'1',
					tokenAddress,
					'1',
					')x',
					undefined as unknown as StreamsHistoryStruct[]
				);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return the expected squeezable balance', async () => {
			// Arrange
			const accountId = '1';
			const senderId = '1';
			const historyHash = '0x';
			const expectedBalance = BigNumber.from(10);
			const streamsHistory: StreamsHistoryStruct[] = [];
			const tokenAddress = Wallet.createRandom().address;

			dripsContractStub.squeezeStreamsResult
				.withArgs(accountId, tokenAddress, senderId, historyHash, streamsHistory)
				.resolves(expectedBalance);

			// Act
			const actualBalance = await testDripsHubClient.getSqueezableBalance(
				accountId,
				tokenAddress,
				senderId,
				historyHash,
				streamsHistory
			);

			// Assert
			assert.equal(actualBalance, expectedBalance.toBigInt());
			assert(
				dripsContractStub.squeezeStreamsResult.calledOnceWithExactly(
					accountId,
					tokenAddress,
					senderId,
					historyHash,
					streamsHistory
				)
			);
		});
	});

	describe('getSplittableBalanceForUser()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const accountId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			dripsContractStub.splittable.withArgs(accountId, tokenAddress).resolves(BigNumber.from(1));

			// Act
			await testDripsHubClient.getSplittableBalanceForUser(accountId, tokenAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should throw argumentMissingError when accountId is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;

			try {
				// Act
				await testDripsHubClient.getSplittableBalanceForUser(undefined as unknown as string, tokenAddress);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return the expected splittable balance', async () => {
			// Arrange
			const accountId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const expectedBalance = BigNumber.from(10);

			dripsContractStub.splittable.withArgs(accountId, tokenAddress).resolves(expectedBalance);

			// Act
			const actualBalance = await testDripsHubClient.getSplittableBalanceForUser(accountId, tokenAddress);

			// Assert
			assert.equal(actualBalance.tokenAddress, tokenAddress);
			assert.equal(actualBalance.splittableAmount, expectedBalance.toBigInt());
			assert(dripsContractStub.splittable.calledOnceWithExactly(accountId, tokenAddress));
		});
	});

	describe('getSplitResult', () => {
		it('validate split receivers', async () => {
			// Arrange
			const receivers: SplitsReceiverStruct[] = [
				{ accountId: 1, weight: 1 },
				{ accountId: 2, weight: 2 }
			];

			const validateSplitsReceiversStub = sinon.stub(validators, 'validateSplitsReceivers');

			dripsContractStub.splitResult.withArgs('1', receivers, 1).resolves({
				collectableAmt: BigNumber.from(1),
				splitAmt: BigNumber.from(1)
			} as any);

			// Act
			await testDripsHubClient.getSplitResult('1', receivers, 1);

			// Assert
			assert(validateSplitsReceiversStub.calledOnceWithExactly(receivers));
		});

		it('should throw an argumentMissingError when user ID is missing', async () => {
			// Arrange
			let threw = false;

			// Act
			try {
				await testDripsHubClient.getSplitResult(undefined as unknown as string, [], 1);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw an argumentError when amount is missing', async () => {
			// Arrange
			let threw = false;

			// Act
			try {
				await testDripsHubClient.getSplitResult('1', [], undefined as unknown as BigNumberish);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw an argumentError when amount is less than 0', async () => {
			// Arrange
			let threw = false;

			// Act
			try {
				await testDripsHubClient.getSplitResult('1', [], -1);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return the expected split result', async () => {
			// Arrange
			const amount = 1;
			const accountId = '1';
			const expectedResult = {
				collectableAmt: BigNumber.from(1),
				splitAmt: BigNumber.from(1)
			} as [ethers.BigNumber, ethers.BigNumber] & {
				collectableAmt: ethers.BigNumber;
				splitAmt: ethers.BigNumber;
			};
			const currentReceivers: SplitsReceiverStruct[] = [];

			dripsContractStub.splitResult.withArgs(accountId, currentReceivers, amount).resolves(expectedResult);

			// Act
			const actualResult = await testDripsHubClient.getSplitResult(accountId, currentReceivers, amount);

			// Assert
			assert.equal(actualResult.splitAmount, expectedResult.splitAmt.toBigInt());
			assert.equal(actualResult.collectableAmount, expectedResult.collectableAmt.toBigInt());
			assert(dripsContractStub.splitResult.calledOnceWithExactly(accountId, currentReceivers, amount));
		});
	});

	describe('split()', () => {
		it('should ensure the signer exists', async () => {
			// Arrange
			const accountId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const receivers: SplitsReceiverStruct[] = [
				{ accountId: 1, weight: 1 },
				{ accountId: 2, weight: 2 }
			];

			const ensureSignerExistsStub = sinon.stub(internals, 'ensureSignerExists');

			// Act
			await testDripsHubClient.split(accountId, tokenAddress, receivers);

			// Assert
			assert(
				ensureSignerExistsStub.calledOnceWithExactly(testDripsHubClient.signer),
				'Expected method to be called with different arguments'
			);
		});

		it('should validate the input', async () => {
			// Arrange
			const accountId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const receivers: SplitsReceiverStruct[] = [
				{ accountId: 1, weight: 1 },
				{ accountId: 2, weight: 2 }
			];

			const validateSplitInputStub = sinon.stub(validators, 'validateSplitInput');

			// Act
			await testDripsHubClient.split(accountId, tokenAddress, receivers);

			// Assert
			assert(validateSplitInputStub.calledOnceWithExactly(accountId, tokenAddress, receivers));
		});

		it('should call the setStreams() method of the AddressDriver contract', async () => {
			// Arrange
			const accountId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const receivers: SplitsReceiverStruct[] = [
				{ accountId: 2, weight: 2 },
				{ accountId: 1, weight: 1 }
			];

			// Act
			await testDripsHubClient.split(accountId, tokenAddress, receivers);

			// Assert
			assert(
				dripsContractStub.split.calledOnceWithExactly(
					accountId,
					tokenAddress,
					internals.formatSplitReceivers(receivers)
				),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getCollectableBalanceForUser()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const accountId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			dripsContractStub.collectable.withArgs(accountId, tokenAddress).resolves(BigNumber.from(1));

			// Act
			await testDripsHubClient.getCollectableBalanceForUser(accountId, tokenAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should throw argumentMissingError when accountId is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;

			try {
				// Act
				await testDripsHubClient.getCollectableBalanceForUser(undefined as unknown as string, tokenAddress);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return the expected collectable balance', async () => {
			// Arrange
			const accountId = '1';
			const expectedBalance = BigNumber.from(1);
			const tokenAddress = Wallet.createRandom().address;

			dripsContractStub.collectable.withArgs(accountId, tokenAddress).resolves(expectedBalance);

			// Act
			const actualBalance = await testDripsHubClient.getCollectableBalanceForUser(accountId, tokenAddress);

			// Assert
			assert.equal(actualBalance.tokenAddress, tokenAddress);
			assert.equal(actualBalance.collectableAmount, expectedBalance.toBigInt());
			assert(dripsContractStub.collectable.calledOnceWithExactly(accountId, tokenAddress));
		});
	});

	describe('streamsState()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const accountId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			dripsContractStub.streamsState.withArgs(accountId, tokenAddress).resolves({} as any);

			// Act
			await testDripsHubClient.streamsState(accountId, tokenAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should throw argumentMissingError when accountId is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;

			try {
				// Act
				await testDripsHubClient.streamsState(undefined as unknown as string, tokenAddress);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return the expected user state', async () => {
			// Arrange
			const accountId = '1';
			const expectedState = {
				streamsHash: '0x00',
				streamsHistoryHash: '0x01',
				updateTime: 1,
				balance: BigNumber.from(2),
				maxEnd: 3
			} as any;
			const tokenAddress = Wallet.createRandom().address;

			dripsContractStub.streamsState.withArgs(accountId, tokenAddress).resolves(expectedState);

			// Act
			const actualState = await testDripsHubClient.streamsState(accountId, tokenAddress);

			// Assert
			assert.equal(actualState.maxEnd, expectedState.maxEnd);
			assert.equal(actualState.balance, expectedState.balance.toBigInt());
			assert.equal(actualState.streamsHash, expectedState.streamsHash);
			assert.equal(actualState.updateTime, expectedState.updateTime);
			assert.equal(actualState.streamsHistoryHash, expectedState.streamsHistoryHash);
			assert(dripsContractStub.streamsState.calledOnceWithExactly(accountId, tokenAddress));
		});
	});

	describe('getDripsBalanceAt()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const accountId = '1';
			const timestamp = 11111n;
			const receivers: StreamReceiverStruct[] = [];
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			dripsContractStub.balanceAt.withArgs(accountId, tokenAddress, receivers, timestamp).resolves(BigNumber.from(1));

			// Act
			await testDripsHubClient.getDripsBalanceAt(accountId, tokenAddress, receivers, timestamp);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should validate the drips receivers', async () => {
			// Arrange
			const accountId = '1';
			const timestamp = 11111n;
			const receivers: StreamReceiverStruct[] = [
				{
					accountId: 1,
					config: Utils.StreamConfiguration.toUint256({ dripId: 1n, amountPerSec: 1n, duration: 1n, start: 1n })
				}
			];
			const tokenAddress = Wallet.createRandom().address;
			const validateStreamReceiversStub = sinon.stub(validators, 'validateStreamReceivers');

			dripsContractStub.balanceAt.withArgs(accountId, tokenAddress, receivers, timestamp).resolves(BigNumber.from(1));

			// Act
			await testDripsHubClient.getDripsBalanceAt(accountId, tokenAddress, receivers, timestamp);

			// Assert
			assert(
				validateStreamReceiversStub.calledOnceWithExactly(
					sinon.match(
						(r: { accountId: string; config: StreamConfig }[]) =>
							Utils.StreamConfiguration.toUint256(r[0].config) === receivers[0].config
					)
				)
			);
		});

		it('should throw argumentMissingError when accountId is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;

			try {
				// Act
				await testDripsHubClient.getDripsBalanceAt(undefined as unknown as string, tokenAddress, [], 1n);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw argumentMissingError when timestamp is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;

			try {
				// Act
				await testDripsHubClient.getDripsBalanceAt('1', tokenAddress, [], undefined as unknown as bigint);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return the expected result', async () => {
			// Arrange
			const accountId = '1';
			const timestamp = 11111n;
			const tokenAddress = Wallet.createRandom().address;
			const receivers: StreamReceiverStruct[] = [
				{
					accountId: 1,
					config: Utils.StreamConfiguration.toUint256({ dripId: 1n, amountPerSec: 1n, duration: 1n, start: 1n })
				}
			];
			const expectedBalance = BigNumber.from(1);

			dripsContractStub.balanceAt.withArgs(accountId, tokenAddress, receivers, timestamp).resolves(expectedBalance);

			// Act
			const actualBalance = await testDripsHubClient.getDripsBalanceAt(accountId, tokenAddress, receivers, timestamp);

			// Assert
			assert.equal(actualBalance, expectedBalance.toBigInt());
			assert(dripsContractStub.balanceAt.calledOnceWithExactly(accountId, tokenAddress, receivers, timestamp));
		});
	});
});
