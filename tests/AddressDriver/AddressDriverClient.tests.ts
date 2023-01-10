import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubObject, stubInterface } from 'ts-sinon';
import { assert } from 'chai';
import type { Provider } from '@ethersproject/providers';
import { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import type { Network } from '@ethersproject/networks';
import type { ethers } from 'ethers';
import { BigNumber, constants, Wallet } from 'ethers';
import type { AddressDriver, IERC20 } from '../../contracts';
import { IERC20__factory, AddressDriver__factory } from '../../contracts';
import type {
	SplitsReceiverStruct,
	DripsReceiverStruct,
	AddressDriverInterface,
	UserMetadata
} from '../../src/common/types';
import AddressDriverClient from '../../src/AddressDriver/AddressDriverClient';
import Utils from '../../src/utils';
import { DripsErrorCode } from '../../src/common/DripsError';
import * as validators from '../../src/common/validators';
import DripsHubClient from '../../src/DripsHub/DripsHubClient';
import * as internals from '../../src/common/internals';

describe('AddressDriverClient', () => {
	const TEST_CHAIN_ID = 5; // Goerli.

	let networkStub: StubbedInstance<Network>;
	let signerStub: StubbedInstance<JsonRpcSigner>;
	let dripsHubClientStub: StubbedInstance<DripsHubClient>;
	let providerStub: sinon.SinonStubbedInstance<JsonRpcProvider>;
	let addressDriverContractStub: StubbedInstance<AddressDriver>;
	let addressDriverInterfaceStub: StubbedInstance<AddressDriverInterface>;
	let addressDriverContractFactoryStub: sinon.SinonStub<
		[address: string, signerOrProvider: Provider | ethers.Signer],
		AddressDriver
	>;

	let testAddressDriverClient: AddressDriverClient;

	// Acts also as the "base Arrange step".
	beforeEach(async () => {
		signerStub = sinon.createStubInstance(JsonRpcSigner);
		signerStub.getAddress.resolves(Wallet.createRandom().address);

		networkStub = stubObject<Network>({ chainId: TEST_CHAIN_ID } as Network);

		providerStub = sinon.createStubInstance(JsonRpcProvider);
		providerStub.getSigner.returns(signerStub);
		providerStub.getNetwork.resolves(networkStub);

		(signerStub as any).provider = providerStub;

		addressDriverContractStub = stubInterface<AddressDriver>();
		addressDriverInterfaceStub = stubInterface<AddressDriverInterface>();
		addressDriverContractStub.interface = addressDriverInterfaceStub;

		addressDriverContractFactoryStub = sinon.stub(AddressDriver__factory, 'connect');
		addressDriverContractFactoryStub
			.withArgs(Utils.Network.configs[TEST_CHAIN_ID].CONTRACT_ADDRESS_DRIVER, signerStub)
			.returns(addressDriverContractStub);

		dripsHubClientStub = stubInterface<DripsHubClient>();
		sinon.stub(DripsHubClient, 'create').resolves(dripsHubClientStub);

		testAddressDriverClient = await AddressDriverClient.create(signerStub);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('create()', () => {
		it('should validate the signer', async () => {
			// Arrange
			const validateClientSignerStub = sinon.stub(validators, 'validateClientSigner');

			// Act
			await AddressDriverClient.create(signerStub);

			// Assert
			assert(
				validateClientSignerStub.calledOnceWithExactly(signerStub),
				'Expected method to be called with different arguments'
			);
		});

		it('should set the custom driver address when provided', async () => {
			// Arrange
			const customDriverAddress = Wallet.createRandom().address;

			// Act
			const client = await AddressDriverClient.create(signerStub, customDriverAddress);

			// Assert
			assert.equal(client.driverAddress, customDriverAddress);
		});

		it('should create a fully initialized client instance', async () => {
			// Assert
			assert.equal(testAddressDriverClient.signer, signerStub);
			assert.equal(testAddressDriverClient.provider, signerStub.provider);
			assert.equal(
				testAddressDriverClient.driverAddress,
				Utils.Network.configs[(await signerStub.provider.getNetwork()).chainId].CONTRACT_ADDRESS_DRIVER
			);
			assert(
				addressDriverContractFactoryStub.calledOnceWithExactly(
					Utils.Network.configs[(await signerStub.provider.getNetwork()).chainId].CONTRACT_ADDRESS_DRIVER,
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
			await AddressDriverClient.createReadonly(providerStub);

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
			const client = await AddressDriverClient.createReadonly(providerStub, customDriverAddress);

			// Assert
			assert.equal(client.driverAddress, customDriverAddress);
		});

		it('should create a fully initialized client instance', async () => {
			// Act
			const client = await AddressDriverClient.createReadonly(providerStub);

			// Assert
			assert.isUndefined(client.signer);
			assert.equal(client.provider, providerStub);
			assert.equal(
				client.driverAddress,
				Utils.Network.configs[(await providerStub.getNetwork()).chainId].CONTRACT_ADDRESS_DRIVER
			);
			assert(
				addressDriverContractFactoryStub.calledWithExactly(
					Utils.Network.configs[(await providerStub.getNetwork()).chainId].CONTRACT_ADDRESS_DRIVER,
					providerStub
				),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getAllowance()', () => {
		it('should ensure the signer exists', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;
			const ensureSignerExistsStub = sinon.stub(internals, 'ensureSignerExists');

			const erc20ContractStub = stubInterface<IERC20>();

			erc20ContractStub.allowance
				.withArgs(await signerStub.getAddress(), testAddressDriverClient.driverAddress)
				.resolves(BigNumber.from(1));

			sinon
				.stub(IERC20__factory, 'connect')
				.withArgs(tokenAddress, testAddressDriverClient.provider.getSigner())
				.returns(erc20ContractStub);

			// Act
			await testAddressDriverClient.getAllowance(tokenAddress);

			// Assert
			assert(
				ensureSignerExistsStub.calledOnceWithExactly(testAddressDriverClient.signer),
				'Expected method to be called with different arguments'
			);
		});

		it('should validate the ERC20 address', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			const erc20ContractStub = stubInterface<IERC20>();

			erc20ContractStub.allowance
				.withArgs(await signerStub.getAddress(), testAddressDriverClient.driverAddress)
				.resolves(BigNumber.from(1));

			sinon
				.stub(IERC20__factory, 'connect')
				.withArgs(tokenAddress, testAddressDriverClient.provider.getSigner())
				.returns(erc20ContractStub);

			// Act
			await testAddressDriverClient.getAllowance(tokenAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should call the getAllowance() method of the ERC20 contract', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;

			const erc20ContractStub = stubInterface<IERC20>();

			erc20ContractStub.allowance
				.withArgs(await signerStub.getAddress(), testAddressDriverClient.driverAddress)
				.resolves(BigNumber.from(1));

			sinon
				.stub(IERC20__factory, 'connect')
				.withArgs(tokenAddress, testAddressDriverClient.provider.getSigner())
				.returns(erc20ContractStub);

			// Act
			const allowance = await testAddressDriverClient.getAllowance(tokenAddress);

			// Assert
			assert.equal(allowance, 1n);
			assert(
				erc20ContractStub.allowance.calledOnceWithExactly(
					await testAddressDriverClient.provider.getSigner().getAddress(),
					testAddressDriverClient.driverAddress
				),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('approve()', () => {
		it('should ensure the signer exists', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;
			const ensureSignerExistsStub = sinon.stub(internals, 'ensureSignerExists');

			const erc20ContractStub = stubInterface<IERC20>();

			sinon
				.stub(IERC20__factory, 'connect')
				.withArgs(tokenAddress, testAddressDriverClient.provider.getSigner())
				.returns(erc20ContractStub);

			// Act
			await testAddressDriverClient.approve(tokenAddress);

			// Assert
			assert(
				ensureSignerExistsStub.calledOnceWithExactly(testAddressDriverClient.signer),
				'Expected method to be called with different arguments'
			);
		});

		it('should validate the ERC20 address', async () => {
			// Arrange
			const tokenAddress = 'invalid address';
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			const erc20ContractStub = stubInterface<IERC20>();

			sinon
				.stub(IERC20__factory, 'connect')
				.withArgs(tokenAddress, testAddressDriverClient.provider.getSigner())
				.returns(erc20ContractStub);

			// Act
			await testAddressDriverClient.approve(tokenAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should call the approve() method of the ERC20 contract', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;

			const erc20ContractStub = stubInterface<IERC20>();

			sinon
				.stub(IERC20__factory, 'connect')
				.withArgs(tokenAddress, testAddressDriverClient.provider.getSigner())
				.returns(erc20ContractStub);

			// Act
			await testAddressDriverClient.approve(tokenAddress);

			// Assert
			assert(
				erc20ContractStub.approve.calledOnceWithExactly(testAddressDriverClient.driverAddress, constants.MaxUint256),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getUserId()', () => {
		it('should ensure the signer exists', async () => {
			// Arrange
			const ensureSignerExistsStub = sinon.stub(internals, 'ensureSignerExists');

			addressDriverContractStub.calcUserId
				.withArgs(await testAddressDriverClient.provider.getSigner().getAddress())
				.resolves(BigNumber.from(111));

			// Act
			await testAddressDriverClient.getUserId();

			// Assert
			assert(
				ensureSignerExistsStub.calledOnceWithExactly(testAddressDriverClient.signer),
				'Expected method to be called with different arguments'
			);
		});

		it('should call the calcUserId() method of the AddressDriver contract', async () => {
			// Arrange
			addressDriverContractStub.calcUserId
				.withArgs(await testAddressDriverClient.provider.getSigner().getAddress())
				.resolves(BigNumber.from(111));

			// Act
			await testAddressDriverClient.getUserId();

			// Assert
			assert(
				addressDriverContractStub.calcUserId.calledOnceWithExactly(
					await testAddressDriverClient.provider.getSigner().getAddress()
				),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getUserIdByAddress()', () => {
		it('should validate the user address', async () => {
			// Arrange
			const userAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');
			addressDriverContractStub.calcUserId.resolves(BigNumber.from(1));

			// Act
			await testAddressDriverClient.getUserIdByAddress(userAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(userAddress));
		});

		it('should call the calcUserId() method of the AddressDriver contract', async () => {
			// Arrange
			const userAddress = Wallet.createRandom().address;
			addressDriverContractStub.calcUserId.withArgs(userAddress).resolves(BigNumber.from(111));

			// Act
			await testAddressDriverClient.getUserIdByAddress(userAddress);

			// Assert
			assert(
				addressDriverContractStub.calcUserId.calledOnceWithExactly(userAddress),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('collect()', () => {
		it('should ensure the signer exists', async () => {
			// Arrange
			const ensureSignerExistsStub = sinon.stub(internals, 'ensureSignerExists');

			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;

			// Act
			await testAddressDriverClient.collect(tokenAddress, transferToAddress);

			// Assert
			assert(
				ensureSignerExistsStub.calledOnceWithExactly(testAddressDriverClient.signer),
				'Expected method to be called with different arguments'
			);
		});

		it('should validate the input', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;
			const validateCollectInputStub = sinon.stub(validators, 'validateCollectInput');

			// Act
			await testAddressDriverClient.collect(tokenAddress, transferToAddress);

			// Assert
			assert(
				validateCollectInputStub.calledOnceWithExactly(tokenAddress, transferToAddress),
				'Expected method to be called with different arguments'
			);
		});

		it('should call the collect() method of the AddressDriver contract', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;

			// Act
			await testAddressDriverClient.collect(tokenAddress, transferToAddress);

			// Assert
			assert(
				addressDriverContractStub.collect.calledOnceWithExactly(tokenAddress, transferToAddress),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('give()', () => {
		it('should ensure the signer exists', async () => {
			// Arrange
			const ensureSignerExistsStub = sinon.stub(internals, 'ensureSignerExists');
			const tokenAddress = Wallet.createRandom().address;

			// Act
			await testAddressDriverClient.give('1', tokenAddress, 1n);

			// Assert
			assert(
				ensureSignerExistsStub.calledOnceWithExactly(testAddressDriverClient.signer),
				'Expected method to be called with different arguments'
			);
		});

		it('should throw argumentMissingError when receiverUserId is missing', async () => {
			// Arrange
			let threw = false;
			const tokenAddress = Wallet.createRandom().address;

			try {
				// Act
				await testAddressDriverClient.give(undefined as unknown as string, tokenAddress, 1n);
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
				await testAddressDriverClient.give('1', tokenAddress, -1n);
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
			const tokenAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(validators, 'validateAddress');

			// Act
			await testAddressDriverClient.give('1', tokenAddress, 1n);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(tokenAddress));
		});

		it('should call the give() method of the AddressDriver contract', async () => {
			// Arrange
			const amount = 100n;
			const receiverUserId = '1';
			const tokenAddress = Wallet.createRandom().address;

			// Act
			await testAddressDriverClient.give(receiverUserId, tokenAddress, amount);

			// Assert
			assert(
				addressDriverContractStub.give.calledOnceWithExactly(receiverUserId, tokenAddress, amount),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('setSplits()', () => {
		it('should ensure the signer exists', async () => {
			// Arrange
			const ensureSignerExistsStub = sinon.stub(internals, 'ensureSignerExists');

			// Act
			await testAddressDriverClient.setSplits([]);

			// Assert
			assert(
				ensureSignerExistsStub.calledOnceWithExactly(testAddressDriverClient.signer),
				'Expected method to be called with different arguments'
			);
		});

		it('should validate the splits receivers', async () => {
			// Arrange
			const receivers: SplitsReceiverStruct[] = [
				{ userId: 1, weight: 1 },
				{ userId: 2, weight: 2 }
			];

			const validateSplitsReceiversStub = sinon.stub(validators, 'validateSplitsReceivers');

			// Act
			await testAddressDriverClient.setSplits(receivers);

			// Assert
			assert(validateSplitsReceiversStub.calledOnceWithExactly(receivers));
		});

		it('should call the setSplits() method of the AddressDriver contract', async () => {
			// Arrange
			const receivers: SplitsReceiverStruct[] = [
				{ userId: 2, weight: 100 },
				{ userId: 1, weight: 1 },
				{ userId: 1, weight: 1 }
			];

			// Act
			await testAddressDriverClient.setSplits(receivers);

			// Assert
			assert(
				addressDriverContractStub.setSplits.calledOnceWithExactly(
					sinon
						.match((r: SplitsReceiverStruct[]) => r.length === 2)
						.and(sinon.match((r: SplitsReceiverStruct[]) => r[0].userId === 1))
						.and(sinon.match((r: SplitsReceiverStruct[]) => r[1].userId === 2))
				),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('setDrips()', () => {
		it('should ensure the signer exists', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;
			const ensureSignerExistsStub = sinon.stub(internals, 'ensureSignerExists');

			const estimatedGasFees = 2000000;

			addressDriverContractStub.estimateGas = {
				setDrips: () => BigNumber.from(estimatedGasFees) as any
			} as any;
			// Act
			await testAddressDriverClient.setDrips(tokenAddress, [], [], transferToAddress, undefined as unknown as bigint);

			// Assert
			assert(
				ensureSignerExistsStub.calledOnceWithExactly(testAddressDriverClient.signer),
				'Expected method to be called with different arguments'
			);
		});

		it('should validate the input', async () => {
			// Arrange
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

			const estimatedGasFees = 2000000;

			addressDriverContractStub.estimateGas = {
				setDrips: () => BigNumber.from(estimatedGasFees) as any
			} as any;

			// Act
			await testAddressDriverClient.setDrips(tokenAddress, currentReceivers, receivers, transferToAddress, 1n);

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

		it('should clear drips when new receivers is an empty list', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;
			const currentReceivers: DripsReceiverStruct[] = [
				{
					userId: 3,
					config: Utils.DripsReceiverConfiguration.toUint256({ dripId: 1n, amountPerSec: 3n, duration: 3n, start: 3n })
				}
			];

			const estimatedGasFees = 2000000;
			const gasLimit = Math.ceil(estimatedGasFees + estimatedGasFees * 0.2);

			addressDriverContractStub.estimateGas = {
				setDrips: () => BigNumber.from(estimatedGasFees) as any
			} as any;

			// Act
			await testAddressDriverClient.setDrips(tokenAddress, currentReceivers, [], transferToAddress, 1n);

			// Assert
			assert(
				addressDriverContractStub.setDrips.calledOnceWithExactly(
					tokenAddress,
					currentReceivers,
					1n,
					[],
					0,
					0,
					transferToAddress,
					{ gasLimit }
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should call the setDrips() method of the AddressDriver contract', async () => {
			// Arrange
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

			const estimatedGasFees = 2000000;
			const gasLimit = Math.ceil(estimatedGasFees + estimatedGasFees * 0.2);

			addressDriverContractStub.estimateGas = {
				setDrips: () => BigNumber.from(estimatedGasFees) as any
			} as any;

			// Act
			await testAddressDriverClient.setDrips(tokenAddress, currentReceivers, receivers, transferToAddress, 1n);

			// Assert
			assert(
				addressDriverContractStub.setDrips.calledOnceWithExactly(
					tokenAddress,
					currentReceivers,
					1n,
					sinon
						.match((r: DripsReceiverStruct[]) => r[0].userId === 1n)
						.and(sinon.match((r: DripsReceiverStruct[]) => r[1].userId === 2n))
						.and(sinon.match((r: DripsReceiverStruct[]) => r.length === 2)),
					0,
					0,
					transferToAddress,
					{ gasLimit }
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should set balanceDelta to 0 when balanceDelta is undefined', async () => {
			// Arrange
			const tokenAddress = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;

			const estimatedGasFees = 2000000;
			const gasLimit = Math.ceil(estimatedGasFees + estimatedGasFees * 0.2);

			addressDriverContractStub.estimateGas = {
				setDrips: () => BigNumber.from(estimatedGasFees) as any
			} as any;

			// Act
			await testAddressDriverClient.setDrips(tokenAddress, [], [], transferToAddress, undefined as unknown as bigint);

			// Assert
			assert(
				addressDriverContractStub.setDrips.calledOnceWithExactly(tokenAddress, [], 0, [], 0, 0, transferToAddress, {
					gasLimit
				}),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getAddressByUserId', () => {
		it('should return the expected result', () => {
			const expectedAddress = '0xAEeF2381C4Ca788a7bc53421849d73e61ec47B8D';
			const userId = '998697365313809816557299962230702436787341785997';

			// Act
			const actualAddress = AddressDriverClient.getUserAddress(userId);

			// Assert
			assert.equal(actualAddress, expectedAddress);
		});
	});

	describe('emitUserMetadata()', () => {
		it('should ensure the signer exists', async () => {
			// Arrange
			const ensureSignerExistsStub = sinon.stub(internals, 'ensureSignerExists');

			// Act
			await testAddressDriverClient.emitUserMetadata([]);

			// Assert
			assert(
				ensureSignerExistsStub.calledOnceWithExactly(testAddressDriverClient.signer),
				'Expected method to be called with different arguments'
			);
		});

		it('should validate the input', async () => {
			// Arrange
			const metadata: UserMetadata[] = [];
			const validateEmitUserMetadataInputStub = sinon.stub(validators, 'validateEmitUserMetadataInput');

			// Act
			await testAddressDriverClient.emitUserMetadata(metadata);

			// Assert
			assert(validateEmitUserMetadataInputStub.calledOnceWithExactly(metadata));
		});

		it('should call the emitUserMetadata() method of the AddressDriver contract', async () => {
			// Arrange
			const metadata: UserMetadata[] = [{ key: 'key', value: 'value' }];
			const metadataAsBytes = metadata.map((m) => internals.createFromStrings(m.key, m.value));

			// Act
			await testAddressDriverClient.emitUserMetadata(metadata);

			// Assert
			assert(
				addressDriverContractStub.emitUserMetadata.calledOnceWithExactly(metadataAsBytes),
				'Expected method to be called with different arguments'
			);
		});
	});
});
