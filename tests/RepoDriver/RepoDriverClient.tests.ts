import type { Network } from '@ethersproject/networks';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubInterface, stubObject } from 'ts-sinon';
import { BigNumber, constants, ethers, Wallet } from 'ethers';
import { assert } from 'chai';
import RepoDriverClient from '../../src/RepoDriver/RepoDriverClient';
import Utils from '../../src/utils';
import * as validators from '../../src/common/validators';
import RepoDriverTxFactory from '../../src/RepoDriver/RepoDriverTxFactory';
import type { IERC20, RepoDriver } from '../../contracts';
import { RepoDriver__factory, IERC20__factory } from '../../contracts';
import type { DripsReceiverStruct, SplitsReceiverStruct, UserMetadata } from '../../src/common/types';
import { Forge } from '../../src/common/types';
import { DripsErrorCode } from '../../src/common/DripsError';

describe('RepoDriverClient', () => {
	const TEST_CHAIN_ID = 5; // Goerli.

	let networkStub: StubbedInstance<Network>;
	let signerStub: StubbedInstance<JsonRpcSigner>;
	let repoDriverContractStub: StubbedInstance<RepoDriver>;
	let signerWithProviderStub: StubbedInstance<JsonRpcSigner>;
	let providerStub: sinon.SinonStubbedInstance<JsonRpcProvider>;
	let repoDriverTxFactoryStub: StubbedInstance<RepoDriverTxFactory>;

	let testRepoDriverClient: RepoDriverClient;

	// Acts also as the "base Arrange step".
	beforeEach(async () => {
		providerStub = sinon.createStubInstance(JsonRpcProvider);

		signerStub = sinon.createStubInstance(JsonRpcSigner);
		signerStub.getAddress.resolves(Wallet.createRandom().address);

		networkStub = stubObject<Network>({ chainId: TEST_CHAIN_ID } as Network);

		providerStub.getNetwork.resolves(networkStub);

		signerWithProviderStub = { ...signerStub, provider: providerStub };
		signerStub.connect.withArgs(providerStub).returns(signerWithProviderStub);

		repoDriverTxFactoryStub = stubInterface<RepoDriverTxFactory>();
		sinon
			.stub(RepoDriverTxFactory, 'create')
			.withArgs(signerWithProviderStub, Utils.Network.configs[TEST_CHAIN_ID].REPO_DRIVER)
			.resolves(repoDriverTxFactoryStub);

		repoDriverContractStub = stubInterface<RepoDriver>();
		sinon
			.stub(RepoDriver__factory, 'connect')
			.withArgs(Utils.Network.configs[TEST_CHAIN_ID].REPO_DRIVER, signerWithProviderStub)
			.returns(repoDriverContractStub);

		testRepoDriverClient = await RepoDriverClient.create(providerStub, signerStub, undefined, repoDriverTxFactoryStub);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('create()', () => {
		it('should validate the provider', async () => {
			// Arrange
			const validateClientProviderStub = sinon.stub(validators, 'validateClientProvider');

			// Act
			await RepoDriverClient.create(providerStub, signerStub);

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
			await RepoDriverClient.create(providerStub, signerStub);

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
			const client = await RepoDriverClient.create(providerStub, signerStub, customDriverAddress);

			// Assert
			assert.equal(client.driverAddress, customDriverAddress);
		});

		it('should create a fully initialized client instance', async () => {
			// Assert
			assert.equal(testRepoDriverClient.signer, signerWithProviderStub);
			assert.equal(testRepoDriverClient.provider, providerStub);
			assert.equal(testRepoDriverClient.signer!.provider, providerStub);
			assert.equal(
				testRepoDriverClient.driverAddress,
				Utils.Network.configs[(await providerStub.getNetwork()).chainId].REPO_DRIVER
			);
		});
	});

	describe('getAllowance()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			const erc20ContractStub = stubInterface<IERC20>();

			erc20ContractStub.allowance
				.withArgs(await signerStub.getAddress(), testRepoDriverClient.driverAddress)
				.resolves(BigNumber.from(1));

			sinon.stub(IERC20__factory, 'connect').withArgs(tokenAddress, signerWithProviderStub).returns(erc20ContractStub);

			// Act
			await testRepoDriverClient.getAllowance(tokenAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should call the getAllowance() method of the ERC20 contract', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;

			const erc20ContractStub = stubInterface<IERC20>();

			erc20ContractStub.allowance
				.withArgs(await signerStub.getAddress(), testRepoDriverClient.driverAddress)
				.resolves(BigNumber.from(1));

			sinon.stub(IERC20__factory, 'connect').withArgs(tokenAddress, signerWithProviderStub).returns(erc20ContractStub);

			// Act
			const allowance = await testRepoDriverClient.getAllowance(tokenAddress);

			// Assert
			assert.equal(allowance, 1n);
			assert(
				erc20ContractStub.allowance.calledOnceWithExactly(
					await signerWithProviderStub.getAddress(),
					testRepoDriverClient.driverAddress
				),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('approve()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const tokenAddress = 'invalid address';
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			const erc20ContractStub = stubInterface<IERC20>();

			sinon.stub(IERC20__factory, 'connect').withArgs(tokenAddress, signerWithProviderStub).returns(erc20ContractStub);

			// Act
			await testRepoDriverClient.approve(tokenAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should call the approve() method of the ERC20 contract', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;

			const erc20ContractStub = stubInterface<IERC20>();

			sinon.stub(IERC20__factory, 'connect').withArgs(tokenAddress, signerWithProviderStub).returns(erc20ContractStub);

			// Act
			await testRepoDriverClient.approve(tokenAddress);

			// Assert
			assert(
				erc20ContractStub.approve.calledOnceWithExactly(testRepoDriverClient.driverAddress, constants.MaxUint256),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getUserId()', () => {
		it('should call the calcUserId() method of the RepoDriver contract', async () => {
			// Arrange
			const repoId = '1';
			repoDriverContractStub.calcUserId.withArgs(repoId).resolves(BigNumber.from(111));

			// Act
			await testRepoDriverClient.getUserId(repoId);

			// Assert
			assert(
				repoDriverContractStub.calcUserId.calledOnceWithExactly(repoId),
				'Expected method to be called with different arguments'
			);
		});

		it('should throw argumentError when repoId is missing', async () => {
			// Arrange
			let threw = false;
			repoDriverContractStub.calcUserId.withArgs(undefined as unknown as string).resolves(BigNumber.from(111));

			try {
				// Act
				await testRepoDriverClient.getUserId(undefined as unknown as string);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});
	});

	describe('getRepoId()', () => {
		it('should call the calcRepoId() method of the RepoDriver contract', async () => {
			// Arrange
			const forge = Forge.GitHub;
			const name = 'test';
			repoDriverContractStub.calcRepoId
				.withArgs(forge, ethers.utils.arrayify(ethers.utils.toUtf8Bytes(name)))
				.resolves(BigNumber.from(111));

			// Act
			await testRepoDriverClient.getRepoId(forge, name);

			// Assert
			assert(
				repoDriverContractStub.calcRepoId.calledOnceWithExactly(
					forge,
					ethers.utils.arrayify(ethers.utils.toUtf8Bytes(name))
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should throw argumentError when repoId is missing', async () => {
			// Arrange
			const name = 'test';
			let threw = false;
			repoDriverContractStub.calcRepoId.withArgs(undefined as unknown as Forge, name).resolves(BigNumber.from(111));

			try {
				// Act
				await testRepoDriverClient.getRepoId(undefined as unknown as Forge, name);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw argumentError when repoId is missing', async () => {
			// Arrange
			const forge = Forge.GitHub;
			let threw = false;
			repoDriverContractStub.calcRepoId.withArgs(forge, undefined as unknown as string).resolves(BigNumber.from(111));

			try {
				// Act
				await testRepoDriverClient.getRepoId(forge, undefined as unknown as string);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});
	});

	describe('getRepoOwner()', () => {
		it('should return the owner address when owner exists', async () => {
			// Arrange
			const repoId = '1';
			const owner = Wallet.createRandom().address;
			repoDriverContractStub.repoOwner.withArgs(repoId).resolves(owner);

			// Act
			const result = await testRepoDriverClient.getRepoOwner(repoId);

			// Assert
			assert.equal(result, owner);
		});

		it('should return null address when owner does not exist', async () => {
			// Arrange
			const repoId = '1';
			repoDriverContractStub.repoOwner.withArgs(repoId).resolves(null as unknown as string);

			// Act
			const result = await testRepoDriverClient.getRepoOwner(repoId);

			// Assert
			assert.isNull(result);
		});

		it('should call the repoOwner() method of the RepoDriver contract', async () => {
			// Arrange
			const repoId = '1';
			repoDriverContractStub.repoOwner.withArgs(repoId).resolves(Wallet.createRandom().address);

			// Act
			await testRepoDriverClient.getRepoOwner(repoId);

			// Assert
			assert(
				repoDriverContractStub.repoOwner.calledOnceWithExactly(repoId),
				'Expected method to be called with different arguments'
			);
		});

		it('should throw argumentError when repoId is missing', async () => {
			// Arrange
			let threw = false;
			repoDriverContractStub.repoOwner.withArgs(undefined as unknown as string).resolves(Wallet.createRandom().address);

			try {
				// Act
				await testRepoDriverClient.getRepoOwner(undefined as unknown as string);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});
	});

	describe('triggerUpdateRepoOwnerRequest()', () => {
		it('should send the expected transaction', async () => {
			// Arrange
			const forge = Forge.GitHub;
			const name = 'test';

			const tx = {};
			repoDriverTxFactoryStub.requestUpdateRepoOwner
				.withArgs(forge, ethers.utils.hexlify(ethers.utils.toUtf8Bytes(name)))
				.resolves(tx);

			// Act
			await testRepoDriverClient.triggerUpdateRepoOwnerRequest(forge, name);

			// Assert
			assert(signerStub?.sendTransaction.calledOnceWithExactly(tx), 'Did not send the expected tx.');
		});

		it('should throw argumentError when forge is missing', async () => {
			// Arrange
			let threw = false;
			const name = 'test';
			repoDriverContractStub.requestUpdateRepoOwner.withArgs(undefined as unknown as Forge, name).resolves();

			try {
				// Act
				await testRepoDriverClient.triggerUpdateRepoOwnerRequest(undefined as unknown as Forge, name);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw argumentError when name is missing', async () => {
			// Arrange
			let threw = false;
			const forge = Forge.GitHub;
			repoDriverContractStub.requestUpdateRepoOwner.withArgs(forge, undefined as unknown as string).resolves();

			try {
				// Act
				await testRepoDriverClient.triggerUpdateRepoOwnerRequest(forge, undefined as unknown as string);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});
	});

	describe('collect()', () => {
		it('should throw argumentError when repoId is missing', async () => {
			// Arrange
			let threw = false;
			const testAddress = Wallet.createRandom().address;

			try {
				// Act
				await testRepoDriverClient.collect(undefined as unknown as string, testAddress, testAddress);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should validate the ERC20 and transferTo addresses', async () => {
			// Arrange
			const repoId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			// Act
			await testRepoDriverClient.collect(repoId, tokenAddress, transferToAddress);

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

		it('should send the expected transaction', async () => {
			// Arrange
			const repoId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;

			const tx = {};
			repoDriverTxFactoryStub.collect.withArgs(repoId, tokenAddress, transferToAddress).resolves(tx);

			// Act
			await testRepoDriverClient.collect(repoId, tokenAddress, transferToAddress);

			// Assert
			assert(signerStub?.sendTransaction.calledOnceWithExactly(tx), 'Did not send the expected tx.');
		});
	});

	describe('give()', () => {
		it('should throw argumentError when repoId is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;

			try {
				// Act
				await testRepoDriverClient.give(undefined as unknown as string, '1', tokenAddress, 1);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw argumentError when receiverUserId is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;

			try {
				// Act
				await testRepoDriverClient.give('1', undefined as unknown as string, tokenAddress, 1);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw argumentError when amount is less than or equal to 0', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;

			try {
				// Act
				await testRepoDriverClient.give('1', ' 1', tokenAddress, -1);
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
			const repoId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			// Act
			await testRepoDriverClient.give(repoId, ' 1', tokenAddress, 1);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should send the expected transaction', async () => {
			// Arrange
			const repoId = '1';
			const amount = 100n;
			const receiverUserId = '1';
			const tokenAddress = Wallet.createRandom().address;

			const tx = {};
			repoDriverTxFactoryStub.give.withArgs(repoId, receiverUserId, tokenAddress, amount).resolves(tx);

			// Act
			await testRepoDriverClient.give(repoId, receiverUserId, tokenAddress, amount);

			// Assert
			assert(signerStub?.sendTransaction.calledOnceWithExactly(tx), 'Did not send the expected tx.');
		});
	});

	describe('setDrips()', () => {
		it('should throw argumentError when repoId is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;

			try {
				// Act
				await testRepoDriverClient.setDrips(undefined as unknown as string, tokenAddress, [], [], transferToAddress, 1);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should validate the input', async () => {
			// Arrange
			const repoId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;

			const currentReceivers: DripsReceiverStruct[] = [
				{
					userId: '3',
					config: Utils.DripsReceiverConfiguration.toUint256({ dripId: 1n, amountPerSec: 3n, duration: 3n, start: 3n })
				}
			];
			const receivers: DripsReceiverStruct[] = [
				{
					userId: '2',
					config: Utils.DripsReceiverConfiguration.toUint256({ dripId: 1n, amountPerSec: 1n, duration: 1n, start: 1n })
				},
				{
					userId: '2',
					config: Utils.DripsReceiverConfiguration.toUint256({ dripId: 1n, amountPerSec: 1n, duration: 1n, start: 1n })
				},
				{
					userId: '1',
					config: Utils.DripsReceiverConfiguration.toUint256({ dripId: 1n, amountPerSec: 2n, duration: 2n, start: 2n })
				}
			];

			const validateSetDripsInputStub = sinon.stub(validators, 'validateSetDripsInput');

			// Act
			await testRepoDriverClient.setDrips(repoId, tokenAddress, currentReceivers, receivers, transferToAddress, 1n);

			// Assert
			assert(
				validateSetDripsInputStub.calledOnceWithExactly(
					tokenAddress,
					sinon.match.array.deepEquals(
						currentReceivers?.map((r) => ({
							userId: r.userId.toString(),
							config: Utils.DripsReceiverConfiguration.fromUint256(BigNumber.from(r.config).toBigInt())
						}))
					),
					sinon.match.array.deepEquals(
						receivers?.map((r) => ({
							userId: r.userId.toString(),
							config: Utils.DripsReceiverConfiguration.fromUint256(BigNumber.from(r.config).toBigInt())
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
			const repoId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;
			const currentReceivers: DripsReceiverStruct[] = [
				{
					userId: 3n,
					config: Utils.DripsReceiverConfiguration.toUint256({ dripId: 1n, amountPerSec: 3n, duration: 3n, start: 3n })
				}
			];
			const receivers: DripsReceiverStruct[] = [
				{
					userId: 2n,
					config: Utils.DripsReceiverConfiguration.toUint256({ dripId: 1n, amountPerSec: 1n, duration: 1n, start: 1n })
				},
				{
					userId: 2n,
					config: Utils.DripsReceiverConfiguration.toUint256({ dripId: 1n, amountPerSec: 1n, duration: 1n, start: 1n })
				},
				{
					userId: 1n,
					config: Utils.DripsReceiverConfiguration.toUint256({ dripId: 1n, amountPerSec: 2n, duration: 2n, start: 2n })
				}
			];

			const balance = 1n;

			const tx = {};
			repoDriverTxFactoryStub.setDrips
				.withArgs(repoId, tokenAddress, currentReceivers, balance, receivers, 0, 0, transferToAddress)
				.resolves(tx);

			// Act
			await testRepoDriverClient.setDrips(
				repoId,
				tokenAddress,
				currentReceivers,
				receivers,
				transferToAddress,
				balance
			);

			// Assert
			assert(signerStub?.sendTransaction.calledOnceWithExactly(tx), 'Did not send the expected tx.');
		});
	});

	describe('setSplits()', () => {
		it('should throw argumentError when repoId is missing', async () => {
			// Arrange
			let threw = false;

			// Act
			try {
				await testRepoDriverClient.setSplits(undefined as unknown as string, []);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should validate the splits receivers', async () => {
			// Arrange
			const repoId = '1';

			const receivers: SplitsReceiverStruct[] = [
				{ userId: 1, weight: 1 },
				{ userId: 2, weight: 2 }
			];

			const validateSplitsReceiversStub = sinon.stub(validators, 'validateSplitsReceivers');

			// Act
			await testRepoDriverClient.setSplits(repoId, receivers);

			// Assert
			assert(validateSplitsReceiversStub.calledOnceWithExactly(receivers));
		});

		it('should send the expected transaction', async () => {
			const repoId = '1';

			const receivers: SplitsReceiverStruct[] = [
				{ userId: 2, weight: 100 },
				{ userId: 1, weight: 1 },
				{ userId: 1, weight: 1 }
			];

			const tx = {};
			repoDriverTxFactoryStub.setSplits.withArgs(repoId, receivers).resolves(tx);

			// Act
			await testRepoDriverClient.setSplits(repoId, receivers);

			// Assert
			assert(signerStub?.sendTransaction.calledOnceWithExactly(tx), 'Did not send the expected tx.');
		});
	});

	describe('emitUserMetadata()', () => {
		it('should throw argumentMissingError when repoId is missing', async () => {
			// Arrange
			let threw = false;

			// Act
			try {
				await testRepoDriverClient.emitUserMetadata(undefined as unknown as string, []);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should send the expected transaction', async () => {
			// Arrange
			const metadata: UserMetadata[] = [{ key: 'key', value: 'value' }];
			const metadataAsBytes = metadata.map((m) => Utils.Metadata.createFromStrings(m.key, m.value));

			const tx = {};
			repoDriverTxFactoryStub.emitUserMetadata.withArgs('1', metadataAsBytes).resolves(tx);

			// Act
			await testRepoDriverClient.emitUserMetadata('1', metadata);

			// Assert
			assert(signerStub?.sendTransaction.calledOnceWithExactly(tx), 'Did not send the expected tx.');
		});
	});
});
