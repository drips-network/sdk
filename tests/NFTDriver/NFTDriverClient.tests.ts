import type { Network } from '@ethersproject/networks';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubInterface, stubObject } from 'ts-sinon';
import type { ContractReceipt, ContractTransaction, Event } from 'ethers';
import { ethers, BigNumber, constants, Wallet } from 'ethers';
import { assert } from 'chai';
import type { IERC20, NFTDriver } from '../../contracts';
import { IERC20__factory, NFTDriver__factory } from '../../contracts';
import DripsHubClient from '../../src/DripsHub/DripsHubClient';
import NFTDriverClient from '../../src/NFTDriver/NFTDriverClient';
import Utils from '../../src/utils';
import { DripsErrorCode } from '../../src/common/DripsError';
import * as internals from '../../src/common/internals';
import * as validators from '../../src/common/validators';
import type {
	DripsReceiverStruct,
	SplitsReceiverStruct,
	DripsReceiver,
	UserMetadataStruct
} from '../../src/common/types';

describe('NFTDriverClient', () => {
	const TEST_CHAIN_ID = 5; // Goerli.

	let networkStub: StubbedInstance<Network>;
	let signerStub: StubbedInstance<JsonRpcSigner>;
	let providerStub: StubbedInstance<JsonRpcProvider>;
	let dripsHubClientStub: StubbedInstance<DripsHubClient>;
	let nftDriverContractStub: StubbedInstance<NFTDriver>;

	let testNftDriverClient: NFTDriverClient;

	// Acts also as the "base Arrange step".
	beforeEach(async () => {
		providerStub = sinon.createStubInstance(JsonRpcProvider);

		signerStub = sinon.createStubInstance(JsonRpcSigner);
		signerStub.getAddress.resolves(Wallet.createRandom().address);

		networkStub = stubObject<Network>({ chainId: TEST_CHAIN_ID } as Network);

		providerStub.getSigner.returns(signerStub);
		providerStub.getNetwork.resolves(networkStub);

		nftDriverContractStub = stubInterface<NFTDriver>();
		sinon
			.stub(NFTDriver__factory, 'connect')
			.withArgs(Utils.Network.configs[TEST_CHAIN_ID].CONTRACT_NFT_DRIVER, signerStub)
			.returns(nftDriverContractStub);

		dripsHubClientStub = stubInterface<DripsHubClient>();
		sinon.stub(DripsHubClient, 'create').resolves(dripsHubClientStub);

		testNftDriverClient = await NFTDriverClient.create(providerStub);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('create()', () => {
		it('should validate the provider', async () => {
			// Arrange
			const validateClientProviderStub = sinon.stub(validators, 'validateClientProvider');

			// Act
			NFTDriverClient.create(providerStub);

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
			const client = await NFTDriverClient.create(providerStub, customDriverAddress);

			// Assert
			assert.equal(client.driverAddress, customDriverAddress);
		});

		it('should create a fully initialized client instance', async () => {
			// Assert
			assert.equal(testNftDriverClient.signer, signerStub);
			assert.equal(testNftDriverClient.provider, providerStub);
			assert.equal(testNftDriverClient.provider.getSigner(), providerStub.getSigner());
			assert.equal(await testNftDriverClient.signer.getAddress(), await signerStub.getAddress());
			assert.equal(
				await testNftDriverClient.provider.getSigner().getAddress(),
				await providerStub.getSigner().getAddress()
			);
			assert.equal(
				testNftDriverClient.driverAddress,
				Utils.Network.configs[(await providerStub.getNetwork()).chainId].CONTRACT_NFT_DRIVER
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
				.withArgs(await signerStub.getAddress(), testNftDriverClient.driverAddress)
				.resolves(BigNumber.from(1));

			sinon
				.stub(IERC20__factory, 'connect')
				.withArgs(tokenAddress, testNftDriverClient.provider.getSigner())
				.returns(erc20ContractStub);

			// Act
			await testNftDriverClient.getAllowance(tokenAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should call the getAllowance() method of the ERC20 contract', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;

			const erc20ContractStub = stubInterface<IERC20>();

			erc20ContractStub.allowance
				.withArgs(await signerStub.getAddress(), testNftDriverClient.driverAddress)
				.resolves(BigNumber.from(1));

			sinon
				.stub(IERC20__factory, 'connect')
				.withArgs(tokenAddress, testNftDriverClient.provider.getSigner())
				.returns(erc20ContractStub);

			// Act
			const allowance = await testNftDriverClient.getAllowance(tokenAddress);

			// Assert
			assert.equal(allowance, 1n);
			assert(
				erc20ContractStub.allowance.calledOnceWithExactly(
					await testNftDriverClient.provider.getSigner().getAddress(),
					testNftDriverClient.driverAddress
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

			sinon
				.stub(IERC20__factory, 'connect')
				.withArgs(tokenAddress, testNftDriverClient.provider.getSigner())
				.returns(erc20ContractStub);

			// Act
			await testNftDriverClient.approve(tokenAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should call the approve() method of the ERC20 contract', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;

			const erc20ContractStub = stubInterface<IERC20>();

			sinon
				.stub(IERC20__factory, 'connect')
				.withArgs(tokenAddress, testNftDriverClient.provider.getSigner())
				.returns(erc20ContractStub);

			// Act
			await testNftDriverClient.approve(tokenAddress);

			// Assert
			assert(
				erc20ContractStub.approve.calledOnceWithExactly(testNftDriverClient.driverAddress, constants.MaxUint256),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('createAccount()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const metadata: UserMetadataStruct[] = [];
			const transferToAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'Transfer', args: { tokenId: 1 } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			nftDriverContractStub.mint.withArgs(transferToAddress, metadata).resolves(txResponse);

			// Act
			await testNftDriverClient.createAccount(transferToAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(transferToAddress));
		});

		it('should validate the user metadata', async () => {
			// Arrange
			const metadata: UserMetadataStruct[] = [{ key: 'key', value: 'value' }];
			const transferToAddress = Wallet.createRandom().address;
			const validateEmitUserMetadataInputStub = sinon.stub(validators, 'validateEmitUserMetadataInput');

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'Transfer', args: { tokenId: 1 } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			nftDriverContractStub.mint.withArgs(transferToAddress, metadata).resolves(txResponse);

			// Act
			await testNftDriverClient.createAccount(transferToAddress, undefined, metadata);

			// Assert
			assert(validateEmitUserMetadataInputStub.calledOnceWithExactly(metadata));
		});

		it('should throw an argumentError when associatedApp is not BytesLike', async () => {
			let threw = false;
			const metadata: UserMetadataStruct[] = [{ key: 'key', value: 'value' }];

			const transferToAddress = Wallet.createRandom().address;

			try {
				// Act
				await testNftDriverClient.createAccount(transferToAddress, 'invalid BytesLike string', metadata);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return the expected token', async () => {
			// Arrange
			const expectedTokenId = '1';
			const metadata: UserMetadataStruct[] = [{ key: 'key', value: 'value' }];
			const transferToAddress = Wallet.createRandom().address;

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'Transfer', args: { tokenId: expectedTokenId } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			nftDriverContractStub.mint.withArgs(transferToAddress, metadata).resolves(txResponse);

			// Act
			const actualTokenId = await testNftDriverClient.createAccount(transferToAddress, undefined, metadata);

			// Assert
			assert.equal(actualTokenId, expectedTokenId);
			assert(
				nftDriverContractStub.mint.calledOnceWithExactly(transferToAddress, metadata),
				'Expected method to be called with different arguments'
			);
		});

		it('should not set an associated app metadata entry when an associated app is not provided', async () => {
			// Arrange
			const expectedTokenId = '1';
			const metadata: UserMetadataStruct[] = [{ key: 'key', value: 'value' }];
			const transferToAddress = Wallet.createRandom().address;

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'Transfer', args: { tokenId: expectedTokenId } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			nftDriverContractStub.mint.withArgs(transferToAddress, metadata).resolves(txResponse);

			// Act
			await testNftDriverClient.createAccount(transferToAddress, undefined, metadata);

			// Assert
			assert(
				nftDriverContractStub.mint.calledOnceWithExactly(
					transferToAddress,
					sinon.match((meta: UserMetadataStruct[]) => meta.length === 1 && meta[0].key === metadata[0].key)
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should set an associated app metadata entry when an associated app is provided', async () => {
			// Arrange
			const expectedTokenId = '1';
			const metadata: UserMetadataStruct[] = [{ key: 'key', value: 'value' }];
			const transferToAddress = Wallet.createRandom().address;

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'Transfer', args: { tokenId: expectedTokenId } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			nftDriverContractStub.mint.withArgs(transferToAddress, metadata).resolves(txResponse);

			// Act
			await testNftDriverClient.createAccount(transferToAddress, ethers.utils.toUtf8Bytes('myApp'), metadata);

			// Assert
			assert(
				nftDriverContractStub.mint.calledOnceWithExactly(
					transferToAddress,
					sinon.match(
						(meta: UserMetadataStruct[]) =>
							meta.length === 2 &&
							meta[0].key === metadata[0].key &&
							meta[1].key === ethers.utils.formatBytes32String('associatedApp') &&
							ethers.utils.toUtf8String(meta[1].value) === ethers.utils.toUtf8String(ethers.utils.toUtf8Bytes('myApp'))
					)
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should call the mint() of the NFTDriver contract', async () => {
			// Arrange
			const expectedTokenId = '1';
			const metadata: UserMetadataStruct[] = [{ key: 'key', value: 'value' }];
			const transferToAddress = Wallet.createRandom().address;

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'Transfer', args: { tokenId: expectedTokenId } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			nftDriverContractStub.mint.withArgs(transferToAddress, metadata).resolves(txResponse);

			// Act
			await testNftDriverClient.createAccount(transferToAddress, undefined, metadata);

			// Assert
			assert(
				nftDriverContractStub.mint.calledOnceWithExactly(transferToAddress, metadata),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('safeCreateAccount()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const metadata: UserMetadataStruct[] = [];
			const transferToAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'Transfer', args: { tokenId: 1 } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			nftDriverContractStub.safeMint.withArgs(transferToAddress, metadata).resolves(txResponse);

			// Act
			await testNftDriverClient.safeCreateAccount(transferToAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(transferToAddress));
		});

		it('should validate the user metadata', async () => {
			// Arrange
			const metadata: UserMetadataStruct[] = [{ key: 'key', value: 'value' }];
			const transferToAddress = Wallet.createRandom().address;
			const validateEmitUserMetadataInputStub = sinon.stub(validators, 'validateEmitUserMetadataInput');

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'Transfer', args: { tokenId: 1 } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			nftDriverContractStub.safeMint.withArgs(transferToAddress, metadata).resolves(txResponse);

			// Act
			await testNftDriverClient.safeCreateAccount(transferToAddress, undefined, metadata);

			// Assert
			assert(validateEmitUserMetadataInputStub.calledOnceWithExactly(metadata));
		});

		it('should not set an associated app metadata entry when an associated app is not provided', async () => {
			// Arrange
			const expectedTokenId = '1';
			const metadata: UserMetadataStruct[] = [{ key: 'key', value: 'value' }];
			const transferToAddress = Wallet.createRandom().address;

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'Transfer', args: { tokenId: expectedTokenId } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			nftDriverContractStub.safeMint.withArgs(transferToAddress, metadata).resolves(txResponse);

			// Act
			await testNftDriverClient.safeCreateAccount(transferToAddress, undefined, metadata);

			// Assert
			assert(
				nftDriverContractStub.safeMint.calledOnceWithExactly(
					transferToAddress,
					sinon.match((meta: UserMetadataStruct[]) => meta.length === 1 && meta[0].key === metadata[0].key)
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should set an associated app metadata entry when an associated app is provided', async () => {
			// Arrange
			const expectedTokenId = '1';
			const metadata: UserMetadataStruct[] = [{ key: 'key', value: 'value' }];
			const transferToAddress = Wallet.createRandom().address;

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'Transfer', args: { tokenId: expectedTokenId } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			nftDriverContractStub.safeMint.withArgs(transferToAddress, metadata).resolves(txResponse);

			// Act
			await testNftDriverClient.safeCreateAccount(transferToAddress, ethers.utils.toUtf8Bytes('myApp'), metadata);

			// Assert
			assert(
				nftDriverContractStub.safeMint.calledOnceWithExactly(
					transferToAddress,
					sinon.match(
						(meta: UserMetadataStruct[]) =>
							meta.length === 2 &&
							meta[0].key === metadata[0].key &&
							meta[1].key === ethers.utils.formatBytes32String('associatedApp') &&
							ethers.utils.toUtf8String(meta[1].value) === ethers.utils.toUtf8String(ethers.utils.toUtf8Bytes('myApp'))
					)
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should throw an argumentError when associatedApp is not BytesLike', async () => {
			let threw = false;
			const metadata: UserMetadataStruct[] = [{ key: 'key', value: 'value' }];

			const transferToAddress = Wallet.createRandom().address;

			try {
				// Act
				await testNftDriverClient.createAccount(transferToAddress, 'invalid BytesLike string', metadata);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return the expected token', async () => {
			// Arrange
			const expectedTokenId = '1';
			const metadata: UserMetadataStruct[] = [{ key: 'key', value: 'value' }];
			const transferToAddress = Wallet.createRandom().address;

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'Transfer', args: { tokenId: expectedTokenId } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			nftDriverContractStub.safeMint.withArgs(transferToAddress, metadata).resolves(txResponse);

			// Act
			const actualTokenId = await testNftDriverClient.safeCreateAccount(transferToAddress, undefined, metadata);

			// Assert
			assert.equal(actualTokenId, expectedTokenId);
			assert('Expected method to be called with different arguments');
		});

		it('should call the safeMint() of the NFTDriver contract', async () => {
			// Arrange
			const expectedTokenId = '1';
			const metadata: UserMetadataStruct[] = [{ key: 'key', value: 'value' }];
			const transferToAddress = Wallet.createRandom().address;

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'Transfer', args: { tokenId: expectedTokenId } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			nftDriverContractStub.safeMint.withArgs(transferToAddress, metadata).resolves(txResponse);

			// Act
			await testNftDriverClient.safeCreateAccount(transferToAddress, undefined, metadata);

			// Assert
			assert(
				nftDriverContractStub.safeMint.calledOnceWithExactly(transferToAddress, metadata),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('collect()', () => {
		it('should throw argumentMissingError when tokenId is missing', async () => {
			// Arrange
			let threw = false;
			const testAddress = Wallet.createRandom().address;

			try {
				// Act
				await testNftDriverClient.collect(undefined as unknown as string, testAddress, testAddress);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should validate the ERC20 and transferTo addresses', async () => {
			// Arrange
			const tokenId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			// Act
			await testNftDriverClient.collect(tokenId, tokenAddress, transferToAddress);

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

		it('should call the collect() method of the NFTDriver contract', async () => {
			// Arrange
			const tokenId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;

			// Act
			await testNftDriverClient.collect(tokenId, tokenAddress, transferToAddress);

			// Assert
			assert(
				nftDriverContractStub.collect.calledOnceWithExactly(tokenId, tokenAddress, transferToAddress),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('give()', () => {
		it('should throw argumentMissingError when tokenId is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;

			try {
				// Act
				await testNftDriverClient.give(undefined as unknown as string, '1', tokenAddress, 1);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw argumentMissingError when receiverUserId is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;

			try {
				// Act
				await testNftDriverClient.give('1', undefined as unknown as string, tokenAddress, 1);
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
				await testNftDriverClient.give('1', ' 1', tokenAddress, -1);
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
			const tokenId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			// Act
			await testNftDriverClient.give(tokenId, ' 1', tokenAddress, 1);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should call the give() method of the NFTDriver contract', async () => {
			// Arrange
			const tokenId = '1';
			const amount = 100;
			const receiverUserId = '1';
			const tokenAddress = Wallet.createRandom().address;

			// Act
			await testNftDriverClient.give(tokenId, receiverUserId, tokenAddress, amount);

			// Assert
			assert(
				nftDriverContractStub.give.calledOnceWithExactly(tokenId, receiverUserId, tokenAddress, amount),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('setDrips()', () => {
		it('should throw argumentMissingError when tokenId is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;

			try {
				// Act
				await testNftDriverClient.setDrips(undefined as unknown as string, tokenAddress, [], [], transferToAddress, 1);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should validate the ERC20 address', async () => {
			// Arrange
			const tokenId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;
			const currentReceivers: DripsReceiverStruct[] = [
				{
					userId: 3,
					config: Utils.DripsReceiverConfiguration.toUint256({ dripId: 1n, amountPerSec: 3n, duration: 3n, start: 3n })
				}
			];
			const receivers: DripsReceiverStruct[] = [
				{
					userId: 2,
					config: Utils.DripsReceiverConfiguration.toUint256({ dripId: 1n, amountPerSec: 1n, duration: 1n, start: 1n })
				},
				{
					userId: 2,
					config: Utils.DripsReceiverConfiguration.toUint256({ dripId: 1n, amountPerSec: 1n, duration: 1n, start: 1n })
				},
				{
					userId: 1,
					config: Utils.DripsReceiverConfiguration.toUint256({ dripId: 1n, amountPerSec: 2n, duration: 2n, start: 2n })
				}
			];

			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			// Act
			await testNftDriverClient.setDrips(tokenId, tokenAddress, currentReceivers, receivers, transferToAddress, 1n);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should validate the drips receivers', async () => {
			// Arrange
			const tokenId = '1';
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

			const validateDripsReceiversStub = sinon.stub(validators, 'validateDripsReceivers');

			// Act
			await testNftDriverClient.setDrips(tokenId, tokenAddress, currentReceivers, receivers, transferToAddress, 1n);

			// Assert
			assert(
				validateDripsReceiversStub.calledWithExactly(
					sinon.match(
						(r: DripsReceiver[]) =>
							r[0].userId === receivers[0].userId &&
							r[1].userId === receivers[1].userId &&
							r[2].userId === receivers[2].userId
					)
				),
				'Expected method to be called with different arguments'
			);
			assert(
				validateDripsReceiversStub.calledWithExactly(
					sinon.match((r: DripsReceiver[]) => r[0].userId === currentReceivers[0].userId)
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should throw argumentMissingError when current drips transferToAddress are missing', async () => {
			// Arrange
			let threw = false;

			// Act
			try {
				await testNftDriverClient.setDrips(
					'1',
					Wallet.createRandom().address,
					[],
					[],
					undefined as unknown as string,
					0n
				);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should clear drips when new receivers is an empty list', async () => {
			// Arrange
			const tokenId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;
			const currentReceivers: DripsReceiverStruct[] = [
				{
					userId: 3,
					config: Utils.DripsReceiverConfiguration.toUint256({ dripId: 1n, amountPerSec: 3n, duration: 3n, start: 3n })
				}
			];

			// Act
			await testNftDriverClient.setDrips(tokenId, tokenAddress, currentReceivers, [], transferToAddress, 1n);

			// Assert
			assert(
				nftDriverContractStub.setDrips.calledOnceWithExactly(
					tokenId,
					tokenAddress,
					currentReceivers,
					1n,
					[],
					0,
					0,
					transferToAddress
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should set balanceDelta to the default value of 0 when balanceDelta is not provided', async () => {
			// Arrange
			const tokenId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;

			// Act
			await testNftDriverClient.setDrips(
				tokenId,
				tokenAddress,
				[],
				[],
				transferToAddress,
				undefined as unknown as bigint
			);

			// Assert
			assert(
				nftDriverContractStub.setDrips.calledOnceWithExactly(tokenId, tokenAddress, [], 0, [], 0, 0, transferToAddress),
				'Expected method to be called with different arguments'
			);
		});

		it('should call the setDrips() method of the NFTDriver contract', async () => {
			// Arrange
			const tokenId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;
			const currentReceivers: DripsReceiverStruct[] = [
				{
					userId: 3n,
					config: Utils.DripsReceiverConfiguration.toUint256({ dripId: 1n, amountPerSec: 3n, duration: 3n, start: 3n })
				}
			];
			const newReceivers: DripsReceiverStruct[] = [
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

			sinon
				.stub(internals, 'formatDripsReceivers')
				.onFirstCall()
				.returns(currentReceivers)
				.onSecondCall()
				.returns(newReceivers);

			// Act
			await testNftDriverClient.setDrips(tokenId, tokenAddress, currentReceivers, newReceivers, transferToAddress, 1);

			// Assert
			assert(
				nftDriverContractStub.setDrips.calledOnceWithExactly(
					tokenId,
					tokenAddress,
					currentReceivers,
					1,
					newReceivers,
					0,
					0,
					transferToAddress
				),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('setSplits()', () => {
		it('should throw argumentMissingError when tokenId is missing', async () => {
			// Arrange
			let threw = false;

			// Act
			try {
				await testNftDriverClient.setSplits(undefined as unknown as string, []);
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
			const tokenId = '1';

			const receivers: SplitsReceiverStruct[] = [
				{ userId: 1, weight: 1 },
				{ userId: 2, weight: 2 }
			];

			const validateSplitsReceiversStub = sinon.stub(validators, 'validateSplitsReceivers');

			// Act
			await testNftDriverClient.setSplits(tokenId, receivers);

			// Assert
			assert(validateSplitsReceiversStub.calledOnceWithExactly(receivers));
		});

		it('should call the setSplits() method of the NFTDriver contract', async () => {
			// Arrange
			const tokenId = '1';

			const receivers: SplitsReceiverStruct[] = [
				{ userId: 2, weight: 100 },
				{ userId: 1, weight: 1 },
				{ userId: 1, weight: 1 }
			];

			// Act
			await testNftDriverClient.setSplits(tokenId, receivers);

			// Assert
			assert(
				nftDriverContractStub.setSplits.calledOnceWithExactly(
					tokenId,
					sinon
						.match((r: SplitsReceiverStruct[]) => r.length === 2)
						.and(sinon.match((r: SplitsReceiverStruct[]) => r[0].userId === 1))
						.and(sinon.match((r: SplitsReceiverStruct[]) => r[1].userId === 2))
				),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('emitUserMetadata()', () => {
		it('should throw argumentMissingError when tokenId is missing', async () => {
			// Arrange
			let threw = false;

			// Act
			try {
				await testNftDriverClient.emitUserMetadata(undefined as unknown as string, []);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should call the emitUserMetadata() method of the NFTDriver contract', async () => {
			// Arrange
			const tokenId = '1';
			const metadata: UserMetadataStruct[] = [{ key: 'key', value: 'value' }];

			// Act
			await testNftDriverClient.emitUserMetadata(tokenId, metadata);

			// Assert
			assert(
				nftDriverContractStub.emitUserMetadata.calledOnceWithExactly(tokenId, metadata),
				'Expected method to be called with different arguments'
			);
		});
	});
});
