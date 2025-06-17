import {describe, it, expect, vi, beforeEach} from 'vitest';
import {mapToMetadataReceiver} from '../../../src/internal/metadata/mapToMetadataReceiver';
import {DripsError} from '../../../src/internal/shared/DripsError';
import type {ReadBlockchainAdapter} from '../../../src/internal/blockchain/BlockchainAdapter';
import type {SdkSplitsReceiver} from '../../../src/internal/shared/mapToOnChainReceiver';
import type {Address} from 'viem';

// Mock dependencies
vi.mock('../../../src/internal/projects/calcProjectId');
vi.mock('../../../src/internal/projects/destructProjectUrl');
vi.mock('../../../src/internal/shared/calcAddressId');

import {calcProjectId} from '../../../src/internal/projects/calcProjectId';
import {destructProjectUrl} from '../../../src/internal/projects/destructProjectUrl';
import {calcAddressId} from '../../../src/internal/shared/calcAddressId';

const mockCalcProjectId = vi.mocked(calcProjectId);
const mockDestructProjectUrl = vi.mocked(destructProjectUrl);
const mockCalcAddressId = vi.mocked(calcAddressId);

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
      mockCalcProjectId.mockResolvedValue(123n);

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
      expect(mockDestructProjectUrl).toHaveBeenCalledWith(
        'https://github.com/owner/repo',
      );
      expect(mockCalcProjectId).toHaveBeenCalledWith(mockAdapter, {
        forge: 'github',
        name: 'owner/repo',
      });
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
      mockCalcProjectId.mockResolvedValue(456n);

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

    it('should handle project receiver with zero weight', async () => {
      // Arrange
      const projectReceiver: SdkSplitsReceiver = {
        type: 'project',
        url: 'https://github.com/owner/repo',
        weight: 0,
      };

      mockDestructProjectUrl.mockReturnValue({
        forge: 'github',
        ownerName: 'owner',
        repoName: 'repo',
      });
      mockCalcProjectId.mockResolvedValue(789n);

      // Act
      const result = await mapToMetadataReceiver(mockAdapter, projectReceiver);

      // Assert
      expect(result).toEqual({
        type: 'repoDriver',
        weight: 0,
        accountId: '789',
        source: {
          forge: 'github',
          url: 'https://github.com/owner/repo',
          ownerName: 'owner',
          repoName: 'repo',
        },
      });
    });

    it('should handle project receiver with maximum weight', async () => {
      // Arrange
      const projectReceiver: SdkSplitsReceiver = {
        type: 'project',
        url: 'https://github.com/owner/repo',
        weight: 1000000,
      };

      mockDestructProjectUrl.mockReturnValue({
        forge: 'github',
        ownerName: 'owner',
        repoName: 'repo',
      });
      mockCalcProjectId.mockResolvedValue(999n);

      // Act
      const result = await mapToMetadataReceiver(mockAdapter, projectReceiver);

      // Assert
      expect(result).toEqual({
        type: 'repoDriver',
        weight: 1000000,
        accountId: '999',
        source: {
          forge: 'github',
          url: 'https://github.com/owner/repo',
          ownerName: 'owner',
          repoName: 'repo',
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
      mockCalcProjectId.mockResolvedValue(largeAccountId);

      // Act
      const result = await mapToMetadataReceiver(mockAdapter, projectReceiver);

      // Assert
      expect(result.accountId).toBe(largeAccountId.toString());
      expect(typeof result.accountId).toBe('string');
    });

    it('should propagate error from destructProjectUrl', async () => {
      // Arrange
      const projectReceiver: SdkSplitsReceiver = {
        type: 'project',
        url: 'invalid-url',
        weight: 500000,
      };

      const destructError = new Error('Invalid URL');
      mockDestructProjectUrl.mockImplementation(() => {
        throw destructError;
      });

      // Act & Assert
      await expect(
        mapToMetadataReceiver(mockAdapter, projectReceiver),
      ).rejects.toThrow('Invalid URL');
    });

    it('should propagate error from calcProjectId', async () => {
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
      const calcError = new Error('Calculation failed');
      mockCalcProjectId.mockRejectedValue(calcError);

      // Act & Assert
      await expect(
        mapToMetadataReceiver(mockAdapter, projectReceiver),
      ).rejects.toThrow('Calculation failed');
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

      // Act
      const result = await mapToMetadataReceiver(mockAdapter, dripListReceiver);

      // Assert
      expect(result).toEqual({
        type: 'dripList',
        weight: 500000,
        accountId: '123',
      });
    });

    it('should handle drip-list receiver with zero accountId', async () => {
      // Arrange
      const dripListReceiver: SdkSplitsReceiver = {
        type: 'drip-list',
        accountId: 0n,
        weight: 250000,
      };

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

    it('should handle drip-list receiver with zero weight', async () => {
      // Arrange
      const dripListReceiver: SdkSplitsReceiver = {
        type: 'drip-list',
        accountId: 456n,
        weight: 0,
      };

      // Act
      const result = await mapToMetadataReceiver(mockAdapter, dripListReceiver);

      // Assert
      expect(result).toEqual({
        type: 'dripList',
        weight: 0,
        accountId: '456',
      });
    });

    it('should handle drip-list receiver with maximum weight', async () => {
      // Arrange
      const dripListReceiver: SdkSplitsReceiver = {
        type: 'drip-list',
        accountId: 789n,
        weight: 1000000,
      };

      // Act
      const result = await mapToMetadataReceiver(mockAdapter, dripListReceiver);

      // Assert
      expect(result).toEqual({
        type: 'dripList',
        weight: 1000000,
        accountId: '789',
      });
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

      // Act
      const result = await mapToMetadataReceiver(mockAdapter, subListReceiver);

      // Assert
      expect(result).toEqual({
        type: 'subList',
        weight: 300000,
        accountId: '456',
      });
    });

    it('should handle sub-list receiver with zero weight', async () => {
      // Arrange
      const subListReceiver: SdkSplitsReceiver = {
        type: 'sub-list',
        accountId: 789n,
        weight: 0,
      };

      // Act
      const result = await mapToMetadataReceiver(mockAdapter, subListReceiver);

      // Assert
      expect(result).toEqual({
        type: 'subList',
        weight: 0,
        accountId: '789',
      });
    });

    it('should handle sub-list receiver with large accountId', async () => {
      // Arrange
      const largeAccountId = BigInt('0x123456789abcdef0123456789abcdef0');
      const subListReceiver: SdkSplitsReceiver = {
        type: 'sub-list',
        accountId: largeAccountId,
        weight: 500000,
      };

      // Act
      const result = await mapToMetadataReceiver(mockAdapter, subListReceiver);

      // Assert
      expect(result).toEqual({
        type: 'subList',
        weight: 500000,
        accountId: largeAccountId.toString(),
      });
      expect(typeof result.accountId).toBe('string');
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

      mockCalcAddressId.mockResolvedValue(999n);

      // Act
      const result = await mapToMetadataReceiver(mockAdapter, addressReceiver);

      // Assert
      expect(result).toEqual({
        type: 'address',
        weight: 400000,
        accountId: '999',
      });
      expect(mockCalcAddressId).toHaveBeenCalledWith(mockAdapter, address);
    });

    it('should handle address receiver with zero address', async () => {
      // Arrange
      const zeroAddress: Address = '0x0000000000000000000000000000000000000000';
      const addressReceiver: SdkSplitsReceiver = {
        type: 'address',
        address: zeroAddress,
        weight: 100000,
      };

      mockCalcAddressId.mockResolvedValue(0n);

      // Act
      const result = await mapToMetadataReceiver(mockAdapter, addressReceiver);

      // Assert
      expect(result).toEqual({
        type: 'address',
        weight: 100000,
        accountId: '0',
      });
      expect(mockCalcAddressId).toHaveBeenCalledWith(mockAdapter, zeroAddress);
    });

    it('should handle address receiver with checksummed address', async () => {
      // Arrange
      const checksummedAddress: Address =
        '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';
      const addressReceiver: SdkSplitsReceiver = {
        type: 'address',
        address: checksummedAddress,
        weight: 600000,
      };

      mockCalcAddressId.mockResolvedValue(555n);

      // Act
      const result = await mapToMetadataReceiver(mockAdapter, addressReceiver);

      // Assert
      expect(result).toEqual({
        type: 'address',
        weight: 600000,
        accountId: '555',
      });
      expect(mockCalcAddressId).toHaveBeenCalledWith(
        mockAdapter,
        checksummedAddress,
      );
    });

    it('should convert accountId to string', async () => {
      // Arrange
      const address: Address = '0x1234567890123456789012345678901234567890';
      const addressReceiver: SdkSplitsReceiver = {
        type: 'address',
        address,
        weight: 400000,
      };

      const largeAccountId = BigInt('0xffffffffffffffffffffffffffffffff');
      mockCalcAddressId.mockResolvedValue(largeAccountId);

      // Act
      const result = await mapToMetadataReceiver(mockAdapter, addressReceiver);

      // Assert
      expect(result.accountId).toBe(largeAccountId.toString());
      expect(typeof result.accountId).toBe('string');
    });

    it('should propagate error from calcAddressId', async () => {
      // Arrange
      const address: Address = '0x1234567890123456789012345678901234567890';
      const addressReceiver: SdkSplitsReceiver = {
        type: 'address',
        address,
        weight: 400000,
      };

      const calcError = new Error('Address calculation failed');
      mockCalcAddressId.mockRejectedValue(calcError);

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

      // Act & Assert
      await expect(
        mapToMetadataReceiver(mockAdapter, unsupportedReceiver),
      ).rejects.toThrow(DripsError);
      await expect(
        mapToMetadataReceiver(mockAdapter, unsupportedReceiver),
      ).rejects.toThrow('Unsupported receiver type: unsupported-type');
    });

    it('should include receiver in error meta', async () => {
      // Arrange
      const unsupportedReceiver = {
        type: 'invalid-type',
        someProperty: 'value',
      } as any;

      // Act & Assert
      try {
        await mapToMetadataReceiver(mockAdapter, unsupportedReceiver);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(DripsError);
        const dripsError = error as DripsError;
        expect(dripsError.meta).toEqual({
          operation: 'mapToMetadataReceiver',
          receiver: unsupportedReceiver,
        });
      }
    });

    it('should handle receiver with undefined type', async () => {
      // Arrange
      const receiverWithUndefinedType = {
        accountId: 123n,
        weight: 500000,
      } as any;

      // Act & Assert
      await expect(
        mapToMetadataReceiver(mockAdapter, receiverWithUndefinedType),
      ).rejects.toThrow(DripsError);
      await expect(
        mapToMetadataReceiver(mockAdapter, receiverWithUndefinedType),
      ).rejects.toThrow('Unsupported receiver type: undefined');
    });

    it('should handle receiver with null type', async () => {
      // Arrange
      const receiverWithNullType = {
        type: null,
        accountId: 123n,
        weight: 500000,
      } as any;

      // Act & Assert
      await expect(
        mapToMetadataReceiver(mockAdapter, receiverWithNullType),
      ).rejects.toThrow(DripsError);
      await expect(
        mapToMetadataReceiver(mockAdapter, receiverWithNullType),
      ).rejects.toThrow('Unsupported receiver type: null');
    });

    it('should handle ecosystem-main-account receiver (unsupported in metadata)', async () => {
      // Arrange
      const ecosystemReceiver: SdkSplitsReceiver = {
        type: 'ecosystem-main-account',
        accountId: 777n,
        weight: 800000,
      };

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

      // Act
      const result = await mapToMetadataReceiver(mockAdapter, dripListReceiver);

      // Assert
      expect(result).toEqual({
        type: 'dripList',
        weight: 500000,
        accountId: largeAccountId.toString(),
      });
    });

    it('should handle project receiver with special characters in URL', async () => {
      // Arrange
      const projectReceiver: SdkSplitsReceiver = {
        type: 'project',
        url: 'https://github.com/my-org/my_repo.test',
        weight: 500000,
      };

      mockDestructProjectUrl.mockReturnValue({
        forge: 'github',
        ownerName: 'my-org',
        repoName: 'my_repo.test',
      });
      mockCalcProjectId.mockResolvedValue(123n);

      // Act
      const result = await mapToMetadataReceiver(mockAdapter, projectReceiver);

      // Assert
      expect(result).toEqual({
        type: 'repoDriver',
        weight: 500000,
        accountId: '123',
        source: {
          forge: 'github',
          url: 'https://github.com/my-org/my_repo.test',
          ownerName: 'my-org',
          repoName: 'my_repo.test',
        },
      });
    });
  });

  describe('immutability and side effects', () => {
    it('should not modify input receiver', async () => {
      // Arrange
      const originalReceiver: SdkSplitsReceiver = {
        type: 'drip-list',
        accountId: 123n,
        weight: 500000,
      };
      const receiverCopy = {...originalReceiver};

      // Act
      await mapToMetadataReceiver(mockAdapter, originalReceiver);

      // Assert
      expect(originalReceiver).toEqual(receiverCopy);
    });

    it('should not modify adapter', async () => {
      // Arrange
      const dripListReceiver: SdkSplitsReceiver = {
        type: 'drip-list',
        accountId: 123n,
        weight: 500000,
      };
      const originalAdapter = {...mockAdapter};

      // Act
      await mapToMetadataReceiver(mockAdapter, dripListReceiver);

      // Assert
      expect(mockAdapter).toEqual(originalAdapter);
    });

    it('should return new object instances', async () => {
      // Arrange
      const dripListReceiver: SdkSplitsReceiver = {
        type: 'drip-list',
        accountId: 123n,
        weight: 500000,
      };

      // Act
      const result1 = await mapToMetadataReceiver(
        mockAdapter,
        dripListReceiver,
      );
      const result2 = await mapToMetadataReceiver(
        mockAdapter,
        dripListReceiver,
      );

      // Assert
      expect(result1).not.toBe(result2);
      expect(result1).toEqual(result2);
    });

    it('should not modify project receiver URL during processing', async () => {
      // Arrange
      const originalUrl = 'https://github.com/owner/repo';
      const projectReceiver: SdkSplitsReceiver = {
        type: 'project',
        url: originalUrl,
        weight: 500000,
      };

      mockDestructProjectUrl.mockReturnValue({
        forge: 'github',
        ownerName: 'owner',
        repoName: 'repo',
      });
      mockCalcProjectId.mockResolvedValue(123n);

      // Act
      await mapToMetadataReceiver(mockAdapter, projectReceiver);

      // Assert
      expect(projectReceiver.url).toBe(originalUrl);
    });
  });

  describe('async behavior', () => {
    it('should handle concurrent calls correctly', async () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = [
        {type: 'drip-list', accountId: 1n, weight: 100000},
        {type: 'sub-list', accountId: 2n, weight: 200000},
        {type: 'drip-list', accountId: 3n, weight: 300000},
      ];

      // Act
      const results = await Promise.all(
        receivers.map(receiver => mapToMetadataReceiver(mockAdapter, receiver)),
      );

      // Assert
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({
        type: 'dripList',
        accountId: '1',
        weight: 100000,
      });
      expect(results[1]).toEqual({
        type: 'subList',
        accountId: '2',
        weight: 200000,
      });
      expect(results[2]).toEqual({
        type: 'dripList',
        accountId: '3',
        weight: 300000,
      });
    });

    it('should handle mixed success and failure scenarios', async () => {
      // Arrange
      const projectReceiver: SdkSplitsReceiver = {
        type: 'project',
        url: 'https://github.com/owner/repo',
        weight: 500000,
      };
      const dripListReceiver: SdkSplitsReceiver = {
        type: 'drip-list',
        accountId: 123n,
        weight: 300000,
      };

      mockDestructProjectUrl.mockReturnValue({
        forge: 'github',
        ownerName: 'owner',
        repoName: 'repo',
      });
      mockCalcProjectId.mockRejectedValue(new Error('Project calc failed'));

      // Act
      const projectPromise = mapToMetadataReceiver(
        mockAdapter,
        projectReceiver,
      );
      const dripListPromise = mapToMetadataReceiver(
        mockAdapter,
        dripListReceiver,
      );

      // Assert
      await expect(projectPromise).rejects.toThrow('Project calc failed');
      await expect(dripListPromise).resolves.toEqual({
        type: 'dripList',
        accountId: '123',
        weight: 300000,
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
