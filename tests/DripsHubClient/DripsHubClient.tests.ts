import type { Network } from '@ethersproject/networks';
import type { Provider } from '@ethersproject/providers';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubObject, stubInterface } from 'ts-sinon';
import { assert } from 'chai';
import type { BigNumberish } from 'ethers';
import { ethers, BigNumber, Wallet } from 'ethers';
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
import DripsSubgraphClient from '../../src/DripsSubgraph/DripsSubgraphClient';
import type { DripsReceiverSeenEvent, UserAssetConfig } from '../../src/DripsSubgraph/types';
import * as internals from '../../src/common/internals';

describe('DripsHubClient', () => {
	const TEST_CHAIN_ID = 5; // Goerli.

	let networkStub: StubbedInstance<Network>;
	let signerStub: StubbedInstance<JsonRpcSigner>;
	let dripsHubContractStub: StubbedInstance<DripsHub>;
	let providerStub: sinon.SinonStubbedInstance<JsonRpcProvider>;
	let dripsSubgraphClientStub: StubbedInstance<DripsSubgraphClient>;
	let dripsHubContractFactoryStub: sinon.SinonStub<
		[address: string, signerOrProvider: Provider | ethers.Signer],
		DripsHub
	>;

	let testDripsHubClient: DripsHubClient;

	beforeEach(async () => {
		signerStub = sinon.createStubInstance(JsonRpcSigner);
		signerStub.getAddress.resolves(Wallet.createRandom().address);

		networkStub = stubObject<Network>({ chainId: TEST_CHAIN_ID } as Network);

		providerStub = sinon.createStubInstance(JsonRpcProvider);
		providerStub.getSigner.returns(signerStub);
		providerStub.getNetwork.resolves(networkStub);

		(signerStub as any).provider = providerStub;

		dripsHubContractStub = stubInterface<DripsHub>();

		dripsHubContractFactoryStub = sinon.stub(DripsHub__factory, 'connect');
		dripsHubContractFactoryStub
			.withArgs(Utils.Network.configs[TEST_CHAIN_ID].CONTRACT_DRIPS_HUB, signerStub)
			.returns(dripsHubContractStub);

		dripsSubgraphClientStub = stubInterface<DripsSubgraphClient>();
		sinon.stub(DripsSubgraphClient, 'create').returns(dripsSubgraphClientStub);

		testDripsHubClient = await DripsHubClient.create(signerStub);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('create()', () => {
		it('should validate the signer', async () => {
			// Arrange
			const validateClientSignerStub = sinon.stub(validators, 'validateClientSigner');

			// Act
			DripsHubClient.create(signerStub);

			// Assert
			assert(
				validateClientSignerStub.calledOnceWithExactly(signerStub, Utils.Network.SUPPORTED_CHAINS),
				'Expected method to be called with different arguments'
			);
		});

		it('should set the custom driver address when provided', async () => {
			// Arrange
			const customDriverAddress = Wallet.createRandom().address;

			// Act
			const client = await DripsHubClient.create(signerStub, customDriverAddress);

			// Assert
			assert.equal(client.driverAddress, customDriverAddress);
		});

		it('should create a fully initialized client instance', async () => {
			// Assert
			assert.equal(testDripsHubClient.signer, signerStub);
			assert.equal(testDripsHubClient.provider, signerStub.provider);
			assert.equal(
				testDripsHubClient.driverAddress,
				Utils.Network.configs[(await signerStub.provider.getNetwork()).chainId].CONTRACT_DRIPS_HUB
			);
			assert(
				dripsHubContractFactoryStub.calledOnceWithExactly(
					Utils.Network.configs[(await signerStub.provider.getNetwork()).chainId].CONTRACT_DRIPS_HUB,
					signerStub
				),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('createReadonly()', () => {
		it('should validate the provider', async () => {
			// Arrange
			const validateClientProviderStub = sinon.stub(validators, 'validateClientProvider');

			// Act
			await DripsHubClient.createReadonly(providerStub);

			// Assert
			assert(
				validateClientProviderStub.calledOnceWithExactly(providerStub, Utils.Network.SUPPORTED_CHAINS),
				'Expected method to be called with different arguments'
			);
		});

		it('should set the custom driver address when provided', async () => {
			// Arrange
			const customDriverAddress = Wallet.createRandom().address;

			// Act
			const client = await DripsHubClient.createReadonly(providerStub, customDriverAddress);

			// Assert
			assert.equal(client.driverAddress, customDriverAddress);
		});

		it('should create a fully initialized client instance', async () => {
			// Act
			const client = await DripsHubClient.createReadonly(providerStub);

			// Assert
			assert.isUndefined(client.signer);
			assert.equal(client.provider, providerStub);
			assert.equal(
				client.driverAddress,
				Utils.Network.configs[(await providerStub.getNetwork()).chainId].CONTRACT_DRIPS_HUB
			);
			assert(
				dripsHubContractFactoryStub.calledWithExactly(
					Utils.Network.configs[(await providerStub.getNetwork()).chainId].CONTRACT_DRIPS_HUB,
					providerStub
				),
				'Expected method to be called with different arguments'
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

			dripsSubgraphClientStub.getDripsReceiverSeenEventsByReceiverId.withArgs(userId).resolves([]);

			// Act
			const balances = await testDripsHubClient.getAllReceivableBalancesForUser(userId, maxCycles);

			// Assert
			assert.isEmpty(balances);
		});

		it('should return the expected receivable balances', async () => {
			// Arrange
			const userId = '1';
			const maxCycles = 10;

			const firstResults: DripsReceiverSeenEvent[] = new Array(100).fill({}).map(
				() =>
					({
						dripsSetEvent: {
							assetId: Utils.Asset.getIdFromAddress('0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6')
						}
					} as DripsReceiverSeenEvent)
			);

			const secondResults: DripsReceiverSeenEvent[] = [
				{
					dripsSetEvent: {
						assetId: Utils.Asset.getIdFromAddress('0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984')
					}
				} as DripsReceiverSeenEvent
			];

			sinon
				.stub(DripsHubClient.prototype, 'getReceivableBalanceForUser')
				.onFirstCall()
				.resolves({
					receivableAmount: BigInt(1),
					tokenAddress: '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6'
				})
				.onSecondCall()
				.resolves({
					receivableAmount: BigInt(2),
					tokenAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'
				});

			dripsSubgraphClientStub.getDripsReceiverSeenEventsByReceiverId
				.withArgs(userId)
				.onFirstCall()
				.resolves(firstResults)
				.onSecondCall()
				.resolves(secondResults);

			// Act
			const balances = await testDripsHubClient.getAllReceivableBalancesForUser(userId, maxCycles);

			// Assert
			assert.equal(balances.length, 2);
			assert.equal(
				balances.filter((x) => x.tokenAddress === '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6')[0].receivableAmount,
				BigInt(1)
			);
			assert.equal(
				balances.filter((x) => x.tokenAddress === '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6')[0].tokenAddress,
				'0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6'
			);
			assert.equal(
				balances.filter((x) => x.tokenAddress === '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984')[0].receivableAmount,
				BigInt(2)
			);
			assert.equal(
				balances.filter((x) => x.tokenAddress === '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984')[0].tokenAddress,
				'0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984'
			);
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
					ethers.utils.hexlify(ethers.utils.toUtf8Bytes(historyHash)),
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
				.withArgs(
					userId,
					tokenAddress,
					senderId,
					ethers.utils.hexlify(ethers.utils.toUtf8Bytes(historyHash)),
					dripsHistory
				)
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
				.withArgs(
					userId,
					tokenAddress,
					senderId,
					ethers.utils.hexlify(ethers.utils.toUtf8Bytes(historyHash)),
					dripsHistory
				)
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
					ethers.utils.hexlify(ethers.utils.toUtf8Bytes(historyHash)),
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

			dripsSubgraphClientStub.getAllUserAssetConfigsByUserId.withArgs(userId).resolves([]);

			// Act
			const balances = await testDripsHubClient.getAllSplittableBalancesForUser(userId);

			// Assert
			assert.isEmpty(balances);
		});

		it('should return the expected splittable balances', async () => {
			// Arrange
			const userId = '1';

			const firstResults: UserAssetConfig[] = new Array(100).fill({}).map(
				() =>
					({
						assetId: Utils.Asset.getIdFromAddress(Wallet.createRandom().address),
						amountSplittable: Math.floor(Math.random() * 100000)
					} as any)
			);

			const secondResults: UserAssetConfig[] = [
				{
					assetId: Utils.Asset.getIdFromAddress(Wallet.createRandom().address),
					amountSplittable: Math.floor(Math.random() * 100000)
				} as any
			];

			dripsSubgraphClientStub.getAllUserAssetConfigsByUserId
				.onFirstCall()
				.resolves(firstResults)
				.onSecondCall()
				.resolves(secondResults);

			// Act
			const balances = await testDripsHubClient.getAllSplittableBalancesForUser(userId);

			// Assert
			assert.equal(balances.length, 101);
			for (let i = 0; i < firstResults.length; i++) {
				const element = firstResults[i];

				assert.equal(Utils.Asset.getAddressFromId(element.assetId), balances[i].tokenAddress);
				assert.equal(element.amountSplittable, balances[i].splittableAmount);
			}
			for (let i = 49; i < secondResults.length; i++) {
				const element = secondResults[i];

				assert.equal(Utils.Asset.getAddressFromId(element.assetId), balances[i].tokenAddress);
				assert.equal(element.amountSplittable, balances[i].splittableAmount);
			}
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

			dripsSubgraphClientStub.getAllUserAssetConfigsByUserId.withArgs(userId).resolves([]);

			// Act
			const balances = await testDripsHubClient.getAllCollectableBalancesForUser(userId);

			// Assert
			assert.isEmpty(balances);
		});

		it('should return the expected collectable balances', async () => {
			// Arrange
			const userId = '1';

			const firstResults: UserAssetConfig[] = new Array(100).fill({}).map(
				() =>
					({
						assetId: Utils.Asset.getIdFromAddress(Wallet.createRandom().address),
						amountPostSplitCollectable: Math.floor(Math.random() * 100000)
					} as any)
			);

			const secondResults: UserAssetConfig[] = [
				{
					assetId: Utils.Asset.getIdFromAddress(Wallet.createRandom().address),
					amountPostSplitCollectable: Math.floor(Math.random() * 100000)
				} as any
			];

			dripsSubgraphClientStub.getAllUserAssetConfigsByUserId
				.onFirstCall()
				.resolves(firstResults)
				.onSecondCall()
				.resolves(secondResults);

			// Act
			const balances = await testDripsHubClient.getAllCollectableBalancesForUser(userId);

			// Assert
			assert.equal(balances.length, 101);
			for (let i = 0; i < firstResults.length; i++) {
				const element = firstResults[i];

				assert.equal(Utils.Asset.getAddressFromId(element.assetId), balances[i].tokenAddress);
				assert.equal(element.amountPostSplitCollectable, balances[i].collectableAmount);
			}
			for (let i = 49; i < secondResults.length; i++) {
				const element = secondResults[i];

				assert.equal(Utils.Asset.getAddressFromId(element.assetId), balances[i].tokenAddress);
				assert.equal(element.amountPostSplitCollectable, balances[i].collectableAmount);
			}
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
