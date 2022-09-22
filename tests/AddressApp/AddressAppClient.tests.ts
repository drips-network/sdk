import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubObject, stubInterface } from 'ts-sinon';
import { assert } from 'chai';
import type { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import type { Network } from '@ethersproject/networks';
import type { BigNumberish } from 'ethers';
import { constants, Wallet } from 'ethers';
import type { AddressApp, IERC20 } from '../../contracts';
import { IERC20__factory, AddressApp__factory } from '../../contracts';
import type { SplitsReceiverStruct, DripsReceiverStruct } from '../../contracts/AddressApp';
import DripsHubClient from '../../src/DripsHub/DripsHubClient';
import AddressAppClient from '../../src/AddressApp/AddressAppClient';
import Utils from '../../src/utils';
import { DripsErrorCode } from '../../src/common/DripsError';
import * as internals from '../../src/common/internals';
import * as addressAppValidators from '../../src/AddressApp/addressAppValidators';

describe('AddressAppClient', () => {
	const TEST_CHAIN_ID = 5; // Goerli.

	let signerAddress: string;
	let dripsHubClientStub: DripsHubClient;
	let networkStub: StubbedInstance<Network>;
	let signerStub: StubbedInstance<JsonRpcSigner>;
	let providerStub: StubbedInstance<JsonRpcProvider>;
	let addressAppContractStub: StubbedInstance<AddressApp>;

	let testAddressAppClient: AddressAppClient;

	// Acts also as the "base Arrange step".
	beforeEach(async () => {
		providerStub = stubInterface<JsonRpcProvider>();

		signerStub = stubInterface<JsonRpcSigner>();
		signerAddress = Wallet.createRandom().address;
		signerStub.getAddress.resolves(signerAddress);

		networkStub = stubObject<Network>({ chainId: TEST_CHAIN_ID } as Network);

		providerStub.getSigner.returns(signerStub);
		providerStub.getNetwork.resolves(networkStub);

		addressAppContractStub = stubInterface<AddressApp>();

		sinon
			.stub(AddressApp__factory, 'connect')
			.withArgs(Utils.Network.chainDripsMetadata[TEST_CHAIN_ID].CONTRACT_ADDRESS_APP, signerStub)
			.returns(addressAppContractStub);

		dripsHubClientStub = {} as DripsHubClient;

		sinon.stub(DripsHubClient, 'create').resolves(dripsHubClientStub);

		testAddressAppClient = await AddressAppClient.create(providerStub);
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
				await AddressAppClient.create(undefined as unknown as JsonRpcProvider);
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
				await AddressAppClient.create(providerStub);
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
			AddressAppClient.create(providerStub);

			// Assert
			assert(
				validateAddressStub.calledOnceWithExactly(await signerStub.getAddress()),
				'Expected method to be called with different arguments'
			);
		});

		it('should throw unsupportedNetworkError error when the provider is connected to an unsupported chain', async () => {
			// Arrange
			let threw = false;
			providerStub.getNetwork.resolves({ chainId: TEST_CHAIN_ID + 1 } as Network);

			try {
				// Act
				await AddressAppClient.create(providerStub);
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
			assert.equal(testAddressAppClient.signerAddress, await signerStub.getAddress());
			assert.equal(testAddressAppClient.network.chainId, networkStub.chainId);
			assert.equal(
				await testAddressAppClient.provider.getSigner().getAddress(),
				await providerStub.getSigner().getAddress()
			);
			assert.equal(
				testAddressAppClient.chainDripsMetadata,
				Utils.Network.chainDripsMetadata[(await providerStub.getNetwork()).chainId]
			);
			assert.equal(testAddressAppClient.dripsHub, dripsHubClientStub);
			assert.equal(testAddressAppClient.signerAddress, signerAddress);
		});
	});

	describe('getAllowance()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const erc20Address = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(internals, 'validateAddress');

			const erc20ContractStub = stubInterface<IERC20>();

			sinon
				.stub(IERC20__factory, 'connect')
				.withArgs(erc20Address, testAddressAppClient.signer)
				.returns(erc20ContractStub);

			// Act
			await testAddressAppClient.getAllowance(erc20Address);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(erc20Address));
		});

		it('should call the getAllowance() method of the ERC20 contract', async () => {
			// Arrange
			const erc20Address = Wallet.createRandom().address;

			const erc20ContractStub = stubInterface<IERC20>();

			sinon
				.stub(IERC20__factory, 'connect')
				.withArgs(erc20Address, testAddressAppClient.signer)
				.returns(erc20ContractStub);

			// Act
			await testAddressAppClient.getAllowance(erc20Address);

			// Assert
			assert(
				erc20ContractStub.allowance.calledOnceWithExactly(
					testAddressAppClient.signerAddress,
					testAddressAppClient.chainDripsMetadata.CONTRACT_ADDRESS_APP
				),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('approve()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const erc20Address = 'invalid address';
			const validateAddressStub = sinon.stub(internals, 'validateAddress');

			const erc20ContractStub = stubInterface<IERC20>();

			sinon
				.stub(IERC20__factory, 'connect')
				.withArgs(erc20Address, testAddressAppClient.signer)
				.returns(erc20ContractStub);

			// Act
			await testAddressAppClient.approve(erc20Address);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(erc20Address));
		});

		it('should call the approve() method of the ERC20 contract', async () => {
			// Arrange
			const erc20Address = Wallet.createRandom().address;

			const erc20ContractStub = stubInterface<IERC20>();

			sinon
				.stub(IERC20__factory, 'connect')
				.withArgs(erc20Address, testAddressAppClient.signer)
				.returns(erc20ContractStub);

			// Act
			await testAddressAppClient.approve(erc20Address);

			// Assert
			assert(
				erc20ContractStub.approve.calledOnceWithExactly(
					testAddressAppClient.chainDripsMetadata.CONTRACT_ADDRESS_APP,
					constants.MaxUint256
				),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getUserId()', () => {
		it('should call the calcUserId() method of the AddressApp contract', async () => {
			// Arrange
			addressAppContractStub.calcUserId.withArgs(testAddressAppClient.signerAddress).resolves(internals.toBN(111));

			// Act
			await testAddressAppClient.getUserId();

			// Assert
			assert(
				addressAppContractStub.calcUserId.calledOnceWithExactly(testAddressAppClient.signerAddress),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getUserIdByAddress()', () => {
		it('should validate the user address', async () => {
			// Arrange
			const userAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(internals, 'validateAddress');
			addressAppContractStub.calcUserId.resolves(internals.toBN(1));

			// Act
			await testAddressAppClient.getUserIdByAddress(userAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(userAddress));
		});

		it('should call the calcUserId() method of the AddressApp contract', async () => {
			// Arrange
			const userAddress = Wallet.createRandom().address;
			addressAppContractStub.calcUserId.withArgs(userAddress).resolves(internals.toBN(111));

			// Act
			await testAddressAppClient.getUserIdByAddress(userAddress);

			// Assert
			assert(
				addressAppContractStub.calcUserId.calledOnceWithExactly(userAddress),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('collect()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const erc20Address = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(internals, 'validateAddress');

			// Act
			await testAddressAppClient.collect(erc20Address);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(erc20Address));
		});

		it('should call the collect() method of the AddressApp contract', async () => {
			// Arrange
			const erc20Address = Wallet.createRandom().address;

			// Act
			await testAddressAppClient.collect(erc20Address);

			// Assert
			assert(
				addressAppContractStub.collect.calledOnceWithExactly(testAddressAppClient.signerAddress, erc20Address),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('collectForAddress()', () => {
		it('should validate the ERC20 address and the user address', async () => {
			// Arrange
			const erc20Address = Wallet.createRandom().address;
			const userAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(internals, 'validateAddress');

			// Act
			await testAddressAppClient.collectForAddress(userAddress, erc20Address);

			// Assert
			assert(validateAddressStub.calledTwice);
			assert(validateAddressStub.calledWithExactly(userAddress));
			assert(validateAddressStub.calledWithExactly(erc20Address));
		});

		it('should call the collect() method of the AddressApp contract', async () => {
			// Arrange
			const userAddress = Wallet.createRandom().address;
			const erc20Address = Wallet.createRandom().address;

			// Act
			await testAddressAppClient.collectForAddress(userAddress, erc20Address);

			// Assert
			assert(
				addressAppContractStub.collect.calledOnceWithExactly(userAddress, erc20Address),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('collectAll()', () => {
		it('should validate the ERC20 address and the splits receivers', async () => {
			// Arrange
			const erc20Address = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(internals, 'validateAddress');
			const validateSplitsReceiversStub = sinon.stub(addressAppValidators, 'validateSplitsReceivers');
			const receivers: SplitsReceiverStruct[] = [];

			// Act
			await testAddressAppClient.collectAll(erc20Address, receivers);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(erc20Address));
			assert(validateSplitsReceiversStub.calledOnceWithExactly(receivers));
		});

		it('should call the collectAll() method of the AddressApp contract', async () => {
			// Arrange
			const erc20Address = Wallet.createRandom().address;
			const currentReceivers = [{ userId: 1, weight: 3 }];

			// Act
			await testAddressAppClient.collectAll(erc20Address, currentReceivers);

			// Assert
			assert(
				addressAppContractStub.collectAll.calledOnceWithExactly(
					testAddressAppClient.signerAddress,
					erc20Address,
					currentReceivers
				),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('collectAllForAddress()', () => {
		it('should validate the ERC20 address, the user address and the splits receivers', async () => {
			// Arrange
			const userAddress = Wallet.createRandom().address;
			const erc20Address = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(internals, 'validateAddress');
			const validateSplitsReceiversStub = sinon.stub(addressAppValidators, 'validateSplitsReceivers');
			const receivers: SplitsReceiverStruct[] = [];

			// Act
			await testAddressAppClient.collectAllForAddress(userAddress, erc20Address, []);

			// Assert
			assert(validateAddressStub.calledTwice);
			assert(validateAddressStub.calledWithExactly(userAddress));
			assert(validateAddressStub.calledWithExactly(erc20Address));
			assert(validateSplitsReceiversStub.calledWithExactly(receivers));
		});

		it('should call the collectAll() method of the AddressApp contract', async () => {
			// Arrange
			const userAddress = Wallet.createRandom().address;
			const erc20Address = Wallet.createRandom().address;
			const currentReceivers = [{ userId: 1, weight: 3 }];

			// Act
			await testAddressAppClient.collectAllForAddress(userAddress, erc20Address, currentReceivers);

			// Assert
			assert(
				addressAppContractStub.collectAll.calledOnceWithExactly(userAddress, erc20Address, currentReceivers),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('give()', () => {
		it('should throw argumentMissingError when receiverId is missing', async () => {
			// Arrange
			let threw = false;
			const erc20Address = Wallet.createRandom().address;

			try {
				// Act
				await testAddressAppClient.give(undefined as unknown as BigNumberish, erc20Address, 1);
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
			const erc20Address = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(internals, 'validateAddress');

			// Act
			await testAddressAppClient.give(1, erc20Address, 1);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(erc20Address));
		});

		it('should call the give() method of the AddressApp contract', async () => {
			// Arrange
			const amount = 100;
			const receiverId = 1;
			const erc20Address = Wallet.createRandom().address;

			// Act
			await testAddressAppClient.give(receiverId, erc20Address, amount);

			// Assert
			assert(
				addressAppContractStub.give.calledOnceWithExactly(receiverId, erc20Address, amount),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('setSplits()', () => {
		it('should throw argumentMissingError when splits receivers are missing', async () => {
			// Arrange
			let threw = false;

			// Act
			try {
				await testAddressAppClient.setSplits(undefined as unknown as SplitsReceiverStruct[]);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('clears splits when new receivers is an empty list', async () => {
			// Act
			await testAddressAppClient.setSplits([]);

			// Assert
			assert(
				addressAppContractStub.setSplits.calledOnceWithExactly([]),
				'Expected method to be called with different arguments'
			);
		});

		it('should validate the splits receivers', async () => {
			// Arrange
			const receivers: SplitsReceiverStruct[] = [
				{ userId: 1, weight: 1 },
				{ userId: 2, weight: 2 }
			];

			const validateSplitsReceiversStub = sinon.stub(addressAppValidators, 'validateSplitsReceivers');

			// Act
			await testAddressAppClient.setSplits(receivers);

			// Assert
			assert(validateSplitsReceiversStub.calledOnceWithExactly(receivers));
		});

		it('should call the setSplits() method of the AddressApp contract', async () => {
			// Arrange
			const receivers: SplitsReceiverStruct[] = [
				{ userId: 2, weight: 100 },
				{ userId: 1, weight: 1 },
				{ userId: 1, weight: 1 }
			];

			// Act
			await testAddressAppClient.setSplits(receivers);

			// Assert
			assert(
				addressAppContractStub.setSplits.calledOnceWithExactly(
					sinon
						.match((r: SplitsReceiverStruct[]) => r.length === 2)
						.and(sinon.match((r: SplitsReceiverStruct[]) => r[0].userId === 1))
						.and(sinon.match((r: SplitsReceiverStruct[]) => r[1].userId === 2))
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should sort by the expected order when userID1>userID2', async () => {
			// Arrange
			const receivers: SplitsReceiverStruct[] = [
				{ userId: 100, weight: 1 },
				{ userId: 1, weight: 100 }
			];

			// Act
			await testAddressAppClient.setSplits(receivers);

			// Assert
			assert(
				addressAppContractStub.setSplits.calledOnceWithExactly(
					sinon.match((r: DripsReceiverStruct[]) => r[0].userId < r[1].userId)
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should sort by the expected order when userID1<userID2', async () => {
			// Arrange
			const receivers: SplitsReceiverStruct[] = [
				{ userId: 1, weight: 100 },
				{ userId: 100, weight: 1 }
			];

			// Act
			await testAddressAppClient.setSplits(receivers);

			// Assert
			assert(
				addressAppContractStub.setSplits.calledOnceWithExactly(
					sinon.match((r: DripsReceiverStruct[]) => r[0].userId < r[1].userId)
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should remove duplicates', async () => {
			// Arrange
			const receivers: SplitsReceiverStruct[] = [
				{ userId: 1, weight: 100 },
				{ userId: 1, weight: 100 },
				{ userId: 100, weight: 1 }
			];

			// Act
			await testAddressAppClient.setSplits(receivers);

			// Assert
			assert(
				addressAppContractStub.setSplits.calledOnceWithExactly(
					sinon.match((r: DripsReceiverStruct[]) => r.length === 2)
				),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('setDrips()', () => {
		it('should validate the ERC20 address', async () => {
			// Arrange
			const erc20Address = Wallet.createRandom().address;
			const currentReceivers: DripsReceiverStruct[] = [
				{
					userId: 3,
					config: Utils.DripsReceiverConfiguration.toUint256String({ amountPerSec: 3, duration: 3, start: 3 })
				}
			];
			const receivers: DripsReceiverStruct[] = [
				{
					userId: 2,
					config: Utils.DripsReceiverConfiguration.toUint256String({ amountPerSec: 1, duration: 1, start: 1 })
				},
				{
					userId: 2,
					config: Utils.DripsReceiverConfiguration.toUint256String({ amountPerSec: 1, duration: 1, start: 1 })
				},
				{
					userId: 1,
					config: Utils.DripsReceiverConfiguration.toUint256String({ amountPerSec: 2, duration: 2, start: 2 })
				}
			];

			const validateAddressStub = sinon.stub(internals, 'validateAddress');

			// Act
			await testAddressAppClient.setDrips(erc20Address, currentReceivers, receivers, 1);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(erc20Address));
		});

		it('should validate the drips receivers', async () => {
			// Arrange
			const erc20Address = Wallet.createRandom().address;
			const currentReceivers: DripsReceiverStruct[] = [
				{
					userId: 3,
					config: Utils.DripsReceiverConfiguration.toUint256String({ amountPerSec: 3, duration: 3, start: 3 })
				}
			];
			const receivers: DripsReceiverStruct[] = [
				{
					userId: 2,
					config: Utils.DripsReceiverConfiguration.toUint256String({ amountPerSec: 1, duration: 1, start: 1 })
				},
				{
					userId: 2,
					config: Utils.DripsReceiverConfiguration.toUint256String({ amountPerSec: 1, duration: 1, start: 1 })
				},
				{
					userId: 1,
					config: Utils.DripsReceiverConfiguration.toUint256String({ amountPerSec: 2, duration: 2, start: 2 })
				}
			];

			const validateDripsReceiversStub = sinon.stub(addressAppValidators, 'validateDripsReceivers');

			// Act
			await testAddressAppClient.setDrips(erc20Address, currentReceivers, receivers, 1);

			// Assert
			assert(
				validateDripsReceiversStub.calledWithExactly(receivers),
				'Expected method to be called with different arguments'
			);
			assert(
				validateDripsReceiversStub.calledWithExactly(currentReceivers),
				'Expected method to be called with different arguments'
			);
		});

		it('should throw argumentMissingError when current drips receivers are missing', async () => {
			// Arrange
			let threw = false;

			// Act
			try {
				await testAddressAppClient.setDrips(
					Wallet.createRandom().address,
					undefined as unknown as DripsReceiverStruct[],
					[],
					0
				);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw argumentMissingError when new drips receivers are missing', async () => {
			// Arrange
			let threw = false;

			// Act
			try {
				await testAddressAppClient.setDrips(
					Wallet.createRandom().address,
					[],
					undefined as unknown as DripsReceiverStruct[],
					0
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
			const erc20Address = Wallet.createRandom().address;
			const currentReceivers: DripsReceiverStruct[] = [
				{
					userId: 3,
					config: Utils.DripsReceiverConfiguration.toUint256String({ amountPerSec: 3, duration: 3, start: 3 })
				}
			];

			// Act
			await testAddressAppClient.setDrips(erc20Address, currentReceivers, [], 1);

			// Assert
			assert(
				addressAppContractStub.setDrips.calledOnceWithExactly(erc20Address, currentReceivers, 1, []),
				'Expected method to be called with different arguments'
			);
		});

		it('should call the setDrips() method of the AddressApp contract', async () => {
			// Arrange
			const erc20Address = Wallet.createRandom().address;
			const currentReceivers: DripsReceiverStruct[] = [
				{
					userId: 3,
					config: Utils.DripsReceiverConfiguration.toUint256String({ amountPerSec: 3, duration: 3, start: 3 })
				}
			];
			const receivers: DripsReceiverStruct[] = [
				{
					userId: 2,
					config: Utils.DripsReceiverConfiguration.toUint256String({ amountPerSec: 1, duration: 1, start: 1 })
				},
				{
					userId: 2,
					config: Utils.DripsReceiverConfiguration.toUint256String({ amountPerSec: 1, duration: 1, start: 1 })
				},
				{
					userId: 1,
					config: Utils.DripsReceiverConfiguration.toUint256String({ amountPerSec: 2, duration: 2, start: 2 })
				}
			];

			// Act
			await testAddressAppClient.setDrips(erc20Address, currentReceivers, receivers, 1);

			// Assert
			assert(
				addressAppContractStub.setDrips.calledOnceWithExactly(
					erc20Address,
					currentReceivers,
					1,
					sinon
						.match((r: DripsReceiverStruct[]) => r[0].userId === 1)
						.and(sinon.match((r: DripsReceiverStruct[]) => r[1].userId === 2))
						.and(sinon.match((r: DripsReceiverStruct[]) => r.length === 2))
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should set default values when required parameters are falsy', async () => {
			// Arrange
			const erc20Address = Wallet.createRandom().address;

			// Act
			await testAddressAppClient.setDrips(erc20Address, [], [], undefined as unknown as number);

			// Assert
			assert(
				addressAppContractStub.setDrips.calledOnceWithExactly(erc20Address, [], 0, []),
				'Expected method to be called with different arguments'
			);
		});

		it('should sort by the expected order when userID1=userID2 but config1<config2', async () => {
			// Arrange
			const erc20Address = Wallet.createRandom().address;
			const receivers: DripsReceiverStruct[] = [
				{
					userId: 2,
					config: Utils.DripsReceiverConfiguration.toUint256String({ amountPerSec: 1, duration: 1, start: 1 })
				},
				{
					userId: 2,
					config: Utils.DripsReceiverConfiguration.toUint256String({ amountPerSec: 1, duration: 1, start: 200 })
				}
			];

			// Act
			await testAddressAppClient.setDrips(erc20Address, [], receivers, undefined as unknown as number);

			// Assert
			assert(
				addressAppContractStub.setDrips.calledOnceWithExactly(
					erc20Address,
					[],
					0,
					sinon.match((r: DripsReceiverStruct[]) => r[0].config < r[1].config)
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should sort by the expected order when userID1=userID2 but config1>config2', async () => {
			// Arrange
			const erc20Address = Wallet.createRandom().address;
			const receivers: DripsReceiverStruct[] = [
				{
					userId: 2,
					config: Utils.DripsReceiverConfiguration.toUint256String({ amountPerSec: 1, duration: 1, start: 200 })
				},
				{
					userId: 2,
					config: Utils.DripsReceiverConfiguration.toUint256String({ amountPerSec: 1, duration: 1, start: 1 })
				}
			];

			// Act
			await testAddressAppClient.setDrips(erc20Address, [], receivers, undefined as unknown as number);

			// Assert
			assert(
				addressAppContractStub.setDrips.calledOnceWithExactly(
					erc20Address,
					[],
					0,
					sinon.match((r: DripsReceiverStruct[]) => r[0].config < r[1].config)
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should remove duplicates', async () => {
			// Arrange
			const erc20Address = Wallet.createRandom().address;
			const receivers: DripsReceiverStruct[] = [
				{
					userId: 2,
					config: Utils.DripsReceiverConfiguration.toUint256String({ amountPerSec: 1, duration: 1, start: 2 })
				},
				{
					userId: 2,
					config: Utils.DripsReceiverConfiguration.toUint256String({ amountPerSec: 1, duration: 1, start: 1 })
				},
				{
					userId: 2,
					config: Utils.DripsReceiverConfiguration.toUint256String({ amountPerSec: 1, duration: 1, start: 1 })
				},
				{
					userId: 2,
					config: Utils.DripsReceiverConfiguration.toUint256String({ amountPerSec: 2, duration: 1, start: 1 })
				},
				{
					userId: 2,
					config: Utils.DripsReceiverConfiguration.toUint256String({ amountPerSec: 2, duration: 1, start: 2 })
				},
				{
					userId: 2,
					config: Utils.DripsReceiverConfiguration.toUint256String({ amountPerSec: 2, duration: 1, start: 2 })
				}
			];

			// Act
			await testAddressAppClient.setDrips(erc20Address, [], receivers, undefined as unknown as number);

			// Assert
			assert(
				addressAppContractStub.setDrips.calledOnceWithExactly(
					erc20Address,
					[],
					0,
					sinon.match((r: DripsReceiverStruct[]) => r.length === 4)
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should sort by the expected order when userID1>userID2', async () => {
			// Arrange
			const erc20Address = Wallet.createRandom().address;
			const receivers: DripsReceiverStruct[] = [
				{
					userId: 100,
					config: Utils.DripsReceiverConfiguration.toUint256String({ amountPerSec: 100, duration: 1, start: 1 })
				},
				{
					userId: 1,
					config: Utils.DripsReceiverConfiguration.toUint256String({ amountPerSec: 1, duration: 1, start: 200 })
				}
			];

			// Act
			await testAddressAppClient.setDrips(erc20Address, [], receivers, undefined as unknown as number);

			// Assert
			assert(
				addressAppContractStub.setDrips.calledOnceWithExactly(
					erc20Address,
					[],
					0,
					sinon.match((r: DripsReceiverStruct[]) => r[0].userId < r[1].userId)
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should sort by the expected order when userID1<userID2', async () => {
			// Arrange
			const erc20Address = Wallet.createRandom().address;
			const receivers: DripsReceiverStruct[] = [
				{
					userId: 1,
					config: Utils.DripsReceiverConfiguration.toUint256String({ amountPerSec: 1, duration: 1, start: 200 })
				},
				{
					userId: 100,
					config: Utils.DripsReceiverConfiguration.toUint256String({ amountPerSec: 100, duration: 1, start: 1 })
				}
			];

			// Act
			await testAddressAppClient.setDrips(erc20Address, [], receivers, undefined as unknown as number);

			// Assert
			assert(
				addressAppContractStub.setDrips.calledOnceWithExactly(
					erc20Address,
					[],
					0,
					sinon.match((r: DripsReceiverStruct[]) => r[0].userId < r[1].userId)
				),
				'Expected method to be called with different arguments'
			);
		});
	});
});
