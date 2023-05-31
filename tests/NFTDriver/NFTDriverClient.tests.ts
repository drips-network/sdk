import type { Network } from '@ethersproject/networks';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubInterface, stubObject } from 'ts-sinon';
import type { ContractReceipt, ContractTransaction } from 'ethers';
import { ethers, BigNumber, constants, Wallet } from 'ethers';
import { assert } from 'chai';
import NFTDriverClient from '../../src/NFTDriver/NFTDriverClient';
import Utils from '../../src/utils';
import * as validators from '../../src/common/validators';
import NFTDriverTxFactory from '../../src/NFTDriver/NFTDriverTxFactory';
import type { IERC20, NFTDriver } from '../../contracts';
import { NFTDriver__factory, IERC20__factory } from '../../contracts';
import type { DripsReceiverStruct, SplitsReceiverStruct, UserMetadata } from '../../src/common/types';
import { DripsErrorCode } from '../../src/common/DripsError';

describe('NFTDriverClient', () => {
	const TEST_CHAIN_ID = 11155111; // Sepolia.

	let networkStub: StubbedInstance<Network>;
	let signerStub: StubbedInstance<JsonRpcSigner>;
	let nftDriverContractStub: StubbedInstance<NFTDriver>;
	let signerWithProviderStub: StubbedInstance<JsonRpcSigner>;
	let providerStub: sinon.SinonStubbedInstance<JsonRpcProvider>;
	let nftDriverTxFactoryStub: StubbedInstance<NFTDriverTxFactory>;

	let testNftDriverClient: NFTDriverClient;

	// Acts also as the "base Arrange step".
	beforeEach(async () => {
		providerStub = sinon.createStubInstance(JsonRpcProvider);

		signerStub = sinon.createStubInstance(JsonRpcSigner);
		signerStub.getAddress.resolves(Wallet.createRandom().address);

		networkStub = stubObject<Network>({ chainId: TEST_CHAIN_ID } as Network);

		providerStub.getNetwork.resolves(networkStub);

		signerWithProviderStub = { ...signerStub, provider: providerStub };
		signerStub.connect.withArgs(providerStub).returns(signerWithProviderStub);

		nftDriverTxFactoryStub = stubInterface<NFTDriverTxFactory>();
		sinon
			.stub(NFTDriverTxFactory, 'create')
			.withArgs(signerWithProviderStub, Utils.Network.configs[TEST_CHAIN_ID].NFT_DRIVER)
			.resolves(nftDriverTxFactoryStub);

		nftDriverContractStub = stubInterface<NFTDriver>();
		sinon
			.stub(NFTDriver__factory, 'connect')
			.withArgs(Utils.Network.configs[TEST_CHAIN_ID].NFT_DRIVER, signerWithProviderStub)
			.returns(nftDriverContractStub);

		testNftDriverClient = await NFTDriverClient.create(providerStub, signerStub, undefined, nftDriverTxFactoryStub);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('create()', () => {
		it('should validate the provider', async () => {
			// Arrange
			const validateClientProviderStub = sinon.stub(validators, 'validateClientProvider');

			// Act
			await NFTDriverClient.create(providerStub, signerStub);

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
			await NFTDriverClient.create(providerStub, signerStub);

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
			const client = await NFTDriverClient.create(providerStub, signerStub, customDriverAddress);

			// Assert
			assert.equal(client.driverAddress, customDriverAddress);
		});

		it('should create a fully initialized client instance', async () => {
			// Assert
			assert.equal(testNftDriverClient.signer, signerWithProviderStub);
			assert.equal(testNftDriverClient.provider, providerStub);
			assert.equal(testNftDriverClient.signer!.provider, providerStub);
			assert.equal(
				testNftDriverClient.driverAddress,
				Utils.Network.configs[(await providerStub.getNetwork()).chainId].NFT_DRIVER
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

			sinon.stub(IERC20__factory, 'connect').withArgs(tokenAddress, signerWithProviderStub).returns(erc20ContractStub);

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

			sinon.stub(IERC20__factory, 'connect').withArgs(tokenAddress, signerWithProviderStub).returns(erc20ContractStub);

			// Act
			const allowance = await testNftDriverClient.getAllowance(tokenAddress);

			// Assert
			assert.equal(allowance, 1n);
			assert(
				erc20ContractStub.allowance.calledOnceWithExactly(
					await signerWithProviderStub.getAddress(),
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

			sinon.stub(IERC20__factory, 'connect').withArgs(tokenAddress, signerWithProviderStub).returns(erc20ContractStub);

			// Act
			await testNftDriverClient.approve(tokenAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should call the approve() method of the ERC20 contract', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;

			const erc20ContractStub = stubInterface<IERC20>();

			sinon.stub(IERC20__factory, 'connect').withArgs(tokenAddress, signerWithProviderStub).returns(erc20ContractStub);

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
			const metadata: UserMetadata[] = [];
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
			const metadata: UserMetadata[] = [{ key: 'key', value: 'value' }];
			const transferToAddress = Wallet.createRandom().address;
			const metadataAsBytes = metadata.map((m) => Utils.Metadata.createFromStrings(m.key, m.value));
			const validateEmitUserMetadataInputStub = sinon.stub(validators, 'validateEmitUserMetadataInput');

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'Transfer', args: { tokenId: 1 } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			nftDriverContractStub.mint.withArgs(transferToAddress, metadataAsBytes).resolves(txResponse);

			// Act
			await testNftDriverClient.createAccount(transferToAddress, undefined, metadata);

			// Assert
			assert(validateEmitUserMetadataInputStub.calledOnceWithExactly(metadata));
		});

		it('should throw a txEventNotFound when a transfer event is not found in the transaction', async () => {
			let threw = false;
			const metadata: UserMetadata[] = [{ key: 'key', value: 'value' }];
			const metadataAsBytes = metadata.map((m) => Utils.Metadata.createFromStrings(m.key, m.value));

			const transferToAddress = Wallet.createRandom().address;

			const waitFake = async () =>
				Promise.resolve({
					events: []
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			nftDriverContractStub.mint.withArgs(transferToAddress, metadataAsBytes).resolves(txResponse);

			try {
				// Act
				await testNftDriverClient.createAccount(transferToAddress, undefined, metadata);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.TX_EVENT_NOT_FOUND);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return the expected token', async () => {
			// Arrange
			const expectedTokenId = '1';
			const transferToAddress = Wallet.createRandom().address;
			const metadata: UserMetadata[] = [{ key: 'key', value: 'value' }];
			const metadataAsBytes = metadata.map((m) => Utils.Metadata.createFromStrings(m.key, m.value));

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'Transfer', args: { tokenId: expectedTokenId } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			nftDriverContractStub.mint.withArgs(transferToAddress, metadataAsBytes).resolves(txResponse);

			// Act
			const actualTokenId = await testNftDriverClient.createAccount(transferToAddress, undefined, metadata);

			// Assert
			assert.equal(actualTokenId, expectedTokenId);
			assert(
				nftDriverContractStub.mint.calledOnceWithExactly(transferToAddress, metadataAsBytes),
				'Expected method to be called with different arguments'
			);
		});

		it('should not set an associated app metadata entry when an associated app is not provided', async () => {
			// Arrange
			const expectedTokenId = '1';
			const transferToAddress = Wallet.createRandom().address;
			const metadata: UserMetadata[] = [{ key: 'key', value: 'value' }];

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'Transfer', args: { tokenId: expectedTokenId } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			nftDriverContractStub.mint.resolves(txResponse);

			// Act
			await testNftDriverClient.createAccount(transferToAddress, undefined, metadata);

			// Assert
			assert(
				nftDriverContractStub.mint.calledOnceWithExactly(
					transferToAddress,
					sinon.match(
						(meta: UserMetadata[]) =>
							meta.length === 1 &&
							meta[0].key === ethers.utils.formatBytes32String(metadata[0].key) &&
							meta[0].value === ethers.utils.hexlify(ethers.utils.toUtf8Bytes(metadata[0].value))
					)
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should call the mint() of the NFTDriver contract', async () => {
			// Arrange
			const expectedTokenId = '1';
			const metadata: UserMetadata[] = [{ key: 'key', value: 'value' }];
			const transferToAddress = Wallet.createRandom().address;

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'Transfer', args: { tokenId: expectedTokenId } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			nftDriverContractStub.mint.resolves(txResponse);

			// Act
			await testNftDriverClient.createAccount(transferToAddress, 'myApp', metadata);

			// Assert
			assert(
				nftDriverContractStub.mint.calledOnceWithExactly(
					transferToAddress,
					sinon.match(
						(meta: UserMetadata[]) =>
							meta.length === 2 &&
							meta[0].key === ethers.utils.formatBytes32String(metadata[0].key) &&
							meta[0].value === ethers.utils.hexlify(ethers.utils.toUtf8Bytes(metadata[0].value)) &&
							meta[1].key === ethers.utils.formatBytes32String(metadata[1].key) &&
							meta[1].value === ethers.utils.hexlify(ethers.utils.toUtf8Bytes(metadata[1].value))
					)
				),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('safeCreateAccount()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const metadata: UserMetadata[] = [];
			const transferToAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');
			const metadataAsBytes = metadata.map((m) => Utils.Metadata.createFromStrings(m.key, m.value));

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'Transfer', args: { tokenId: 1 } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			nftDriverContractStub.safeMint.withArgs(transferToAddress, metadataAsBytes).resolves(txResponse);

			// Act
			await testNftDriverClient.safeCreateAccount(transferToAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(transferToAddress));
		});

		it('should validate the user metadata', async () => {
			// Arrange
			const metadata: UserMetadata[] = [{ key: 'key', value: 'value' }];
			const transferToAddress = Wallet.createRandom().address;
			const validateEmitUserMetadataInputStub = sinon.stub(validators, 'validateEmitUserMetadataInput');
			const metadataAsBytes = metadata.map((m) => Utils.Metadata.createFromStrings(m.key, m.value));

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'Transfer', args: { tokenId: 1 } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			nftDriverContractStub.safeMint.withArgs(transferToAddress, metadataAsBytes).resolves(txResponse);

			// Act
			await testNftDriverClient.safeCreateAccount(transferToAddress, undefined, metadata);

			// Assert
			assert(validateEmitUserMetadataInputStub.calledOnceWithExactly(metadata));
		});

		it('should not set an associated app metadata entry when an associated app is not provided', async () => {
			// Arrange
			const expectedTokenId = '1';
			const transferToAddress = Wallet.createRandom().address;
			const metadata: UserMetadata[] = [{ key: 'key', value: 'value' }];

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'Transfer', args: { tokenId: expectedTokenId } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			nftDriverContractStub.safeMint.resolves(txResponse);

			// Act
			await testNftDriverClient.safeCreateAccount(transferToAddress, undefined, metadata);

			// Assert
			assert(
				nftDriverContractStub.safeMint.calledOnceWithExactly(
					transferToAddress,
					sinon.match(
						(meta: UserMetadata[]) =>
							meta.length === 1 &&
							meta[0].key === ethers.utils.formatBytes32String(metadata[0].key) &&
							meta[0].value === ethers.utils.hexlify(ethers.utils.toUtf8Bytes(metadata[0].value))
					)
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should throw a txEventNotFound when a transfer event is not found in the transaction', async () => {
			let threw = false;
			const transferToAddress = Wallet.createRandom().address;
			const metadata: UserMetadata[] = [{ key: 'key', value: 'value' }];
			const metadataAsBytes = metadata.map((m) => Utils.Metadata.createFromStrings(m.key, m.value));

			const waitFake = async () =>
				Promise.resolve({
					events: []
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			nftDriverContractStub.safeMint.withArgs(transferToAddress, metadataAsBytes).resolves(txResponse);

			try {
				// Act
				await testNftDriverClient.safeCreateAccount(transferToAddress, undefined, metadata);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.TX_EVENT_NOT_FOUND);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return the expected token', async () => {
			// Arrange
			const expectedTokenId = '1';
			const transferToAddress = Wallet.createRandom().address;
			const metadata: UserMetadata[] = [{ key: 'key', value: 'value' }];
			const metadataAsBytes = metadata.map((m) => Utils.Metadata.createFromStrings(m.key, m.value));

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'Transfer', args: { tokenId: expectedTokenId } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			nftDriverContractStub.safeMint.withArgs(transferToAddress, metadataAsBytes).resolves(txResponse);

			// Act
			const actualTokenId = await testNftDriverClient.safeCreateAccount(transferToAddress, undefined, metadata);

			// Assert
			assert.equal(actualTokenId, expectedTokenId);
			assert('Expected method to be called with different arguments');
		});

		it('should call the safeMint() of the NFTDriver contract', async () => {
			// Arrange
			const expectedTokenId = '1';
			const metadata: UserMetadata[] = [{ key: 'key', value: 'value' }];
			const transferToAddress = Wallet.createRandom().address;

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'Transfer', args: { tokenId: expectedTokenId } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			nftDriverContractStub.safeMint.resolves(txResponse);

			// Act
			await testNftDriverClient.safeCreateAccount(transferToAddress, 'myApp', metadata);

			// Assert
			assert(
				nftDriverContractStub.safeMint.calledOnceWithExactly(
					transferToAddress,
					sinon.match(
						(meta: UserMetadata[]) =>
							meta.length === 2 &&
							meta[0].key === ethers.utils.formatBytes32String(metadata[0].key) &&
							meta[0].value === ethers.utils.hexlify(ethers.utils.toUtf8Bytes(metadata[0].value)) &&
							meta[1].key === ethers.utils.formatBytes32String(metadata[1].key) &&
							meta[1].value === ethers.utils.hexlify(ethers.utils.toUtf8Bytes(metadata[1].value))
					)
				),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('safeCreateAccountWithSalt()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const salt = 1;
			const metadata: UserMetadata[] = [];
			const transferToAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');
			const metadataAsBytes = metadata.map((m) => Utils.Metadata.createFromStrings(m.key, m.value));

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'Transfer', args: { tokenId: 1 } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			nftDriverContractStub.safeMintWithSalt.withArgs(salt, transferToAddress, metadataAsBytes).resolves(txResponse);

			// Act
			await testNftDriverClient.safeCreateAccountWithSalt(1, transferToAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(transferToAddress));
		});

		it('should validate the user metadata', async () => {
			// Arrange
			const salt = 1;
			const metadata: UserMetadata[] = [{ key: 'key', value: 'value' }];
			const transferToAddress = Wallet.createRandom().address;
			const validateEmitUserMetadataInputStub = sinon.stub(validators, 'validateEmitUserMetadataInput');
			const metadataAsBytes = metadata.map((m) => Utils.Metadata.createFromStrings(m.key, m.value));

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'Transfer', args: { tokenId: 1 } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			nftDriverContractStub.safeMintWithSalt.withArgs(salt, transferToAddress, metadataAsBytes).resolves(txResponse);

			// Act
			await testNftDriverClient.safeCreateAccountWithSalt(1, transferToAddress, undefined, metadata);

			// Assert
			assert(validateEmitUserMetadataInputStub.calledOnceWithExactly(metadata));
		});

		it('should not set an associated app metadata entry when an associated app is not provided', async () => {
			// Arrange
			const salt = 1;
			const expectedTokenId = '1';
			const transferToAddress = Wallet.createRandom().address;
			const metadata: UserMetadata[] = [{ key: 'key', value: 'value' }];

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'Transfer', args: { tokenId: expectedTokenId } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			nftDriverContractStub.safeMintWithSalt.resolves(txResponse);

			// Act
			await testNftDriverClient.safeCreateAccountWithSalt(salt, transferToAddress, undefined, metadata);

			// Assert
			assert(
				nftDriverContractStub.safeMintWithSalt.calledOnceWithExactly(
					salt,
					transferToAddress,
					sinon.match(
						(meta: UserMetadata[]) =>
							meta.length === 1 &&
							meta[0].key === ethers.utils.formatBytes32String(metadata[0].key) &&
							meta[0].value === ethers.utils.hexlify(ethers.utils.toUtf8Bytes(metadata[0].value))
					)
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should throw a txEventNotFound when a transfer event is not found in the transaction', async () => {
			const salt = 1;
			let threw = false;
			const transferToAddress = Wallet.createRandom().address;
			const metadata: UserMetadata[] = [{ key: 'key', value: 'value' }];
			const metadataAsBytes = metadata.map((m) => Utils.Metadata.createFromStrings(m.key, m.value));

			const waitFake = async () =>
				Promise.resolve({
					events: []
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			nftDriverContractStub.safeMintWithSalt.withArgs(salt, transferToAddress, metadataAsBytes).resolves(txResponse);

			try {
				// Act
				await testNftDriverClient.safeCreateAccountWithSalt(salt, transferToAddress, undefined, metadata);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.TX_EVENT_NOT_FOUND);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should return the expected token', async () => {
			// Arrange
			const salt = 1;
			const expectedTokenId = '1';
			const transferToAddress = Wallet.createRandom().address;
			const metadata: UserMetadata[] = [{ key: 'key', value: 'value' }];
			const metadataAsBytes = metadata.map((m) => Utils.Metadata.createFromStrings(m.key, m.value));

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'Transfer', args: { tokenId: expectedTokenId } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			nftDriverContractStub.safeMintWithSalt.withArgs(salt, transferToAddress, metadataAsBytes).resolves(txResponse);

			// Act
			const actualTokenId = await testNftDriverClient.safeCreateAccountWithSalt(
				salt,
				transferToAddress,
				undefined,
				metadata
			);

			// Assert
			assert.equal(actualTokenId, expectedTokenId);
			assert('Expected method to be called with different arguments');
		});

		it('should call the safeMint() of the NFTDriver contract', async () => {
			// Arrange
			const salt = 1;
			const expectedTokenId = '1';
			const metadata: UserMetadata[] = [{ key: 'key', value: 'value' }];
			const transferToAddress = Wallet.createRandom().address;

			const waitFake = async () =>
				Promise.resolve({
					events: [{ event: 'Transfer', args: { tokenId: expectedTokenId } } as unknown as Event]
				} as unknown as ContractReceipt);
			const txResponse = { wait: waitFake } as ContractTransaction;
			nftDriverContractStub.safeMintWithSalt.resolves(txResponse);

			// Act
			await testNftDriverClient.safeCreateAccountWithSalt(salt, transferToAddress, 'myApp', metadata);

			// Assert
			assert(
				nftDriverContractStub.safeMintWithSalt.calledOnceWithExactly(
					salt,
					transferToAddress,
					sinon.match(
						(meta: UserMetadata[]) =>
							meta.length === 2 &&
							meta[0].key === ethers.utils.formatBytes32String(metadata[0].key) &&
							meta[0].value === ethers.utils.hexlify(ethers.utils.toUtf8Bytes(metadata[0].value)) &&
							meta[1].key === ethers.utils.formatBytes32String(metadata[1].key) &&
							meta[1].value === ethers.utils.hexlify(ethers.utils.toUtf8Bytes(metadata[1].value))
					)
				),
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

		it('should send the expected transaction', async () => {
			// Arrange
			const tokenId = '1';
			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;

			const tx = {};
			nftDriverTxFactoryStub.collect.withArgs(tokenId, tokenAddress, transferToAddress).resolves(tx);

			// Act
			await testNftDriverClient.collect(tokenId, tokenAddress, transferToAddress);

			// Assert
			assert(signerStub?.sendTransaction.calledOnceWithExactly(tx), 'Did not send the expected tx.');
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

		it('should send the expected transaction', async () => {
			// Arrange
			const tokenId = '1';
			const amount = 100n;
			const receiverUserId = '1';
			const tokenAddress = Wallet.createRandom().address;

			const tx = {};
			nftDriverTxFactoryStub.give.withArgs(tokenId, receiverUserId, tokenAddress, amount).resolves(tx);

			// Act
			await testNftDriverClient.give(tokenId, receiverUserId, tokenAddress, amount);

			// Assert
			assert(signerStub?.sendTransaction.calledOnceWithExactly(tx), 'Did not send the expected tx.');
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

		it('should validate the input', async () => {
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

			const validateSetDripsInputStub = sinon.stub(validators, 'validateSetDripsInput');

			// Act
			await testNftDriverClient.setDrips(tokenId, tokenAddress, currentReceivers, receivers, transferToAddress, 1n);

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
			const tokenId = '1';
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
			nftDriverTxFactoryStub.setDrips
				.withArgs(tokenId, tokenAddress, currentReceivers, balance, receivers, 0, 0, transferToAddress)
				.resolves(tx);

			// Act
			await testNftDriverClient.setDrips(
				tokenId,
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

		it('should send the expected transaction', async () => {
			const tokenId = '1';

			const receivers: SplitsReceiverStruct[] = [
				{ userId: 2, weight: 100 },
				{ userId: 1, weight: 1 },
				{ userId: 1, weight: 1 }
			];

			const tx = {};
			nftDriverTxFactoryStub.setSplits.withArgs(tokenId, receivers).resolves(tx);

			// Act
			await testNftDriverClient.setSplits(tokenId, receivers);

			// Assert
			assert(signerStub?.sendTransaction.calledOnceWithExactly(tx), 'Did not send the expected tx.');
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
			nftDriverTxFactoryStub.emitUserMetadata.withArgs('1', metadataAsBytes).resolves(tx);

			// Act
			await testNftDriverClient.emitUserMetadata('1', metadata);

			// Assert
			assert(signerStub?.sendTransaction.calledOnceWithExactly(tx), 'Did not send the expected tx.');
		});
	});
});
