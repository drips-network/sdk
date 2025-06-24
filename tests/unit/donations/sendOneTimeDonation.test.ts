import {describe, it, expect, vi, beforeEach} from 'vitest';
import {sendOneTimeDonation} from '../../../src/internal/donations/sendOneTimeDonation';
import {prepareOneTimeDonation} from '../../../src/internal/donations/prepareOneTimeDonation';
import {requireWriteAccess} from '../../../src/internal/shared/assertions';
import {
  WriteBlockchainAdapter,
  TxResponse,
} from '../../../src/internal/blockchain/BlockchainAdapter';

vi.mock('../../../src/internal/donations/prepareOneTimeDonation');
vi.mock('../../../src/internal/shared/assertions');

describe('sendOneTimeDonation', () => {
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
    to: '0xAddressDriver123' as const,
    data: '0xmockdata' as const,
  };

  beforeEach(() => {
    mockAdapter = {
      getChainId: vi.fn().mockResolvedValue(1),
      getAddress: vi.fn().mockResolvedValue('0xSender456'),
      sendTx: vi.fn().mockResolvedValue(mockTxResponse),
      call: vi.fn(),
      signMsg: vi.fn(),
    } as any;

    vi.mocked(prepareOneTimeDonation).mockResolvedValue(mockPreparedTx as any);
    vi.mocked(requireWriteAccess).mockImplementation(() => {});

    vi.clearAllMocks();
  });

  describe('successful donation', () => {
    it('should send one-time donation with batchedTxOverrides', async () => {
      const mockBatchedTxOverrides = {
        gasLimit: 100000n,
      };

      const params = {
        receiver: {
          type: 'project' as const,
          url: 'https://github.com/owner/repo',
          amount: 1000n,
        },
        amount: 1000n,
        erc20: '0xToken123' as const,
        batchedTxOverrides: mockBatchedTxOverrides,
      };

      const result = await sendOneTimeDonation(mockAdapter, params);

      expect(result).toBe(mockTxResponse);
      expect(requireWriteAccess).toHaveBeenCalledWith(
        mockAdapter,
        'sendOneTimeDonation',
      );
      expect(prepareOneTimeDonation).toHaveBeenCalledWith(mockAdapter, params);
      expect(mockAdapter.sendTx).toHaveBeenCalledWith(mockPreparedTx);
    });
    it('should send one-time donation for project receiver', async () => {
      const params = {
        receiver: {
          type: 'project' as const,
          url: 'https://github.com/owner/repo',
          amount: 1000n,
        },
        amount: 1000n,
        erc20: '0xToken123' as const,
      };

      const result = await sendOneTimeDonation(mockAdapter, params);

      expect(result).toBe(mockTxResponse);
      expect(requireWriteAccess).toHaveBeenCalledWith(
        mockAdapter,
        'sendOneTimeDonation',
      );
      expect(prepareOneTimeDonation).toHaveBeenCalledWith(mockAdapter, params);
      expect(mockAdapter.sendTx).toHaveBeenCalledWith(mockPreparedTx);
    });

    it('should send one-time donation for drip-list receiver', async () => {
      const params = {
        receiver: {
          type: 'drip-list' as const,
          accountId: 456n,
          amount: 2000n,
        },
        amount: 2000n,
        erc20: '0xToken456' as const,
      };

      const result = await sendOneTimeDonation(mockAdapter, params);

      expect(result).toBe(mockTxResponse);
      expect(requireWriteAccess).toHaveBeenCalledWith(
        mockAdapter,
        'sendOneTimeDonation',
      );
      expect(prepareOneTimeDonation).toHaveBeenCalledWith(mockAdapter, params);
      expect(mockAdapter.sendTx).toHaveBeenCalledWith(mockPreparedTx);
    });

    it('should send one-time donation for address receiver', async () => {
      const params = {
        receiver: {
          type: 'address' as const,
          address: '0x1234567890123456789012345678901234567890' as const,
          amount: 3000n,
        },
        amount: 3000n,
        erc20: '0xToken789' as const,
      };

      const result = await sendOneTimeDonation(mockAdapter, params);

      expect(result).toBe(mockTxResponse);
      expect(requireWriteAccess).toHaveBeenCalledWith(
        mockAdapter,
        'sendOneTimeDonation',
      );
      expect(prepareOneTimeDonation).toHaveBeenCalledWith(mockAdapter, params);
      expect(mockAdapter.sendTx).toHaveBeenCalledWith(mockPreparedTx);
    });

    it('should send one-time donation for ecosystem-main-account receiver', async () => {
      const params = {
        receiver: {
          type: 'ecosystem-main-account' as const,
          accountId: 101112n,
          amount: 4000n,
        },
        amount: 4000n,
        erc20: '0xToken101112' as const,
      };

      const result = await sendOneTimeDonation(mockAdapter, params);

      expect(result).toBe(mockTxResponse);
      expect(requireWriteAccess).toHaveBeenCalledWith(
        mockAdapter,
        'sendOneTimeDonation',
      );
      expect(prepareOneTimeDonation).toHaveBeenCalledWith(mockAdapter, params);
      expect(mockAdapter.sendTx).toHaveBeenCalledWith(mockPreparedTx);
    });

    it('should send one-time donation for sub-list receiver', async () => {
      const params = {
        receiver: {
          type: 'sub-list' as const,
          accountId: 131415n,
          amount: 5000n,
        },
        amount: 5000n,
        erc20: '0xToken131415' as const,
      };

      const result = await sendOneTimeDonation(mockAdapter, params);

      expect(result).toBe(mockTxResponse);
      expect(requireWriteAccess).toHaveBeenCalledWith(
        mockAdapter,
        'sendOneTimeDonation',
      );
      expect(prepareOneTimeDonation).toHaveBeenCalledWith(mockAdapter, params);
      expect(mockAdapter.sendTx).toHaveBeenCalledWith(mockPreparedTx);
    });
  });

  describe('error handling', () => {
    it('should propagate error from requireWriteAccess', async () => {
      const mockError = new Error('Write access required');
      vi.mocked(requireWriteAccess).mockImplementation(() => {
        throw mockError;
      });

      const params = {
        receiver: {
          type: 'project' as const,
          url: 'https://github.com/owner/repo',
          amount: 1000n,
        },
        amount: 1000n,
        erc20: '0xToken123' as const,
      };

      await expect(sendOneTimeDonation(mockAdapter, params)).rejects.toThrow(
        'Write access required',
      );
      expect(requireWriteAccess).toHaveBeenCalledWith(
        mockAdapter,
        'sendOneTimeDonation',
      );
      expect(prepareOneTimeDonation).not.toHaveBeenCalled();
      expect(mockAdapter.sendTx).not.toHaveBeenCalled();
    });

    it('should propagate error from prepareOneTimeDonation', async () => {
      const mockError = new Error('Failed to prepare transaction');
      vi.mocked(prepareOneTimeDonation).mockRejectedValue(mockError);

      const params = {
        receiver: {
          type: 'drip-list' as const,
          accountId: 456n,
          amount: 2000n,
        },
        amount: 2000n,
        erc20: '0xToken456' as const,
      };

      await expect(sendOneTimeDonation(mockAdapter, params)).rejects.toThrow(
        'Failed to prepare transaction',
      );
      expect(requireWriteAccess).toHaveBeenCalledWith(
        mockAdapter,
        'sendOneTimeDonation',
      );
      expect(prepareOneTimeDonation).toHaveBeenCalledWith(mockAdapter, params);
      expect(mockAdapter.sendTx).not.toHaveBeenCalled();
    });

    it('should propagate error from adapter.sendTx', async () => {
      const mockError = new Error('Transaction failed');
      mockAdapter.sendTx = vi.fn().mockRejectedValue(mockError);

      const params = {
        receiver: {
          type: 'address' as const,
          address: '0x1234567890123456789012345678901234567890' as const,
          amount: 3000n,
        },
        amount: 3000n,
        erc20: '0xToken789' as const,
      };

      await expect(sendOneTimeDonation(mockAdapter, params)).rejects.toThrow(
        'Transaction failed',
      );
      expect(requireWriteAccess).toHaveBeenCalledWith(
        mockAdapter,
        'sendOneTimeDonation',
      );
      expect(prepareOneTimeDonation).toHaveBeenCalledWith(mockAdapter, params);
      expect(mockAdapter.sendTx).toHaveBeenCalledWith(mockPreparedTx);
    });
  });

  describe('function call order', () => {
    it('should call functions in correct order', async () => {
      const callOrder: string[] = [];

      vi.mocked(requireWriteAccess).mockImplementation(() => {
        callOrder.push('requireWriteAccess');
      });

      vi.mocked(prepareOneTimeDonation).mockImplementation(async () => {
        callOrder.push('prepareOneTimeDonation');
        return mockPreparedTx as any;
      });

      mockAdapter.sendTx = vi.fn().mockImplementation(async () => {
        callOrder.push('sendTx');
        return mockTxResponse;
      });

      const params = {
        receiver: {
          type: 'project' as const,
          url: 'https://github.com/owner/repo',
          amount: 1000n,
        },
        amount: 1000n,
        erc20: '0xToken123' as const,
      };

      await sendOneTimeDonation(mockAdapter, params);

      expect(callOrder).toEqual([
        'requireWriteAccess',
        'prepareOneTimeDonation',
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

      const params = {
        receiver: {
          type: 'ecosystem-main-account' as const,
          accountId: 101112n,
          amount: 4000n,
        },
        amount: 4000n,
        erc20: '0xToken101112' as const,
      };

      const result = await sendOneTimeDonation(mockAdapter, params);

      expect(result).toBe(customTxResponse);
      expect(result.hash).toBe(
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      );
      expect(result.meta).toEqual({custom: 'metadata'});
    });
  });
});
