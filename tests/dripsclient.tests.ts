import { Web3Provider } from '@ethersproject/providers';
import { BigNumber, ContractTransaction, ethers, providers, constants } from 'ethers';
import sinon, { StubbedInstance, stubInterface } from 'ts-sinon';
import { assert } from 'chai';
import { Dai, DaiDripsHub, DaiDripsHub__factory, Dai__factory } from '../contracts';
import DripsClient from '../src/dripsclient';
import { getContractsForNetwork } from '../src/contracts';
import * as utils from '../src/utils';

describe('DripsClient', () => {
	const NETWORK = 'rinkeby';

	let daiContractStub: StubbedInstance<Dai>;
	let providerStub: StubbedInstance<Web3Provider>;
	let hubContractStub: StubbedInstance<DaiDripsHub>;
	let signerStub: StubbedInstance<providers.JsonRpcSigner>;

	let dripsClient: DripsClient;

	// Base "Arrange" step.
	beforeEach(() => {
		// Setup DripsClient dependency stubs.
		signerStub = stubInterface<providers.JsonRpcSigner>();
		signerStub.getAddress.resolves(ethers.Wallet.createRandom().address);

		providerStub = stubInterface<Web3Provider>();
		providerStub.getSigner.returns(signerStub);
		providerStub.getNetwork.resolves({ chainId: 4 } as providers.Network);

		// Setup Dai contract stub.
		daiContractStub = stubInterface<Dai>();
		daiContractStub.connect.withArgs(signerStub).returns(daiContractStub);
		sinon
			.stub(Dai__factory, 'connect')
			.withArgs(getContractsForNetwork(NETWORK).CONTRACT_DAI, providerStub)
			.returns(daiContractStub);

		// Setup DaiDripsHub contract stub.
		hubContractStub = stubInterface<DaiDripsHub>();
		hubContractStub.connect.withArgs(signerStub).returns(hubContractStub);
		sinon
			.stub(DaiDripsHub__factory, 'connect')
			.withArgs(getContractsForNetwork(NETWORK).CONTRACT_DRIPS_HUB, providerStub)
			.returns(hubContractStub);

		// Create a DripsClient instance (system under test).
		dripsClient = new DripsClient(providerStub, NETWORK);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('constructor()', () => {
		it('should set provider, Dai contract and DaiDripsHub contract properties', () => {
			// Assert.
			assert.isUndefined(dripsClient.signer);
			assert.isUndefined(dripsClient.address);
			assert.isUndefined(dripsClient.networkId);
			assert.equal(dripsClient.provider, providerStub);
			assert.equal(dripsClient.daiContract, daiContractStub);
			assert.equal(dripsClient.hubContract, hubContractStub);
		});
	});

	describe('connect()', () => {
		it('should set the signer, address and network ID properties', async () => {
			// Act.
			await dripsClient.connect();

			// Assert.
			assert.equal(dripsClient.signer, providerStub.getSigner());
			assert.equal(dripsClient.address, (await providerStub.getSigner().getAddress()).toLowerCase());
			assert.equal(dripsClient.networkId, (await providerStub.getNetwork()).chainId);
		});

		it('should disconnect when an exception is thrown', async () => {
			// Arrange.
			const error = new Error('Cannot get signer');
			providerStub.getSigner.throws(error);

			let threw = false;

			try {
				// Act.
				await dripsClient.connect();
			} catch (ex) {
				// Assert
				assert.equal(ex, error);
				threw = true;
			}

			// Assert
			assert.isNull(dripsClient.signer);
			assert.isNull(dripsClient.address);
			assert.isNull(dripsClient.networkId);
			assert.isTrue(threw, "Expected to throw but it didn't");
		});
	});

	describe('disconnect()', () => {
		it('should set the signer, address and network ID properties to null values', async () => {
			// Arrange.
			await dripsClient.connect();

			// Act.
			dripsClient.disconnect();

			// Assert.
			assert.isNull(dripsClient.signer);
			assert.isNull(dripsClient.address);
			assert.isNull(dripsClient.networkId);
		});
	});

	describe('connected', () => {
		it('should return true when network ID is set', async () => {
			// Arrange.
			dripsClient.networkId = 4;

			// Assert
			assert.isTrue(dripsClient.connected);
		});

		it('should return false when network ID is falsy', () => {
			// Arrange.
			dripsClient.networkId = undefined;

			// Assert
			assert.isFalse(dripsClient.connected);
		});
	});

	describe('approveDAIContract()', () => {
		it('should throw if signer property is falsy', async () => {
			// Arrange.
			dripsClient.signer = undefined;

			let threw = false;

			try {
				// Act.
				await dripsClient.approveDAIContract();
			} catch (error) {
				// Assert
				assert.typeOf(error, 'Error');
				assert.equal('DripsClient must be connected before approving DAI', error.message);
				threw = true;
			}
			// Assert
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it('should delegate the call to the approve() contract method', async () => {
			// Arrange.
			const tx = {} as ContractTransaction;
			daiContractStub.approve
				.withArgs(getContractsForNetwork(NETWORK).CONTRACT_DRIPS_HUB, constants.MaxUint256)
				.resolves(tx);

			await dripsClient.connect();

			// Act.
			const response = await dripsClient.approveDAIContract();

			// Assert.
			assert.equal(response, tx);
			assert(
				daiContractStub.approve.calledOnceWithExactly(
					getContractsForNetwork(NETWORK).CONTRACT_DRIPS_HUB,
					constants.MaxUint256
				),
				`Expected approve() method to be called with different arguments`
			);
		});
	});

	describe('updateUserDrips()', async () => {
		it('should throw if signer property is falsy', async () => {
			// Arrange.
			dripsClient.signer = undefined;

			const payload = {
				lastUpdate: 2,
				lastBalance: 22,
				currentReceivers: [{ receiver: ethers.Wallet.createRandom().address, amtPerSec: 3 }],
				balanceDelta: 22,
				newReceivers: [{ receiver: ethers.Wallet.createRandom().address, amtPerSec: 3 }]
			};

			let threw = false;

			try {
				// Act.
				await dripsClient.updateUserDrips(
					payload.lastBalance,
					payload.lastBalance,
					payload.currentReceivers,
					payload.balanceDelta,
					payload.newReceivers
				);
			} catch (error) {
				// Assert.
				assert.typeOf(error, 'Error');
				assert.equal('Not connected to wallet', error.message);
				threw = true;
			}
			// Assert
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it('should validate Drips', async () => {
			// Arrange.
			const payload = {
				lastUpdate: 2,
				lastBalance: 22,
				currentReceivers: [{ receiver: ethers.Wallet.createRandom().address, amtPerSec: 3 }],
				balanceDelta: 22,
				newReceivers: [{ receiver: ethers.Wallet.createRandom().address, amtPerSec: 3 }]
			};

			const validateDripsStub = sinon.stub(utils, 'validateDrips');

			await dripsClient.connect();

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
			await dripsClient.connect();

			const payload = {
				lastUpdate: 2,
				lastBalance: 22,
				currentReceivers: [{ receiver: ethers.Wallet.createRandom().address, amtPerSec: 3 }],
				balanceDelta: 22,
				newReceivers: [{ receiver: ethers.Wallet.createRandom().address, amtPerSec: 3 }]
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
		it('should throw if signer property is falsy', async () => {
			// Arrange.
			dripsClient.signer = undefined;

			const payload = {
				account: 1,
				lastUpdate: 2,
				lastBalance: 22,
				currentReceivers: [{ receiver: ethers.Wallet.createRandom().address, amtPerSec: 3 }],
				balanceDelta: 22,
				newReceivers: [{ receiver: ethers.Wallet.createRandom().address, amtPerSec: 3 }]
			};

			let threw = false;

			try {
				// Act.
				await dripsClient.updateSubAccountDrips(
					payload.account,
					payload.lastBalance,
					payload.lastBalance,
					payload.currentReceivers,
					payload.balanceDelta,
					payload.newReceivers
				);
			} catch (error) {
				// Assert.
				assert.typeOf(error, 'Error');
				assert.equal('Not connected to wallet', error.message);
				threw = true;
			}
			// Assert
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it('should validate Drips', async () => {
			// Arrange.
			const payload = {
				account: 1,
				lastUpdate: 2,
				lastBalance: 22,
				currentReceivers: [{ receiver: ethers.Wallet.createRandom().address, amtPerSec: 3 }],
				balanceDelta: 22,
				newReceivers: [{ receiver: ethers.Wallet.createRandom().address, amtPerSec: 3 }]
			};

			const validateDripsStub = sinon.stub(utils, 'validateDrips');

			await dripsClient.connect();

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
			await dripsClient.connect();

			const payload = {
				account: 1,
				lastUpdate: 2,
				lastBalance: 22,
				currentReceivers: [{ receiver: ethers.Wallet.createRandom().address, amtPerSec: 3 }],
				balanceDelta: 22,
				newReceivers: [{ receiver: ethers.Wallet.createRandom().address, amtPerSec: 3 }]
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
		it('should throw if signer property is falsy', async () => {
			// Arrange.
			dripsClient.signer = undefined;

			const payload = {
				lastUpdate: 2,
				lastBalance: 22,
				currentReceivers: [{ receiver: ethers.Wallet.createRandom().address, weight: 3 }],
				balanceDelta: 22,
				newReceivers: [{ receiver: ethers.Wallet.createRandom().address, weight: 3 }]
			};

			let threw = false;

			try {
				// Act.
				await dripsClient.updateUserSplits(payload.currentReceivers, payload.newReceivers);
			} catch (error) {
				// Assert.
				assert.typeOf(error, 'Error');
				assert.equal('Not connected to wallet', error.message);
				threw = true;
			}
			// Assert.
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it('should validate Drips', async () => {
			// Arrange.
			const payload = {
				lastUpdate: 2,
				lastBalance: 22,
				currentReceivers: [{ receiver: ethers.Wallet.createRandom().address, weight: 1 }],
				balanceDelta: 22,
				newReceivers: [{ receiver: ethers.Wallet.createRandom().address, weight: 3 }]
			};

			const validateSlitsStub = sinon.stub(utils, 'validateSplits');

			await dripsClient.connect();

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
			await dripsClient.connect();

			const payload = {
				lastUpdate: 2,
				lastBalance: 22,
				currentReceivers: [{ receiver: ethers.Wallet.createRandom().address, weight: 3 }],
				balanceDelta: 22,
				newReceivers: [{ receiver: ethers.Wallet.createRandom().address, weight: 3 }]
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
		it('should throw if signer property is falsy', async () => {
			// Arrange.
			dripsClient.signer = undefined;

			const payload = {
				receiver: ethers.Wallet.createRandom().address,
				amount: 10
			};

			let threw = false;

			try {
				// Act.
				await dripsClient.giveFromUser(payload.receiver, payload.amount);
			} catch (error) {
				// Assert.
				assert.typeOf(error, 'Error');
				assert.equal('Not connected to wallet', error.message);
				threw = true;
			}
			// Assert.
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it('should throw if receiver is not a valid Etherium address', async () => {
			// Arrange.
			await dripsClient.connect();

			const payload = {
				receiver: 'invalid Etherium address',
				amount: 10
			};

			let threw = false;

			try {
				// Act.
				await dripsClient.giveFromUser(payload.receiver, payload.amount);
			} catch (error) {
				// Assert.
				assert.typeOf(error, 'Error');
				assert.equal(`Invalid recipient: "${payload.receiver}" is not an Ethereum address`, error.message);
				threw = true;
			}
			// Assert.
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it('should delegate the call to the give() contract method', async () => {
			// Arrange.
			await dripsClient.connect();

			const payload = {
				receiver: ethers.Wallet.createRandom().address,
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
		it('should throw if signer property is falsy', async () => {
			// Arrange.
			dripsClient.signer = undefined;

			const payload = {
				account: 1,
				receiver: ethers.Wallet.createRandom().address,
				amount: 10
			};

			let threw = false;

			try {
				// Act.
				await dripsClient.giveFromAccount(payload.account, payload.receiver, payload.amount);
			} catch (error) {
				// Assert.
				assert.typeOf(error, 'Error');
				assert.equal('Not connected to wallet', error.message);
				threw = true;
			}
			// Assert.
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it('should throw if receiver is not a valid Etherium address', async () => {
			// Arrange.
			await dripsClient.connect();

			const payload = {
				account: 1,
				receiver: 'invalid Etherium address',
				amount: 10
			};

			let threw = false;

			try {
				// Act.
				await dripsClient.giveFromAccount(payload.account, payload.receiver, payload.amount);
			} catch (error) {
				// Assert.
				assert.typeOf(error, 'Error');
				assert.equal(`Invalid recipient: "${payload.receiver}" is not an Ethereum address`, error.message);
				threw = true;
			}
			// Assert.
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it('should delegate the call to the give() contract method', async () => {
			// Arrange.
			await dripsClient.connect();

			const payload = {
				account: 1,
				receiver: ethers.Wallet.createRandom().address,
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
		it('should throw when address property is falsy', async () => {
			// Arrange.
			dripsClient.address = undefined;

			let threw = false;
			try {
				// Act.
				await dripsClient.getAllowance();
			} catch (error) {
				// Assert.
				assert.typeOf(error, 'Error');
				assert.equal('Must call connect() before calling getAllowance()', error.message);
				threw = true;
			}
			// Assert.
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it('should delegate the call to the allowance() contract method', async () => {
			// Arrange.
			await dripsClient.connect();
			const expectedAllowance = BigNumber.from(1000);

			daiContractStub.allowance
				.withArgs(dripsClient.address, getContractsForNetwork(NETWORK).CONTRACT_DRIPS_HUB)
				.resolves(expectedAllowance);

			// Act.
			const allowance = await dripsClient.getAllowance();

			// Assert.
			assert.equal(allowance, expectedAllowance);
			assert(
				daiContractStub.allowance.calledOnceWithExactly(
					dripsClient.address,
					getContractsForNetwork(NETWORK).CONTRACT_DRIPS_HUB
				),
				'Expected allowance() method to be called with different arguments'
			);
		});
	});

	describe('getAmountCollectableWithSplits()', () => {
		it('should throw when address property is falsy', async () => {
			// Arrange.
			dripsClient.provider = undefined;

			let threw = false;

			try {
				// Act.
				await dripsClient.getAmountCollectableWithSplits(ethers.Wallet.createRandom().address, [
					{ receiver: ethers.Wallet.createRandom().address, weight: 1 }
				]);
			} catch (error) {
				// Assert.
				assert.typeOf(error, 'Error');
				assert.equal('Must have a provider defined to query the collectable balance', error.message);
				threw = true;
			}
			// Assert.
			assert.isTrue(threw, "Expected to throw but it didn't");
		});

		it('should delegate the call to the allowance() contract method', async () => {
			// Arrange.
			const { address } = ethers.Wallet.createRandom();
			const currentSplits = [
				{
					receiver: ethers.Wallet.createRandom().address,
					weight: 1
				}
			];
			const expectedAmountCollectable = [BigNumber.from(1000), BigNumber.from(2000)] as [BigNumber, BigNumber] & {
				collected: BigNumber;
				split: BigNumber;
			};

			hubContractStub.collectable.withArgs(address, currentSplits).resolves(expectedAmountCollectable);

			await dripsClient.connect();

			// Act.
			const collectable = await dripsClient.getAmountCollectableWithSplits(address, currentSplits);

			// Assert.
			assert.equal(collectable, expectedAmountCollectable);
			assert(
				hubContractStub.collectable.calledOnceWithExactly(address, currentSplits),
				'Expected collectable() method to be called with different arguments'
			);
		});
	});
});
