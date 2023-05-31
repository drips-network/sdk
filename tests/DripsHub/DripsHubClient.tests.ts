import type { Network } from '@ethersproject/networks';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubObject, stubInterface } from 'ts-sinon';
import { assert } from 'chai';
import type { BigNumberish, ethers } from 'ethers';
import { BigNumber, Wallet } from 'ethers';
import DripsHubClient from '../../src/DripsHub/DripsHubClient';
import type { DripsHub } from '../../contracts';
import { DripsHub__factory } from '../../contracts';
import Utils from '../../src/utils';
import { DripsErrorCode } from '../../src/common/DripsError';
import * as validators from '../../src/common/validators';
import type {
	DripsHistoryStruct,
	DripsReceiverStruct,
	SplitsReceiverStruct,
	DripsReceiverConfig
} from '../../src/common/types';
import * as internals from '../../src/common/internals';

describe('DripsHubClient', () => {
	const TEST_CHAIN_ID = 11155111; // Sepolia.

	let networkStub: StubbedInstance<Network>;
	let signerStub: StubbedInstance<JsonRpcSigner>;
	let dripsHubContractStub: StubbedInstance<DripsHub>;
	let signerWithProviderStub: StubbedInstance<JsonRpcSigner>;
	let providerStub: sinon.SinonStubbedInstance<JsonRpcProvider>;

	let testDripsHubClient: DripsHubClient;

	beforeEach(async () => {
		providerStub = sinon.createStubInstance(JsonRpcProvider);

		signerStub = sinon.createStubInstance(JsonRpcSigner);
		signerStub.getAddress.resolves(Wallet.createRandom().address);

		networkStub = stubObject<Network>({ chainId: TEST_CHAIN_ID } as Network);

		providerStub.getNetwork.resolves(networkStub);

		signerWithProviderStub = { ...signerStub, provider: providerStub };
		signerStub.connect.withArgs(providerStub).returns(signerWithProviderStub);

		dripsHubContractStub = stubInterface<DripsHub>();
		sinon
			.stub(DripsHub__factory, 'connect')
			.withArgs(Utils.Network.configs[TEST_CHAIN_ID].DRIPS_HUB, signerWithProviderStub)
			.returns(dripsHubContractStub);

		testDripsHubClient = await DripsHubClient.create(providerStub, signerStub);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('create()', () => {
		it('should validate the signer', async () => {
			// Arrange
			const validateClientSignerStub = sinon.stub(validators, 'validateClientSigner');

			// Act
			await DripsHubClient.create(providerStub, signerStub);

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
			await DripsHubClient.create(providerStub, signerStub);

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
				await DripsHubClient.create(undefined as any, undefined as any);
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
			const client = await DripsHubClient.create(providerStub, signerStub, customDriverAddress);

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
				Utils.Network.configs[(await providerStub.getNetwork()).chainId].DRIPS_HUB
			);
		});
	});

	describe('cycleSecs()', () => {
		it('should call the cycleSecs() method of the AddressDriver contract', async () => {
			// Act
			await testDripsHubClient.cycleSecs();

			// Assert
			assert(dripsHubContractStub.cycleSecs.calledOnce);
		});
	});

	describe('cycleSecs()', () => {
		it('return the expected cycle seconds', async () => {
			// Arrange
			const expectedCycleSecs = 10;
			dripsHubContractStub.cycleSecs.resolves(expectedCycleSecs);

			// Act
			const actualCycleSecs = await testDripsHubClient.cycleSecs();

			// Assert
			assert.equal(actualCycleSecs, expectedCycleSecs);
			assert(dripsHubContractStub.cycleSecs.calledOnce);
		});
	});

	describe('getTokenBalance()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			dripsHubContractStub.totalBalance.withArgs(tokenAddress).resolves(BigNumber.from(1));

			// Act
			await testDripsHubClient.getTokenBalance(tokenAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('return the expected token balance', async () => {
			// Arrange
			const expectedBalance = BigNumber.from(10);
			const tokenAddress = Wallet.createRandom().address;

			dripsHubContractStub.totalBalance.withArgs(tokenAddress).resolves(expectedBalance);

			// Act
			const actualBalance = await testDripsHubClient.getTokenBalance(tokenAddress);

			// Assert
			assert.equal(actualBalance, expectedBalance.toBigInt());
			assert(dripsHubContractStub.totalBalance.calledOnceWithExactly(tokenAddress));
		});
	});

	describe('receivableCyclesCount()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const userId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			// Act
			await testDripsHubClient.receivableCyclesCount(userId, tokenAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should throw argumentMissingError when userId is missing', async () => {
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
			const userId = '1';
			const expectedCount = 10;
			const tokenAddress = Wallet.createRandom().address;

			dripsHubContractStub.receivableDripsCycles.withArgs(userId, tokenAddress).resolves(expectedCount);

			// Act
			const actualCount = await testDripsHubClient.receivableCyclesCount(userId, tokenAddress);

			// Assert
			assert.equal(actualCount, expectedCount);
			assert(dripsHubContractStub.receivableDripsCycles.calledOnceWithExactly(userId, tokenAddress));
		});
	});

	describe('getReceivableBalanceForUser()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const userId = '1';
			const maxCycles = 1;
			const tokenAddress = Wallet.createRandom().address;
			const expectedBalance = BigNumber.from(1);
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			dripsHubContractStub.receiveDripsResult.withArgs(userId, tokenAddress, maxCycles).resolves(expectedBalance);

			// Act
			await testDripsHubClient.getReceivableBalanceForUser(userId, tokenAddress, maxCycles);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should throw argumentMissingError when userId is missing', async () => {
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
			const userId = '1';
			const maxCycles = 1;
			const tokenAddress = Wallet.createRandom().address;
			const expectedBalance = BigNumber.from(1);

			dripsHubContractStub.receiveDripsResult.withArgs(userId, tokenAddress, maxCycles).resolves(expectedBalance);

			// Act
			const actualBalance = await testDripsHubClient.getReceivableBalanceForUser(userId, tokenAddress, maxCycles);

			// Assert
			assert.equal(actualBalance.receivableAmount, expectedBalance.toBigInt());
			assert(dripsHubContractStub.receiveDripsResult.calledOnceWithExactly(userId, tokenAddress, maxCycles));
		});
	});

	describe('receiveDrips()', () => {
		it('should ensure the signer exists', async () => {
			// Arrange
			const userId = '1';
			const maxCycles = 1n;
			const tokenAddress = Wallet.createRandom().address;
			const ensureSignerExistsStub = sinon.stub(internals, 'ensureSignerExists');

			// Act
			await testDripsHubClient.receiveDrips(userId, tokenAddress, maxCycles);

			// Assert
			assert(
				ensureSignerExistsStub.calledOnceWithExactly(testDripsHubClient.signer),
				'Expected method to be called with different arguments'
			);
		});

		it('should validate the ERC20 address', async () => {
			// Arrange
			const userId = '1';
			const maxCycles = 1n;
			const tokenAddress = Wallet.createRandom().address;
			const validateReceiveDripsInputStub = sinon.stub(validators, 'validateReceiveDripsInput');

			// Act
			await testDripsHubClient.receiveDrips(userId, tokenAddress, maxCycles);

			// Assert
			assert(validateReceiveDripsInputStub.calledOnceWithExactly(userId, tokenAddress, maxCycles));
		});

		it('should call the receiveDrips() method of the AddressDriver contract', async () => {
			// Arrange
			const userId = '1';
			const maxCycles = 1n;
			const tokenAddress = Wallet.createRandom().address;

			// Act
			await testDripsHubClient.receiveDrips(userId, tokenAddress, maxCycles);

			// Assert
			assert(dripsHubContractStub.receiveDrips.calledOnceWithExactly(userId, tokenAddress, maxCycles));
		});
	});

	describe('squeezeDrips()', () => {
		it('should validate input', async () => {
			// Arrange
			const userId = '1';
			const senderId = '1';
			const historyHash = '0x00';
			const dripsHistory: DripsHistoryStruct[] = [];
			const tokenAddress = Wallet.createRandom().address;
			const validateSqueezeDripsInputStub = sinon.stub(validators, 'validateSqueezeDripsInput');

			// Act
			await testDripsHubClient.squeezeDrips(userId, tokenAddress, senderId, historyHash, dripsHistory);

			// Assert
			assert(
				validateSqueezeDripsInputStub.calledOnceWithExactly(userId, tokenAddress, senderId, historyHash, dripsHistory),
				'Expected method to be called with different arguments'
			);
		});

		it('should call the squeezeDrips() method of the DripsHub contract', async () => {
			// Arrange
			const userId = '1';
			const senderId = '1';
			const historyHash = '0x';
			const dripsHistory: DripsHistoryStruct[] = [];
			const tokenAddress = Wallet.createRandom().address;

			// Act
			await testDripsHubClient.squeezeDrips(userId, tokenAddress, senderId, historyHash, dripsHistory);

			// Assert
			assert(
				dripsHubContractStub.squeezeDrips.calledOnceWithExactly(
					userId,
					tokenAddress,
					senderId,
					historyHash,
					dripsHistory
				)
			);
		});
	});

	describe('getSqueezableBalance()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const userId = '1';
			const senderId = '1';
			const historyHash = '0x';
			const dripsHistory: DripsHistoryStruct[] = [];
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			dripsHubContractStub.squeezeDripsResult
				.withArgs(userId, tokenAddress, senderId, historyHash, dripsHistory)
				.resolves(BigNumber.from(1));

			// Act
			await testDripsHubClient.getSqueezableBalance(userId, tokenAddress, senderId, historyHash, dripsHistory);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should throw argumentMissingError when userId is missing', async () => {
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

		it('should throw argumentMissingError when dripsHistory is missing', async () => {
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
					undefined as unknown as DripsHistoryStruct[]
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
			const userId = '1';
			const senderId = '1';
			const historyHash = '0x';
			const expectedBalance = BigNumber.from(10);
			const dripsHistory: DripsHistoryStruct[] = [];
			const tokenAddress = Wallet.createRandom().address;

			dripsHubContractStub.squeezeDripsResult
				.withArgs(userId, tokenAddress, senderId, historyHash, dripsHistory)
				.resolves(expectedBalance);

			// Act
			const actualBalance = await testDripsHubClient.getSqueezableBalance(
				userId,
				tokenAddress,
				senderId,
				historyHash,
				dripsHistory
			);

			// Assert
			assert.equal(actualBalance, expectedBalance.toBigInt());
			assert(
				dripsHubContractStub.squeezeDripsResult.calledOnceWithExactly(
					userId,
					tokenAddress,
					senderId,
					historyHash,
					dripsHistory
				)
			);
		});
	});

	describe('getSplittableBalanceForUser()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const userId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			dripsHubContractStub.splittable.withArgs(userId, tokenAddress).resolves(BigNumber.from(1));

			// Act
			await testDripsHubClient.getSplittableBalanceForUser(userId, tokenAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should throw argumentMissingError when userId is missing', async () => {
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
			const userId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const expectedBalance = BigNumber.from(10);

			dripsHubContractStub.splittable.withArgs(userId, tokenAddress).resolves(expectedBalance);

			// Act
			const actualBalance = await testDripsHubClient.getSplittableBalanceForUser(userId, tokenAddress);

			// Assert
			assert.equal(actualBalance.tokenAddress, tokenAddress);
			assert.equal(actualBalance.splittableAmount, expectedBalance.toBigInt());
			assert(dripsHubContractStub.splittable.calledOnceWithExactly(userId, tokenAddress));
		});
	});

	describe('getSplitResult', () => {
		it('validate split receivers', async () => {
			// Arrange
			const receivers: SplitsReceiverStruct[] = [
				{ userId: 1, weight: 1 },
				{ userId: 2, weight: 2 }
			];

			const validateSplitsReceiversStub = sinon.stub(validators, 'validateSplitsReceivers');

			dripsHubContractStub.splitResult.withArgs('1', receivers, 1).resolves({
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
			const userId = '1';
			const expectedResult = {
				collectableAmt: BigNumber.from(1),
				splitAmt: BigNumber.from(1)
			} as [ethers.BigNumber, ethers.BigNumber] & {
				collectableAmt: ethers.BigNumber;
				splitAmt: ethers.BigNumber;
			};
			const currentReceivers: SplitsReceiverStruct[] = [];

			dripsHubContractStub.splitResult.withArgs(userId, currentReceivers, amount).resolves(expectedResult);

			// Act
			const actualResult = await testDripsHubClient.getSplitResult(userId, currentReceivers, amount);

			// Assert
			assert.equal(actualResult.splitAmount, expectedResult.splitAmt.toBigInt());
			assert.equal(actualResult.collectableAmount, expectedResult.collectableAmt.toBigInt());
			assert(dripsHubContractStub.splitResult.calledOnceWithExactly(userId, currentReceivers, amount));
		});
	});

	describe('split()', () => {
		it('should ensure the signer exists', async () => {
			// Arrange
			const userId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const receivers: SplitsReceiverStruct[] = [
				{ userId: 1, weight: 1 },
				{ userId: 2, weight: 2 }
			];

			const ensureSignerExistsStub = sinon.stub(internals, 'ensureSignerExists');

			// Act
			await testDripsHubClient.split(userId, tokenAddress, receivers);

			// Assert
			assert(
				ensureSignerExistsStub.calledOnceWithExactly(testDripsHubClient.signer),
				'Expected method to be called with different arguments'
			);
		});

		it('should validate the input', async () => {
			// Arrange
			const userId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const receivers: SplitsReceiverStruct[] = [
				{ userId: 1, weight: 1 },
				{ userId: 2, weight: 2 }
			];

			const validateSplitInputStub = sinon.stub(validators, 'validateSplitInput');

			// Act
			await testDripsHubClient.split(userId, tokenAddress, receivers);

			// Assert
			assert(validateSplitInputStub.calledOnceWithExactly(userId, tokenAddress, receivers));
		});

		it('should call the setDrips() method of the AddressDriver contract', async () => {
			// Arrange
			const userId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const receivers: SplitsReceiverStruct[] = [
				{ userId: 2, weight: 2 },
				{ userId: 1, weight: 1 }
			];

			// Act
			await testDripsHubClient.split(userId, tokenAddress, receivers);

			// Assert
			assert(
				dripsHubContractStub.split.calledOnceWithExactly(
					userId,
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
			const userId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			dripsHubContractStub.collectable.withArgs(userId, tokenAddress).resolves(BigNumber.from(1));

			// Act
			await testDripsHubClient.getCollectableBalanceForUser(userId, tokenAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should throw argumentMissingError when userId is missing', async () => {
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
			const userId = '1';
			const expectedBalance = BigNumber.from(1);
			const tokenAddress = Wallet.createRandom().address;

			dripsHubContractStub.collectable.withArgs(userId, tokenAddress).resolves(expectedBalance);

			// Act
			const actualBalance = await testDripsHubClient.getCollectableBalanceForUser(userId, tokenAddress);

			// Assert
			assert.equal(actualBalance.tokenAddress, tokenAddress);
			assert.equal(actualBalance.collectableAmount, expectedBalance.toBigInt());
			assert(dripsHubContractStub.collectable.calledOnceWithExactly(userId, tokenAddress));
		});
	});

	describe('dripsState()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const userId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			dripsHubContractStub.dripsState.withArgs(userId, tokenAddress).resolves({} as any);

			// Act
			await testDripsHubClient.dripsState(userId, tokenAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should throw argumentMissingError when userId is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;

			try {
				// Act
				await testDripsHubClient.dripsState(undefined as unknown as string, tokenAddress);
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
			const userId = '1';
			const expectedState = {
				dripsHash: '0x00',
				dripsHistoryHash: '0x01',
				updateTime: 1,
				balance: BigNumber.from(2),
				maxEnd: 3
			} as any;
			const tokenAddress = Wallet.createRandom().address;

			dripsHubContractStub.dripsState.withArgs(userId, tokenAddress).resolves(expectedState);

			// Act
			const actualState = await testDripsHubClient.dripsState(userId, tokenAddress);

			// Assert
			assert.equal(actualState.maxEnd, expectedState.maxEnd);
			assert.equal(actualState.balance, expectedState.balance.toBigInt());
			assert.equal(actualState.dripsHash, expectedState.dripsHash);
			assert.equal(actualState.updateTime, expectedState.updateTime);
			assert.equal(actualState.dripsHistoryHash, expectedState.dripsHistoryHash);
			assert(dripsHubContractStub.dripsState.calledOnceWithExactly(userId, tokenAddress));
		});
	});

	describe('getDripsBalanceAt()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const userId = '1';
			const timestamp = 11111n;
			const receivers: DripsReceiverStruct[] = [];
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			dripsHubContractStub.balanceAt.withArgs(userId, tokenAddress, receivers, timestamp).resolves(BigNumber.from(1));

			// Act
			await testDripsHubClient.getDripsBalanceAt(userId, tokenAddress, receivers, timestamp);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should validate the drips receivers', async () => {
			// Arrange
			const userId = '1';
			const timestamp = 11111n;
			const receivers: DripsReceiverStruct[] = [
				{
					userId: 1,
					config: Utils.DripsReceiverConfiguration.toUint256({ dripId: 1n, amountPerSec: 1n, duration: 1n, start: 1n })
				}
			];
			const tokenAddress = Wallet.createRandom().address;
			const validateDripsReceiversStub = sinon.stub(validators, 'validateDripsReceivers');

			dripsHubContractStub.balanceAt.withArgs(userId, tokenAddress, receivers, timestamp).resolves(BigNumber.from(1));

			// Act
			await testDripsHubClient.getDripsBalanceAt(userId, tokenAddress, receivers, timestamp);

			// Assert
			assert(
				validateDripsReceiversStub.calledOnceWithExactly(
					sinon.match(
						(r: { userId: string; config: DripsReceiverConfig }[]) =>
							Utils.DripsReceiverConfiguration.toUint256(r[0].config) === receivers[0].config
					)
				)
			);
		});

		it('should throw argumentMissingError when userId is missing', async () => {
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
			const userId = '1';
			const timestamp = 11111n;
			const tokenAddress = Wallet.createRandom().address;
			const receivers: DripsReceiverStruct[] = [
				{
					userId: 1,
					config: Utils.DripsReceiverConfiguration.toUint256({ dripId: 1n, amountPerSec: 1n, duration: 1n, start: 1n })
				}
			];
			const expectedBalance = BigNumber.from(1);

			dripsHubContractStub.balanceAt.withArgs(userId, tokenAddress, receivers, timestamp).resolves(expectedBalance);

			// Act
			const actualBalance = await testDripsHubClient.getDripsBalanceAt(userId, tokenAddress, receivers, timestamp);

			// Assert
			assert.equal(actualBalance, expectedBalance.toBigInt());
			assert(dripsHubContractStub.balanceAt.calledOnceWithExactly(userId, tokenAddress, receivers, timestamp));
		});
	});
});
