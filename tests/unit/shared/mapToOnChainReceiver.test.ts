import {describe, it, expect, vi, beforeEach} from 'vitest';
import {mapToOnChainReceiver} from '../../../src/internal/shared/mapToOnChainReceiver';
import type {ReadBlockchainAdapter} from '../../../src/internal/blockchain/BlockchainAdapter';
import type {Address} from 'viem';

// Mock dependencies
vi.mock('../../../src/internal/shared/resolveAccountId');

import {resolveAccountId} from '../../../src/internal/shared/resolveAccountId';

const mockResolveAccountId = vi.mocked(resolveAccountId);

describe('mapToOnChainReceiver', () => {
  let mockAdapter: ReadBlockchainAdapter;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAdapter = {
      getChainId: vi.fn(),
      call: vi.fn(),
    } as any;
  });

  describe('project receiver', () => {
    it('should map project receiver to on-chain receiver', async () => {
      // Arrange
      const projectReceiver = {
        type: 'project' as const,
        url: 'https://github.com/owner/repo',
        weight: 500000,
      };

      mockResolveAccountId.mockResolvedValue(123n);

      // Act
      const result = await mapToOnChainReceiver(mockAdapter, projectReceiver);

      // Assert
      expect(result).toEqual({
        accountId: 123n,
        weight: 500000,
      });
      expect(mockResolveAccountId).toHaveBeenCalledWith(
        mockAdapter,
        projectReceiver,
      );
    });

    it('should handle project receiver with different weight', async () => {
      // Arrange
      const projectReceiver = {
        type: 'project' as const,
        url: 'https://github.com/myorg/myrepo',
        weight: 750000,
      };

      mockResolveAccountId.mockResolvedValue(456n);

      // Act
      const result = await mapToOnChainReceiver(mockAdapter, projectReceiver);

      // Assert
      expect(result).toEqual({
        accountId: 456n,
        weight: 750000,
      });
      expect(mockResolveAccountId).toHaveBeenCalledWith(
        mockAdapter,
        projectReceiver,
      );
    });

    it('should propagate error from resolveAccountId', async () => {
      // Arrange
      const projectReceiver = {
        type: 'project' as const,
        url: 'invalid-url',
        weight: 500000,
      };

      const resolveError = new Error('Failed to resolve account ID');
      mockResolveAccountId.mockRejectedValue(resolveError);

      // Act & Assert
      await expect(
        mapToOnChainReceiver(mockAdapter, projectReceiver),
      ).rejects.toThrow('Failed to resolve account ID');
    });
  });

  describe('drip-list receiver', () => {
    it('should map drip-list receiver to on-chain receiver', async () => {
      // Arrange
      const dripListReceiver = {
        type: 'drip-list' as const,
        accountId: 123n,
        weight: 500000,
      };

      mockResolveAccountId.mockResolvedValue(123n);

      // Act
      const result = await mapToOnChainReceiver(mockAdapter, dripListReceiver);

      // Assert
      expect(result).toEqual({
        accountId: 123n,
        weight: 500000,
      });
      expect(mockResolveAccountId).toHaveBeenCalledWith(
        mockAdapter,
        dripListReceiver,
      );
    });

    it('should handle drip-list receiver with zero accountId', async () => {
      // Arrange
      const dripListReceiver = {
        type: 'drip-list' as const,
        accountId: 0n,
        weight: 250000,
      };

      mockResolveAccountId.mockResolvedValue(0n);

      // Act
      const result = await mapToOnChainReceiver(mockAdapter, dripListReceiver);

      // Assert
      expect(result).toEqual({
        accountId: 0n,
        weight: 250000,
      });
    });

    it('should handle drip-list receiver with large accountId', async () => {
      // Arrange
      const largeAccountId = BigInt('0xffffffffffffffffffffffffffffffff');
      const dripListReceiver = {
        type: 'drip-list' as const,
        accountId: largeAccountId,
        weight: 750000,
      };

      mockResolveAccountId.mockResolvedValue(largeAccountId);

      // Act
      const result = await mapToOnChainReceiver(mockAdapter, dripListReceiver);

      // Assert
      expect(result).toEqual({
        accountId: largeAccountId,
        weight: 750000,
      });
    });
  });

  describe('sub-list receiver', () => {
    it('should map sub-list receiver to on-chain receiver', async () => {
      // Arrange
      const subListReceiver = {
        type: 'sub-list' as const,
        accountId: 456n,
        weight: 300000,
      };

      mockResolveAccountId.mockResolvedValue(456n);

      // Act
      const result = await mapToOnChainReceiver(mockAdapter, subListReceiver);

      // Assert
      expect(result).toEqual({
        accountId: 456n,
        weight: 300000,
      });
      expect(mockResolveAccountId).toHaveBeenCalledWith(
        mockAdapter,
        subListReceiver,
      );
    });

    it('should handle sub-list receiver with zero weight', async () => {
      // Arrange
      const subListReceiver = {
        type: 'sub-list' as const,
        accountId: 789n,
        weight: 0,
      };

      mockResolveAccountId.mockResolvedValue(789n);

      // Act
      const result = await mapToOnChainReceiver(mockAdapter, subListReceiver);

      // Assert
      expect(result).toEqual({
        accountId: 789n,
        weight: 0,
      });
    });
  });

  describe('address receiver', () => {
    it('should map address receiver to on-chain receiver', async () => {
      // Arrange
      const address: Address = '0x1234567890123456789012345678901234567890';
      const addressReceiver = {
        type: 'address' as const,
        address,
        weight: 400000,
      };

      mockResolveAccountId.mockResolvedValue(999n);

      // Act
      const result = await mapToOnChainReceiver(mockAdapter, addressReceiver);

      // Assert
      expect(result).toEqual({
        accountId: 999n,
        weight: 400000,
      });
      expect(mockResolveAccountId).toHaveBeenCalledWith(
        mockAdapter,
        addressReceiver,
      );
    });

    it('should handle address receiver with zero address', async () => {
      // Arrange
      const zeroAddress: Address = '0x0000000000000000000000000000000000000000';
      const addressReceiver = {
        type: 'address' as const,
        address: zeroAddress,
        weight: 100000,
      };

      mockResolveAccountId.mockResolvedValue(0n);

      // Act
      const result = await mapToOnChainReceiver(mockAdapter, addressReceiver);

      // Assert
      expect(result).toEqual({
        accountId: 0n,
        weight: 100000,
      });
      expect(mockResolveAccountId).toHaveBeenCalledWith(
        mockAdapter,
        addressReceiver,
      );
    });

    it('should propagate error from resolveAccountId', async () => {
      // Arrange
      const address: Address = '0x1234567890123456789012345678901234567890';
      const addressReceiver = {
        type: 'address' as const,
        address,
        weight: 400000,
      };

      const resolveError = new Error('Address calculation failed');
      mockResolveAccountId.mockRejectedValue(resolveError);

      // Act & Assert
      await expect(
        mapToOnChainReceiver(mockAdapter, addressReceiver),
      ).rejects.toThrow('Address calculation failed');
    });
  });

  describe('ecosystem-main-account receiver', () => {
    it('should map ecosystem-main-account receiver to on-chain receiver', async () => {
      // Arrange
      const ecosystemReceiver = {
        type: 'ecosystem-main-account' as const,
        accountId: 777n,
        weight: 800000,
      };

      mockResolveAccountId.mockResolvedValue(777n);

      // Act
      const result = await mapToOnChainReceiver(mockAdapter, ecosystemReceiver);

      // Assert
      expect(result).toEqual({
        accountId: 777n,
        weight: 800000,
      });
      expect(mockResolveAccountId).toHaveBeenCalledWith(
        mockAdapter,
        ecosystemReceiver,
      );
    });

    it('should handle ecosystem-main-account receiver with maximum weight', async () => {
      // Arrange
      const ecosystemReceiver = {
        type: 'ecosystem-main-account' as const,
        accountId: 888n,
        weight: 1000000,
      };

      mockResolveAccountId.mockResolvedValue(888n);

      // Act
      const result = await mapToOnChainReceiver(mockAdapter, ecosystemReceiver);

      // Assert
      expect(result).toEqual({
        accountId: 888n,
        weight: 1000000,
      });
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle receivers with very large weights', async () => {
      // Arrange
      const largeWeight = 999999999;
      const dripListReceiver = {
        type: 'drip-list' as const,
        accountId: 123n,
        weight: largeWeight,
      };

      mockResolveAccountId.mockResolvedValue(123n);

      // Act
      const result = await mapToOnChainReceiver(mockAdapter, dripListReceiver);

      // Assert
      expect(result).toEqual({
        accountId: 123n,
        weight: largeWeight,
      });
    });

    it('should handle receivers with negative weights', async () => {
      // Arrange
      const negativeWeight = -100;
      const subListReceiver = {
        type: 'sub-list' as const,
        accountId: 456n,
        weight: negativeWeight,
      };

      mockResolveAccountId.mockResolvedValue(456n);

      // Act
      const result = await mapToOnChainReceiver(mockAdapter, subListReceiver);

      // Assert
      expect(result).toEqual({
        accountId: 456n,
        weight: negativeWeight,
      });
    });

    it('should handle receivers with very large accountIds', async () => {
      // Arrange
      const largeAccountId = BigInt(
        '0x123456789abcdef0123456789abcdef0123456789abcdef0',
      );
      const ecosystemReceiver = {
        type: 'ecosystem-main-account' as const,
        accountId: largeAccountId,
        weight: 500000,
      };

      mockResolveAccountId.mockResolvedValue(largeAccountId);

      // Act
      const result = await mapToOnChainReceiver(mockAdapter, ecosystemReceiver);

      // Assert
      expect(result).toEqual({
        accountId: largeAccountId,
        weight: 500000,
      });
    });
  });

  describe('immutability and side effects', () => {
    it('should not modify input receiver', async () => {
      // Arrange
      const originalReceiver = {
        type: 'drip-list' as const,
        accountId: 123n,
        weight: 500000,
      };
      const receiverCopy = {...originalReceiver};

      mockResolveAccountId.mockResolvedValue(123n);

      // Act
      await mapToOnChainReceiver(mockAdapter, originalReceiver);

      // Assert
      expect(originalReceiver).toEqual(receiverCopy);
    });

    it('should not modify adapter', async () => {
      // Arrange
      const dripListReceiver = {
        type: 'drip-list' as const,
        accountId: 123n,
        weight: 500000,
      };
      const originalAdapter = {...mockAdapter};

      mockResolveAccountId.mockResolvedValue(123n);

      // Act
      await mapToOnChainReceiver(mockAdapter, dripListReceiver);

      // Assert
      expect(mockAdapter).toEqual(originalAdapter);
    });

    it('should return new object instances', async () => {
      // Arrange
      const dripListReceiver = {
        type: 'drip-list' as const,
        accountId: 123n,
        weight: 500000,
      };

      mockResolveAccountId.mockResolvedValue(123n);

      // Act
      const result1 = await mapToOnChainReceiver(mockAdapter, dripListReceiver);
      const result2 = await mapToOnChainReceiver(mockAdapter, dripListReceiver);

      // Assert
      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });
  });

  describe('async behavior', () => {
    it('should handle concurrent calls correctly', async () => {
      // Arrange
      const receivers = [
        {type: 'drip-list' as const, accountId: 1n, weight: 100000},
        {type: 'sub-list' as const, accountId: 2n, weight: 200000},
        {
          type: 'ecosystem-main-account' as const,
          accountId: 3n,
          weight: 300000,
        },
      ];

      mockResolveAccountId
        .mockResolvedValueOnce(1n)
        .mockResolvedValueOnce(2n)
        .mockResolvedValueOnce(3n);

      // Act
      const results = await Promise.all(
        receivers.map(receiver => mapToOnChainReceiver(mockAdapter, receiver)),
      );

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({accountId: 1n, weight: 100000});
      expect(results[1]).toEqual({accountId: 2n, weight: 200000});
      expect(results[2]).toEqual({accountId: 3n, weight: 300000});
    });

    it('should handle mixed success and failure scenarios', async () => {
      // Arrange
      const projectReceiver = {
        type: 'project' as const,
        url: 'https://github.com/owner/repo',
        weight: 500000,
      };
      const dripListReceiver = {
        type: 'drip-list' as const,
        accountId: 123n,
        weight: 300000,
      };

      mockResolveAccountId
        .mockRejectedValueOnce(new Error('Project calc failed'))
        .mockResolvedValueOnce(123n);

      // Act
      const projectPromise = mapToOnChainReceiver(mockAdapter, projectReceiver);
      const dripListPromise = mapToOnChainReceiver(
        mockAdapter,
        dripListReceiver,
      );

      // Assert
      await expect(projectPromise).rejects.toThrow('Project calc failed');
      await expect(dripListPromise).resolves.toEqual({
        accountId: 123n,
        weight: 300000,
      });
    });
  });

  describe('performance', () => {
    it('should handle multiple mappings efficiently', async () => {
      // Arrange
      const receivers = Array.from({length: 100}, (_, i) => ({
        type: 'drip-list' as const,
        accountId: BigInt(i),
        weight: i * 1000,
      }));

      // Mock resolveAccountId to return the expected accountId for each receiver
      receivers.forEach((_, i) => {
        mockResolveAccountId.mockResolvedValueOnce(BigInt(i));
      });

      // Act
      const startTime = performance.now();
      const results = await Promise.all(
        receivers.map(receiver => mapToOnChainReceiver(mockAdapter, receiver)),
      );
      const endTime = performance.now();

      // Assert
      expect(results).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast
      results.forEach((result, i) => {
        expect(result).toEqual({
          accountId: BigInt(i),
          weight: i * 1000,
        });
      });
    });
  });
});
