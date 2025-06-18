import {describe, it, expect, vi, beforeEach} from 'vitest';
import {mapToMetadataReceiver} from '../../../src/internal/metadata/mapToMetadataReceiver';
import {DripsError} from '../../../src/internal/shared/DripsError';
import type {ReadBlockchainAdapter} from '../../../src/internal/blockchain/BlockchainAdapter';
import type {SdkSplitsReceiver} from '../../../src/internal/shared/mapToOnChainReceiver';
import type {Address} from 'viem';

// Mock dependencies
vi.mock('../../../src/internal/shared/resolveAccountId');
vi.mock('../../../src/internal/projects/destructProjectUrl');

import {resolveAccountId} from '../../../src/internal/shared/resolveAccountId';
import {destructProjectUrl} from '../../../src/internal/projects/destructProjectUrl';

const mockResolveAccountId = vi.mocked(resolveAccountId);
const mockDestructProjectUrl = vi.mocked(destructProjectUrl);

describe('mapToMetadataReceiver', () => {
  let mockAdapter: ReadBlockchainAdapter;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAdapter = {
      getChainId: vi.fn(),
      call: vi.fn(),
    } as any;
  });

  describe('project receiver', () => {
    it('should map project receiver to metadata receiver', async () => {
      // Arrange
      const projectReceiver: SdkSplitsReceiver = {
        type: 'project',
        url: 'https://github.com/owner/repo',
        weight: 500000,
      };

      mockDestructProjectUrl.mockReturnValue({
        forge: 'github',
        ownerName: 'owner',
        repoName: 'repo',
      });
      mockResolveAccountId.mockResolvedValue(123n);

      // Act
      const result = await mapToMetadataReceiver(mockAdapter, projectReceiver);

      // Assert
      expect(result).toEqual({
        type: 'repoDriver',
        weight: 500000,
        accountId: '123',
        source: {
          forge: 'github',
          url: 'https://github.com/owner/repo',
          ownerName: 'owner',
          repoName: 'repo',
        },
      });
      expect(mockResolveAccountId).toHaveBeenCalledWith(
        mockAdapter,
        projectReceiver,
      );
      expect(mockDestructProjectUrl).toHaveBeenCalledWith(
        'https://github.com/owner/repo',
      );
    });

    it('should handle project receiver with different owner/repo names', async () => {
      // Arrange
      const projectReceiver: SdkSplitsReceiver = {
        type: 'project',
        url: 'https://github.com/myorg/myrepo',
        weight: 750000,
      };

      mockDestructProjectUrl.mockReturnValue({
        forge: 'github',
        ownerName: 'myorg',
        repoName: 'myrepo',
      });
      mockResolveAccountId.mockResolvedValue(456n);

      // Act
      const result = await mapToMetadataReceiver(mockAdapter, projectReceiver);

      // Assert
      expect(result).toEqual({
        type: 'repoDriver',
        weight: 750000,
        accountId: '456',
        source: {
          forge: 'github',
          url: 'https://github.com/myorg/myrepo',
          ownerName: 'myorg',
          repoName: 'myrepo',
        },
      });
    });

    it('should convert accountId to string', async () => {
      // Arrange
      const projectReceiver: SdkSplitsReceiver = {
        type: 'project',
        url: 'https://github.com/owner/repo',
        weight: 500000,
      };

      mockDestructProjectUrl.mockReturnValue({
        forge: 'github',
        ownerName: 'owner',
        repoName: 'repo',
      });
      const largeAccountId = BigInt('0xffffffffffffffffffffffffffffffff');
      mockResolveAccountId.mockResolvedValue(largeAccountId);

      // Act
      const result = await mapToMetadataReceiver(mockAdapter, projectReceiver);

      // Assert
      expect(result.accountId).toBe(largeAccountId.toString());
      expect(typeof result.accountId).toBe('string');
    });

    it('should propagate error from resolveAccountId', async () => {
      // Arrange
      const projectReceiver: SdkSplitsReceiver = {
        type: 'project',
        url: 'https://github.com/owner/repo',
        weight: 500000,
      };

      mockDestructProjectUrl.mockReturnValue({
        forge: 'github',
        ownerName: 'owner',
        repoName: 'repo',
      });
      const resolveError = new Error('Failed to resolve account ID');
      mockResolveAccountId.mockRejectedValue(resolveError);

      // Act & Assert
      await expect(
        mapToMetadataReceiver(mockAdapter, projectReceiver),
      ).rejects.toThrow('Failed to resolve account ID');
    });
  });

  describe('drip-list receiver', () => {
    it('should map drip-list receiver to metadata receiver', async () => {
      // Arrange
      const dripListReceiver: SdkSplitsReceiver = {
        type: 'drip-list',
        accountId: 123n,
        weight: 500000,
      };

      mockResolveAccountId.mockResolvedValue(123n);

      // Act
      const result = await mapToMetadataReceiver(mockAdapter, dripListReceiver);

      // Assert
      expect(result).toEqual({
        type: 'dripList',
        weight: 500000,
        accountId: '123',
      });
      expect(mockResolveAccountId).toHaveBeenCalledWith(
        mockAdapter,
        dripListReceiver,
      );
    });

    it('should handle drip-list receiver with zero accountId', async () => {
      // Arrange
      const dripListReceiver: SdkSplitsReceiver = {
        type: 'drip-list',
        accountId: 0n,
        weight: 250000,
      };

      mockResolveAccountId.mockResolvedValue(0n);

      // Act
      const result = await mapToMetadataReceiver(mockAdapter, dripListReceiver);

      // Assert
      expect(result).toEqual({
        type: 'dripList',
        weight: 250000,
        accountId: '0',
      });
    });

    it('should handle drip-list receiver with large accountId', async () => {
      // Arrange
      const largeAccountId = BigInt('0xffffffffffffffffffffffffffffffff');
      const dripListReceiver: SdkSplitsReceiver = {
        type: 'drip-list',
        accountId: largeAccountId,
        weight: 750000,
      };

      mockResolveAccountId.mockResolvedValue(largeAccountId);

      // Act
      const result = await mapToMetadataReceiver(mockAdapter, dripListReceiver);

      // Assert
      expect(result).toEqual({
        type: 'dripList',
        weight: 750000,
        accountId: largeAccountId.toString(),
      });
      expect(typeof result.accountId).toBe('string');
    });
  });

  describe('sub-list receiver', () => {
    it('should map sub-list receiver to metadata receiver', async () => {
      // Arrange
      const subListReceiver: SdkSplitsReceiver = {
        type: 'sub-list',
        accountId: 456n,
        weight: 300000,
      };

      mockResolveAccountId.mockResolvedValue(456n);

      // Act
      const result = await mapToMetadataReceiver(mockAdapter, subListReceiver);

      // Assert
      expect(result).toEqual({
        type: 'subList',
        weight: 300000,
        accountId: '456',
      });
      expect(mockResolveAccountId).toHaveBeenCalledWith(
        mockAdapter,
        subListReceiver,
      );
    });

    it('should handle sub-list receiver with zero weight', async () => {
      // Arrange
      const subListReceiver: SdkSplitsReceiver = {
        type: 'sub-list',
        accountId: 789n,
        weight: 0,
      };

      mockResolveAccountId.mockResolvedValue(789n);

      // Act
      const result = await mapToMetadataReceiver(mockAdapter, subListReceiver);

      // Assert
      expect(result).toEqual({
        type: 'subList',
        weight: 0,
        accountId: '789',
      });
    });
  });

  describe('address receiver', () => {
    it('should map address receiver to metadata receiver', async () => {
      // Arrange
      const address: Address = '0x1234567890123456789012345678901234567890';
      const addressReceiver: SdkSplitsReceiver = {
        type: 'address',
        address,
        weight: 400000,
      };

      mockResolveAccountId.mockResolvedValue(999n);

      // Act
      const result = await mapToMetadataReceiver(mockAdapter, addressReceiver);

      // Assert
      expect(result).toEqual({
        type: 'address',
        weight: 400000,
        accountId: '999',
      });
      expect(mockResolveAccountId).toHaveBeenCalledWith(
        mockAdapter,
        addressReceiver,
      );
    });

    it('should handle address receiver with zero address', async () => {
      // Arrange
      const zeroAddress: Address = '0x0000000000000000000000000000000000000000';
      const addressReceiver: SdkSplitsReceiver = {
        type: 'address',
        address: zeroAddress,
        weight: 100000,
      };

      mockResolveAccountId.mockResolvedValue(0n);

      // Act
      const result = await mapToMetadataReceiver(mockAdapter, addressReceiver);

      // Assert
      expect(result).toEqual({
        type: 'address',
        weight: 100000,
        accountId: '0',
      });
      expect(mockResolveAccountId).toHaveBeenCalledWith(
        mockAdapter,
        addressReceiver,
      );
    });

    it('should propagate error from resolveAccountId', async () => {
      // Arrange
      const address: Address = '0x1234567890123456789012345678901234567890';
      const addressReceiver: SdkSplitsReceiver = {
        type: 'address',
        address,
        weight: 400000,
      };

      const resolveError = new Error('Address calculation failed');
      mockResolveAccountId.mockRejectedValue(resolveError);

      // Act & Assert
      await expect(
        mapToMetadataReceiver(mockAdapter, addressReceiver),
      ).rejects.toThrow('Address calculation failed');
    });
  });

  describe('unsupported receiver type', () => {
    it('should throw DripsError for unsupported receiver type', async () => {
      // Arrange
      const unsupportedReceiver = {
        type: 'unsupported-type',
        accountId: 123n,
        weight: 500000,
      } as any;

      // Reset the mock completely for this test so the actual function logic runs
      mockResolveAccountId.mockReset();

      // Act & Assert
      await expect(
        mapToMetadataReceiver(mockAdapter, unsupportedReceiver),
      ).rejects.toThrow(DripsError);
      await expect(
        mapToMetadataReceiver(mockAdapter, unsupportedReceiver),
      ).rejects.toThrow('Unsupported receiver type: unsupported-type');
    });

    it('should handle ecosystem-main-account receiver (unsupported in metadata)', async () => {
      // Arrange
      const ecosystemReceiver: SdkSplitsReceiver = {
        type: 'ecosystem-main-account',
        accountId: 777n,
        weight: 800000,
      };

      // Mock resolveAccountId to return a value, but the function should still throw because ecosystem-main-account is not supported in metadata
      mockResolveAccountId.mockResolvedValue(777n);

      // Act & Assert
      await expect(
        mapToMetadataReceiver(mockAdapter, ecosystemReceiver),
      ).rejects.toThrow(DripsError);
      await expect(
        mapToMetadataReceiver(mockAdapter, ecosystemReceiver),
      ).rejects.toThrow('Unsupported receiver type: ecosystem-main-account');
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle receivers with very large weights', async () => {
      // Arrange
      const largeWeight = 999999999;
      const dripListReceiver: SdkSplitsReceiver = {
        type: 'drip-list',
        accountId: 123n,
        weight: largeWeight,
      };

      mockResolveAccountId.mockResolvedValue(123n);

      // Act
      const result = await mapToMetadataReceiver(mockAdapter, dripListReceiver);

      // Assert
      expect(result).toEqual({
        type: 'dripList',
        weight: largeWeight,
        accountId: '123',
      });
    });

    it('should handle receivers with negative weights', async () => {
      // Arrange
      const negativeWeight = -100;
      const subListReceiver: SdkSplitsReceiver = {
        type: 'sub-list',
        accountId: 456n,
        weight: negativeWeight,
      };

      mockResolveAccountId.mockResolvedValue(456n);

      // Act
      const result = await mapToMetadataReceiver(mockAdapter, subListReceiver);

      // Assert
      expect(result).toEqual({
        type: 'subList',
        weight: negativeWeight,
        accountId: '456',
      });
    });

    it('should handle receivers with very large accountIds', async () => {
      // Arrange
      const largeAccountId = BigInt(
        '0x123456789abcdef0123456789abcdef0123456789abcdef0',
      );
      const dripListReceiver: SdkSplitsReceiver = {
        type: 'drip-list',
        accountId: largeAccountId,
        weight: 500000,
      };

      mockResolveAccountId.mockResolvedValue(largeAccountId);

      // Act
      const result = await mapToMetadataReceiver(mockAdapter, dripListReceiver);

      // Assert
      expect(result).toEqual({
        type: 'dripList',
        weight: 500000,
        accountId: largeAccountId.toString(),
      });
    });
  });

  describe('type conversion', () => {
    it('should always convert accountId to string for all receiver types', async () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = [
        {type: 'drip-list', accountId: 123n, weight: 100000},
        {type: 'sub-list', accountId: 456n, weight: 200000},
      ];

      mockResolveAccountId
        .mockResolvedValueOnce(123n)
        .mockResolvedValueOnce(456n);

      // Act
      const results = await Promise.all(
        receivers.map(receiver => mapToMetadataReceiver(mockAdapter, receiver)),
      );

      // Assert
      results.forEach(result => {
        expect(typeof result.accountId).toBe('string');
      });
    });

    it('should handle zero accountId conversion', async () => {
      // Arrange
      const dripListReceiver: SdkSplitsReceiver = {
        type: 'drip-list',
        accountId: 0n,
        weight: 100000,
      };

      mockResolveAccountId.mockResolvedValue(0n);

      // Act
      const result = await mapToMetadataReceiver(mockAdapter, dripListReceiver);

      // Assert
      expect(result.accountId).toBe('0');
      expect(typeof result.accountId).toBe('string');
    });

    it('should handle negative accountId conversion', async () => {
      // Arrange
      const subListReceiver: SdkSplitsReceiver = {
        type: 'sub-list',
        accountId: -123n,
        weight: 100000,
      };

      mockResolveAccountId.mockResolvedValue(-123n);

      // Act
      const result = await mapToMetadataReceiver(mockAdapter, subListReceiver);

      // Assert
      expect(result.accountId).toBe('-123');
      expect(typeof result.accountId).toBe('string');
    });
  });

  describe('performance', () => {
    it('should handle multiple mappings efficiently', async () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = Array.from(
        {length: 100},
        (_, i) => ({
          type: 'drip-list',
          accountId: BigInt(i),
          weight: i * 1000,
        }),
      );

      // Mock resolveAccountId to return the expected accountId for each receiver
      receivers.forEach((_, i) => {
        mockResolveAccountId.mockResolvedValueOnce(BigInt(i));
      });

      // Act
      const startTime = performance.now();
      const results = await Promise.all(
        receivers.map(receiver => mapToMetadataReceiver(mockAdapter, receiver)),
      );
      const endTime = performance.now();

      // Assert
      expect(results).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
      results.forEach((result, i) => {
        expect(result).toEqual({
          type: 'dripList',
          accountId: i.toString(),
          weight: i * 1000,
        });
      });
    });
  });
});
