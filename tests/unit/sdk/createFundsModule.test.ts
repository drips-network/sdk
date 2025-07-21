import {describe, it, expect, vi, beforeEach} from 'vitest';
import {
  createFundsModule,
  FundsModule,
} from '../../../src/sdk/createFundsModule';
import {WriteBlockchainAdapter} from '../../../src/internal/blockchain/BlockchainAdapter';
import {CollectConfig} from '../../../src/internal/collect/prepareCollection';
import * as prepareCollectionModule from '../../../src/internal/collect/prepareCollection';
import * as collectModule from '../../../src/internal/collect/collect';
import * as getUserWithdrawableBalancesModule from '../../../src/internal/collect/getUserWithdrawableBalances';
import * as assertions from '../../../src/internal/shared/assertions';

vi.mock('../../../src/internal/collect/prepareCollection');
vi.mock('../../../src/internal/collect/collect');
vi.mock('../../../src/internal/collect/getUserWithdrawableBalances');
vi.mock('../../../src/internal/shared/assertions');

describe('createFundsModule', () => {
  let mockAdapter: WriteBlockchainAdapter;
  let mockGraphqlClient: any;
  let fundsModule: FundsModule;
  let mockConfig: CollectConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAdapter = {
      type: 'write',
      getChainId: vi.fn().mockResolvedValue(1),
      getAddress: vi
        .fn()
        .mockResolvedValue('0x1234567890123456789012345678901234567890'),
      sendTx: vi.fn().mockResolvedValue({hash: '0xhash'}),
    } as unknown as WriteBlockchainAdapter;

    mockGraphqlClient = {
      query: vi.fn(),
    };

    mockConfig = {
      accountId: 123n,
      currentReceivers: [],
      tokenAddresses: ['0xtoken'],
    };

    fundsModule = createFundsModule({
      adapter: mockAdapter,
      graphqlClient: mockGraphqlClient,
    });
  });

  describe('prepareCollection', () => {
    it('should require write access', async () => {
      const mockPreparedTx = {
        to: '0xcontract' as `0x${string}`,
        data: '0xdata' as `0x${string}`,
      };
      vi.mocked(prepareCollectionModule.prepareCollection).mockResolvedValue(
        mockPreparedTx,
      );

      await fundsModule.prepareCollection(mockConfig);

      expect(assertions.requireWriteAccess).toHaveBeenCalledWith(
        mockAdapter,
        collectModule.collect.name,
      );
    });

    it('should call prepareCollection with correct parameters', async () => {
      const mockPreparedTx = {
        to: '0xcontract' as `0x${string}`,
        data: '0xdata' as `0x${string}`,
      };
      vi.mocked(prepareCollectionModule.prepareCollection).mockResolvedValue(
        mockPreparedTx,
      );

      const result = await fundsModule.prepareCollection(mockConfig);

      expect(prepareCollectionModule.prepareCollection).toHaveBeenCalledWith(
        mockAdapter,
        mockConfig,
      );
      expect(result).toBe(mockPreparedTx);
    });
  });

  describe('getUserWithdrawableBalances', () => {
    it('should call getUserWithdrawableBalances with correct parameters', async () => {
      const mockAddress =
        '0x1234567890123456789012345678901234567890' as `0x${string}`;
      const mockChainId = 1;
      const mockBalances = [
        {
          __typename: 'UserData' as const,
          withdrawableBalances: [
            {
              __typename: 'WithdrawableBalance' as const,
              tokenAddress: '0xtoken',
              collectableAmount: '100',
              receivableAmount: '0',
              splittableAmount: '50',
            },
          ],
        },
      ];

      vi.mocked(
        getUserWithdrawableBalancesModule.getUserWithdrawableBalances,
      ).mockResolvedValue(mockBalances);

      const result = await fundsModule.getUserWithdrawableBalances(
        mockAddress,
        mockChainId,
      );

      expect(
        getUserWithdrawableBalancesModule.getUserWithdrawableBalances,
      ).toHaveBeenCalledWith(mockAddress, mockChainId, mockGraphqlClient);
      expect(result).toBe(mockBalances);
    });
  });

  describe('collect', () => {
    it('should require write access', async () => {
      const mockTxResponse = {
        hash: '0xhash' as `0x${string}`,
        wait: vi.fn().mockResolvedValue({status: 1}),
      };
      vi.mocked(collectModule.collect).mockResolvedValue(mockTxResponse);

      await fundsModule.collect(mockConfig);

      expect(assertions.requireWriteAccess).toHaveBeenCalledWith(
        mockAdapter,
        collectModule.collect.name,
      );
    });

    it('should call collect with correct parameters', async () => {
      const mockTxResponse = {
        hash: '0xhash' as `0x${string}`,
        wait: vi.fn().mockResolvedValue({status: 1}),
      };
      vi.mocked(collectModule.collect).mockResolvedValue(mockTxResponse);

      const result = await fundsModule.collect(mockConfig);

      expect(collectModule.collect).toHaveBeenCalledWith(
        mockAdapter,
        mockConfig,
      );
      expect(result).toBe(mockTxResponse);
    });
  });
});
