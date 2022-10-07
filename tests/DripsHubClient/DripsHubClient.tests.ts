import type { Network } from '@ethersproject/networks';
import { JsonRpcProvider } from '@ethersproject/providers';
import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubObject, stubInterface } from 'ts-sinon';
import { assert } from 'chai';
import type { BigNumberish, BytesLike } from 'ethers';
import { Wallet } from 'ethers';
import DripsHubClient from '../../src/DripsHub/DripsHubClient';
import type { DripsHub } from '../../contracts';
import { DripsHub__factory } from '../../contracts';
import Utils from '../../src/utils';
import { DripsErrorCode } from '../../src/common/DripsError';
import { toBN } from '../../src/common/internals';
import * as internals from '../../src/common/internals';
import type { DripsHistoryStruct } from '../../contracts/AddressDriver';
import type { DripsReceiverStruct } from '../../contracts/DripsHub';
import type { DripsReceiverConfig, ReceivableDrips } from '../../src/common/types';
import DripsSubgraphClient from '../../src/DripsSubgraph/DripsSubgraphClient';
import type { DripsSetEvent } from '../../src/DripsSubgraph/types';

describe('DripsHubClient', () => {
	const TEST_CHAIN_ID = 5; // Goerli.
	const TEST_TOTAL_SPLITS_WEIGHT = 10;
	const TEST_MAX_DRIPS_RECEIVERS = 10;
	const TEST_MAX_SPLITS_RECEIVERS = 20;
	const TEST_MAX_TOTAL_BALANCE = toBN(1);
	const TEST_AMT_PER_SEC_EXTRA_DECIMALS = 18;
	const TEST_AMT_PER_SEC_MULTIPLIER = toBN(1000);

	let networkStub: StubbedInstance<Network>;
	let providerStub: StubbedInstance<JsonRpcProvider>;
	let dripsHubContractStub: StubbedInstance<DripsHub>;
	let dripsSubgraphClientStub: StubbedInstance<DripsSubgraphClient>;

	let testDripsHubClient: DripsHubClient;

	beforeEach(async () => {
		providerStub = sinon.createStubInstance(JsonRpcProvider);

		networkStub = stubObject<Network>({ chainId: TEST_CHAIN_ID } as Network);

		providerStub.getNetwork.resolves(networkStub);

		dripsHubContractStub = stubInterface<DripsHub>();

		sinon
			.stub(DripsHub__factory, 'connect')
			.withArgs(Utils.Network.dripsMetadata[TEST_CHAIN_ID].CONTRACT_DRIPS_HUB, providerStub)
			.returns(dripsHubContractStub);

		dripsSubgraphClientStub = stubInterface<DripsSubgraphClient>();
		sinon.stub(DripsSubgraphClient, 'create').returns(dripsSubgraphClientStub);

		dripsHubContractStub.MAX_TOTAL_BALANCE.resolves(TEST_MAX_TOTAL_BALANCE);
		dripsHubContractStub.TOTAL_SPLITS_WEIGHT.resolves(TEST_TOTAL_SPLITS_WEIGHT);
		dripsHubContractStub.MAX_DRIPS_RECEIVERS.resolves(TEST_MAX_DRIPS_RECEIVERS);
		dripsHubContractStub.MAX_SPLITS_RECEIVERS.resolves(TEST_MAX_SPLITS_RECEIVERS);
		dripsHubContractStub.AMT_PER_SEC_MULTIPLIER.resolves(TEST_AMT_PER_SEC_MULTIPLIER);
		dripsHubContractStub.AMT_PER_SEC_EXTRA_DECIMALS.resolves(TEST_AMT_PER_SEC_EXTRA_DECIMALS);

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
			assert.equal(testDripsHubClient.constants.MAX_TOTAL_BALANCE, TEST_MAX_TOTAL_BALANCE);
			assert.equal(testDripsHubClient.constants.TOTAL_SPLITS_WEIGHT, TEST_TOTAL_SPLITS_WEIGHT);
			assert.equal(testDripsHubClient.constants.MAX_DRIPS_RECEIVERS, TEST_MAX_DRIPS_RECEIVERS);
			assert.equal(testDripsHubClient.constants.MAX_SPLITS_RECEIVERS, TEST_MAX_SPLITS_RECEIVERS);
			assert.equal(testDripsHubClient.constants.AMT_PER_SEC_MULTIPLIER, TEST_AMT_PER_SEC_MULTIPLIER);
			assert.equal(testDripsHubClient.constants.AMT_PER_SEC_EXTRA_DECIMALS, TEST_AMT_PER_SEC_EXTRA_DECIMALS);
			assert.equal(testDripsHubClient.network.chainId, TEST_CHAIN_ID);
			assert.equal((await testDripsHubClient.provider.getNetwork()).chainId, networkStub.chainId);
			assert.equal(
				testDripsHubClient.dripsMetadata,
				Utils.Network.dripsMetadata[(await providerStub.getNetwork()).chainId]
			);
		});
	});

	describe('getCycleSecs()', () => {
		it('should call the getCycleSecs() method of the AddressDriver contract', async () => {
			// Act
			await testDripsHubClient.getCycleSecs();

			// Assert
			assert(dripsHubContractStub.cycleSecs.calledOnce);
		});
	});

	describe('getCycleSecs()', () => {
		it('should call the getCycleSecs() method of the AddressDriver contract', async () => {
			// Act
			await testDripsHubClient.getCycleSecs();

			// Assert
			assert(dripsHubContractStub.cycleSecs.calledOnce);
		});
	});

	describe('getTotalBalanceForToken()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(internals, 'validateAddress');

			// Act
			await testDripsHubClient.getTotalBalanceForToken(tokenAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should call the totalBalance() method of the AddressDriver contract', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;

			// Act
			await testDripsHubClient.getTotalBalanceForToken(tokenAddress);

			// Assert
			assert(dripsHubContractStub.totalBalance.calledOnceWithExactly(tokenAddress));
		});
	});

	describe('getReceivableDripsCyclesCount()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const userId = 1;
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(internals, 'validateAddress');

			// Act
			await testDripsHubClient.getReceivableDripsCyclesCount(userId, tokenAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should throw argumentMissingError when userId is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;

			try {
				// Act
				await testDripsHubClient.getReceivableDripsCyclesCount(undefined as unknown as BigNumberish, tokenAddress);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should call the receivableDripsCycles() method of the AddressDriver contract', async () => {
			// Arrange
			const userId = 1;
			const tokenAddress = Wallet.createRandom().address;

			// Act
			await testDripsHubClient.getReceivableDripsCyclesCount(userId, tokenAddress);

			// Assert
			assert(dripsHubContractStub.receivableDripsCycles.calledOnceWithExactly(userId, tokenAddress));
		});
	});

	describe('getReceivableDrips()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const userId = 1;
			const maxCycles = 1;
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(internals, 'validateAddress');

			// Act
			await testDripsHubClient.getReceivableDrips(userId, tokenAddress, maxCycles);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should throw argumentMissingError when userId is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;

			try {
				// Act
				await testDripsHubClient.getReceivableDrips(undefined as unknown as BigNumberish, tokenAddress, 1);
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
				await testDripsHubClient.getReceivableDrips(1, tokenAddress, undefined as unknown as BigNumberish);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should call the receivableDrips() method of the AddressDriver contract', async () => {
			// Arrange
			const userId = 1;
			const maxCycles = 1;
			const tokenAddress = Wallet.createRandom().address;

			// Act
			await testDripsHubClient.getReceivableDrips(userId, tokenAddress, maxCycles);

			// Assert
			assert(dripsHubContractStub.receivableDrips.calledOnceWithExactly(userId, tokenAddress, maxCycles));
		});
	});

	describe('receiveDrips()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const userId = 1;
			const maxCycles = 1;
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
				await testDripsHubClient.receiveDrips(undefined as unknown as BigNumberish, tokenAddress, 1);
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
				await testDripsHubClient.receiveDrips(1, tokenAddress, undefined as unknown as BigNumberish);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should call the receiveDrips() method of the AddressDriver contract', async () => {
			// Arrange
			const userId = 1;
			const maxCycles = 1;
			const tokenAddress = Wallet.createRandom().address;

			// Act
			await testDripsHubClient.receiveDrips(userId, tokenAddress, maxCycles);

			// Assert
			assert(dripsHubContractStub.receiveDrips.calledOnceWithExactly(userId, tokenAddress, maxCycles));
		});
	});

	describe('getSqueezableDrips()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const userId = 1;
			const senderId = 1;
			const historyHash = '0x';
			const dripsHistory: DripsHistoryStruct[] = [];
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(internals, 'validateAddress');

			// Act
			await testDripsHubClient.getSqueezableDrips(userId, tokenAddress, senderId, historyHash, dripsHistory);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should throw argumentMissingError when userId is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;

			try {
				// Act
				await testDripsHubClient.getSqueezableDrips(undefined as unknown as BigNumberish, tokenAddress, 1, '', []);
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
				await testDripsHubClient.getSqueezableDrips(1, tokenAddress, undefined as unknown as BigNumberish, '', []);
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
				await testDripsHubClient.getSqueezableDrips(1, tokenAddress, 1, undefined as unknown as BytesLike, []);
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
				await testDripsHubClient.getSqueezableDrips(
					1,
					tokenAddress,
					1,
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

		it('should call the squeezableDrips() method of the AddressDriver contract', async () => {
			// Arrange
			const userId = 1;
			const senderId = 1;
			const historyHash = '0x';
			const dripsHistory: DripsHistoryStruct[] = [];
			const tokenAddress = Wallet.createRandom().address;

			// Act
			await testDripsHubClient.getSqueezableDrips(userId, tokenAddress, senderId, historyHash, dripsHistory);

			// Assert
			assert(
				dripsHubContractStub.squeezableDrips.calledOnceWithExactly(
					userId,
					tokenAddress,
					senderId,
					historyHash,
					dripsHistory
				)
			);
		});
	});

	describe('getNextSqueezedDrips()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const userId = 1;
			const senderId = 1;
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(internals, 'validateAddress');

			// Act
			await testDripsHubClient.getNextSqueezedDrips(userId, tokenAddress, senderId);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should throw argumentMissingError when userId is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;

			try {
				// Act
				await testDripsHubClient.getNextSqueezedDrips(undefined as unknown as BigNumberish, tokenAddress, 1);
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
				await testDripsHubClient.getNextSqueezedDrips(1, tokenAddress, undefined as unknown as BigNumberish);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should call the nextSqueezedDrips() method of the AddressDriver contract', async () => {
			// Arrange
			const userId = 1;
			const senderId = 1;
			const tokenAddress = Wallet.createRandom().address;

			// Act
			await testDripsHubClient.getNextSqueezedDrips(userId, tokenAddress, senderId);

			// Assert
			assert(dripsHubContractStub.nextSqueezedDrips.calledOnceWithExactly(userId, tokenAddress, senderId));
		});
	});

	describe('getSplittable()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const userId = 1;
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(internals, 'validateAddress');

			// Act
			await testDripsHubClient.getSplittable(userId, tokenAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should throw argumentMissingError when userId is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;

			try {
				// Act
				await testDripsHubClient.getSplittable(undefined as unknown as BigNumberish, tokenAddress);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should call the splittable() method of the AddressDriver contract', async () => {
			// Arrange
			const userId = 1;
			const tokenAddress = Wallet.createRandom().address;

			// Act
			await testDripsHubClient.getSplittable(userId, tokenAddress);

			// Assert
			assert(dripsHubContractStub.splittable.calledOnceWithExactly(userId, tokenAddress));
		});
	});

	describe('getCollectable()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const userId = 1;
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(internals, 'validateAddress');

			// Act
			await testDripsHubClient.getCollectable(userId, tokenAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should throw argumentMissingError when userId is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;

			try {
				// Act
				await testDripsHubClient.getCollectable(undefined as unknown as BigNumberish, tokenAddress);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should call the collectable() method of the AddressDriver contract', async () => {
			// Arrange
			const userId = 1;
			const tokenAddress = Wallet.createRandom().address;

			// Act
			await testDripsHubClient.getCollectable(userId, tokenAddress);

			// Assert
			assert(dripsHubContractStub.collectable.calledOnceWithExactly(userId, tokenAddress));
		});
	});

	describe('getDripsState()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const userId = 1;
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(internals, 'validateAddress');

			// Act
			await testDripsHubClient.getDripsState(userId, tokenAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should throw argumentMissingError when userId is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;

			try {
				// Act
				await testDripsHubClient.getDripsState(undefined as unknown as BigNumberish, tokenAddress);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should call the dripsState() method of the AddressDriver contract', async () => {
			// Arrange
			const userId = 1;
			const tokenAddress = Wallet.createRandom().address;

			// Act
			await testDripsHubClient.getDripsState(userId, tokenAddress);

			// Assert
			assert(dripsHubContractStub.dripsState.calledOnceWithExactly(userId, tokenAddress));
		});
	});

	describe('getBalanceAt()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const userId = 1;
			const timestamp = 11111;
			const receivers: DripsReceiverStruct[] = [];
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(internals, 'validateAddress');

			// Act
			await testDripsHubClient.getBalanceAt(userId, tokenAddress, receivers, timestamp);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should validate the drips receivers', async () => {
			// Arrange
			const userId = 1;
			const timestamp = 11111;
			const receivers: DripsReceiverStruct[] = [
				{
					userId: 1,
					config: Utils.DripsReceiverConfiguration.toUint256String({ amountPerSec: 1, duration: 1, start: 1 })
				}
			];
			const tokenAddress = Wallet.createRandom().address;
			const validateDripsReceiversStub = sinon.stub(internals, 'validateDripsReceivers');

			// Act
			await testDripsHubClient.getBalanceAt(userId, tokenAddress, receivers, timestamp);

			// Assert
			assert(
				validateDripsReceiversStub.calledOnceWithExactly(
					sinon.match(
						(r: { userId: BigNumberish; config: DripsReceiverConfig }[]) =>
							Utils.DripsReceiverConfiguration.toUint256String(r[0].config) === receivers[0].config
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
				await testDripsHubClient.getBalanceAt(undefined as unknown as BigNumberish, tokenAddress, [], 1);
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
				await testDripsHubClient.getBalanceAt(1, tokenAddress, [], undefined as unknown as BigNumberish);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should call the balanceAt() method of the AddressDriver contract', async () => {
			// Arrange
			const userId = 1;
			const timestamp = 11111;
			const tokenAddress = Wallet.createRandom().address;
			const receivers: DripsReceiverStruct[] = [
				{
					userId: 1,
					config: Utils.DripsReceiverConfiguration.toUint256String({ amountPerSec: 1, duration: 1, start: 1 })
				}
			];

			// Act
			await testDripsHubClient.getBalanceAt(userId, tokenAddress, receivers, timestamp);

			// Assert
			assert(dripsHubContractStub.balanceAt.calledOnceWithExactly(userId, tokenAddress, receivers, timestamp));
		});
	});

	describe('getBalancesForUser()', () => {
		it('should throw argumentMissingError when userId is missing', async () => {
			// Arrange
			let threw = false;

			try {
				// Act
				await testDripsHubClient.getBalancesForUser(undefined as unknown as string);
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
				await testDripsHubClient.getBalancesForUser('1', -1);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return an empty array when there are no DripSet events for the user', async () => {
			// Arrange
			const userId = '1';
			const tokenAddress = Wallet.createRandom().address;

			dripsSubgraphClientStub.getDripsSetEventsByUserId.withArgs(userId).resolves([]);

			// Act
			const balances = await testDripsHubClient.getBalancesForUser(userId, tokenAddress);

			// Assert
			assert.isEmpty(balances);
		});

		it('should return the expected result', async () => {
			// Arrange
			const userId = '1';
			const tokenAddress = Wallet.createRandom().address;

			const dripsSetEvents: DripsSetEvent[] = [
				{
					assetId: Utils.Asset.getIdFromAddress(Wallet.createRandom().address)
				} as DripsSetEvent,
				{
					assetId: Utils.Asset.getIdFromAddress(Wallet.createRandom().address)
				} as DripsSetEvent
			];

			const receivableDrips: ReceivableDrips[] = [
				{
					receivableAmt: toBN(1),
					receivableCycles: 1
				},
				{
					receivableAmt: toBN(2),
					receivableCycles: 2
				}
			];

			sinon
				.stub(DripsHubClient.prototype, 'getReceivableDrips')
				.onFirstCall()
				.resolves(receivableDrips[0])
				.onSecondCall()
				.resolves(receivableDrips[1]);

			dripsSubgraphClientStub.getDripsSetEventsByUserId.withArgs(userId).resolves(dripsSetEvents);

			// Act
			const balances = await testDripsHubClient.getBalancesForUser(userId, tokenAddress);

			// Assert
			assert.equal(balances[0].tokenAddress, Utils.Asset.getAddressFromId(dripsSetEvents[0].assetId));
			assert.equal(balances[0].receivableDrips.receivableAmt, receivableDrips[0].receivableAmt);
			assert.equal(balances[0].receivableDrips.receivableCycles, receivableDrips[0].receivableCycles);
			assert.equal(balances[1].tokenAddress, Utils.Asset.getAddressFromId(dripsSetEvents[1].assetId));
			assert.equal(balances[1].receivableDrips.receivableAmt, receivableDrips[1].receivableAmt);
			assert.equal(balances[1].receivableDrips.receivableCycles, receivableDrips[1].receivableCycles);
		});
	});
});
