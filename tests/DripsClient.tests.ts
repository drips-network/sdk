import type { ContractTransaction, providers, Signer } from 'ethers';
import { BigNumber, constants, Wallet } from 'ethers';
import type { StubbedInstance } from 'ts-sinon';
import sinon, { stubInterface } from 'ts-sinon';
import { assert } from 'chai';
import type { Provider } from '@ethersproject/providers';
import type { Dai, DaiDripsHub } from '../contracts';
import { DaiDripsHub__factory, Dai__factory } from '../contracts';
import type { DripsClientConfig } from '../src/dripsclient';
import DripsClient from '../src/DripsClient';
import { chainIdToNetworkPropertiesMap } from '../src/NetworkProperties';
import * as utils from '../src/utils';
import { DripsErrorCode } from '../src/DripsError';

describe('DripsClient', () => {
	const CHAIN_ID = 80001;

	let daiContractStub: StubbedInstance<Dai>;
	let providerStub: StubbedInstance<Provider>;
	let hubContractStub: StubbedInstance<DaiDripsHub>;
	let signerStub: StubbedInstance<providers.JsonRpcSigner>;

	let dripsClient: DripsClient;

	// Base "Arrange" step.
	beforeEach(async () => {
		// Setup DripsClient dependency stubs.
		signerStub = stubInterface<providers.JsonRpcSigner>();
		signerStub.getAddress.resolves(Wallet.createRandom().address);

		providerStub = stubInterface<Provider>();
		providerStub.getNetwork.resolves({ chainId: CHAIN_ID } as providers.Network);

		// Setup Dai contract stub.
		daiContractStub = stubInterface<Dai>();
		daiContractStub.connect.withArgs(signerStub).returns(daiContractStub);
		sinon
			.stub(Dai__factory, 'connect')
			.withArgs(chainIdToNetworkPropertiesMap[CHAIN_ID].CONTRACT_DAI, providerStub)
			.returns(daiContractStub);

		// Setup DaiDripsHub contract stub.
		hubContractStub = stubInterface<DaiDripsHub>();
		hubContractStub.connect.withArgs(signerStub).returns(hubContractStub);
		sinon
			.stub(DaiDripsHub__factory, 'connect')
			.withArgs(chainIdToNetworkPropertiesMap[CHAIN_ID].CONTRACT_DRIPS_HUB, providerStub)
			.returns(hubContractStub);

		// Create a DripsClient instance (system under test).
		dripsClient = await DripsClient.create({
			provider: providerStub,
			signer: signerStub
		});
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('create()', () => {
		it('should throw invalidConfiguration error when provider is missing', async () => {
			// Arrange.
			let threw = false;

			try {
				// Act.
				await DripsClient.create({ signer: signerStub as Signer } as DripsClientConfig);
			} catch (error) {
				// Assert.
				assert.equal(error.code, DripsErrorCode.INVALID_CONFIGURATION);
				threw = true;
			}

			// Assert.
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it('should throw invalidConfiguration error when signer is missing', async () => {
			// Arrange.
			let threw = false;

			try {
				// Act.
				await DripsClient.create({ provider: providerStub as Provider } as DripsClientConfig);
			} catch (error) {
				// Assert.
				assert.equal(error.code, DripsErrorCode.INVALID_CONFIGURATION);
				threw = true;
			}

			// Assert.
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it('should throw invalidAddress error when signer address is not valid', async () => {
			// Arrange.
			let threw = false;
			const invalidAddress = 'invalid address';
			signerStub.getAddress.resolves(invalidAddress);

			try {
				// Act.
				await DripsClient.create({ provider: providerStub, signer: signerStub });
			} catch (error) {
				// Assert.
				assert.equal(error.code, DripsErrorCode.INVALID_ADDRESS);
				threw = true;
			}

			// Assert.
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it('should throw invalidConfiguration error when chain ID is not supported', async () => {
			// Arrange.
			let threw = false;
			providerStub.getNetwork.resolves({ chainId: CHAIN_ID + 1 } as providers.Network);

			try {
				// Act.
				await DripsClient.create({ provider: providerStub, signer: signerStub });
			} catch (error) {
				// Assert.
				assert.equal(error.code, DripsErrorCode.INVALID_CONFIGURATION);
				threw = true;
			}

			// Assert.
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it('should create a fully initialized client instance', async () => {
			// Assert.
			assert.equal(dripsClient.signer, signerStub);
			assert.equal(dripsClient.network, await providerStub.getNetwork());
			assert.equal(dripsClient.provider, providerStub);
			assert.equal(
				dripsClient.networkProperties,
				chainIdToNetworkPropertiesMap[(await providerStub.getNetwork()).chainId]
			);
			assert.equal(
				dripsClient.networkProperties,
				chainIdToNetworkPropertiesMap[(await providerStub.getNetwork()).chainId]
			);
			assert.equal(
				chainIdToNetworkPropertiesMap[CHAIN_ID],
				chainIdToNetworkPropertiesMap[(await providerStub.getNetwork()).chainId]
			);
		});
	});

	describe('approveDAIContract()', () => {
		it('should delegate the call to the approve() contract method', async () => {
			// Arrange.
			const tx = {} as ContractTransaction;
			daiContractStub.approve
				.withArgs(chainIdToNetworkPropertiesMap[CHAIN_ID].CONTRACT_DRIPS_HUB, constants.MaxUint256)
				.resolves(tx);

			// Act.
			const response = await dripsClient.approveDAIContract();

			// Assert.
			assert.equal(response, tx);
			assert(
				daiContractStub.approve.calledOnceWithExactly(
					chainIdToNetworkPropertiesMap[CHAIN_ID].CONTRACT_DRIPS_HUB,
					constants.MaxUint256
				),
				`Expected approve() method to be called with different arguments`
			);
		});
	});

	describe('updateUserDrips()', async () => {
		it('should validate Drips', async () => {
			// Arrange.
			const payload = {
				lastUpdate: 2,
				lastBalance: 22,
				currentReceivers: [{ receiver: Wallet.createRandom().address, amtPerSec: 3 }],
				balanceDelta: 22,
				newReceivers: [{ receiver: Wallet.createRandom().address, amtPerSec: 3 }]
			};

			const validateDripsStub = sinon.stub(utils, 'validateDrips');

			hubContractStub['setDrips(uint64,uint128,(address,uint128)[],int128,(address,uint128)[])']
				.withArgs(
					payload.lastBalance,
					payload.lastBalance,
					payload.currentReceivers,
					payload.balanceDelta,
					payload.newReceivers
				)
				.resolves({} as ContractTransaction);

			// Act.
			await dripsClient.updateUserDrips(
				payload.lastBalance,
				payload.lastBalance,
				payload.currentReceivers,
				payload.balanceDelta,
				payload.newReceivers
			);

			// Assert.
			assert(
				validateDripsStub.calledOnceWithExactly(payload.newReceivers),
				`Expected validateSplits() method to be called with different arguments`
			);
		});

		it('should delegate the call to the setDrips() contract method', async () => {
			// Arrange.
			const payload = {
				lastUpdate: 2,
				lastBalance: 22,
				currentReceivers: [{ receiver: Wallet.createRandom().address, amtPerSec: 3 }],
				balanceDelta: 22,
				newReceivers: [{ receiver: Wallet.createRandom().address, amtPerSec: 3 }]
			};

			hubContractStub['setDrips(uint64,uint128,(address,uint128)[],int128,(address,uint128)[])']
				.withArgs(
					payload.lastBalance,
					payload.lastBalance,
					payload.currentReceivers,
					payload.balanceDelta,
					payload.newReceivers
				)
				.resolves({} as ContractTransaction);

			// Act.
			await dripsClient.updateUserDrips(
				payload.lastBalance,
				payload.lastBalance,
				payload.currentReceivers,
				payload.balanceDelta,
				payload.newReceivers
			);

			// Assert.
			assert(
				hubContractStub[
					'setDrips(uint64,uint128,(address,uint128)[],int128,(address,uint128)[])'
				].calledOnceWithExactly(
					payload.lastBalance,
					payload.lastBalance,
					payload.currentReceivers,
					payload.balanceDelta,
					payload.newReceivers
				),
				`Expected setDrips() method to be called with different arguments`
			);
		});
	});

	describe('updateSubAccountDrips()', async () => {
		it('should validate Drips', async () => {
			// Arrange.
			const payload = {
				account: 1,
				lastUpdate: 2,
				lastBalance: 22,
				currentReceivers: [{ receiver: Wallet.createRandom().address, amtPerSec: 3 }],
				balanceDelta: 22,
				newReceivers: [{ receiver: Wallet.createRandom().address, amtPerSec: 3 }]
			};

			const validateDripsStub = sinon.stub(utils, 'validateDrips');

			hubContractStub['setDrips(uint256,uint64,uint128,(address,uint128)[],int128,(address,uint128)[])']
				.withArgs(
					payload.account,
					payload.lastBalance,
					payload.lastBalance,
					payload.currentReceivers,
					payload.balanceDelta,
					payload.newReceivers
				)
				.resolves({} as ContractTransaction);

			// Act.
			await dripsClient.updateSubAccountDrips(
				payload.account,
				payload.lastBalance,
				payload.lastBalance,
				payload.currentReceivers,
				payload.balanceDelta,
				payload.newReceivers
			);

			// Assert.
			assert(
				validateDripsStub.calledOnceWithExactly(payload.newReceivers),
				`Expected validateSplits() method to be called with different arguments`
			);
		});

		it('should delegate the call to the setDrips() contract method', async () => {
			// Arrange.
			const payload = {
				account: 1,
				lastUpdate: 2,
				lastBalance: 22,
				currentReceivers: [{ receiver: Wallet.createRandom().address, amtPerSec: 3 }],
				balanceDelta: 22,
				newReceivers: [{ receiver: Wallet.createRandom().address, amtPerSec: 3 }]
			};

			hubContractStub['setDrips(uint256,uint64,uint128,(address,uint128)[],int128,(address,uint128)[])']
				.withArgs(
					payload.account,
					payload.lastBalance,
					payload.lastBalance,
					payload.currentReceivers,
					payload.balanceDelta,
					payload.newReceivers
				)
				.resolves({} as ContractTransaction);

			// Act.
			await dripsClient.updateSubAccountDrips(
				payload.account,
				payload.lastBalance,
				payload.lastBalance,
				payload.currentReceivers,
				payload.balanceDelta,
				payload.newReceivers
			);

			// Assert.
			assert(
				hubContractStub[
					'setDrips(uint256,uint64,uint128,(address,uint128)[],int128,(address,uint128)[])'
				].calledOnceWithExactly(
					payload.account,
					payload.lastBalance,
					payload.lastBalance,
					payload.currentReceivers,
					payload.balanceDelta,
					payload.newReceivers
				),
				`Expected setDrips() method to be called with different arguments`
			);
		});
	});

	describe('updateUserSplits()', async () => {
		it('should validate Drips', async () => {
			// Arrange.
			const payload = {
				lastUpdate: 2,
				lastBalance: 22,
				currentReceivers: [{ receiver: Wallet.createRandom().address, weight: 1 }],
				balanceDelta: 22,
				newReceivers: [{ receiver: Wallet.createRandom().address, weight: 3 }]
			};

			const validateSlitsStub = sinon.stub(utils, 'validateSplits');

			hubContractStub.setSplits
				.withArgs(payload.currentReceivers, payload.newReceivers)
				.resolves({} as ContractTransaction);

			// Act.
			await dripsClient.updateUserSplits(payload.currentReceivers, payload.newReceivers);

			// Assert.
			assert(
				validateSlitsStub.calledOnceWithExactly(payload.newReceivers),
				'Expected validateSplits() method to be called with different arguments'
			);
		});

		it('should delegate the call to the setSplits() contract method', async () => {
			// Arrange.
			const payload = {
				lastUpdate: 2,
				lastBalance: 22,
				currentReceivers: [{ receiver: Wallet.createRandom().address, weight: 3 }],
				balanceDelta: 22,
				newReceivers: [{ receiver: Wallet.createRandom().address, weight: 3 }]
			};

			hubContractStub.setSplits
				.withArgs(payload.currentReceivers, payload.newReceivers)
				.resolves({} as ContractTransaction);

			// Act.
			await dripsClient.updateUserSplits(payload.currentReceivers, payload.newReceivers);

			// Assert.
			assert(
				hubContractStub.setSplits.calledOnceWithExactly(payload.currentReceivers, payload.newReceivers),
				'Expected setSplits() method to be called with different arguments'
			);
		});
	});

	describe('giveFromUser()', async () => {
		it('should throw if receiver address is not a valid', async () => {
			// Arrange.
			const payload = {
				receiver: 'invalid address',
				amount: 10
			};

			let threw = false;

			try {
				// Act.
				await dripsClient.giveFromUser(payload.receiver, payload.amount);
			} catch (error) {
				// Assert.
				assert.equal(error.code, DripsErrorCode.INVALID_ADDRESS);
				threw = true;
			}
			// Assert.
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it('should delegate the call to the give() contract method', async () => {
			// Arrange.
			const payload = {
				receiver: Wallet.createRandom().address,
				amount: 10
			};

			hubContractStub['give(address,uint128)']
				.withArgs(payload.receiver, payload.amount)
				.resolves({} as ContractTransaction);

			// Act.
			await dripsClient.giveFromUser(payload.receiver, payload.amount);

			// Assert.
			assert(
				hubContractStub['give(address,uint128)'].calledOnceWithExactly(payload.receiver, payload.amount),
				'Expected giveFromUser() method to be called with different arguments'
			);
		});
	});

	describe('giveFromAccount()', async () => {
		it('should throw invalidAddress error when receiver address is not valid', async () => {
			// Arrange.
			const payload = {
				account: 1,
				receiver: 'invalid address',
				amount: 10
			};

			let threw = false;

			try {
				// Act.
				await dripsClient.giveFromAccount(payload.account, payload.receiver, payload.amount);
			} catch (error) {
				// Assert.
				assert.equal(error.code, DripsErrorCode.INVALID_ADDRESS);
				threw = true;
			}
			// Assert.
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it('should delegate the call to the give() contract method', async () => {
			// Arrange.
			const payload = {
				account: 1,
				receiver: Wallet.createRandom().address,
				amount: 10
			};

			hubContractStub['give(address,uint128)']
				.withArgs(payload.receiver, payload.amount)
				.resolves({} as ContractTransaction);

			// Act.
			await dripsClient.giveFromAccount(payload.account, payload.receiver, payload.amount);

			// Assert.
			assert(
				hubContractStub['give(uint256,address,uint128)'].calledOnceWithExactly(
					payload.account,
					payload.receiver,
					payload.amount
				),
				'Expected giveFromAccount() method to be called with different arguments'
			);
		});
	});

	describe('getAllowance()', () => {
		it('should delegate the call to the allowance() contract method', async () => {
			// Arrange.
			const expectedAllowance = BigNumber.from(1000);

			daiContractStub.allowance
				.withArgs(await dripsClient.signer.getAddress(), chainIdToNetworkPropertiesMap[CHAIN_ID].CONTRACT_DRIPS_HUB)
				.resolves(expectedAllowance);

			// Act.
			const allowance = await dripsClient.getAllowance();

			// Assert.
			assert.equal(allowance, expectedAllowance);
			assert(
				daiContractStub.allowance.calledOnceWithExactly(
					await dripsClient.signer.getAddress(),
					chainIdToNetworkPropertiesMap[CHAIN_ID].CONTRACT_DRIPS_HUB
				),
				'Expected allowance() method to be called with different arguments'
			);
		});
	});

	describe('getAmountCollectableWithSplits()', () => {
		it('should throw invalidAddress error when address is not valid', async () => {
			// Arrange.
			let threw = false;

			try {
				// Act.
				await dripsClient.getAmountCollectableWithSplits('invalid address', [
					{ receiver: Wallet.createRandom().address, weight: 1 }
				]);
			} catch (error) {
				// Assert.
				assert.equal(error.code, DripsErrorCode.INVALID_ADDRESS);
				threw = true;
			}
			// Assert.
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it('should delegate the call to the getAmountCollectableWithSplits() contract method', async () => {
			// Arrange.
			const { address } = Wallet.createRandom();
			const currentSplits = [
				{
					receiver: Wallet.createRandom().address,
					weight: 1
				}
			];
			const expectedAmountCollectable = [BigNumber.from(1000), BigNumber.from(2000)] as [BigNumber, BigNumber] & {
				collected: BigNumber;
				split: BigNumber;
			};

			hubContractStub.collectable.withArgs(address.toLowerCase(), currentSplits).resolves(expectedAmountCollectable);

			// Act.
			const collectable = await dripsClient.getAmountCollectableWithSplits(address, currentSplits);

			// Assert.
			assert.equal(collectable, expectedAmountCollectable);
			assert(
				hubContractStub.collectable.calledOnceWithExactly(address.toLowerCase(), currentSplits),
				'Expected collectable() method to be called with different arguments'
			);
		});
	});

	describe('collect()', async () => {
		it('should delegate the call to the collect() contract method', async () => {
			// Arrange.
			const splits = [{ receiver: '', weight: 1 }];
			const signerAddress = await dripsClient.signer.getAddress();

			hubContractStub.collect.withArgs(signerAddress, splits).resolves({} as ContractTransaction);

			// Act.
			await dripsClient.collect(splits);

			// Assert.
			assert(
				hubContractStub.collect.calledOnceWithExactly(signerAddress.toLowerCase(), splits),
				'Expected collect() method to be called with different arguments'
			);
		});
	});
});
