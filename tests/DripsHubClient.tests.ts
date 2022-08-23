import type { Network } from '@ethersproject/networks';
import type { JsonRpcProvider } from '@ethersproject/providers';
import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubObject, stubInterface } from 'ts-sinon';
import { assert } from 'chai';
import { Wallet } from 'ethers';
import DripsHubClient from '../src/DripsHubClient';
import type { DripsHubLogic as DripsHubContract } from '../contracts';
import { DripsHubLogic__factory } from '../contracts';
import * as utils from '../src/common';
import { DripsErrorCode, DripsErrors } from '../src/DripsError';
import type { DripsHistoryStruct, DripsReceiverStruct, SplitsReceiverStruct } from '../contracts/DripsHubLogic';

describe('DripsHubClient', () => {
	const TEST_CHAIN_ID = 5; // Goerli.

	let networkStub: StubbedInstance<Network>;
	let providerStub: StubbedInstance<JsonRpcProvider>;
	let dripsHubContractStub: StubbedInstance<DripsHubContract>;

	let testDripsHubClient: DripsHubClient;

	// Acts also as the "base Arrange step".
	beforeEach(async () => {
		providerStub = stubInterface<JsonRpcProvider>();

		networkStub = stubObject<Network>({ chainId: TEST_CHAIN_ID } as Network);

		providerStub.getNetwork.resolves(networkStub);

		dripsHubContractStub = stubInterface<DripsHubContract>();

		sinon
			.stub(DripsHubLogic__factory, 'connect')
			.withArgs(utils.chainIdToNetworkPropertiesMap[TEST_CHAIN_ID].CONTRACT_DRIPS_HUB, providerStub)
			.returns(dripsHubContractStub);

		testDripsHubClient = await DripsHubClient.create(providerStub);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('create()', () => {
		it('should throw invalidArgument error when the provider argument is missing', async () => {
			// Arrange.
			let threw = false;

			try {
				// Act.
				await DripsHubClient.create(undefined as unknown as JsonRpcProvider);
			} catch (error) {
				// Assert.
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert.
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it('should throw unsupportedNetwork error when the provider is connected to an unsupported chain', async () => {
			// Arrange.
			let threw = false;
			providerStub.getNetwork.resolves({ chainId: TEST_CHAIN_ID + 1 } as Network);

			try {
				// Act.
				await DripsHubClient.create(providerStub);
			} catch (error) {
				// Assert.
				assert.equal(error.code, DripsErrorCode.UNSUPPORTED_NETWORK);
				threw = true;
			}

			// Assert.
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it('should create a fully initialized client instance', async () => {
			// Assert.
			assert.equal(testDripsHubClient.network.chainId, networkStub.chainId);
			assert.equal(
				testDripsHubClient.networkProperties,
				utils.chainIdToNetworkPropertiesMap[(await providerStub.getNetwork()).chainId]
			);
			assert.equal(await testDripsHubClient.provider.getNetwork(), networkStub);
		});
	});

	describe('getCollectableAll()', () => {
		it('should guard against invalid ERC20 address', async () => {
			// Arrange.
			const erc20Address = 'invalid address';
			const guardAgainstInvalidAddressStub = sinon.stub(utils, 'guardAgainstInvalidAddress');
			guardAgainstInvalidAddressStub.throws(DripsErrors.invalidAddress('Error'));

			// Act.
			try {
				await testDripsHubClient.getCollectableAll(1, erc20Address, []);
			} catch (error) {
				// Just for the test to continue.
			}

			// Assert.
			assert(guardAgainstInvalidAddressStub.calledOnceWithExactly(erc20Address));
		});

		it('should call the collectableAll() method of the drips hub contract', async () => {
			// Arrange.
			const userId = 1;
			const currentReceivers: SplitsReceiverStruct[] = [];
			const erc20Address = Wallet.createRandom().address;

			// Act.
			await testDripsHubClient.getCollectableAll(userId, erc20Address, currentReceivers);

			// Assert.
			assert(
				dripsHubContractStub.collectableAll.calledOnceWithExactly(userId, erc20Address, currentReceivers),
				`Expected collectableAll() method to be called with different arguments`
			);
		});
	});

	describe('getSplittable()', () => {
		it('should guard against invalid ERC20 address', async () => {
			// Arrange.
			const erc20Address = 'invalid address';
			const guardAgainstInvalidAddressStub = sinon.stub(utils, 'guardAgainstInvalidAddress');
			guardAgainstInvalidAddressStub.throws(DripsErrors.invalidAddress('Error'));

			// Act.
			try {
				await testDripsHubClient.getSplittable(1, erc20Address);
			} catch (error) {
				// Just for the test to continue.
			}

			// Assert.
			assert(guardAgainstInvalidAddressStub.calledOnceWithExactly(erc20Address));
		});

		it('should call the getSplittable() method of the drips hub contract', async () => {
			// Arrange.
			const userId = 1;
			const erc20Address = Wallet.createRandom().address;

			// Act.
			await testDripsHubClient.getSplittable(userId, erc20Address);

			// Assert.
			assert(
				dripsHubContractStub.splittable.calledOnceWithExactly(userId, erc20Address),
				`Expected getSplittable() method to be called with different arguments`
			);
		});
	});

	describe('getCollectable()', () => {
		it('should guard against invalid ERC20 address', async () => {
			// Arrange.
			const erc20Address = 'invalid address';
			const guardAgainstInvalidAddressStub = sinon.stub(utils, 'guardAgainstInvalidAddress');
			guardAgainstInvalidAddressStub.throws(DripsErrors.invalidAddress('Error'));

			// Act.
			try {
				await testDripsHubClient.getCollectable(1, erc20Address);
			} catch (error) {
				// Just for the test to continue.
			}

			// Assert.
			assert(guardAgainstInvalidAddressStub.calledOnceWithExactly(erc20Address));
		});

		it('should call the getCollectable() method of the drips hub contract', async () => {
			// Arrange.
			const userId = 1;
			const erc20Address = Wallet.createRandom().address;

			// Act.
			await testDripsHubClient.getCollectable(userId, erc20Address);

			// Assert.
			assert(
				dripsHubContractStub.collectable.calledOnceWithExactly(userId, erc20Address),
				`Expected getCollectable() method to be called with different arguments`
			);
		});
	});

	describe('getDripsState()', () => {
		it('should guard against invalid ERC20 address', async () => {
			// Arrange.
			const erc20Address = 'invalid address';
			const guardAgainstInvalidAddressStub = sinon.stub(utils, 'guardAgainstInvalidAddress');
			guardAgainstInvalidAddressStub.throws(DripsErrors.invalidAddress('Error'));

			// Act.
			try {
				await testDripsHubClient.getDripsState(1, erc20Address);
			} catch (error) {
				// Just for the test to continue.
			}

			// Assert.
			assert(guardAgainstInvalidAddressStub.calledOnceWithExactly(erc20Address));
		});

		it('should call the getDripsState() method of the drips hub contract', async () => {
			// Arrange.
			const userId = 1;
			const erc20Address = Wallet.createRandom().address;

			// Act.
			await testDripsHubClient.getDripsState(userId, erc20Address);

			// Assert.
			assert(
				dripsHubContractStub.dripsState.calledOnceWithExactly(userId, erc20Address),
				`Expected getDripsState() method to be called with different arguments`
			);
		});
	});

	describe('getBalanceAt()', () => {
		it('should guard against invalid ERC20 address', async () => {
			// Arrange.
			const erc20Address = 'invalid address';
			const guardAgainstInvalidAddressStub = sinon.stub(utils, 'guardAgainstInvalidAddress');
			guardAgainstInvalidAddressStub.throws(DripsErrors.invalidAddress('Error'));

			// Act.
			try {
				await testDripsHubClient.getBalanceAt(1, erc20Address, [], 1);
			} catch (error) {
				// Just for the test to continue.
			}

			// Assert.
			assert(guardAgainstInvalidAddressStub.calledOnceWithExactly(erc20Address));
		});

		it('should call the getBalanceAt() method of the drips hub contract', async () => {
			// Arrange.
			const userId = 1;
			const timestamp = 1;
			const receivers: DripsReceiverStruct[] = [];
			const erc20Address = Wallet.createRandom().address;

			// Act.
			await testDripsHubClient.getBalanceAt(userId, erc20Address, receivers, timestamp);

			// Assert.
			assert(
				dripsHubContractStub.balanceAt.calledOnceWithExactly(userId, erc20Address, receivers, timestamp),
				`Expected getDripsState() method to be called with different arguments`
			);
		});
	});

	describe('getSqueezableDrips()', () => {
		it('should guard against invalid ERC20 address', async () => {
			// Arrange.
			const erc20Address = 'invalid address';
			const guardAgainstInvalidAddressStub = sinon.stub(utils, 'guardAgainstInvalidAddress');
			guardAgainstInvalidAddressStub.throws(DripsErrors.invalidAddress('Error'));

			// Act.
			try {
				await testDripsHubClient.getSqueezableDrips(1, erc20Address, 2, 'historyHash', []);
			} catch (error) {
				// Just for the test to continue.
			}

			// Assert.
			assert(guardAgainstInvalidAddressStub.calledOnceWithExactly(erc20Address));
		});

		it('should call the getSplittable() method of the drips hub contract', async () => {
			// Arrange.
			const userId = 1;
			const senderId = 2;
			const historyHash = 'bytes';
			const dripsHistory: DripsHistoryStruct[] = [];
			const erc20Address = Wallet.createRandom().address;
			// Act.
			await testDripsHubClient.getSqueezableDrips(userId, erc20Address, senderId, historyHash, dripsHistory);

			// Assert.
			assert(
				dripsHubContractStub.squeezableDrips.calledOnceWithExactly(
					userId,
					erc20Address,
					senderId,
					historyHash,
					dripsHistory
				),
				`Expected getSplittable() method to be called with different arguments`
			);
		});
	});

	describe('squeezeDrips()', () => {
		it('should guard against invalid ERC20 address', async () => {
			// Arrange.
			const erc20Address = 'invalid address';
			const guardAgainstInvalidAddressStub = sinon.stub(utils, 'guardAgainstInvalidAddress');
			guardAgainstInvalidAddressStub.throws(DripsErrors.invalidAddress('Error'));

			// Act.
			try {
				await testDripsHubClient.squeezeDrips(1, erc20Address, 2, 'historyHash', []);
			} catch (error) {
				// Just for the test to continue.
			}

			// Assert.
			assert(guardAgainstInvalidAddressStub.calledOnceWithExactly(erc20Address));
		});

		it('should call the getSplittable() method of the drips hub contract', async () => {
			// Arrange.
			const userId = 1;
			const senderId = 2;
			const historyHash = 'bytes';
			const dripsHistory: DripsHistoryStruct[] = [];
			const erc20Address = Wallet.createRandom().address;
			// Act.
			await testDripsHubClient.squeezeDrips(userId, erc20Address, senderId, historyHash, dripsHistory);

			// Assert.
			assert(
				dripsHubContractStub.squeezeDrips.calledOnceWithExactly(
					userId,
					erc20Address,
					senderId,
					historyHash,
					dripsHistory
				),
				`Expected getSplittable() method to be called with different arguments`
			);
		});
	});
});
