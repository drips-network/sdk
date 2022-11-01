import type { Network } from '@ethersproject/networks';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubObject, stubInterface } from 'ts-sinon';
import { assert } from 'chai';
import type { BigNumberish, BytesLike } from 'ethers';
import { BigNumber, Wallet } from 'ethers';
import DripsHubClient from '../../src/DripsHub/DripsHubClient';
import type { DripsHub } from '../../contracts';
import { DripsHub__factory } from '../../contracts';
import Utils from '../../src/utils';
import { DripsErrorCode } from '../../src/common/DripsError';
import * as internals from '../../src/common/internals';
import type { DripsHistoryStruct, DripsReceiverStruct, SplitsReceiverStruct } from '../../contracts/DripsHub';
import type { DripsReceiverConfig } from '../../src/common/types';
import DripsSubgraphClient from '../../src/DripsSubgraph/DripsSubgraphClient';
import type { DripsSetEvent } from '../../src/DripsSubgraph/types';
import type { CollectableBalance, ReceivableBalance, SplittableBalance } from '../../src/DripsHub/types';

describe('DripsHubClient', () => {
	const TEST_CHAIN_ID = 5; // Goerli.

	let networkStub: StubbedInstance<Network>;
	let signerStub: StubbedInstance<JsonRpcSigner>;
	let providerStub: StubbedInstance<JsonRpcProvider>;
	let dripsHubContractStub: StubbedInstance<DripsHub>;
	let dripsSubgraphClientStub: StubbedInstance<DripsSubgraphClient>;

	let testDripsHubClient: DripsHubClient;

	beforeEach(async () => {
		providerStub = sinon.createStubInstance(JsonRpcProvider);

		signerStub = sinon.createStubInstance(JsonRpcSigner);
		signerStub.getAddress.resolves(Wallet.createRandom().address);

		networkStub = stubObject<Network>({ chainId: TEST_CHAIN_ID } as Network);

		providerStub.getSigner.returns(signerStub);
		providerStub.getNetwork.resolves(networkStub);

		dripsHubContractStub = stubInterface<DripsHub>();

		sinon
			.stub(DripsHub__factory, 'connect')
			.withArgs(Utils.Network.dripsMetadata[TEST_CHAIN_ID].CONTRACT_DRIPS_HUB, signerStub)
			.returns(dripsHubContractStub);

		dripsSubgraphClientStub = stubInterface<DripsSubgraphClient>();
		sinon.stub(DripsSubgraphClient, 'create').returns(dripsSubgraphClientStub);

		testDripsHubClient = await DripsHubClient.create(providerStub);
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
				await DripsHubClient.create(undefined as unknown as JsonRpcProvider);
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
				await DripsHubClient.create(providerStub);
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
			DripsHubClient.create(providerStub);

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
				await DripsHubClient.create(providerStub);
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
			assert.equal(await testDripsHubClient.signer.getAddress(), await signerStub.getAddress());
			assert.equal(testDripsHubClient.network.chainId, networkStub.chainId);
			assert.equal(
				await testDripsHubClient.provider.getSigner().getAddress(),
				await providerStub.getSigner().getAddress()
			);
			assert.equal(
				testDripsHubClient.dripsMetadata,
				Utils.Network.dripsMetadata[(await providerStub.getNetwork()).chainId]
			);
			assert.equal(testDripsHubClient.signerAddress, await signerStub.getAddress());
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
			const validateAddressStub = sinon.stub(internals, 'validateAddress');

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
			const validateAddressStub = sinon.stub(internals, 'validateAddress');

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
			const validateAddressStub = sinon.stub(internals, 'validateAddress');

			dripsHubContractStub.receiveDripsResult.withArgs(userId, tokenAddress, maxCycles).resolves({
				receivableAmt: BigNumber.from(1),
				receivableCycles: 1
			} as any);

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
			const expectedBalance = {
				receivableAmt: BigNumber.from(1),
				receivableCycles: 1
			} as [BigNumber, number] & { receivableAmt: BigNumber; receivableCycles: number };

			dripsHubContractStub.receiveDripsResult.withArgs(userId, tokenAddress, maxCycles).resolves(expectedBalance);

			// Act
			const actualBalance = await testDripsHubClient.getReceivableBalanceForUser(userId, tokenAddress, maxCycles);

			// Assert
			assert.equal(actualBalance.receivableAmount, expectedBalance.receivableAmt.toBigInt());
			assert.equal(actualBalance.remainingReceivableCycles, expectedBalance.receivableCycles);
			assert(dripsHubContractStub.receiveDripsResult.calledOnceWithExactly(userId, tokenAddress, maxCycles));
		});
	});

	describe('getAllReceivableBalancesForUser()', () => {
		it('should throw argumentMissingError when userId is missing', async () => {
			// Arrange
			let threw = false;

			try {
				// Act
				await testDripsHubClient.getAllReceivableBalancesForUser(undefined as unknown as string);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw argumentError when maxCycles is less than 0', async () => {
			// Arrange
			let threw = false;

			try {
				// Act
				await testDripsHubClient.getAllReceivableBalancesForUser('1', -1);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return an empty array when there are no tokens found for the user', async () => {
			// Arrange
			const userId = '1';
			const maxCycles = 10;

			dripsSubgraphClientStub.getDripsSetEventsByUserId.withArgs(userId).resolves([]);

			// Act
			const balances = await testDripsHubClient.getAllReceivableBalancesForUser(userId, maxCycles);

			// Assert
			assert.isEmpty(balances);
		});

		it('should return the expected receivable balances', async () => {
			// Arrange
			const userId = '1';
			const maxCycles = 10;
			const tokenAddress1 = Wallet.createRandom().address;
			const tokenAddress2 = Wallet.createRandom().address;

			const dripsSetEvents: DripsSetEvent[] = [
				{
					assetId: Utils.Asset.getIdFromAddress(tokenAddress1)
				} as DripsSetEvent,
				{
					assetId: Utils.Asset.getIdFromAddress(tokenAddress2)
				} as DripsSetEvent
			];

			const receivableDrips: ReceivableBalance[] = [
				{
					tokenAddress: tokenAddress1,
					receivableAmount: BigInt(1),
					remainingReceivableCycles: 1
				},
				{
					tokenAddress: tokenAddress2,
					receivableAmount: BigInt(2),
					remainingReceivableCycles: 2
				}
			];

			sinon
				.stub(DripsHubClient.prototype, 'getReceivableBalanceForUser')
				.onFirstCall()
				.resolves(receivableDrips[0])
				.onSecondCall()
				.resolves(receivableDrips[1]);

			dripsSubgraphClientStub.getDripsSetEventsByUserId.withArgs(userId).resolves(dripsSetEvents);

			// Act
			const balances = await testDripsHubClient.getAllReceivableBalancesForUser(userId, maxCycles);

			// Assert
			assert.equal(balances[0].tokenAddress, Utils.Asset.getAddressFromId(dripsSetEvents[0].assetId));
			assert.equal(balances[0].receivableAmount, receivableDrips[0].receivableAmount);
			assert.equal(balances[0].remainingReceivableCycles, receivableDrips[0].remainingReceivableCycles);
			assert.equal(balances[1].tokenAddress, Utils.Asset.getAddressFromId(dripsSetEvents[1].assetId));
			assert.equal(balances[1].receivableAmount, receivableDrips[1].receivableAmount);
			assert.equal(balances[1].remainingReceivableCycles, receivableDrips[1].remainingReceivableCycles);
		});
	});

	describe('receiveDrips()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const userId = '1';
			const maxCycles = 1n;
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(internals, 'validateAddress');

			// Act
			await testDripsHubClient.receiveDrips(userId, tokenAddress, maxCycles);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should throw argumentMissingError when userId is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;

			try {
				// Act
				await testDripsHubClient.receiveDrips(undefined as unknown as string, tokenAddress, 1n);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw argumentError when maxCycles is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;

			try {
				// Act
				await testDripsHubClient.receiveDrips('1', tokenAddress, undefined as unknown as bigint);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
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

	describe('getSqueezableBalance()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const userId = '1';
			const senderId = '1';
			const historyHash = '0x';
			const dripsHistory: DripsHistoryStruct[] = [];
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(internals, 'validateAddress');

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
				await testDripsHubClient.getSqueezableBalance('1', tokenAddress, '1', undefined as unknown as BytesLike, []);
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
			const validateAddressStub = sinon.stub(internals, 'validateAddress');

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

	describe('getAllSplittableBalancesForUser()', () => {
		it('should throw argumentMissingError when userId is missing', async () => {
			// Arrange
			let threw = false;

			try {
				// Act
				await testDripsHubClient.getAllSplittableBalancesForUser(undefined as unknown as string);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return an empty array when there are no tokens found for the user', async () => {
			// Arrange
			const userId = '1';

			dripsSubgraphClientStub.getDripsSetEventsByUserId.withArgs(userId).resolves([]);

			// Act
			const balances = await testDripsHubClient.getAllSplittableBalancesForUser(userId);

			// Assert
			assert.isEmpty(balances);
		});

		it('should return the expected splittable balances', async () => {
			// Arrange
			const userId = '1';
			const tokenAddress1 = Wallet.createRandom().address;
			const tokenAddress2 = Wallet.createRandom().address;

			const dripsSetEvents: DripsSetEvent[] = [
				{
					assetId: Utils.Asset.getIdFromAddress(tokenAddress1)
				} as DripsSetEvent,
				{
					assetId: Utils.Asset.getIdFromAddress(tokenAddress2)
				} as DripsSetEvent
			];

			const splittableBalances: SplittableBalance[] = [
				{
					tokenAddress: tokenAddress1,
					splittableAmount: 1n
				},
				{
					tokenAddress: tokenAddress2,
					splittableAmount: 2n
				}
			];

			sinon
				.stub(DripsHubClient.prototype, 'getSplittableBalanceForUser')
				.onFirstCall()
				.resolves(splittableBalances[0])
				.onSecondCall()
				.resolves(splittableBalances[1]);

			dripsSubgraphClientStub.getDripsSetEventsByUserId.withArgs(userId).resolves(dripsSetEvents);

			// Act
			const balances = await testDripsHubClient.getAllSplittableBalancesForUser(userId);

			// Assert
			assert.equal(balances[0].splittableAmount, splittableBalances[0].splittableAmount);
			assert.equal(balances[0].tokenAddress, splittableBalances[0].tokenAddress);
			assert.equal(balances[1].splittableAmount, splittableBalances[1].splittableAmount);
			assert.equal(balances[1].tokenAddress, splittableBalances[1].tokenAddress);
		});
	});

	describe('getSplitResult', () => {
		it('validate split receivers', async () => {
			// Arrange
			const receivers: SplitsReceiverStruct[] = [
				{ userId: 1, weight: 1 },
				{ userId: 2, weight: 2 }
			];

			const validateSplitsReceiversStub = sinon.stub(internals, 'validateSplitsReceivers');

			dripsHubContractStub.splitResult.withArgs('1', receivers, 1).resolves(BigNumber.from(0));

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
			const expectedAmountLeft = BigNumber.from(10);
			const currentReceivers: SplitsReceiverStruct[] = [];

			dripsHubContractStub.splitResult.withArgs(userId, currentReceivers, amount).resolves(expectedAmountLeft);

			// Act
			const actualAmountLeft = await testDripsHubClient.getSplitResult(userId, currentReceivers, amount);

			// Assert
			assert.equal(actualAmountLeft, expectedAmountLeft.toBigInt());
			assert(dripsHubContractStub.splitResult.calledOnceWithExactly(userId, currentReceivers, amount));
		});
	});

	describe('split', () => {
		it('should throw argumentMissingError when splits receivers are missing', async () => {
			// Arrange
			let threw = false;

			// Act
			try {
				await testDripsHubClient.split(undefined as unknown as BigNumberish, Wallet.createRandom().address, []);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should validate the splits receivers', async () => {
			// Arrange
			const userId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const receivers: SplitsReceiverStruct[] = [
				{ userId: 1, weight: 1 },
				{ userId: 2, weight: 2 }
			];

			const validateSplitsReceiversStub = sinon.stub(internals, 'validateSplitsReceivers');

			// Act
			await testDripsHubClient.split(userId, tokenAddress, receivers);

			// Assert
			assert(validateSplitsReceiversStub.calledOnceWithExactly(receivers));
		});

		it('should validate the ERC20 address', async () => {
			// Arrange
			const userId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const receivers: SplitsReceiverStruct[] = [
				{ userId: 1, weight: 1 },
				{ userId: 2, weight: 2 }
			];

			const validateSplitsReceiversStub = sinon.stub(internals, 'validateSplitsReceivers');

			// Act
			await testDripsHubClient.split(userId, tokenAddress, receivers);

			// Assert
			assert(validateSplitsReceiversStub.calledOnceWithExactly(receivers));
		});

		it('should call the setDrips() method of the AddressDriver contract', async () => {
			// Arrange
			const userId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const receivers: SplitsReceiverStruct[] = [
				{ userId: 1, weight: 1 },
				{ userId: 2, weight: 2 }
			];

			// Act
			await testDripsHubClient.split(userId, tokenAddress, receivers);

			// Assert
			assert(
				dripsHubContractStub.split.calledOnceWithExactly(userId, tokenAddress, receivers),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getCollectableBalanceForUser()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const userId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(internals, 'validateAddress');

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

	describe('getAllCollectableBalancesForUser()', () => {
		it('should throw argumentMissingError when userId is missing', async () => {
			// Arrange
			let threw = false;

			try {
				// Act
				await testDripsHubClient.getAllCollectableBalancesForUser(undefined as unknown as string);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return an empty array when there are no tokens found for the user', async () => {
			// Arrange
			const userId = '1';

			dripsSubgraphClientStub.getDripsSetEventsByUserId.withArgs(userId).resolves([]);

			// Act
			const balances = await testDripsHubClient.getAllCollectableBalancesForUser(userId);

			// Assert
			assert.isEmpty(balances);
		});

		it('should return the expected collectable balances', async () => {
			// Arrange
			const userId = '1';
			const tokenAddress1 = Wallet.createRandom().address;
			const tokenAddress2 = Wallet.createRandom().address;

			const dripsSetEvents: DripsSetEvent[] = [
				{
					assetId: Utils.Asset.getIdFromAddress(tokenAddress1)
				} as DripsSetEvent,
				{
					assetId: Utils.Asset.getIdFromAddress(tokenAddress2)
				} as DripsSetEvent
			];

			const collectableBalances: CollectableBalance[] = [
				{
					tokenAddress: tokenAddress1,
					collectableAmount: 1n
				},
				{
					tokenAddress: tokenAddress2,
					collectableAmount: 2n
				}
			];

			sinon
				.stub(DripsHubClient.prototype, 'getCollectableBalanceForUser')
				.onFirstCall()
				.resolves(collectableBalances[0])
				.onSecondCall()
				.resolves(collectableBalances[1]);

			dripsSubgraphClientStub.getDripsSetEventsByUserId.withArgs(userId).resolves(dripsSetEvents);

			// Act
			const balances = await testDripsHubClient.getAllCollectableBalancesForUser(userId);

			// Assert
			assert.equal(balances[0].collectableAmount, collectableBalances[0].collectableAmount);
			assert.equal(balances[0].tokenAddress, collectableBalances[0].tokenAddress);
			assert.equal(balances[1].collectableAmount, collectableBalances[1].collectableAmount);
			assert.equal(balances[1].tokenAddress, collectableBalances[1].tokenAddress);
		});
	});

	describe('dripsState()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const userId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(internals, 'validateAddress');

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
			const validateAddressStub = sinon.stub(internals, 'validateAddress');

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
			const validateDripsReceiversStub = sinon.stub(internals, 'validateDripsReceivers');

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
