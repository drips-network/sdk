import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubObject, stubInterface } from 'ts-sinon';
import { assert } from 'chai';
import { JsonRpcSigner, JsonRpcProvider } from '@ethersproject/providers';
import type { Network } from '@ethersproject/networks';
import type { BigNumberish } from 'ethers';
import { constants, Wallet } from 'ethers';
import type { AddressDriver, IERC20 } from '../../contracts';
import { IERC20__factory, AddressDriver__factory } from '../../contracts';
import type { SplitsReceiverStruct, DripsReceiverStruct, DripsHistoryStruct } from '../../contracts/AddressDriver';
import AddressDriverClient from '../../src/AddressDriver/AddressDriverClient';
import Utils from '../../src/utils';
import { DripsErrorCode } from '../../src/common/DripsError';
import * as internals from '../../src/common/internals';
import * as addressDriverValidators from '../../src/AddressDriver/addressDriverValidators';
import DripsHubClient from '../../src/DripsHub/DripsHubClient';
import DripsSubgraphClient from '../../src/DripsSubgraph/DripsSubgraphClient';
import type { DripsSetEvent } from '../../src/DripsSubgraph/types';
import type { CycleInfo } from '../../src/common/types';

describe('AddressDriverClient', () => {
	const TEST_CHAIN_ID = 5; // Goerli.

	let networkStub: StubbedInstance<Network>;
	let signerStub: StubbedInstance<JsonRpcSigner>;
	let providerStub: StubbedInstance<JsonRpcProvider>;
	let dripsHubClientStub: StubbedInstance<DripsHubClient>;
	let addressDriverContractStub: StubbedInstance<AddressDriver>;

	let testAddressDriverClient: AddressDriverClient;

	// Acts also as the "base Arrange step".
	beforeEach(async () => {
		providerStub = sinon.createStubInstance(JsonRpcProvider);

		signerStub = sinon.createStubInstance(JsonRpcSigner);
		signerStub.getAddress.resolves(Wallet.createRandom().address);

		networkStub = stubObject<Network>({ chainId: TEST_CHAIN_ID } as Network);

		providerStub.getSigner.returns(signerStub);
		providerStub.getNetwork.resolves(networkStub);

		addressDriverContractStub = stubInterface<AddressDriver>();
		sinon
			.stub(AddressDriver__factory, 'connect')
			.withArgs(Utils.Network.chainDripsMetadata[TEST_CHAIN_ID].CONTRACT_ADDRESS_DRIVER, signerStub)
			.returns(addressDriverContractStub);

		dripsHubClientStub = stubInterface<DripsHubClient>();
		sinon.stub(DripsHubClient, 'create').resolves(dripsHubClientStub);

		testAddressDriverClient = await AddressDriverClient.create(providerStub);
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
				await AddressDriverClient.create(undefined as unknown as JsonRpcProvider);
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
				await AddressDriverClient.create(providerStub);
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
			AddressDriverClient.create(providerStub);

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
				await AddressDriverClient.create(providerStub);
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
			assert.equal(await testAddressDriverClient.signer.getAddress(), await signerStub.getAddress());
			assert.equal(testAddressDriverClient.network.chainId, networkStub.chainId);
			assert.equal(
				await testAddressDriverClient.provider.getSigner().getAddress(),
				await providerStub.getSigner().getAddress()
			);
			assert.equal(
				testAddressDriverClient.chainDripsMetadata,
				Utils.Network.chainDripsMetadata[(await providerStub.getNetwork()).chainId]
			);
			assert.equal(testAddressDriverClient.signerAddress, await signerStub.getAddress());
			assert.equal(testAddressDriverClient.dripsHub.network.chainId, dripsHubClientStub.network.chainId);
			assert.equal(
				testAddressDriverClient.subgraph.apiUrl,
				Utils.Network.chainDripsMetadata[TEST_CHAIN_ID].SUBGRAPH_URL
			);
		});
	});

	describe('getCycleInfo()', () => {
		it('should return the expected result', async () => {
			// Arrange

			// Act
			await testAddressDriverClient.getCycleInfo();

			// Assert
			assert.isTrue(dripsHubClientStub.getCycleInfo.calledOnce);
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
				.withArgs(erc20Address, testAddressDriverClient.signer)
				.returns(erc20ContractStub);

			// Act
			await testAddressDriverClient.getAllowance(erc20Address);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(erc20Address));
		});

		it('should call the getAllowance() method of the ERC20 contract', async () => {
			// Arrange
			const erc20Address = Wallet.createRandom().address;

			const erc20ContractStub = stubInterface<IERC20>();

			sinon
				.stub(IERC20__factory, 'connect')
				.withArgs(erc20Address, testAddressDriverClient.signer)
				.returns(erc20ContractStub);

			// Act
			await testAddressDriverClient.getAllowance(erc20Address);

			// Assert
			assert(
				erc20ContractStub.allowance.calledOnceWithExactly(
					testAddressDriverClient.signerAddress,
					testAddressDriverClient.chainDripsMetadata.CONTRACT_ADDRESS_DRIVER
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
				.withArgs(erc20Address, testAddressDriverClient.signer)
				.returns(erc20ContractStub);

			// Act
			await testAddressDriverClient.approve(erc20Address);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(erc20Address));
		});

		it('should call the approve() method of the ERC20 contract', async () => {
			// Arrange
			const erc20Address = Wallet.createRandom().address;

			const erc20ContractStub = stubInterface<IERC20>();

			sinon
				.stub(IERC20__factory, 'connect')
				.withArgs(erc20Address, testAddressDriverClient.signer)
				.returns(erc20ContractStub);

			// Act
			await testAddressDriverClient.approve(erc20Address);

			// Assert
			assert(
				erc20ContractStub.approve.calledOnceWithExactly(
					testAddressDriverClient.chainDripsMetadata.CONTRACT_ADDRESS_DRIVER,
					constants.MaxUint256
				),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getUserId()', () => {
		it('should call the calcUserId() method of the AddressDriver contract', async () => {
			// Arrange
			addressDriverContractStub.calcUserId
				.withArgs(testAddressDriverClient.signerAddress)
				.resolves(internals.toBN(111));

			// Act
			await testAddressDriverClient.getUserId();

			// Assert
			assert(
				addressDriverContractStub.calcUserId.calledOnceWithExactly(testAddressDriverClient.signerAddress),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('getUserIdByAddress()', () => {
		it('should validate the user address', async () => {
			// Arrange
			const userAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(internals, 'validateAddress');
			addressDriverContractStub.calcUserId.resolves(internals.toBN(1));

			// Act
			await testAddressDriverClient.getUserIdByAddress(userAddress);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(userAddress));
		});

		it('should call the calcUserId() method of the AddressDriver contract', async () => {
			// Arrange
			const userAddress = Wallet.createRandom().address;
			addressDriverContractStub.calcUserId.withArgs(userAddress).resolves(internals.toBN(111));

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
		it('should validate the ERC20 and transferTo addresses', async () => {
			// Arrange
			const erc20Address = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(internals, 'validateAddress');

			// Act
			await testAddressDriverClient.collect(erc20Address, transferToAddress);

			// Assert
			assert(
				validateAddressStub.calledWithExactly(erc20Address),
				'Expected method to be called with different arguments'
			);
			assert(
				validateAddressStub.calledWithExactly(transferToAddress),
				'Expected method to be called with different arguments'
			);
		});

		it('should call the collect() method of the AddressDriver contract', async () => {
			// Arrange
			const erc20Address = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;

			// Act
			await testAddressDriverClient.collect(erc20Address, transferToAddress);

			// Assert
			assert(
				addressDriverContractStub.collect.calledOnceWithExactly(erc20Address, transferToAddress),
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
				await testAddressDriverClient.give(undefined as unknown as BigNumberish, erc20Address, 1);
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
			await testAddressDriverClient.give(1, erc20Address, 1);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(erc20Address));
		});

		it('should call the give() method of the AddressDriver contract', async () => {
			// Arrange
			const amount = 100;
			const receiverId = 1;
			const erc20Address = Wallet.createRandom().address;

			// Act
			await testAddressDriverClient.give(receiverId, erc20Address, amount);

			// Assert
			assert(
				addressDriverContractStub.give.calledOnceWithExactly(receiverId, erc20Address, amount),
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
				await testAddressDriverClient.setSplits(undefined as unknown as SplitsReceiverStruct[]);
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
			await testAddressDriverClient.setSplits([]);

			// Assert
			assert(
				addressDriverContractStub.setSplits.calledOnceWithExactly([]),
				'Expected method to be called with different arguments'
			);
		});

		it('should validate the splits receivers', async () => {
			// Arrange
			const receivers: SplitsReceiverStruct[] = [
				{ userId: 1, weight: 1 },
				{ userId: 2, weight: 2 }
			];

			const validateSplitsReceiversStub = sinon.stub(addressDriverValidators, 'validateSplitsReceivers');

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

		it('should sort by the expected order when userID1>userID2', async () => {
			// Arrange
			const receivers: SplitsReceiverStruct[] = [
				{ userId: 100, weight: 1 },
				{ userId: 1, weight: 100 }
			];

			// Act
			await testAddressDriverClient.setSplits(receivers);

			// Assert
			assert(
				addressDriverContractStub.setSplits.calledOnceWithExactly(
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
			await testAddressDriverClient.setSplits(receivers);

			// Assert
			assert(
				addressDriverContractStub.setSplits.calledOnceWithExactly(
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
			await testAddressDriverClient.setSplits(receivers);

			// Assert
			assert(
				addressDriverContractStub.setSplits.calledOnceWithExactly(
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
			const transferToAddress = Wallet.createRandom().address;
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
			await testAddressDriverClient.setDrips(erc20Address, currentReceivers, receivers, transferToAddress, 1);

			// Assert
			assert(validateAddressStub.calledOnceWithExactly(erc20Address));
		});

		it('should validate the drips receivers', async () => {
			// Arrange
			const erc20Address = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;

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

			const validateDripsReceiversStub = sinon.stub(addressDriverValidators, 'validateDripsReceivers');

			// Act
			await testAddressDriverClient.setDrips(erc20Address, currentReceivers, receivers, transferToAddress, 1);

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
				await testAddressDriverClient.setDrips(
					Wallet.createRandom().address,
					undefined as unknown as DripsReceiverStruct[],
					[],
					Wallet.createRandom().address,
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
				await testAddressDriverClient.setDrips(
					Wallet.createRandom().address,
					[],
					undefined as unknown as DripsReceiverStruct[],
					Wallet.createRandom().address,
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
			const transferToAddress = Wallet.createRandom().address;
			const currentReceivers: DripsReceiverStruct[] = [
				{
					userId: 3,
					config: Utils.DripsReceiverConfiguration.toUint256String({ amountPerSec: 3, duration: 3, start: 3 })
				}
			];

			// Act
			await testAddressDriverClient.setDrips(erc20Address, currentReceivers, [], transferToAddress, 1);

			// Assert
			assert(
				addressDriverContractStub.setDrips.calledOnceWithExactly(
					erc20Address,
					currentReceivers,
					1,
					[],
					transferToAddress
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should call the setDrips() method of the AddressDriver contract', async () => {
			// Arrange
			const erc20Address = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;
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
			await testAddressDriverClient.setDrips(erc20Address, currentReceivers, receivers, transferToAddress, 1);

			// Assert
			assert(
				addressDriverContractStub.setDrips.calledOnceWithExactly(
					erc20Address,
					currentReceivers,
					1,
					sinon
						.match((r: DripsReceiverStruct[]) => r[0].userId === 1)
						.and(sinon.match((r: DripsReceiverStruct[]) => r[1].userId === 2))
						.and(sinon.match((r: DripsReceiverStruct[]) => r.length === 2)),
					transferToAddress
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should set default values when required parameters are falsy', async () => {
			// Arrange
			const erc20Address = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;

			// Act
			await testAddressDriverClient.setDrips(erc20Address, [], [], transferToAddress, undefined as unknown as number);

			// Assert
			assert(
				addressDriverContractStub.setDrips.calledOnceWithExactly(erc20Address, [], 0, [], transferToAddress),
				'Expected method to be called with different arguments'
			);
		});

		it('should sort by the expected order when userID1=userID2 but config1<config2', async () => {
			// Arrange
			const erc20Address = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;
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
			await testAddressDriverClient.setDrips(
				erc20Address,
				[],
				receivers,
				transferToAddress,
				undefined as unknown as number
			);

			// Assert
			assert(
				addressDriverContractStub.setDrips.calledOnceWithExactly(
					erc20Address,
					[],
					0,
					sinon.match((r: DripsReceiverStruct[]) => r[0].config < r[1].config),
					transferToAddress
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should sort by the expected order when userID1=userID2 but config1>config2', async () => {
			// Arrange
			const erc20Address = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;
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
			await testAddressDriverClient.setDrips(
				erc20Address,
				[],
				receivers,
				transferToAddress,
				undefined as unknown as number
			);

			// Assert
			assert(
				addressDriverContractStub.setDrips.calledOnceWithExactly(
					erc20Address,
					[],
					0,
					sinon.match((r: DripsReceiverStruct[]) => r[0].config < r[1].config),
					transferToAddress
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should remove duplicates', async () => {
			// Arrange
			const erc20Address = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;
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
			await testAddressDriverClient.setDrips(
				erc20Address,
				[],
				receivers,
				transferToAddress,
				undefined as unknown as number
			);

			// Assert
			assert(
				addressDriverContractStub.setDrips.calledOnceWithExactly(
					erc20Address,
					[],
					0,
					sinon.match((r: DripsReceiverStruct[]) => r.length === 4),
					transferToAddress
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should sort by the expected order when userID1>userID2', async () => {
			// Arrange
			const erc20Address = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;
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
			await testAddressDriverClient.setDrips(
				erc20Address,
				[],
				receivers,
				transferToAddress,
				undefined as unknown as number
			);

			// Assert
			assert(
				addressDriverContractStub.setDrips.calledOnceWithExactly(
					erc20Address,
					[],
					0,
					sinon.match((r: DripsReceiverStruct[]) => r[0].userId < r[1].userId),
					transferToAddress
				),
				'Expected method to be called with different arguments'
			);
		});

		it('should sort by the expected order when userID1<userID2', async () => {
			// Arrange
			const erc20Address = Wallet.createRandom().address;
			const transferToAddress = Wallet.createRandom().address;
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
			await testAddressDriverClient.setDrips(
				erc20Address,
				[],
				receivers,
				transferToAddress,
				undefined as unknown as number
			);

			// Assert
			assert(
				addressDriverContractStub.setDrips.calledOnceWithExactly(
					erc20Address,
					[],
					0,
					sinon.match((r: DripsReceiverStruct[]) => r[0].userId < r[1].userId),
					transferToAddress
				),
				'Expected method to be called with different arguments'
			);
		});
	});

	describe('squeezeDrips', () => {
		it('should validate the ERC20 token address', async () => {
			// Arrange
			const erc20Address = Wallet.createRandom().address;
			const validateAddressStub = sinon.stub(internals, 'validateAddress');

			sinon.stub(DripsSubgraphClient.prototype, 'getDripsSetEvents').resolves([]);

			sinon.stub(AddressDriverClient.prototype, 'getCycleInfo').resolves({
				currentCycleStartDate: new Date(new Date().setDate(new Date().getDate() + 7))
			} as CycleInfo);

			addressDriverContractStub.calcUserId.withArgs(testAddressDriverClient.signerAddress).resolves(internals.toBN(1));

			// Act
			await testAddressDriverClient.squeezeDrips(erc20Address, 1);

			// Assert
			assert(
				validateAddressStub.calledOnceWithExactly(erc20Address),
				'Expected method to be called with different arguments'
			);
		});

		it('should throw argumentMissingError when senderId is null', async () => {
			// Arrange
			let threw = false;

			// Act
			try {
				await testAddressDriverClient.squeezeDrips(Wallet.createRandom().address, null as unknown as BigNumberish);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should throw argumentMissingError when senderId is undefined', async () => {
			// Arrange
			let threw = false;

			// Act
			try {
				await testAddressDriverClient.squeezeDrips(Wallet.createRandom().address, undefined as unknown as BigNumberish);
			} catch (error: any) {
				// Assert
				assert.equal(error.code, DripsErrorCode.MISSING_ARGUMENT);
				threw = true;
			}

			// Assert
			assert.isTrue(threw, 'Expected type of exception was not thrown');
		});

		it('should call the squeezeDrips() method of the AddressDriver contract', async () => {
			// Arrange
			const userId = 100;
			const senderId = 1;
			const erc20Address = '0x24412a9358A0bfE83c07B415BC2EC2C608364D92';
			const assetId = Utils.Asset.getIdFromAddress(erc20Address);

			const dripsSetEvents: DripsSetEvent[] = [
				{
					assetId,
					userId: senderId.toString(),
					receiversHash: '1h',
					dripsReceiverSeenEvents: [
						{
							receiverUserId: userId.toString(),
							config: 1
						}
					],
					blockTimestamp: new Date().setDate(new Date().getDate() - 1),
					dripsHistoryHash: '1',
					maxEnd: String(new Date().setDate(new Date().getDate() + 10))
				},
				{
					assetId,
					userId: senderId.toString(),
					receiversHash: '2h',
					dripsReceiverSeenEvents: [
						{
							receiverUserId: userId.toString(),
							config: 2
						}
					],
					blockTimestamp: new Date().setDate(new Date().getDate() - 2),
					dripsHistoryHash: '2',
					maxEnd: String(new Date().setDate(new Date().getDate() + 10))
				},
				{
					assetId: '1',
					userId: senderId.toString(),
					receiversHash: '4h',
					dripsReceiverSeenEvents: [
						{
							receiverUserId: userId.toString(),
							config: 4
						}
					],
					blockTimestamp: new Date().setDate(new Date().getDate() - 4),
					dripsHistoryHash: '4',
					maxEnd: String(new Date().setDate(new Date().getDate() + 10))
				},
				{
					assetId,
					userId: senderId.toString(),
					receiversHash: '6h',
					dripsReceiverSeenEvents: [
						{
							receiverUserId: '200',
							config: 6
						}
					],
					blockTimestamp: new Date().setDate(new Date().getDate() - 6),
					dripsHistoryHash: '6',
					maxEnd: String(new Date().setDate(new Date().getDate() + 10))
				},
				{
					assetId,
					userId: senderId.toString(),
					receiversHash: '8h',
					dripsReceiverSeenEvents: [
						{
							receiverUserId: userId.toString(),
							config: 8
						}
					],
					blockTimestamp: new Date().setDate(new Date().getDate() - 8),
					dripsHistoryHash: '8',
					maxEnd: String(new Date().setDate(new Date().getDate() + 10))
				},
				{
					assetId: '1',
					userId: senderId.toString(),
					receiversHash: '10h',
					dripsReceiverSeenEvents: [
						{
							receiverUserId: userId.toString(),
							config: 10
						}
					],
					blockTimestamp: new Date().setDate(new Date().getDate() - 10),
					dripsHistoryHash: '10',
					maxEnd: String(new Date().setDate(new Date().getDate() + 10))
				}
			];

			sinon.stub(DripsSubgraphClient.prototype, 'getDripsSetEvents').resolves(dripsSetEvents);

			dripsHubClientStub.getCycleInfo.resolves({
				currentCycleStartDate: new Date(new Date().setDate(new Date().getDate() - 5))
			} as CycleInfo);

			addressDriverContractStub.calcUserId
				.withArgs(testAddressDriverClient.signerAddress)
				.resolves(internals.toBN(userId));

			// Act
			await testAddressDriverClient.squeezeDrips(erc20Address, senderId);

			// Assert
			assert(
				addressDriverContractStub.squeezeDrips.calledOnceWithExactly(
					erc20Address,
					senderId,
					'6',
					sinon.match(
						(history: DripsHistoryStruct[]) =>
							history[0].dripsHash === '6h' &&
							history[0].receivers.length === 0 &&
							history[1].dripsHash === '4h' &&
							history[1].receivers.length === 0 &&
							history[2].dripsHash[0] === 0 &&
							history[2].receivers.length > 0 &&
							history[3].dripsHash[0] === 0 &&
							history[3].receivers.length > 0
					)
				),
				'Expected method to be called with different arguments'
			);
		});
	});
});
