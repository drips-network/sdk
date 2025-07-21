import {describe, it, expect, vi, beforeEach} from 'vitest';
import {prepareOneTimeDonation} from '../../../src/internal/donations/prepareOneTimeDonation';
import {WriteBlockchainAdapter} from '../../../src/internal/blockchain/BlockchainAdapter';
import {requireSupportedChain} from '../../../src/internal/shared/assertions';
import {buildTx} from '../../../src/internal/shared/buildTx';
import {addressDriverAbi} from '../../../src/internal/abis/addressDriverAbi';
import {resolveReceiverAccountId} from '../../../src/internal/shared/receiverUtils';
import {parseUnits} from 'viem';

vi.mock('../../../src/internal/shared/receiverUtils');
vi.mock('../../../src/internal/shared/assertions');
vi.mock('../../../src/internal/shared/buildTx');
vi.mock('../../../src/internal/config/contractsRegistry', () => ({
  contractsRegistry: {
    1: {
      addressDriver: {
        address: '0xAddressDriver123',
      },
    },
  },
}));

describe('prepareOneTimeDonation', () => {
  let mockAdapter: WriteBlockchainAdapter;
  const mockChainId = 1;
  const mockAddressDriverAddress = '0xAddressDriver123';
  const mockPreparedTx = {
    to: mockAddressDriverAddress,
    data: '0xmockdata',
  };

  beforeEach(() => {
    mockAdapter = {
      getChainId: vi.fn().mockResolvedValue(mockChainId),
    } as any;

    vi.mocked(buildTx).mockReturnValue(mockPreparedTx as any);
    vi.mocked(requireSupportedChain).mockImplementation(() => {});

    vi.clearAllMocks();
  });

  describe('project receiver', () => {
    it('should prepare transaction for project receiver', async () => {
      const mockAccountId = 123n;
      const mockAmount = '1000';
      const mockErc20 = '0xToken123' as const;

      vi.mocked(resolveReceiverAccountId).mockResolvedValue(mockAccountId);

      const params = {
        receiver: {
          type: 'project' as const,
          url: 'https://github.com/owner/repo',
        },
        amount: mockAmount,
        erc20: mockErc20,
        tokenDecimals: 18,
      };

      const result = await prepareOneTimeDonation(mockAdapter, params);

      expect(result).toBe(mockPreparedTx);
      expect(requireSupportedChain).toHaveBeenCalledWith(mockChainId);
      expect(resolveReceiverAccountId).toHaveBeenCalledWith(
        mockAdapter,
        params.receiver,
      );
      expect(buildTx).toHaveBeenCalledWith({
        abi: addressDriverAbi,
        functionName: 'give',
        args: [mockAccountId, mockErc20, parseUnits(mockAmount.toString(), 18)],
        contract: mockAddressDriverAddress,
        batchedTxOverrides: undefined,
      });
    });
  });

  describe('drip-list receiver', () => {
    it('should prepare transaction for drip-list receiver', async () => {
      const mockAccountId = 456n;
      const mockAmount = '2000';
      const mockErc20 = '0xToken456' as const;

      vi.mocked(resolveReceiverAccountId).mockResolvedValue(mockAccountId);

      const params = {
        receiver: {
          type: 'drip-list' as const,
          accountId: mockAccountId,
        },
        amount: mockAmount,
        erc20: mockErc20,
        tokenDecimals: 18,
      };

      const result = await prepareOneTimeDonation(mockAdapter, params);

      expect(result).toBe(mockPreparedTx);
      expect(resolveReceiverAccountId).toHaveBeenCalledWith(
        mockAdapter,
        params.receiver,
      );
      expect(buildTx).toHaveBeenCalledWith({
        abi: addressDriverAbi,
        functionName: 'give',
        args: [mockAccountId, mockErc20, parseUnits(mockAmount.toString(), 18)],
        contract: mockAddressDriverAddress,
        batchedTxOverrides: undefined,
      });
    });
  });

  describe('address receiver', () => {
    it('should prepare transaction for address receiver', async () => {
      const mockAccountId = 789n;
      const mockAmount = '3000';
      const mockErc20 = '0xToken789' as const;
      const mockAddress = '0x1234567890123456789012345678901234567890' as const;

      vi.mocked(resolveReceiverAccountId).mockResolvedValue(mockAccountId);

      const params = {
        receiver: {
          type: 'address' as const,
          address: mockAddress,
        },
        amount: mockAmount,
        erc20: mockErc20,
        tokenDecimals: 18,
      };

      const result = await prepareOneTimeDonation(mockAdapter, params);

      expect(result).toBe(mockPreparedTx);
      expect(resolveReceiverAccountId).toHaveBeenCalledWith(
        mockAdapter,
        params.receiver,
      );
      expect(buildTx).toHaveBeenCalledWith({
        abi: addressDriverAbi,
        functionName: 'give',
        args: [mockAccountId, mockErc20, parseUnits(mockAmount.toString(), 18)],
        contract: mockAddressDriverAddress,
        batchedTxOverrides: undefined,
      });
    });
  });

  describe('ecosystem-main-account receiver', () => {
    it('should prepare transaction for ecosystem-main-account receiver', async () => {
      const mockAccountId = 101112n;
      const mockAmount = '4000';
      const mockErc20 = '0xToken101112' as const;

      vi.mocked(resolveReceiverAccountId).mockResolvedValue(mockAccountId);

      const params = {
        receiver: {
          type: 'ecosystem-main-account' as const,
          accountId: mockAccountId,
        },
        amount: mockAmount,
        erc20: mockErc20,
        tokenDecimals: 18,
      };

      const result = await prepareOneTimeDonation(mockAdapter, params);

      expect(result).toBe(mockPreparedTx);
      expect(resolveReceiverAccountId).toHaveBeenCalledWith(
        mockAdapter,
        params.receiver,
      );
      expect(buildTx).toHaveBeenCalledWith({
        abi: addressDriverAbi,
        functionName: 'give',
        args: [mockAccountId, mockErc20, parseUnits(mockAmount.toString(), 18)],
        contract: mockAddressDriverAddress,
        batchedTxOverrides: undefined,
      });
    });
  });

  describe('sub-list receiver', () => {
    it('should prepare transaction for sub-list receiver', async () => {
      const mockAccountId = 131415n;
      const mockAmount = '5000';
      const mockErc20 = '0xToken131415' as const;

      vi.mocked(resolveReceiverAccountId).mockResolvedValue(mockAccountId);

      const params = {
        receiver: {
          type: 'sub-list' as const,
          accountId: mockAccountId,
        },
        amount: mockAmount,
        erc20: mockErc20,
        tokenDecimals: 18,
      };

      const result = await prepareOneTimeDonation(mockAdapter, params);

      expect(result).toBe(mockPreparedTx);
      expect(resolveReceiverAccountId).toHaveBeenCalledWith(
        mockAdapter,
        params.receiver,
      );
      expect(buildTx).toHaveBeenCalledWith({
        abi: addressDriverAbi,
        functionName: 'give',
        args: [mockAccountId, mockErc20, parseUnits(mockAmount.toString(), 18)],
        contract: mockAddressDriverAddress,
        batchedTxOverrides: undefined,
      });
    });
  });

  describe('with batchedTxOverrides', () => {
    it('should pass batchedTxOverrides to buildTx', async () => {
      const mockAccountId = 123n;
      const mockAmount = '1000';
      const mockErc20 = '0xToken123' as const;
      const mockBatchedTxOverrides = {
        gasLimit: 100000n,
      };

      vi.mocked(resolveReceiverAccountId).mockResolvedValue(mockAccountId);

      const params = {
        receiver: {
          type: 'project' as const,
          url: 'https://github.com/owner/repo',
        },
        amount: mockAmount,
        erc20: mockErc20,
        tokenDecimals: 18,
        batchedTxOverrides: mockBatchedTxOverrides,
      };

      const result = await prepareOneTimeDonation(mockAdapter, params);

      expect(result).toBe(mockPreparedTx);
      expect(buildTx).toHaveBeenCalledWith({
        abi: addressDriverAbi,
        functionName: 'give',
        args: [mockAccountId, mockErc20, parseUnits(mockAmount.toString(), 18)],
        contract: mockAddressDriverAddress,
        batchedTxOverrides: mockBatchedTxOverrides,
      });
    });
  });

  describe('error handling', () => {
    it('should propagate errors from resolveReceiverAccountId', async () => {
      const mockError = new Error('Failed to resolve account ID');
      vi.mocked(resolveReceiverAccountId).mockRejectedValue(mockError);

      const params = {
        receiver: {
          type: 'project' as const,
          url: 'https://github.com/owner/repo',
        },
        amount: '1000',
        erc20: '0xToken123' as const,
        tokenDecimals: 18,
      };

      await expect(prepareOneTimeDonation(mockAdapter, params)).rejects.toThrow(
        'Failed to resolve account ID',
      );
    });

    it('should call requireSupportedChain with chain ID', async () => {
      const mockAccountId = 123n;
      vi.mocked(resolveReceiverAccountId).mockResolvedValue(mockAccountId);

      const params = {
        receiver: {
          type: 'drip-list' as const,
          accountId: mockAccountId,
        },
        amount: '1000',
        erc20: '0xToken123' as const,
        tokenDecimals: 18,
      };

      await prepareOneTimeDonation(mockAdapter, params);

      expect(requireSupportedChain).toHaveBeenCalledWith(mockChainId);
    });
  });
});
