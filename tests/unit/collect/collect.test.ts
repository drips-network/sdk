import {describe, it, expect, vi, beforeEach} from 'vitest';
import {collect} from '../../../src/internal/collect/collect';
import {prepareCollection} from '../../../src/internal/collect/prepareCollection';
import {requireWriteAccess} from '../../../src/internal/shared/assertions';
import {
  WriteBlockchainAdapter,
  TxResponse,
} from '../../../src/internal/blockchain/BlockchainAdapter';

vi.mock('../../../src/internal/collect/prepareCollection');
vi.mock('../../../src/internal/shared/assertions');

describe('collect', () => {
  let mockAdapter: WriteBlockchainAdapter;
  const mockTxResponse: TxResponse = {
    hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    wait: vi.fn().mockResolvedValue({
      hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      to: '0xRecipient123',
      from: '0xSender456',
      blockNumber: 12345n,
      gasUsed: 21000n,
      status: 'success' as const,
      logs: [],
    }),
    meta: {},
  };

  const mockPreparedTx = {
    to: '0xCaller123' as const,
    data: '0xmockdata' as const,
  };

  const mockConfig = {
    accountId: 123n,
    currentReceivers: [
      {
        type: 'address' as const,
        address: '0xReceiver1' as `0x${string}`,
        weight: 500000,
      },
    ],
    tokenAddresses: ['0xToken123' as `0x${string}`],
    shouldSkipSplit: false,
    shouldSkipReceive: false,
    shouldAutoUnwrap: false,
  };

  beforeEach(() => {
    mockAdapter = {
      getChainId: vi.fn().mockResolvedValue(1),
      getAddress: vi.fn().mockResolvedValue('0xSender456'),
      sendTx: vi.fn().mockResolvedValue(mockTxResponse),
      call: vi.fn(),
      signMsg: vi.fn(),
    } as any;

    vi.mocked(prepareCollection).mockResolvedValue(mockPreparedTx as any);
    vi.mocked(requireWriteAccess).mockImplementation(() => {});

    vi.clearAllMocks();
  });

  describe('successful collection', () => {
    it('should collect with basic configuration', async () => {
      const result = await collect(mockAdapter, mockConfig);

      expect(result).toBe(mockTxResponse);
      expect(requireWriteAccess).toHaveBeenCalledWith(mockAdapter, 'collect');
      expect(prepareCollection).toHaveBeenCalledWith(mockAdapter, mockConfig);
      expect(mockAdapter.sendTx).toHaveBeenCalledWith(mockPreparedTx);
    });

    it('should collect with batchedTxOverrides', async () => {
      const configWithOverrides = {
        ...mockConfig,
        batchedTxOverrides: {
          gasLimit: 100000n,
          maxFeePerGas: 2000000000n,
        },
      };

      const result = await collect(mockAdapter, configWithOverrides);

      expect(result).toBe(mockTxResponse);
      expect(requireWriteAccess).toHaveBeenCalledWith(mockAdapter, 'collect');
      expect(prepareCollection).toHaveBeenCalledWith(
        mockAdapter,
        configWithOverrides,
      );
      expect(mockAdapter.sendTx).toHaveBeenCalledWith(mockPreparedTx);
    });

    it('should collect with squeeze args', async () => {
      const configWithSqueeze = {
        ...mockConfig,
        squeezeArgs: [
          {
            accountId: '123',
            tokenAddress: '0xToken123',
            senderId: 456n,
            historyHash: '0xHistoryHash1' as `0x${string}`,
            streamsHistory: [
              {
                streamsHash: '0xStreamsHash1' as `0x${string}`,
                receivers: [],
                updateTime: 1234567890,
                maxEnd: 1234567900,
              },
            ],
          },
        ],
      };

      const result = await collect(mockAdapter, configWithSqueeze);

      expect(result).toBe(mockTxResponse);
      expect(requireWriteAccess).toHaveBeenCalledWith(mockAdapter, 'collect');
      expect(prepareCollection).toHaveBeenCalledWith(
        mockAdapter,
        configWithSqueeze,
      );
      expect(mockAdapter.sendTx).toHaveBeenCalledWith(mockPreparedTx);
    });

    it('should collect with auto unwrap enabled', async () => {
      const configWithAutoUnwrap = {
        ...mockConfig,
        shouldAutoUnwrap: true,
      };

      const result = await collect(mockAdapter, configWithAutoUnwrap);

      expect(result).toBe(mockTxResponse);
      expect(requireWriteAccess).toHaveBeenCalledWith(mockAdapter, 'collect');
      expect(prepareCollection).toHaveBeenCalledWith(
        mockAdapter,
        configWithAutoUnwrap,
      );
      expect(mockAdapter.sendTx).toHaveBeenCalledWith(mockPreparedTx);
    });

    it('should collect with custom transfer address', async () => {
      const configWithTransfer = {
        ...mockConfig,
        transferToAddress: '0xTransferTo123' as `0x${string}`,
      };

      const result = await collect(mockAdapter, configWithTransfer);

      expect(result).toBe(mockTxResponse);
      expect(requireWriteAccess).toHaveBeenCalledWith(mockAdapter, 'collect');
      expect(prepareCollection).toHaveBeenCalledWith(
        mockAdapter,
        configWithTransfer,
      );
      expect(mockAdapter.sendTx).toHaveBeenCalledWith(mockPreparedTx);
    });

    it('should collect with skip options', async () => {
      const configWithSkips = {
        ...mockConfig,
        shouldSkipSplit: true,
        shouldSkipReceive: true,
      };

      const result = await collect(mockAdapter, configWithSkips);

      expect(result).toBe(mockTxResponse);
      expect(requireWriteAccess).toHaveBeenCalledWith(mockAdapter, 'collect');
      expect(prepareCollection).toHaveBeenCalledWith(
        mockAdapter,
        configWithSkips,
      );
      expect(mockAdapter.sendTx).toHaveBeenCalledWith(mockPreparedTx);
    });

    it('should collect with multiple tokens', async () => {
      const configWithMultipleTokens = {
        ...mockConfig,
        tokenAddresses: [
          '0xToken123' as `0x${string}`,
          '0xToken456' as `0x${string}`,
        ],
      };

      const result = await collect(mockAdapter, configWithMultipleTokens);

      expect(result).toBe(mockTxResponse);
      expect(requireWriteAccess).toHaveBeenCalledWith(mockAdapter, 'collect');
      expect(prepareCollection).toHaveBeenCalledWith(
        mockAdapter,
        configWithMultipleTokens,
      );
      expect(mockAdapter.sendTx).toHaveBeenCalledWith(mockPreparedTx);
    });
  });

  describe('error handling', () => {
    it('should propagate error from requireWriteAccess', async () => {
      const mockError = new Error('Write access required');
      vi.mocked(requireWriteAccess).mockImplementation(() => {
        throw mockError;
      });

      await expect(collect(mockAdapter, mockConfig)).rejects.toThrow(
        'Write access required',
      );
      expect(requireWriteAccess).toHaveBeenCalledWith(mockAdapter, 'collect');
      expect(prepareCollection).not.toHaveBeenCalled();
      expect(mockAdapter.sendTx).not.toHaveBeenCalled();
    });

    it('should propagate error from prepareCollection', async () => {
      const mockError = new Error('Failed to prepare collection');
      vi.mocked(prepareCollection).mockRejectedValue(mockError);

      await expect(collect(mockAdapter, mockConfig)).rejects.toThrow(
        'Failed to prepare collection',
      );
      expect(requireWriteAccess).toHaveBeenCalledWith(mockAdapter, 'collect');
      expect(prepareCollection).toHaveBeenCalledWith(mockAdapter, mockConfig);
      expect(mockAdapter.sendTx).not.toHaveBeenCalled();
    });

    it('should propagate error from adapter.sendTx', async () => {
      const mockError = new Error('Transaction failed');
      mockAdapter.sendTx = vi.fn().mockRejectedValue(mockError);

      await expect(collect(mockAdapter, mockConfig)).rejects.toThrow(
        'Transaction failed',
      );
      expect(requireWriteAccess).toHaveBeenCalledWith(mockAdapter, 'collect');
      expect(prepareCollection).toHaveBeenCalledWith(mockAdapter, mockConfig);
      expect(mockAdapter.sendTx).toHaveBeenCalledWith(mockPreparedTx);
    });
  });

  describe('function call order', () => {
    it('should call functions in correct order', async () => {
      const callOrder: string[] = [];

      vi.mocked(requireWriteAccess).mockImplementation(() => {
        callOrder.push('requireWriteAccess');
      });

      vi.mocked(prepareCollection).mockImplementation(async () => {
        callOrder.push('prepareCollection');
        return mockPreparedTx as any;
      });

      mockAdapter.sendTx = vi.fn().mockImplementation(async () => {
        callOrder.push('sendTx');
        return mockTxResponse;
      });

      await collect(mockAdapter, mockConfig);

      expect(callOrder).toEqual([
        'requireWriteAccess',
        'prepareCollection',
        'sendTx',
      ]);
    });
  });

  describe('return value', () => {
    it('should return the exact TxResponse from adapter.sendTx', async () => {
      const customTxResponse: TxResponse = {
        hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        wait: vi.fn().mockResolvedValue({
          hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          to: '0xCustomRecipient',
          from: '0xCustomSender',
          blockNumber: 54321n,
          gasUsed: 42000n,
          status: 'success' as const,
          logs: [{custom: 'log'}],
        }),
        meta: {custom: 'metadata'},
      };

      mockAdapter.sendTx = vi.fn().mockResolvedValue(customTxResponse);

      const result = await collect(mockAdapter, mockConfig);

      expect(result).toBe(customTxResponse);
      expect(result.hash).toBe(
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      );
      expect(result.meta).toEqual({custom: 'metadata'});
    });
  });
});
