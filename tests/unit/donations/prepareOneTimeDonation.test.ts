import {describe, it, expect, vi, beforeEach} from 'vitest';
import {prepareOneTimeDonation} from '../../../src/internal/donations/prepareOneTimeDonation';
import {WriteBlockchainAdapter} from '../../../src/internal/blockchain/BlockchainAdapter';
import {
  requireSupportedChain,
  requireWriteAccess,
} from '../../../src/internal/shared/assertions';
import {buildTx} from '../../../src/internal/shared/buildTx';
import {addressDriverAbi} from '../../../src/internal/abis/addressDriverAbi';
import {resolveReceiverAccountId} from '../../../src/internal/shared/receiverUtils';

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
    vi.mocked(requireWriteAccess).mockImplementation(() => {});

    vi.clearAllMocks();
  });

  describe('project receiver', () => {
    it('should prepare transaction for project receiver', async () => {
      const mockAccountId = 123n;
      const mockAmount = 1000n;
      const mockErc20 = '0xToken123' as const;

      vi.mocked(resolveReceiverAccountId).mockResolvedValue(mockAccountId);

      const params = {
        receiver: {
          type: 'project' as const,
          url: 'https://github.com/owner/repo',
          amount: mockAmount,
        },
        amount: mockAmount,
        erc20: mockErc20,
      };

      const result = await prepareOneTimeDonation(mockAdapter, params);

      expect(result).toBe(mockPreparedTx);
      expect(requireSupportedChain).toHaveBeenCalledWith(mockChainId);
      expect(requireWriteAccess).toHaveBeenCalledWith(
        mockAdapter,
        'prepareDripListCreation',
      );
      expect(resolveReceiverAccountId).toHaveBeenCalledWith(
        mockAdapter,
        params.receiver,
      );
      expect(buildTx).toHaveBeenCalledWith({
        abi: addressDriverAbi,
        functionName: 'give',
        args: [mockAccountId, mockErc20, mockAmount],
        contract: mockAddressDriverAddress,
      });
    });
  });

  describe('drip-list receiver', () => {
    it('should prepare transaction for drip-list receiver', async () => {
      const mockAccountId = 456n;
      const mockAmount = 2000n;
      const mockErc20 = '0xToken456' as const;

      vi.mocked(resolveReceiverAccountId).mockResolvedValue(mockAccountId);

      const params = {
        receiver: {
          type: 'drip-list' as const,
          accountId: mockAccountId,
          amount: mockAmount,
        },
        amount: mockAmount,
        erc20: mockErc20,
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
        args: [mockAccountId, mockErc20, mockAmount],
        contract: mockAddressDriverAddress,
      });
    });
  });

  describe('address receiver', () => {
    it('should prepare transaction for address receiver', async () => {
      const mockAccountId = 789n;
      const mockAmount = 3000n;
      const mockErc20 = '0xToken789' as const;
      const mockAddress = '0x1234567890123456789012345678901234567890' as const;

      vi.mocked(resolveReceiverAccountId).mockResolvedValue(mockAccountId);

      const params = {
        receiver: {
          type: 'address' as const,
          address: mockAddress,
          amount: mockAmount,
        },
        amount: mockAmount,
        erc20: mockErc20,
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
        args: [mockAccountId, mockErc20, mockAmount],
        contract: mockAddressDriverAddress,
      });
    });
  });

  describe('ecosystem-main-account receiver', () => {
    it('should prepare transaction for ecosystem-main-account receiver', async () => {
      const mockAccountId = 101112n;
      const mockAmount = 4000n;
      const mockErc20 = '0xToken101112' as const;

      vi.mocked(resolveReceiverAccountId).mockResolvedValue(mockAccountId);

      const params = {
        receiver: {
          type: 'ecosystem-main-account' as const,
          accountId: mockAccountId,
          amount: mockAmount,
        },
        amount: mockAmount,
        erc20: mockErc20,
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
        args: [mockAccountId, mockErc20, mockAmount],
        contract: mockAddressDriverAddress,
      });
    });
  });

  describe('sub-list receiver', () => {
    it('should prepare transaction for sub-list receiver', async () => {
      const mockAccountId = 131415n;
      const mockAmount = 5000n;
      const mockErc20 = '0xToken131415' as const;

      vi.mocked(resolveReceiverAccountId).mockResolvedValue(mockAccountId);

      const params = {
        receiver: {
          type: 'sub-list' as const,
          accountId: mockAccountId,
          amount: mockAmount,
        },
        amount: mockAmount,
        erc20: mockErc20,
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
        args: [mockAccountId, mockErc20, mockAmount],
        contract: mockAddressDriverAddress,
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
          amount: 1000n,
        },
        amount: 1000n,
        erc20: '0xToken123' as const,
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
          amount: 1000n,
        },
        amount: 1000n,
        erc20: '0xToken123' as const,
      };

      await prepareOneTimeDonation(mockAdapter, params);

      expect(requireSupportedChain).toHaveBeenCalledWith(mockChainId);
    });

    it('should call requireWriteAccess with adapter', async () => {
      const mockAccountId = 123n;
      vi.mocked(resolveReceiverAccountId).mockResolvedValue(mockAccountId);

      const params = {
        receiver: {
          type: 'drip-list' as const,
          accountId: mockAccountId,
          amount: 1000n,
        },
        amount: 1000n,
        erc20: '0xToken123' as const,
      };

      await prepareOneTimeDonation(mockAdapter, params);

      expect(requireWriteAccess).toHaveBeenCalledWith(
        mockAdapter,
        'prepareDripListCreation',
      );
    });
  });
});
