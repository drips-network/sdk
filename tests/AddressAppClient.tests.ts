import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubConstructor, stubObject, stubInterface } from 'ts-sinon';
import { assert } from 'chai';
import type { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import type { Network } from '@ethersproject/networks';
import { BigNumber, constants, Contract, Wallet } from 'ethers';
import type { AddressApp as AddressAppContract } from '../contracts';
import { AddressApp__factory } from '../contracts';
import { DripsErrorCode, DripsErrors } from '../src/DripsError';
import AddressAppClient from '../src/AddressAppClient';
import * as utils from '../src/common';
import type { SplitsReceiverStruct, DripsReceiverStruct } from '../contracts/AddressApp';
import DripsReceiverConfig from '../src/DripsReceiverConfig';
import type { DripsReceiver } from '../src/types';
import DripsHubClient from '../src/DripsHubClient';

describe('AddressAppClient', () => {
	const TEST_CHAIN_ID = 5; // Goerli.

	let signerAddress: string;
	let dripsHubClientStub: DripsHubClient;
	let networkStub: StubbedInstance<Network>;
	let signerStub: StubbedInstance<JsonRpcSigner>;
	let providerStub: StubbedInstance<JsonRpcProvider>;
	let addressAppContractStub: StubbedInstance<AddressAppContract>;

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

		addressAppContractStub = stubInterface<AddressAppContract>();

		sinon
			.stub(AddressApp__factory, 'connect')
			.withArgs(utils.chainIdToNetworkPropertiesMap[TEST_CHAIN_ID].CONTRACT_ADDRESS_APP, signerStub)
			.returns(addressAppContractStub);

		dripsHubClientStub = {} as DripsHubClient;

		sinon.stub(DripsHubClient, 'create').resolves(dripsHubClientStub);

		testAddressAppClient = await AddressAppClient.create(providerStub);
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
				await AddressAppClient.create(undefined as unknown as JsonRpcProvider);
			} catch (error) {
				// Assert.
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert.
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it("should throw invalidArgument error when the provider's signer is missing", async () => {
			// Arrange.
			let threw = false;
			providerStub.getSigner.returns(undefined as unknown as JsonRpcSigner);

			try {
				// Act.
				await AddressAppClient.create(providerStub);
			} catch (error) {
				// Assert.
				assert.equal(error.code, DripsErrorCode.INVALID_ARGUMENT);
				threw = true;
			}

			// Assert.
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it("should throw invalidAddress error when the provider's signer has an invalid address", async () => {
			// Arrange.
			let threw = false;
			providerStub.getSigner.returns({ getAddress: () => 'invalid address' } as unknown as JsonRpcSigner);

			try {
				// Act.
				await AddressAppClient.create(providerStub);
			} catch (error) {
				// Assert.
				assert.equal(error.code, DripsErrorCode.INVALID_ADDRESS);
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
				await AddressAppClient.create(providerStub);
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
			assert.equal(await testAddressAppClient.signer.getAddress(), await signerStub.getAddress());
			assert.equal(testAddressAppClient.network.chainId, networkStub.chainId);
			assert.equal(
				await testAddressAppClient.provider.getSigner().getAddress(),
				await providerStub.getSigner().getAddress()
			);
			assert.equal(
				testAddressAppClient.networkProperties,
				utils.chainIdToNetworkPropertiesMap[(await providerStub.getNetwork()).chainId]
			);
			assert.equal(testAddressAppClient.dripsHub, dripsHubClientStub);
		});
	});

	describe('toJson()', () => {
		it('should return the expected JSON string', () => {
			// Act.
			const json = testAddressAppClient.toJsonString();

			// Assert.
			assert.equal(
				json,
				'{"network":{"chainId":5},"networkProperties":{"name":"goerli","CONTRACT_DRIPS_HUB":"0x4FaAB6032dd0264a8e2671F56fd30F69362f31Ad","CONTRACT_ADDRESS_APP":"0x76F457CD4F60c0a634781bfdB8c5318050633A08","CONTRACT_DRIPS_HUB_LOGIC":"0xB79663c5E27C1a2c93aeE2a35b273b0255638267"}}'
			);
		});
	});

	describe('approve()', () => {
		it('should guard against invalid ERC20 address', async () => {
			// Arrange.
			const erc20Address = 'invalid address';
			const guardAgainstInvalidAddressStub = sinon.stub(utils, 'guardAgainstInvalidAddress');
			guardAgainstInvalidAddressStub.throws(DripsErrors.invalidAddress('Error'));

			// Act.
			try {
				await testAddressAppClient.approve(erc20Address);
			} catch (error) {
				// Just for the test to continue.
			}

			// Assert.
			assert(guardAgainstInvalidAddressStub.calledOnceWithExactly(erc20Address));
		});

		it('should call the approve() method of the ERC20 contract', async () => {
			// Arrange.
			const erc20Address = Wallet.createRandom().address;

			const erc20ContractStub = stubConstructor(Contract, erc20Address, utils.erc20Abi, testAddressAppClient.signer);

			sinon
				.stub(utils, 'createErc20Contract')
				.withArgs(erc20Address, testAddressAppClient.signer)
				.returns(erc20ContractStub);

			// Act.
			await testAddressAppClient.approve(erc20Address);

			// Assert.
			assert(
				erc20ContractStub.approve.calledOnceWithExactly(
					testAddressAppClient.networkProperties.CONTRACT_ADDRESS_APP,
					constants.MaxUint256
				),
				`Expected approve() method to be called with different arguments`
			);
		});
	});

	describe('getAllowance()', () => {
		it('should guard against invalid ERC20 address', async () => {
			// Arrange.
			const erc20Address = Wallet.createRandom().address;
			const guardAgainstInvalidAddressStub = sinon.stub(utils, 'guardAgainstInvalidAddress');
			guardAgainstInvalidAddressStub.throws(DripsErrors.invalidAddress('Error'));

			// Act.
			try {
				await testAddressAppClient.getAllowance(erc20Address);
			} catch (error) {
				// Just for the test to continue.
			}

			// Assert.
			assert(guardAgainstInvalidAddressStub.calledOnceWithExactly(erc20Address));
		});

		it('should call the getAllowance() method of the ERC20 contract', async () => {
			// Arrange.
			const erc20Address = Wallet.createRandom().address;

			const erc20ContractStub = stubConstructor(Contract, erc20Address, utils.erc20Abi, testAddressAppClient.signer);

			sinon
				.stub(utils, 'createErc20Contract')
				.withArgs(erc20Address, testAddressAppClient.signer)
				.returns(erc20ContractStub);

			// Act.
			await testAddressAppClient.getAllowance(erc20Address);

			// Assert.
			assert(
				erc20ContractStub.allowance.calledOnceWithExactly(
					await testAddressAppClient.signer.getAddress(),
					testAddressAppClient.networkProperties.CONTRACT_ADDRESS_APP
				),
				`Expected allowance() method to be called with different arguments`
			);
		});
	});

	describe('getUserId()', () => {
		it('should call the calcUserId() method of the AddressApp contract', async () => {
			// Arrange.
			addressAppContractStub.calcUserId
				.withArgs(await testAddressAppClient.signer.getAddress())
				.resolves(BigNumber.from(111));

			// Act.
			await testAddressAppClient.getUserId();

			// Assert.
			assert(
				addressAppContractStub.calcUserId.calledOnceWithExactly(await testAddressAppClient.signer.getAddress()),
				`Expected calcUserId() method to be called with different arguments`
			);
		});
	});

	describe('getUserIdForAddress()', () => {
		it('should guard against invalid user address', async () => {
			// Arrange.
			const userAddress = Wallet.createRandom().address;
			const guardAgainstInvalidAddressStub = sinon.stub(utils, 'guardAgainstInvalidAddress');

			addressAppContractStub.calcUserId.withArgs(userAddress).resolves(BigNumber.from(111));

			// Act.
			await testAddressAppClient.getUserIdForAddress(userAddress);

			// Assert.
			assert(guardAgainstInvalidAddressStub.calledOnceWithExactly(userAddress));
		});

		it('should call the calcUserId() method of the AddressApp contract', async () => {
			// Arrange.
			const userAddress = Wallet.createRandom().address;
			addressAppContractStub.calcUserId.withArgs(userAddress).resolves(BigNumber.from(111));

			// Act.
			await testAddressAppClient.getUserIdForAddress(userAddress);

			// Assert.
			assert(
				addressAppContractStub.calcUserId.calledOnceWithExactly(userAddress),
				`Expected calcUserId() method to be called with different arguments`
			);
		});
	});

	describe('collect()', () => {
		it('should guard against invalid ERC20 address', async () => {
			// Arrange.
			const erc20Address = Wallet.createRandom().address;
			const guardAgainstInvalidAddressStub = sinon.stub(utils, 'guardAgainstInvalidAddress');

			// Act.
			await testAddressAppClient.collect(erc20Address);

			// Assert.
			assert(guardAgainstInvalidAddressStub.calledOnceWithExactly(erc20Address));
		});

		it('should call the collect() method of the AddressApp contract', async () => {
			// Arrange.
			const erc20Address = Wallet.createRandom().address;

			// Act.
			await testAddressAppClient.collect(erc20Address);

			// Assert.
			assert(
				addressAppContractStub.collect.calledOnceWithExactly(
					await testAddressAppClient.signer.getAddress(),
					erc20Address
				),
				`Expected collect() method to be called with different arguments`
			);
		});
	});

	describe('collectForAddress()', () => {
		it('should guard against invalid ERC20 and user address', async () => {
			// Arrange.
			const erc20Address = Wallet.createRandom().address;
			const userAddress = Wallet.createRandom().address;
			const guardAgainstInvalidAddressStub = sinon.stub(utils, 'guardAgainstInvalidAddress');

			// Act.
			await testAddressAppClient.collectForAddress(userAddress, erc20Address);

			// Assert.
			assert(guardAgainstInvalidAddressStub.calledOnceWithExactly(userAddress, erc20Address));
		});

		it('should call the collect() method of the AddressApp contract', async () => {
			// Arrange.
			const userAddress = Wallet.createRandom().address;
			const erc20Address = Wallet.createRandom().address;

			// Act.
			await testAddressAppClient.collectForAddress(userAddress, erc20Address);

			// Assert.
			assert(
				addressAppContractStub.collect.calledOnceWithExactly(userAddress, erc20Address),
				`Expected collect() method to be called with different arguments`
			);
		});
	});

	describe('collectAll()', () => {
		it('should guard against invalid ERC20 address', async () => {
			// Arrange.
			const erc20Address = Wallet.createRandom().address;
			const guardAgainstInvalidAddressStub = sinon.stub(utils, 'guardAgainstInvalidAddress');

			// Act.
			await testAddressAppClient.collectAll(erc20Address, []);

			// Assert.
			assert(guardAgainstInvalidAddressStub.calledOnceWithExactly(erc20Address));
		});

		it('should call the collectAll() method of the AddressApp contract', async () => {
			// Arrange.
			const erc20Address = Wallet.createRandom().address;
			const currentReceivers = [{ userId: 1, weight: 3 }];

			// Act.
			await testAddressAppClient.collectAll(erc20Address, currentReceivers);

			// Assert.
			assert(
				addressAppContractStub.collectAll.calledOnceWithExactly(
					await testAddressAppClient.signer.getAddress(),
					erc20Address,
					currentReceivers
				),
				`Expected collectAll() method to be called with different arguments`
			);
		});
	});

	describe('collectAllForAddress()', () => {
		it('should guard against invalid ERC20 and user address', async () => {
			// Arrange.
			const userAddress = Wallet.createRandom().address;
			const erc20Address = Wallet.createRandom().address;
			const guardAgainstInvalidAddressStub = sinon.stub(utils, 'guardAgainstInvalidAddress');

			// Act.
			await testAddressAppClient.collectAllForAddress(userAddress, erc20Address, []);

			// Assert.
			assert(guardAgainstInvalidAddressStub.calledOnceWithExactly(userAddress, erc20Address));
		});

		it('should call the collectAll() method of the AddressApp contract', async () => {
			// Arrange.
			const userAddress = Wallet.createRandom().address;
			const erc20Address = Wallet.createRandom().address;
			const currentReceivers = [{ userId: 1, weight: 3 }];

			// Act.
			await testAddressAppClient.collectAllForAddress(userAddress, erc20Address, currentReceivers);

			// Assert.
			assert(
				addressAppContractStub.collectAll.calledOnceWithExactly(userAddress, erc20Address, currentReceivers),
				`Expected collectAll() method to be called with different arguments`
			);
		});
	});

	describe('give()', () => {
		it('should guard against invalid ERC20 address', async () => {
			// Arrange.
			const erc20Address = Wallet.createRandom().address;
			const guardAgainstInvalidAddressStub = sinon.stub(utils, 'guardAgainstInvalidAddress');

			// Act.
			await testAddressAppClient.give(1, erc20Address, 1);

			// Assert.
			assert(guardAgainstInvalidAddressStub.calledOnceWithExactly(erc20Address));
		});

		it('should call the give() method of the AddressApp contract', async () => {
			// Arrange.
			const amount = 100;
			const receiverId = 1;
			const erc20Address = Wallet.createRandom().address;

			// Act.
			await testAddressAppClient.give(receiverId, erc20Address, amount);

			// Assert.
			assert(
				addressAppContractStub.give.calledOnceWithExactly(receiverId, erc20Address, amount),
				`Expected give() method to be called with different arguments`
			);
		});
	});

	describe('setSplits()', () => {
		it('should guard against invalid splits receivers', async () => {
			// Arrange.
			const receivers: SplitsReceiverStruct[] = [
				{ userId: 1, weight: 1 },
				{ userId: 2, weight: 2 }
			];

			const guardAgainstInvalidSplitsReceiverStub = sinon.stub(utils, 'guardAgainstInvalidSplitsReceiver');

			// Act.
			await testAddressAppClient.setSplits(receivers);

			// Assert.
			assert(guardAgainstInvalidSplitsReceiverStub.calledOnceWithExactly(...receivers));
		});

		it('should call the setSplits() method of the AddressApp contract', async () => {
			// Arrange.
			const receivers: SplitsReceiverStruct[] = [
				{ userId: 2, weight: 100 },
				{ userId: 1, weight: 1 },
				{ userId: 1, weight: 1 }
			];

			// Act.
			await testAddressAppClient.setSplits(receivers);

			// Assert.
			assert(
				addressAppContractStub.setSplits.calledOnceWithExactly(
					sinon
						.match((r: SplitsReceiverStruct[]) => r.length === 2)
						.and(sinon.match((r: SplitsReceiverStruct[]) => r[0].userId === 1))
						.and(sinon.match((r: SplitsReceiverStruct[]) => r[1].userId === 2))
				),
				`Expected setSplits() method to be called with different arguments`
			);
		});

		it('should sort by the expected order when userID1>userID2', async () => {
			// Arrange.
			const receivers: SplitsReceiverStruct[] = [
				{ userId: 100, weight: 1 },
				{ userId: 1, weight: 100 }
			];

			// Act.
			await testAddressAppClient.setSplits(receivers);

			// Assert.
			assert(
				addressAppContractStub.setSplits.calledOnceWithExactly(
					sinon.match((r: DripsReceiverStruct[]) => r[0].userId < r[1].userId)
				),
				`Expected setSplits() method to be called with different arguments`
			);
		});

		it('should sort by the expected order when userID1<userID2', async () => {
			// Arrange.
			const receivers: SplitsReceiverStruct[] = [
				{ userId: 1, weight: 100 },
				{ userId: 100, weight: 1 }
			];

			// Act.
			await testAddressAppClient.setSplits(receivers);

			// Assert.
			assert(
				addressAppContractStub.setSplits.calledOnceWithExactly(
					sinon.match((r: DripsReceiverStruct[]) => r[0].userId < r[1].userId)
				),
				`Expected setSplits() method to be called with different arguments`
			);
		});

		it('should remove duplicates', async () => {
			// Arrange.
			const receivers: SplitsReceiverStruct[] = [
				{ userId: 1, weight: 100 },
				{ userId: 1, weight: 100 },
				{ userId: 100, weight: 1 }
			];

			// Act.
			await testAddressAppClient.setSplits(receivers);

			// Assert.
			assert(
				addressAppContractStub.setSplits.calledOnceWithExactly(
					sinon.match((r: DripsReceiverStruct[]) => r.length === 2)
				),
				`Expected setSplits() method to be called with different arguments`
			);
		});
	});

	describe('setDrips()', () => {
		it('should guard against invalid ERC20 address', async () => {
			// Arrange.
			const erc20Address = Wallet.createRandom().address;
			const currentReceivers: DripsReceiverStruct[] = [
				{ userId: 3, config: DripsReceiverConfig.create(3, 3, 3).asUint256 }
			];
			const receivers: DripsReceiver[] = [
				{ userId: 2, config: DripsReceiverConfig.create(1, 1, 1) },
				{ userId: 2, config: DripsReceiverConfig.create(1, 1, 1) },
				{ userId: 1, config: DripsReceiverConfig.create(2, 2, 2) }
			];

			const guardAgainstInvalidDripsReceiverStub = sinon.stub(utils, 'guardAgainstInvalidDripsReceiver');

			// Act.
			await testAddressAppClient.setDrips(erc20Address, currentReceivers, 1, receivers);

			// Assert.
			assert(guardAgainstInvalidDripsReceiverStub.calledOnceWithExactly(...receivers));
		});

		it('should guard against invalid drips receivers', async () => {
			// Arrange.
			const erc20Address = Wallet.createRandom().address;
			const currentReceivers: DripsReceiverStruct[] = [
				{ userId: 3, config: DripsReceiverConfig.create(3, 3, 3).asUint256 }
			];
			const receivers: DripsReceiver[] = [
				{ userId: 2, config: DripsReceiverConfig.create(1, 1, 1) },
				{ userId: 2, config: DripsReceiverConfig.create(1, 1, 1) },
				{ userId: 1, config: DripsReceiverConfig.create(2, 2, 2) }
			];

			const guardAgainstInvalidDripsReceiverStub = sinon.stub(utils, 'guardAgainstInvalidDripsReceiver');

			// Act.
			await testAddressAppClient.setDrips(erc20Address, currentReceivers, 1, receivers);

			// Assert.
			assert(guardAgainstInvalidDripsReceiverStub.calledOnceWithExactly(...receivers));
		});

		it('should call the setDrips() method of the AddressApp contract', async () => {
			// Arrange.
			const erc20Address = Wallet.createRandom().address;
			const currentReceivers: DripsReceiverStruct[] = [
				{ userId: 3, config: DripsReceiverConfig.create(3, 3, 3).asUint256 }
			];
			const receivers: DripsReceiver[] = [
				{ userId: 2, config: DripsReceiverConfig.create(1, 1, 1) },
				{ userId: 2, config: DripsReceiverConfig.create(1, 1, 1) },
				{ userId: 1, config: DripsReceiverConfig.create(2, 2, 2) }
			];

			// Act.
			await testAddressAppClient.setDrips(erc20Address, currentReceivers, 1, receivers);

			// Assert.
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
				`Expected setDrips() method to be called with different arguments`
			);
		});

		it('should call the setDrips() method of the AddressApp contract', async () => {
			// Arrange.
			const erc20Address = Wallet.createRandom().address;
			const currentReceivers: DripsReceiverStruct[] = [
				{ userId: 3, config: DripsReceiverConfig.create(3, 3, 3).asUint256 }
			];
			const receivers: DripsReceiver[] = [
				{ userId: 2, config: DripsReceiverConfig.create(1, 1, 1) },
				{ userId: 2, config: DripsReceiverConfig.create(1, 1, 1) },
				{ userId: 1, config: DripsReceiverConfig.create(2, 2, 2) }
			];

			// Act.
			await testAddressAppClient.setDrips(erc20Address, currentReceivers, 1, receivers);

			// Assert.
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
				`Expected setDrips() method to be called with different arguments`
			);
		});

		it('should set default values when required parameters are falsy', async () => {
			// Arrange.
			const erc20Address = Wallet.createRandom().address;
			const receivers: DripsReceiver[] = [
				{ userId: 1, config: DripsReceiverConfig.create(2, 2, 2) },
				{ userId: 2, config: DripsReceiverConfig.create(1, 1, 1) },
				{ userId: 2, config: DripsReceiverConfig.create(1, 1, 1) }
			];

			// Act.
			await testAddressAppClient.setDrips(
				erc20Address,
				undefined as unknown as DripsReceiverStruct[],
				undefined as unknown as number,
				receivers
			);

			// Assert.
			assert(
				addressAppContractStub.setDrips.calledOnceWithExactly(
					erc20Address,
					[],
					0,
					sinon
						.match((r: DripsReceiverStruct[]) => r[0].userId === 1)
						.and(sinon.match((r: DripsReceiverStruct[]) => r[1].userId === 2))
						.and(sinon.match((r: DripsReceiverStruct[]) => r.length === 2))
				),
				`Expected setDrips() method to be called with different arguments`
			);
		});

		it('should sort by the expected order when userID1=userID2 but config1<config2', async () => {
			// Arrange.
			const erc20Address = Wallet.createRandom().address;
			const receivers: DripsReceiver[] = [
				{ userId: 2, config: DripsReceiverConfig.create(1, 1, 1) },
				{ userId: 2, config: DripsReceiverConfig.create(1, 1, 200) }
			];

			// Act.
			await testAddressAppClient.setDrips(
				erc20Address,
				undefined as unknown as DripsReceiverStruct[],
				undefined as unknown as number,
				receivers
			);

			// Assert.
			assert(
				addressAppContractStub.setDrips.calledOnceWithExactly(
					erc20Address,
					[],
					0,
					sinon.match((r: DripsReceiverStruct[]) => r[0].config < r[1].config)
				),
				`Expected setDrips() method to be called with different arguments`
			);
		});

		it('should sort by the expected order when userID1=userID2 but config1>config2', async () => {
			// Arrange.
			const erc20Address = Wallet.createRandom().address;
			const receivers: DripsReceiver[] = [
				{ userId: 2, config: DripsReceiverConfig.create(1, 1, 200) },
				{ userId: 2, config: DripsReceiverConfig.create(1, 1, 1) }
			];

			// Act.
			await testAddressAppClient.setDrips(
				erc20Address,
				undefined as unknown as DripsReceiverStruct[],
				undefined as unknown as number,
				receivers
			);

			// Assert.
			assert(
				addressAppContractStub.setDrips.calledOnceWithExactly(
					erc20Address,
					[],
					0,
					sinon.match((r: DripsReceiverStruct[]) => r[0].config < r[1].config)
				),
				`Expected setDrips() method to be called with different arguments`
			);
		});

		it('should remove duplicates', async () => {
			// Arrange.
			const erc20Address = Wallet.createRandom().address;
			const receivers: DripsReceiver[] = [
				{ userId: 2, config: DripsReceiverConfig.create(1, 1, 2) },
				{ userId: 2, config: DripsReceiverConfig.create(1, 1, 1) },
				{ userId: 2, config: DripsReceiverConfig.create(1, 1, 1) },
				{ userId: 2, config: DripsReceiverConfig.create(2, 1, 1) },
				{ userId: 2, config: DripsReceiverConfig.create(2, 1, 2) },
				{ userId: 2, config: DripsReceiverConfig.create(2, 1, 2) }
			];

			// Act.
			await testAddressAppClient.setDrips(
				erc20Address,
				undefined as unknown as DripsReceiverStruct[],
				undefined as unknown as number,
				receivers
			);

			// Assert.
			assert(
				addressAppContractStub.setDrips.calledOnceWithExactly(
					erc20Address,
					[],
					0,
					sinon
						.match((r: DripsReceiverStruct[]) => r.length === 4)
						.and(sinon.match((r: DripsReceiverStruct[]) => r[0].userId))
				),
				`Expected setDrips() method to be called with different arguments`
			);
		});

		it('should sort by the expected order when userID1>userID2', async () => {
			// Arrange.
			const erc20Address = Wallet.createRandom().address;
			const receivers: DripsReceiver[] = [
				{ userId: 100, config: DripsReceiverConfig.create(100, 1, 1) },
				{ userId: 1, config: DripsReceiverConfig.create(1, 1, 200) }
			];

			// Act.
			await testAddressAppClient.setDrips(
				erc20Address,
				undefined as unknown as DripsReceiverStruct[],
				undefined as unknown as number,
				receivers
			);

			// Assert.
			assert(
				addressAppContractStub.setDrips.calledOnceWithExactly(
					erc20Address,
					[],
					0,
					sinon.match((r: DripsReceiverStruct[]) => r[0].userId < r[1].userId)
				),
				`Expected setDrips() method to be called with different arguments`
			);
		});

		it('should sort by the expected order when userID1<userID2', async () => {
			// Arrange.
			const erc20Address = Wallet.createRandom().address;
			const receivers: DripsReceiver[] = [
				{ userId: 1, config: DripsReceiverConfig.create(1, 1, 200) },
				{ userId: 100, config: DripsReceiverConfig.create(100, 1, 1) }
			];

			// Act.
			await testAddressAppClient.setDrips(
				erc20Address,
				undefined as unknown as DripsReceiverStruct[],
				undefined as unknown as number,
				receivers
			);

			// Assert.
			assert(
				addressAppContractStub.setDrips.calledOnceWithExactly(
					erc20Address,
					[],
					0,
					sinon.match((r: DripsReceiverStruct[]) => r[0].userId < r[1].userId)
				),
				`Expected setDrips() method to be called with different arguments`
			);
		});
	});
});
