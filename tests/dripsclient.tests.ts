import { Web3Provider } from '@ethersproject/providers';
import { BigNumber, ContractTransaction, ethers, providers } from 'ethers';
import * as sinon from 'sinon';
import {
  Dai,
  DaiDripsHub,
  DaiDripsHub__factory,
  Dai__factory,
} from '../contracts';
import { DripsClient } from '../src/dripsclient';
import { Mock, Times } from 'moq.ts';
import { constants } from 'ethers';
import { getContractsForNetwork } from '../src/contracts';
import { assert } from 'chai';
import * as utils from '../src/utils';

describe('DripsClient', () => {
  let network: string;
  let contractDetails: any;
  let daiContractMock: Mock<Dai>;
  let providerMock: Mock<Web3Provider>;
  let hubContractMock: Mock<DaiDripsHub>;
  let signerMock: Mock<providers.JsonRpcSigner>;

  let dripsClient: DripsClient;

  beforeEach(() => {
    // Base "Arrange" step for all tests.

    network = 'rinkeby';
    contractDetails = getContractsForNetwork(network);

    // Setup DripsClient dependency mocks.
    providerMock = new Mock<Web3Provider>();
    signerMock = new Mock<providers.JsonRpcSigner>();
    signerMock
      .setup((x) => x.getAddress())
      .returnsAsync(ethers.Wallet.createRandom().address);
    providerMock.setup((x) => x.getSigner()).returns(signerMock.object());
    providerMock
      .setup((x) => x.getNetwork())
      .returnsAsync({ chainId: 4 } as providers.Network);

    // Setup Dai contract mock.
    daiContractMock = new Mock<Dai>();
    daiContractMock
      .setup((x) => x.connect(signerMock.object()))
      .returns(daiContractMock.object());
    sinon
      .stub(Dai__factory, 'connect')
      .withArgs(contractDetails.CONTRACT_DAI, providerMock.object())
      .returns(daiContractMock.object());

    // Setup DaiDripsHub contract mock.
    hubContractMock = new Mock<DaiDripsHub>();
    hubContractMock
      .setup((x) => x.connect(signerMock.object()))
      .returns(hubContractMock.object());
    sinon
      .stub(DaiDripsHub__factory, 'connect')
      .withArgs(contractDetails.CONTRACT_DRIPS_HUB, providerMock.object())
      .returns(hubContractMock.object());

    // Create a DripsClient instance (system under test).
    dripsClient = new DripsClient(providerMock.object(), network);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('constructor', () => {
    it('should set provider, Dai and DaiDripsHub contracts properties', () => {
      // Assert.
      assert.isUndefined(dripsClient.signer);
      assert.isUndefined(dripsClient.address);
      assert.isUndefined(dripsClient.networkId);
      assert.equal(dripsClient.provider, providerMock.object());
      assert.equal(dripsClient.daiContract, daiContractMock.object());
      assert.equal(dripsClient.hubContract, hubContractMock.object());
    });
  });

  describe('connect()', () => {
    it('should set the signer, address and network ID properties', async () => {
      // Act.
      await dripsClient.connect();

      // Assert.
      assert.equal(dripsClient.signer, providerMock.object().getSigner());
      assert.equal(
        dripsClient.address,
        (await providerMock.object().getSigner().getAddress()).toLowerCase()
      );
      assert.equal(
        dripsClient.networkId,
        (await providerMock.object().getNetwork()).chainId
      );
    });

    it('should disconnect when an exception is thrown', async () => {
      // Arrange.
      const error = new Error('Cannot get signer');
      providerMock.setup((x) => x.getSigner()).throws<Error>(error);

      try {
        // Act.
        await dripsClient.connect();
      } catch (ex) {
        // Assert
        assert.equal(ex, error);
      }

      // Assert
      assert.isNull(dripsClient.signer);
      assert.isNull(dripsClient.address);
      assert.isNull(dripsClient.networkId);
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

    it('should return false when network ID is not set', () => {
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

      try {
        await dripsClient.approveDAIContract();
      } catch (error) {
        assert.typeOf(error, 'Error');
        assert.equal(
          'DripsClient must be connected before approving DAI',
          error.message
        );
      }
    });

    it('should delegate the call to the approve() contract method', async () => {
      // Arrange.
      daiContractMock
        .setup((x) =>
          x.approve(contractDetails.CONTRACT_DRIPS_HUB, constants.MaxUint256)
        )
        .returnsAsync({} as ContractTransaction);

      await dripsClient.connect();

      // Act.
      await dripsClient.approveDAIContract();

      // Assert.
      daiContractMock.verify(
        (x) =>
          x.approve(contractDetails.CONTRACT_DRIPS_HUB, constants.MaxUint256),
        Times.Once()
      );
    });
  });

  describe('updateUserDrips', async () => {
    it('should throw if signer property is falsy', async () => {
      // Arrange.
      dripsClient.signer = undefined;

      const payload = {
        lastUpdate: 2,
        lastBalance: 22,
        currentReceivers: [
          { receiver: ethers.Wallet.createRandom().address, amtPerSec: 3 },
        ],
        balanceDelta: 22,
        newReceivers: [
          { receiver: ethers.Wallet.createRandom().address, amtPerSec: 3 },
        ],
      };

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
      }
    });

    it('should validate Drips', async () => {
      // Arrange.
      const payload = {
        lastUpdate: 2,
        lastBalance: 22,
        currentReceivers: [
          { receiver: ethers.Wallet.createRandom().address, amtPerSec: 3 },
        ],
        balanceDelta: 22,
        newReceivers: [
          { receiver: ethers.Wallet.createRandom().address, amtPerSec: 3 },
        ],
      };

      const validateDripsStub = sinon.stub(utils, 'validateDrips');

      await dripsClient.connect();

      hubContractMock
        .setup((x) =>
          x[
            'setDrips(uint64,uint128,(address,uint128)[],int128,(address,uint128)[])'
          ](
            payload.lastBalance,
            payload.lastBalance,
            payload.currentReceivers,
            payload.balanceDelta,
            payload.newReceivers
          )
        )
        .returnsAsync({} as ContractTransaction);

      // Act.
      await dripsClient.updateUserDrips(
        payload.lastBalance,
        payload.lastBalance,
        payload.currentReceivers,
        payload.balanceDelta,
        payload.newReceivers
      );

      // Assert.
      assert(validateDripsStub.calledOnceWith(payload.newReceivers));
    });

    it('should delegate the call to the setDrips() contract method', async () => {
      // Arrange.
      await dripsClient.connect();

      const payload = {
        lastUpdate: 2,
        lastBalance: 22,
        currentReceivers: [
          { receiver: ethers.Wallet.createRandom().address, amtPerSec: 3 },
        ],
        balanceDelta: 22,
        newReceivers: [
          { receiver: ethers.Wallet.createRandom().address, amtPerSec: 3 },
        ],
      };

      hubContractMock
        .setup((x) =>
          x[
            'setDrips(uint64,uint128,(address,uint128)[],int128,(address,uint128)[])'
          ](
            payload.lastBalance,
            payload.lastBalance,
            payload.currentReceivers,
            payload.balanceDelta,
            payload.newReceivers
          )
        )
        .returnsAsync({} as ContractTransaction);

      // Act.
      await dripsClient.updateUserDrips(
        payload.lastBalance,
        payload.lastBalance,
        payload.currentReceivers,
        payload.balanceDelta,
        payload.newReceivers
      );

      // Assert.
      hubContractMock.verify(
        (x) =>
          x[
            'setDrips(uint64,uint128,(address,uint128)[],int128,(address,uint128)[])'
          ](
            payload.lastBalance,
            payload.lastBalance,
            payload.currentReceivers,
            payload.balanceDelta,
            payload.newReceivers
          ),
        Times.Once()
      );
    });
  });

  describe('updateUserSplits', async () => {
    it('should throw if signer property is falsy', async () => {
      // Arrange.
      dripsClient.signer = undefined;

      const payload = {
        lastUpdate: 2,
        lastBalance: 22,
        currentReceivers: [
          { receiver: ethers.Wallet.createRandom().address, weight: 3 },
        ],
        balanceDelta: 22,
        newReceivers: [
          { receiver: ethers.Wallet.createRandom().address, weight: 3 },
        ],
      };

      try {
        // Act.
        await dripsClient.updateUserSplits(
          payload.currentReceivers,
          payload.newReceivers
        );
      } catch (error) {
        // Assert.
        assert.typeOf(error, 'Error');
        assert.equal('Not connected to wallet', error.message);
      }
    });

    it('should validate Drips', async () => {
      // Arrange.
      const payload = {
        lastUpdate: 2,
        lastBalance: 22,
        currentReceivers: [
          { receiver: ethers.Wallet.createRandom().address, weight: 1 },
        ],
        balanceDelta: 22,
        newReceivers: [
          { receiver: ethers.Wallet.createRandom().address, weight: 3 },
        ],
      };

      const validateSlitsStub = sinon.stub(utils, 'validateSplits');

      await dripsClient.connect();

      hubContractMock
        .setup((x) =>
          x.setSplits(payload.currentReceivers, payload.newReceivers)
        )
        .returnsAsync({} as ContractTransaction);

      // Act.
      await dripsClient.updateUserSplits(
        payload.currentReceivers,
        payload.newReceivers
      );

      // Assert.
      assert(validateSlitsStub.calledOnceWith(payload.newReceivers));
    });

    it('should delegate the call to the setSplits() contract method', async () => {
      // Arrange.
      await dripsClient.connect();

      const payload = {
        lastUpdate: 2,
        lastBalance: 22,
        currentReceivers: [
          { receiver: ethers.Wallet.createRandom().address, weight: 3 },
        ],
        balanceDelta: 22,
        newReceivers: [
          { receiver: ethers.Wallet.createRandom().address, weight: 3 },
        ],
      };

      hubContractMock
        .setup((x) =>
          x.setSplits(payload.currentReceivers, payload.newReceivers)
        )
        .returnsAsync({} as ContractTransaction);

      // Act.
      await dripsClient.updateUserSplits(
        payload.currentReceivers,
        payload.newReceivers
      );

      // Assert.
      hubContractMock.verify(
        (x) => x.setSplits(payload.currentReceivers, payload.newReceivers),
        Times.Once()
      );
    });
  });

  describe('getAllowance()', () => {
    it('should throw when address property is falsy', async () => {
      // Arrange.
      dripsClient.address = undefined;

      try {
        // Act.
        await dripsClient.getAllowance();
      } catch (error) {
        // Assert.
        assert.typeOf(error, 'Error');
        assert.equal(
          'Must call connect() before calling getAllowance()',
          error.message
        );
      }
    });

    it('should delegate the call to the allowance() contract method', async () => {
      // Arrange.
      await dripsClient.connect();
      const expectedAllowance = BigNumber.from(1000);

      daiContractMock
        .setup(async (x) =>
          x.allowance(dripsClient.address, contractDetails.CONTRACT_DRIPS_HUB)
        )
        .returnsAsync(expectedAllowance);

      // Act.
      const allowance = await dripsClient.getAllowance();

      // Assert.
      assert.equal(allowance, expectedAllowance);
      daiContractMock.verify(async (x) =>
        x.allowance(dripsClient.address, contractDetails.CONTRACT_DRIPS_HUB)
      );
    });
  });

  describe('getAmountCollectableWithSplits()', () => {
    it('should throw when address property is falsy', async () => {
      // Arrange.
      dripsClient.provider = undefined;

      try {
        // Act.
        await dripsClient.getAmountCollectableWithSplits(
          ethers.Wallet.createRandom().address,
          [{ receiver: ethers.Wallet.createRandom().address, weight: 1 }]
        );
      } catch (error) {
        // Assert.
        assert.typeOf(error, 'Error');
        assert.equal(
          'Must have a provider defined to query the collectable balance',
          error.message
        );
      }
    });

    it('should delegate the call to the allowance() contract method', async () => {
      // Arrange.
      const address = ethers.Wallet.createRandom().address;
      const currentSplits = [
        {
          receiver: ethers.Wallet.createRandom().address,
          weight: 1,
        },
      ];
      const expectedAmountCollectable = [
        BigNumber.from(1000),
        BigNumber.from(2000),
      ] as [BigNumber, BigNumber] & { collected: BigNumber; split: BigNumber };

      hubContractMock
        .setup(async (x) => x.collectable(address, currentSplits))
        .returnsAsync(expectedAmountCollectable);

      await dripsClient.connect();

      // Act.
      const collectable = await dripsClient.getAmountCollectableWithSplits(
        address,
        currentSplits
      );

      // Assert.
      assert.equal(collectable, expectedAmountCollectable);
      hubContractMock.verify(async (x) =>
        x.collectable(address, currentSplits)
      );
    });
  });
});
