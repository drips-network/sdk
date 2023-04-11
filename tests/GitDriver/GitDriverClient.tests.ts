import type { Network } from '@ethersproject/networks';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubInterface, stubObject } from 'ts-sinon';
import { BigNumber, constants, Wallet } from 'ethers';
import { assert } from 'chai';
import GitDriverClient from '../../src/GitDriver/GitDriverClient';
import Utils from '../../src/utils';
import * as validators from '../../src/common/validators';
import GitDriverTxFactory from '../../src/GitDriver/GitDriverTxFactory';
import type { IERC20, GitDriver } from '../../contracts';
import { GitDriver__factory, IERC20__factory } from '../../contracts';
import type { DripsReceiverStruct, SplitsReceiverStruct, UserMetadata } from '../../src/common/types';
import * as internals from '../../src/common/internals';
import { DripsErrorCode } from '../../src/common/DripsError';

describe('GitDriverClient', () => {
	const TEST_CHAIN_ID = 5; // Goerli.

	let networkStub: StubbedInstance<Network>;
	let signerStub: StubbedInstance<JsonRpcSigner>;
	let gitDriverContractStub: StubbedInstance<GitDriver>;
	let signerWithProviderStub: StubbedInstance<JsonRpcSigner>;
	let providerStub: sinon.SinonStubbedInstance<JsonRpcProvider>;
	let gitDriverTxFactoryStub: StubbedInstance<GitDriverTxFactory>;

	let testGitDriverClient: GitDriverClient;

	// Acts also as the "base Arrange step".
	beforeEach(async () => {
		providerStub = sinon.createStubInstance(JsonRpcProvider);

		signerStub = sinon.createStubInstance(JsonRpcSigner);
		signerStub.getAddress.resolves(Wallet.createRandom().address);

		networkStub = stubObject<Network>({ chainId: TEST_CHAIN_ID } as Network);

		providerStub.getNetwork.resolves(networkStub);

		signerWithProviderStub = { ...signerStub, provider: providerStub };
		signerStub.connect.withArgs(providerStub).returns(signerWithProviderStub);

		gitDriverTxFactoryStub = stubInterface<GitDriverTxFactory>();
		sinon
			.stub(GitDriverTxFactory, 'create')
			.withArgs(signerWithProviderStub, Utils.Network.configs[TEST_CHAIN_ID].GIT_DRIVER)
			.resolves(gitDriverTxFactoryStub);

		gitDriverContractStub = stubInterface<GitDriver>();
		sinon
			.stub(GitDriver__factory, 'connect')
			.withArgs(Utils.Network.configs[TEST_CHAIN_ID].GIT_DRIVER, signerWithProviderStub)
			.returns(gitDriverContractStub);

		testGitDriverClient = await GitDriverClient.create(providerStub, signerStub, undefined, gitDriverTxFactoryStub);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('create()', () => {
		it('should validate the provider', async () => {
			// Arrange
			const validateClientProviderStub = sinon.stub(validators, 'validateClientProvider');

			// Act
			await GitDriverClient.create(providerStub, signerStub);

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
			await GitDriverClient.create(providerStub, signerStub);

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
			const client = await GitDriverClient.create(providerStub, signerStub, customDriverAddress);

			// Assert
			assert.equal(client.driverAddress, customDriverAddress);
		});

		it('should create a fully initialized client instance', async () => {
			// Assert
			assert.equal(testGitDriverClient.signer, signerWithProviderStub);
			assert.equal(testGitDriverClient.provider, providerStub);
			assert.equal(testGitDriverClient.signer!.provider, providerStub);
			assert.equal(
				testGitDriverClient.driverAddress,
				Utils.Network.configs[(await providerStub.getNetwork()).chainId].GIT_DRIVER
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
				.withArgs(await signerStub.getAddress(), testGitDriverClient.driverAddress)
				.resolves(BigNumber.from(1));

			sinon.stub(IERC20__factory, 'connect').withArgs(tokenAddress, signerWithProviderStub).returns(erc20ContractStub);

			// Act
			await testGitDriverClient.getAllowance(tokenAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should call the getAllowance() method of the ERC20 contract', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;

			const erc20ContractStub = stubInterface<IERC20>();

			erc20ContractStub.allowance
				.withArgs(await signerStub.getAddress(), testGitDriverClient.driverAddress)
				.resolves(BigNumber.from(1));

			sinon.stub(IERC20__factory, 'connect').withArgs(tokenAddress, signerWithProviderStub).returns(erc20ContractStub);

			// Act
			const allowance = await testGitDriverClient.getAllowance(tokenAddress);

			// Assert
			assert.equal(allowance, 1n);
			assert(
				erc20ContractStub.allowance.calledOnceWithExactly(
					await signerWithProviderStub.getAddress(),
					testGitDriverClient.driverAddress
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
			await testGitDriverClient.approve(tokenAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should call the approve() method of the ERC20 contract', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;

			const erc20ContractStub = stubInterface<IERC20>();

			sinon.stub(IERC20__factory, 'connect').withArgs(tokenAddress, signerWithProviderStub).returns(erc20ContractStub);

			// Act
			await testGitDriverClient.approve(tokenAddress);

			// Assert
			assert(
				erc20ContractStub.approve.calledOnceWithExactly(testGitDriverClient.driverAddress, constants.MaxUint256),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getUserId()', () => {
		it('should call the calcProjectId() method of the GitDriver contract', async () => {
			// Arrange
			const gitUrl = 'http://project.com';
			gitDriverContractStub.calcProjectId.withArgs(gitUrl).resolves(BigNumber.from(111));

			// Act
			await testGitDriverClient.getProjectId(gitUrl);

			// Assert
			assert(
				gitDriverContractStub.calcProjectId.calledOnceWithExactly(gitUrl),
				'Expected method to be called with different arguments'
			);
		});

		it('should throw argumentError when projectId is missing', async () => {
			// Arrange
			let threw = false;
			gitDriverContractStub.calcProjectId.withArgs(undefined as unknown as string).resolves(BigNumber.from(111));

			try {
				// Act
				await testGitDriverClient.getProjectId(undefined as unknown as string);
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
		it('should throw argumentError when projectId is missing', async () => {
			// Arrange
			let threw = false;
			const testAddress = Wallet.createRandom().address;

			try {
				// Act
				await testGitDriverClient.collect(undefined as unknown as string, testAddress, testAddress);
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
			const projectId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			// Act
			await testGitDriverClient.collect(projectId, tokenAddress, transferToAddress);

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
			const projectId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;

			const tx = {};
			gitDriverTxFactoryStub.collect.withArgs(projectId, tokenAddress, transferToAddress).resolves(tx);

			// Act
			await testGitDriverClient.collect(projectId, tokenAddress, transferToAddress);

			// Assert
			assert(signerStub?.sendTransaction.calledOnceWithExactly(tx), 'Did not send the expected tx.');
		});
	});

	describe('give()', () => {
		it('should throw argumentError when projectId is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;

			try {
				// Act
				await testGitDriverClient.give(undefined as unknown as string, '1', tokenAddress, 1);
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
				await testGitDriverClient.give('1', undefined as unknown as string, tokenAddress, 1);
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
				await testGitDriverClient.give('1', ' 1', tokenAddress, -1);
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
			const projectId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			// Act
			await testGitDriverClient.give(projectId, ' 1', tokenAddress, 1);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should send the expected transaction', async () => {
			// Arrange
			const projectId = '1';
			const amount = 100n;
			const receiverUserId = '1';
			const tokenAddress = Wallet.createRandom().address;

			const tx = {};
			gitDriverTxFactoryStub.give.withArgs(projectId, receiverUserId, tokenAddress, amount).resolves(tx);

			// Act
			await testGitDriverClient.give(projectId, receiverUserId, tokenAddress, amount);

			// Assert
			assert(signerStub?.sendTransaction.calledOnceWithExactly(tx), 'Did not send the expected tx.');
		});
	});

	describe('setDrips()', () => {
		it('should throw argumentError when projectId is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;

			try {
				// Act
				await testGitDriverClient.setDrips(undefined as unknown as string, tokenAddress, [], [], transferToAddress, 1);
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
			const projectId = '1';
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
			await testGitDriverClient.setDrips(projectId, tokenAddress, currentReceivers, receivers, transferToAddress, 1n);

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
			const projectId = '1';
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
			gitDriverTxFactoryStub.setDrips
				.withArgs(projectId, tokenAddress, currentReceivers, balance, receivers, 0, 0, transferToAddress)
				.resolves(tx);

			// Act
			await testGitDriverClient.setDrips(
				projectId,
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
		it('should throw argumentError when projectId is missing', async () => {
			// Arrange
			let threw = false;

			// Act
			try {
				await testGitDriverClient.setSplits(undefined as unknown as string, []);
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
			const projectId = '1';

			const receivers: SplitsReceiverStruct[] = [
				{ userId: 1, weight: 1 },
				{ userId: 2, weight: 2 }
			];

			const validateSplitsReceiversStub = sinon.stub(validators, 'validateSplitsReceivers');

			// Act
			await testGitDriverClient.setSplits(projectId, receivers);

			// Assert
			assert(validateSplitsReceiversStub.calledOnceWithExactly(receivers));
		});

		it('should send the expected transaction', async () => {
			const projectId = '1';

			const receivers: SplitsReceiverStruct[] = [
				{ userId: 2, weight: 100 },
				{ userId: 1, weight: 1 },
				{ userId: 1, weight: 1 }
			];

			const tx = {};
			gitDriverTxFactoryStub.setSplits.withArgs(projectId, receivers).resolves(tx);

			// Act
			await testGitDriverClient.setSplits(projectId, receivers);

			// Assert
			assert(signerStub?.sendTransaction.calledOnceWithExactly(tx), 'Did not send the expected tx.');
		});
	});

	describe('emitUserMetadata()', () => {
		it('should throw argumentMissingError when projectId is missing', async () => {
			// Arrange
			let threw = false;

			// Act
			try {
				await testGitDriverClient.emitUserMetadata(undefined as unknown as string, []);
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
			const metadataAsBytes = metadata.map((m) => internals.createFromStrings(m.key, m.value));

			const tx = {};
			gitDriverTxFactoryStub.emitUserMetadata.withArgs('1', metadataAsBytes).resolves(tx);

			// Act
			await testGitDriverClient.emitUserMetadata('1', metadata);

			// Assert
			assert(signerStub?.sendTransaction.calledOnceWithExactly(tx), 'Did not send the expected tx.');
		});
	});
});
