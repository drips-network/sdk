import { assert, expect } from 'chai';
import { SubgraphClient } from '../src/subgraph';
import * as sinon from 'sinon';
import * as gql from '../src/gql';
import { Wallet } from 'ethers';

describe('SubgraphClient', () => {
  afterEach(() => {
    sinon.restore();
  });

  describe('constructor()', () => {
    it('should set the API URL', () => {
      // Arrange.
      const apiUrl = 'https://api.graphql';

      // Act.
      const client = new SubgraphClient(apiUrl);

      // Assert.
      assert.equal(client.apiUrl, apiUrl);
    });
  });

  describe('getDripsBySender()', async () => {
    it('should return expected Drips Config when Drips Configs exist', async () => {
      // Arrange.
      const client = new SubgraphClient('https://api.graphql');
      const address = Wallet.createRandom().address;
      const apiResponse = {
        dripsConfigs: [
          {
            withdrawable: 1,
            balance: 'balance',
            timestamp: new Date().toISOString(),
            receivers: [
              {
                amtPerSec: '1',
                receiver: Wallet.createRandom().address,
              },
            ],
          },
        ],
      };

      const clientStub = sinon
        .stub(client, 'query')
        .withArgs(gql.dripsConfigByID, { id: address })
        .resolves({ data: apiResponse });

      // Act.
      const dripsConfig = await client.getDripsBySender(address);

      // Assert.
      assert.equal(dripsConfig, apiResponse.dripsConfigs[0]);
      assert(
        clientStub.calledOnceWithExactly(gql.dripsConfigByID, {
          id: address,
        }),
        `Expected query() method to be called with different arguments`
      );
    });

    it('should return empty object when Drips Configs does not exist', async () => {
      // Arrange.
      const client = new SubgraphClient('https://api.graphql');
      const sender = Wallet.createRandom().address;
      const apiResponse = { data: { dripsConfigs: [] } };

      sinon
        .stub(client, 'query')
        .withArgs(gql.dripsConfigByID, { id: sender })
        .resolves({ data: apiResponse });

      // Act.
      const dripsConfig = await client.getDripsBySender(sender);

      // Assert.
      assert.deepEqual(dripsConfig, {});
    });
  });

  describe('getDripsByReceiver()', async () => {
    it('should return expected Drips', async () => {
      // Arrange.
      const client = new SubgraphClient('https://api.graphql');
      const receiver = Wallet.createRandom().address;
      const apiResponse = {
        dripsEntries: [
          {
            amtPerSec: '1',
            receiver: Wallet.createRandom().address,
          },
        ],
      };

      const clientStub = sinon
        .stub(client, 'query')
        .withArgs(gql.dripsByReceiver, { receiver })
        .resolves({ data: apiResponse });

      // Act.
      const drips = await client.getDripsByReceiver(receiver);

      // Assert.
      assert.equal(drips, apiResponse.dripsEntries);
      assert(
        clientStub.calledOnceWithExactly(gql.dripsByReceiver, {
          receiver,
        }),
        `Expected query() method to be called with different arguments`
      );
    });
  });

  describe('getSplitsBySender', () => {
    it('should return expected Splits', async () => {
      // Arrange.
      const client = new SubgraphClient('https://api.graphql');
      const sender = Wallet.createRandom().address;
      const apiResponse = {
        splitsEntries: [
          {
            sender,
            receiver: Wallet.createRandom().address,
            weight: 1,
          },
        ],
      };

      const clientStub = sinon
        .stub(client, 'query')
        .withArgs(gql.splitsBySender, { sender, first: 100 })
        .resolves({ data: apiResponse });

      // Act.
      const splits = await client.getSplitsBySender(sender);

      // Assert.
      assert.equal(splits, apiResponse.splitsEntries);
      assert(
        clientStub.calledOnceWithExactly(gql.splitsBySender, {
          sender,
          first: 100,
        }),
        `Expected query() method to be called with different arguments`
      );
    });

    it('should return empty array when splits do not exist', async () => {
      // Arrange.
      const client = new SubgraphClient('https://api.graphql');
      const sender = Wallet.createRandom().address;

      const clientStub = sinon
        .stub(client, 'query')
        .withArgs(gql.splitsBySender, { sender, first: 100 })
        .resolves({ data: null });

      // Act.
      const splits = await client.getSplitsBySender(sender);

      // Assert.
      assert.deepEqual(splits, []);
      assert(
        clientStub.calledOnceWithExactly(gql.splitsBySender, {
          sender,
          first: 100,
        }),
        `Expected query() method to be called with different arguments`
      );
    });
  });

  describe('getSplitsByReceiver', () => {
    it('should return expected Splits', async () => {
      // Arrange.
      const client = new SubgraphClient('https://api.graphql');
      const receiver = Wallet.createRandom().address;
      const apiResponse = {
        splitsEntries: [
          {
            receiver,
            sender: Wallet.createRandom().address,
            weight: 1,
          },
        ],
      };

      const clientStub = sinon
        .stub(client, 'query')
        .withArgs(gql.splitsByReceiver, { receiver, first: 100 })
        .resolves({ data: apiResponse });

      // Act.
      const splits = await client.getSplitsByReceiver(receiver);

      // Assert.
      assert.equal(splits, apiResponse.splitsEntries);
      assert(
        clientStub.calledOnceWithExactly(gql.splitsByReceiver, {
          receiver,
          first: 100,
        }),
        `Expected query() method to be called with different arguments`
      );
    });
  });

  describe('query()', async () => {
    it('should throw if API URL is empty', async () => {
      // Arrange.
      const client = new SubgraphClient(null);

      try {
        // Act.
        await client.query(gql.dripsByReceiver, {});
      } catch (error) {
        // Assert
        assert.typeOf(error, 'Error');
        assert.equal('API URL missing', error.message);
      }
    });

    it('should return expected response', async () => {
      // Arrange.
      const client = new SubgraphClient('https://api.graphql');
      const apiResponse = {
        dripsEntries: [
          {
            amtPerSec: '1',
            receiver: Wallet.createRandom().address,
          },
        ],
      };
      global.fetch = sinon.stub(async (): Promise<Response> => {
        return {
          status: 200,
          json: async () => await { data: apiResponse },
        } as Response;
      });

      // Act.
      const response = await client.query(gql.dripsByReceiver, {});
    });

    it('should throw if API response status code is not >= 200 and <= 299', async () => {
      // Arrange.
      const client = new SubgraphClient('https://api.graphql');

      global.fetch = sinon.stub(async (): Promise<Response> => {
        return { status: 500, statusText: 'Internal Server Error' } as Response;
      });

      try {
        // Act.
        await client.query(gql.dripsByReceiver, {});
      } catch (error) {
        // Assert
        assert.typeOf(error, 'Error');
        assert.equal('Internal Server Error', error.message);
      }
    });
  });
});
