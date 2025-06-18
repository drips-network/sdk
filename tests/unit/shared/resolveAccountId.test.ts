import {describe, it, expect, vi, beforeEach} from 'vitest';
import {resolveAccountId} from '../../../src/internal/shared/resolveAccountId';
import {ReadBlockchainAdapter} from '../../../src/internal/blockchain/BlockchainAdapter';
import {calcProjectId} from '../../../src/internal/projects/calcProjectId';
import {destructProjectUrl} from '../../../src/internal/projects/destructProjectUrl';
import {calcAddressId} from '../../../src/internal/shared/calcAddressId';
import {DripsError} from '../../../src/internal/shared/DripsError';

vi.mock('../../../src/internal/projects/calcProjectId');
vi.mock('../../../src/internal/projects/destructProjectUrl');
vi.mock('../../../src/internal/shared/calcAddressId');

describe('resolveAccountId', () => {
  let mockAdapter: ReadBlockchainAdapter;

  beforeEach(() => {
    mockAdapter = {} as ReadBlockchainAdapter;
    vi.clearAllMocks();
  });

  describe('project receiver', () => {
    it('should resolve account ID for project receiver', async () => {
      const mockAccountId = 123n;
      const mockUrl = 'https://github.com/owner/repo';
      const mockDestructured = {
        forge: 'github' as const,
        ownerName: 'owner',
        repoName: 'repo',
      };

      vi.mocked(destructProjectUrl).mockReturnValue(mockDestructured);
      vi.mocked(calcProjectId).mockResolvedValue(mockAccountId);

      const receiver = {
        type: 'project' as const,
        url: mockUrl,
      };

      const result = await resolveAccountId(mockAdapter, receiver);

      expect(result).toBe(mockAccountId);
      expect(destructProjectUrl).toHaveBeenCalledWith(mockUrl);
      expect(calcProjectId).toHaveBeenCalledWith(mockAdapter, {
        forge: 'github',
        name: 'owner/repo',
      });
    });

    it('should throw error if project receiver has no url', async () => {
      const receiver = {
        type: 'project' as const,
      };

      await expect(resolveAccountId(mockAdapter, receiver)).rejects.toThrow(
        DripsError,
      );
      await expect(resolveAccountId(mockAdapter, receiver)).rejects.toThrow(
        'Project receiver must have a url',
      );
    });
  });

  describe('address receiver', () => {
    it('should resolve account ID for address receiver', async () => {
      const mockAccountId = 456n;
      const mockAddress = '0x1234567890123456789012345678901234567890' as const;

      vi.mocked(calcAddressId).mockResolvedValue(mockAccountId);

      const receiver = {
        type: 'address' as const,
        address: mockAddress,
      };

      const result = await resolveAccountId(mockAdapter, receiver);

      expect(result).toBe(mockAccountId);
      expect(calcAddressId).toHaveBeenCalledWith(mockAdapter, mockAddress);
    });

    it('should throw error if address receiver has no address', async () => {
      const receiver = {
        type: 'address' as const,
      };

      await expect(resolveAccountId(mockAdapter, receiver)).rejects.toThrow(
        DripsError,
      );
      await expect(resolveAccountId(mockAdapter, receiver)).rejects.toThrow(
        'Address receiver must have an address',
      );
    });
  });

  describe('drip-list receiver', () => {
    it('should return account ID directly for drip-list receiver', async () => {
      const mockAccountId = 789n;

      const receiver = {
        type: 'drip-list' as const,
        accountId: mockAccountId,
      };

      const result = await resolveAccountId(mockAdapter, receiver);

      expect(result).toBe(mockAccountId);
    });

    it('should throw error if drip-list receiver has no accountId', async () => {
      const receiver = {
        type: 'drip-list' as const,
      };

      await expect(resolveAccountId(mockAdapter, receiver)).rejects.toThrow(
        DripsError,
      );
      await expect(resolveAccountId(mockAdapter, receiver)).rejects.toThrow(
        'drip-list receiver must have an accountId',
      );
    });
  });

  describe('sub-list receiver', () => {
    it('should return account ID directly for sub-list receiver', async () => {
      const mockAccountId = 101112n;

      const receiver = {
        type: 'sub-list' as const,
        accountId: mockAccountId,
      };

      const result = await resolveAccountId(mockAdapter, receiver);

      expect(result).toBe(mockAccountId);
    });

    it('should throw error if sub-list receiver has no accountId', async () => {
      const receiver = {
        type: 'sub-list' as const,
      };

      await expect(resolveAccountId(mockAdapter, receiver)).rejects.toThrow(
        DripsError,
      );
      await expect(resolveAccountId(mockAdapter, receiver)).rejects.toThrow(
        'sub-list receiver must have an accountId',
      );
    });
  });

  describe('ecosystem-main-account receiver', () => {
    it('should return account ID directly for ecosystem-main-account receiver', async () => {
      const mockAccountId = 131415n;

      const receiver = {
        type: 'ecosystem-main-account' as const,
        accountId: mockAccountId,
      };

      const result = await resolveAccountId(mockAdapter, receiver);

      expect(result).toBe(mockAccountId);
    });

    it('should throw error if ecosystem-main-account receiver has no accountId', async () => {
      const receiver = {
        type: 'ecosystem-main-account' as const,
      };

      await expect(resolveAccountId(mockAdapter, receiver)).rejects.toThrow(
        DripsError,
      );
      await expect(resolveAccountId(mockAdapter, receiver)).rejects.toThrow(
        'ecosystem-main-account receiver must have an accountId',
      );
    });
  });

  describe('unsupported receiver type', () => {
    it('should throw error for unsupported receiver type', async () => {
      const receiver = {
        type: 'unsupported' as any,
      };

      await expect(resolveAccountId(mockAdapter, receiver)).rejects.toThrow(
        DripsError,
      );
      await expect(resolveAccountId(mockAdapter, receiver)).rejects.toThrow(
        'Unsupported receiver type: unsupported',
      );
    });
  });
});
