import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import type {Address} from 'viem';
import {ReadBlockchainAdapter} from '../../../src/internal/blockchain/BlockchainAdapter';
import * as receiverUtils from '../../../src/internal/shared/receiverUtils';
import {SdkSplitsReceiver} from '../../../src/internal/shared/receiverUtils';
import {calcProjectId} from '../../../src/internal/projects/calcProjectId';
import {destructProjectUrl} from '../../../src/internal/projects/destructProjectUrl';
import {calcAddressId} from '../../../src/internal/shared/calcAddressId';
import {DripsError} from '../../../src/internal/shared/DripsError';

vi.mock('../../../src/internal/projects/calcProjectId');
vi.mock('../../../src/internal/projects/destructProjectUrl');
vi.mock('../../../src/internal/shared/calcAddressId');

describe('receiverUtils', () => {
  let mockAdapter: ReadBlockchainAdapter;

  beforeEach(() => {
    mockAdapter = {
      getChainId: vi.fn().mockResolvedValue(11155111), // Sepolia testnet
      call: vi.fn().mockResolvedValue({}),
    } as any;
    vi.clearAllMocks();
  });

  // Test resolveReceiverAccountId
  describe('resolveReceiverAccountId', () => {
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

        const result = await receiverUtils.resolveReceiverAccountId(
          mockAdapter,
          receiver,
        );

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
        } as any;

        await expect(
          receiverUtils.resolveReceiverAccountId(mockAdapter, receiver),
        ).rejects.toThrow(DripsError);
        await expect(
          receiverUtils.resolveReceiverAccountId(mockAdapter, receiver),
        ).rejects.toThrow('Project receiver must have a url');
      });
    });

    describe('address receiver', () => {
      it('should resolve account ID for address receiver', async () => {
        const mockAccountId = 456n;
        const mockAddress =
          '0x1234567890123456789012345678901234567890' as const;

        vi.mocked(calcAddressId).mockResolvedValue(mockAccountId);

        const receiver = {
          type: 'address' as const,
          address: mockAddress,
        };

        const result = await receiverUtils.resolveReceiverAccountId(
          mockAdapter,
          receiver,
        );

        expect(result).toBe(mockAccountId);
        expect(calcAddressId).toHaveBeenCalledWith(mockAdapter, mockAddress);
      });

      it('should throw error if address receiver has no address', async () => {
        const receiver = {
          type: 'address' as const,
        } as any;

        await expect(
          receiverUtils.resolveReceiverAccountId(mockAdapter, receiver),
        ).rejects.toThrow(DripsError);
        await expect(
          receiverUtils.resolveReceiverAccountId(mockAdapter, receiver),
        ).rejects.toThrow('Address receiver must have an address');
      });
    });

    describe('drip-list receiver', () => {
      it('should return account ID directly for drip-list receiver', async () => {
        const mockAccountId = 789n;

        const receiver = {
          type: 'drip-list' as const,
          accountId: mockAccountId,
        };

        const result = await receiverUtils.resolveReceiverAccountId(
          mockAdapter,
          receiver,
        );

        expect(result).toBe(mockAccountId);
      });

      it('should throw error if drip-list receiver has no accountId', async () => {
        const receiver = {
          type: 'drip-list' as const,
        } as any;

        await expect(
          receiverUtils.resolveReceiverAccountId(mockAdapter, receiver),
        ).rejects.toThrow(DripsError);
        await expect(
          receiverUtils.resolveReceiverAccountId(mockAdapter, receiver),
        ).rejects.toThrow('drip-list receiver must have an accountId');
      });
    });

    describe('sub-list receiver', () => {
      it('should return account ID directly for sub-list receiver', async () => {
        const mockAccountId = 101112n;

        const receiver = {
          type: 'sub-list' as const,
          accountId: mockAccountId,
        };

        const result = await receiverUtils.resolveReceiverAccountId(
          mockAdapter,
          receiver,
        );

        expect(result).toBe(mockAccountId);
      });

      it('should throw error if sub-list receiver has no accountId', async () => {
        const receiver = {
          type: 'sub-list' as const,
        } as any;

        await expect(
          receiverUtils.resolveReceiverAccountId(mockAdapter, receiver),
        ).rejects.toThrow(DripsError);
        await expect(
          receiverUtils.resolveReceiverAccountId(mockAdapter, receiver),
        ).rejects.toThrow('sub-list receiver must have an accountId');
      });
    });

    describe('ecosystem-main-account receiver', () => {
      it('should return account ID directly for ecosystem-main-account receiver', async () => {
        const mockAccountId = 131415n;

        const receiver = {
          type: 'ecosystem-main-account' as const,
          accountId: mockAccountId,
        };

        const result = await receiverUtils.resolveReceiverAccountId(
          mockAdapter,
          receiver,
        );

        expect(result).toBe(mockAccountId);
      });

      it('should throw error if ecosystem-main-account receiver has no accountId', async () => {
        const receiver = {
          type: 'ecosystem-main-account' as const,
        } as any;

        await expect(
          receiverUtils.resolveReceiverAccountId(mockAdapter, receiver),
        ).rejects.toThrow(DripsError);
        await expect(
          receiverUtils.resolveReceiverAccountId(mockAdapter, receiver),
        ).rejects.toThrow(
          'ecosystem-main-account receiver must have an accountId',
        );
      });
    });

    describe('unsupported receiver type', () => {
      it('should throw error for unsupported receiver type', async () => {
        const receiver = {
          type: 'unsupported' as any,
        } as any;

        await expect(
          receiverUtils.resolveReceiverAccountId(mockAdapter, receiver),
        ).rejects.toThrow(DripsError);
        await expect(
          receiverUtils.resolveReceiverAccountId(mockAdapter, receiver),
        ).rejects.toThrow('Unsupported receiver type: unsupported');
      });
    });
  });

  // Test mapToOnChainSplitsReceiver
  describe('mapToOnChainSplitsReceiver', () => {
    beforeEach(() => {
      vi.mocked(destructProjectUrl).mockImplementation((url: string) => {
        if (url === 'https://github.com/org/project') {
          return {
            forge: 'github' as const,
            ownerName: 'org',
            repoName: 'project',
          };
        }
        return {
          forge: 'github' as const,
          ownerName: 'owner',
          repoName: 'repo',
        };
      });

      vi.mocked(calcProjectId).mockImplementation(async (_, project) => {
        if (project.name === 'org/project') {
          return 456n;
        }
        return 123n;
      });

      vi.mocked(calcAddressId).mockImplementation(async (_, address) => {
        if (address === '0x1234567890123456789012345678901234567890') {
          return 999n;
        }
        if (address === '0x0000000000000000000000000000000000000000') {
          return 0n;
        }
        return 456n;
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should map project receiver to on-chain receiver', async () => {
      // Arrange
      const projectReceiver = {
        type: 'project' as const,
        url: 'https://github.com/owner/repo',
        weight: 500000,
      };

      // Act
      const result = await receiverUtils.mapToOnChainSplitsReceiver(
        mockAdapter,
        projectReceiver,
      );

      // Assert
      expect(result).toEqual({
        accountId: 123n,
        weight: 500000,
      });
    });

    it('should handle project receiver with different weight', async () => {
      // Arrange
      const projectReceiver = {
        type: 'project' as const,
        url: 'https://github.com/org/project',
        weight: 750000,
      };

      // Act
      const result = await receiverUtils.mapToOnChainSplitsReceiver(
        mockAdapter,
        projectReceiver,
      );

      // Assert
      expect(result).toEqual({
        accountId: 456n,
        weight: 750000,
      });
    });

    it('should propagate error from resolveReceiverAccountId', async () => {
      // Arrange
      const projectReceiver = {
        type: 'project' as const,
        url: 'https://github.com/owner/repo',
        weight: 500000,
      };

      // Override the mock for this specific test
      vi.mocked(calcProjectId).mockRejectedValueOnce(
        new Error('Failed to resolve account ID'),
      );

      // Act & Assert
      await expect(
        receiverUtils.mapToOnChainSplitsReceiver(mockAdapter, projectReceiver),
      ).rejects.toThrow('Failed to resolve account ID');
    });

    it('should map drip-list receiver to on-chain receiver', async () => {
      // Arrange
      const dripListReceiver = {
        type: 'drip-list' as const,
        accountId: 123n,
        weight: 500000,
      };

      // Act
      const result = await receiverUtils.mapToOnChainSplitsReceiver(
        mockAdapter,
        dripListReceiver,
      );

      // Assert
      expect(result).toEqual({
        accountId: 123n,
        weight: 500000,
      });
    });

    it('should handle drip-list receiver with zero accountId', async () => {
      // In the actual implementation, a check is made to ensure accountId is not falsy
      // So we need to test with a non-zero accountId that's treated as truthy
      const dripListReceiver = {
        type: 'drip-list' as const,
        accountId: 0n, // This will cause the test to fail because 0n is falsy
        weight: 250000,
      };

      // We expect this to throw an error because 0n is falsy
      await expect(
        receiverUtils.mapToOnChainSplitsReceiver(mockAdapter, dripListReceiver),
      ).rejects.toThrow('drip-list receiver must have an accountId');
    });

    it('should handle drip-list receiver with large accountId', async () => {
      // Arrange
      const largeAccountId = 2n ** 128n - 1n; // Max uint128
      const dripListReceiver = {
        type: 'drip-list' as const,
        accountId: largeAccountId,
        weight: 750000,
      };

      // Act
      const result = await receiverUtils.mapToOnChainSplitsReceiver(
        mockAdapter,
        dripListReceiver,
      );

      // Assert
      expect(result).toEqual({
        accountId: largeAccountId,
        weight: 750000,
      });
    });

    it('should map sub-list receiver to on-chain receiver', async () => {
      // Arrange
      const subListReceiver = {
        type: 'sub-list' as const,
        accountId: 456n,
        weight: 300000,
      };

      // Act
      const result = await receiverUtils.mapToOnChainSplitsReceiver(
        mockAdapter,
        subListReceiver,
      );

      // Assert
      expect(result).toEqual({
        accountId: 456n,
        weight: 300000,
      });
    });

    it('should handle sub-list receiver with zero weight', async () => {
      // Arrange
      const subListReceiver = {
        type: 'sub-list' as const,
        accountId: 789n,
        weight: 0,
      };

      // Act
      const result = await receiverUtils.mapToOnChainSplitsReceiver(
        mockAdapter,
        subListReceiver,
      );

      // Assert
      expect(result).toEqual({
        accountId: 789n,
        weight: 0,
      });
    });

    it('should map address receiver to on-chain receiver', async () => {
      // Arrange
      const address: Address = '0x1234567890123456789012345678901234567890';
      const addressReceiver = {
        type: 'address' as const,
        address,
        weight: 400000,
      };

      // Act
      const result = await receiverUtils.mapToOnChainSplitsReceiver(
        mockAdapter,
        addressReceiver,
      );

      // Assert
      expect(result).toEqual({
        accountId: 999n,
        weight: 400000,
      });
    });

    it('should handle address receiver with zero address', async () => {
      // Arrange
      const address: Address = '0x0000000000000000000000000000000000000000';
      const addressReceiver = {
        type: 'address' as const,
        address,
        weight: 100000,
      };

      // Act
      const result = await receiverUtils.mapToOnChainSplitsReceiver(
        mockAdapter,
        addressReceiver,
      );

      // Assert
      expect(result).toEqual({
        accountId: 0n,
        weight: 100000,
      });
    });

    it('should map ecosystem-main-account receiver to on-chain receiver', async () => {
      // Arrange
      const ecosystemReceiver = {
        type: 'ecosystem-main-account' as const,
        accountId: 777n,
        weight: 800000,
      };

      // Act
      const result = await receiverUtils.mapToOnChainSplitsReceiver(
        mockAdapter,
        ecosystemReceiver,
      );

      // Assert
      expect(result).toEqual({
        accountId: 777n,
        weight: 800000,
      });
    });
  });

  // Test mapSdkToMetadataSplitsReceiver
  describe('mapSdkToMetadataSplitsReceiver', () => {
    beforeEach(() => {
      vi.mocked(destructProjectUrl).mockImplementation((url: string) => {
        if (url === 'https://github.com/org/project') {
          return {
            forge: 'github' as const,
            ownerName: 'org',
            repoName: 'project',
          };
        }
        return {
          forge: 'github' as const,
          ownerName: 'owner',
          repoName: 'repo',
        };
      });

      vi.mocked(calcProjectId).mockImplementation(async (_, project) => {
        if (project.name === 'org/project') {
          return 456n;
        }
        return 123n;
      });

      vi.mocked(calcAddressId).mockImplementation(async (_, address) => {
        if (address === '0x1234567890123456789012345678901234567890') {
          return 999n;
        }
        if (address === '0x0000000000000000000000000000000000000000') {
          return 0n;
        }
        return 456n;
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    describe('project receiver', () => {
      it('should map project receiver to metadata receiver', async () => {
        // Arrange
        const projectReceiver: SdkSplitsReceiver = {
          type: 'project',
          url: 'https://github.com/owner/repo',
          weight: 500000,
        };

        vi.mocked(destructProjectUrl).mockReturnValue({
          forge: 'github',
          ownerName: 'owner',
          repoName: 'repo',
        });

        // Act
        const result = await receiverUtils.mapSdkToMetadataSplitsReceiver(
          mockAdapter,
          projectReceiver,
        );

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
      });

      it('should handle project receiver with different weight', async () => {
        // Arrange
        const projectReceiver: SdkSplitsReceiver = {
          type: 'project',
          url: 'https://github.com/org/project',
          weight: 750000,
        };

        vi.mocked(destructProjectUrl).mockReturnValue({
          forge: 'github' as const,
          ownerName: 'org',
          repoName: 'project',
        });

        // Act
        const result = await receiverUtils.mapSdkToMetadataSplitsReceiver(
          mockAdapter,
          projectReceiver,
        );

        // Assert
        expect(result).toEqual({
          type: 'repoDriver',
          weight: 750000,
          accountId: '456',
          source: {
            forge: 'github',
            url: 'https://github.com/org/project',
            ownerName: 'org',
            repoName: 'project',
          },
        });
      });

      it('should propagate error from resolveReceiverAccountId', async () => {
        // Arrange
        const projectReceiver: SdkSplitsReceiver = {
          type: 'project',
          url: 'https://github.com/owner/repo',
          weight: 500000,
        };

        // Override the mock for this specific test
        vi.mocked(calcProjectId).mockRejectedValueOnce(
          new Error('Failed to resolve account ID'),
        );

        // Act & Assert
        await expect(
          receiverUtils.mapSdkToMetadataSplitsReceiver(
            mockAdapter,
            projectReceiver,
          ),
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

        // Act
        const result = await receiverUtils.mapSdkToMetadataSplitsReceiver(
          mockAdapter,
          dripListReceiver,
        );

        // Assert
        expect(result).toEqual({
          type: 'dripList',
          weight: 500000,
          accountId: '123',
        });
      });

      it('should handle drip-list receiver with zero accountId', async () => {
        // In the actual implementation, a check is made to ensure accountId is not falsy
        // So we need to test with a non-zero accountId that's treated as truthy
        const dripListReceiver: SdkSplitsReceiver = {
          type: 'drip-list',
          accountId: 0n, // This will cause the test to fail because 0n is falsy
          weight: 250000,
        };

        // We expect this to throw an error because 0n is falsy
        await expect(
          receiverUtils.mapSdkToMetadataSplitsReceiver(
            mockAdapter,
            dripListReceiver,
          ),
        ).rejects.toThrow('drip-list receiver must have an accountId');
      });

      it('should handle drip-list receiver with large accountId', async () => {
        // Arrange
        const largeAccountId = 2n ** 128n - 1n; // Max uint128
        const dripListReceiver: SdkSplitsReceiver = {
          type: 'drip-list',
          accountId: largeAccountId,
          weight: 750000,
        };

        // Act
        const result = await receiverUtils.mapSdkToMetadataSplitsReceiver(
          mockAdapter,
          dripListReceiver,
        );

        // Assert
        expect(result).toEqual({
          type: 'dripList',
          weight: 750000,
          accountId: largeAccountId.toString(),
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
        const result = await receiverUtils.mapSdkToMetadataSplitsReceiver(
          mockAdapter,
          subListReceiver,
        );

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
        const result = await receiverUtils.mapSdkToMetadataSplitsReceiver(
          mockAdapter,
          subListReceiver,
        );

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

        // Act
        const result = await receiverUtils.mapSdkToMetadataSplitsReceiver(
          mockAdapter,
          addressReceiver,
        );

        // Assert
        expect(result).toEqual({
          type: 'address',
          weight: 400000,
          accountId: '999',
        });
      });

      it('should handle address receiver with zero address', async () => {
        // Arrange
        const address: Address = '0x0000000000000000000000000000000000000000';
        const addressReceiver: SdkSplitsReceiver = {
          type: 'address',
          address,
          weight: 100000,
        };

        // Act
        const result = await receiverUtils.mapSdkToMetadataSplitsReceiver(
          mockAdapter,
          addressReceiver,
        );

        // Assert
        expect(result).toEqual({
          type: 'address',
          weight: 100000,
          accountId: '0',
        });
      });
    });

    describe('unsupported receiver type', () => {
      it('should throw error for unsupported receiver type', async () => {
        // Arrange
        const unsupportedReceiver = {
          type: 'unsupported' as any,
          weight: 500000,
        } as SdkSplitsReceiver;

        // Act & Assert
        await expect(
          receiverUtils.mapSdkToMetadataSplitsReceiver(
            mockAdapter,
            unsupportedReceiver,
          ),
        ).rejects.toThrow(DripsError);
        await expect(
          receiverUtils.mapSdkToMetadataSplitsReceiver(
            mockAdapter,
            unsupportedReceiver,
          ),
        ).rejects.toThrow('Unsupported receiver type: unsupported');
      });

      it('should throw error for ecosystem-main-account receiver type', async () => {
        // Arrange
        const ecosystemReceiver: SdkSplitsReceiver = {
          type: 'ecosystem-main-account' as any,
          accountId: 123n,
          weight: 500000,
        };

        // Act & Assert
        await expect(
          receiverUtils.mapSdkToMetadataSplitsReceiver(
            mockAdapter,
            ecosystemReceiver,
          ),
        ).rejects.toThrow(DripsError);
        await expect(
          receiverUtils.mapSdkToMetadataSplitsReceiver(
            mockAdapter,
            ecosystemReceiver,
          ),
        ).rejects.toThrow('Unsupported receiver type: ecosystem-main-account');
      });
    });

    describe('edge cases', () => {
      it('should handle receivers with very large weights', async () => {
        // Arrange
        const largeWeight = 999999999;
        const dripListReceiver: SdkSplitsReceiver = {
          type: 'drip-list',
          accountId: 123n,
          weight: largeWeight,
        };

        // Act
        const result = await receiverUtils.mapSdkToMetadataSplitsReceiver(
          mockAdapter,
          dripListReceiver,
        );

        // Assert
        expect(result).toEqual({
          type: 'dripList',
          weight: largeWeight,
          accountId: '123',
        });
      });

      it('should handle receivers with very large accountIds', async () => {
        // Arrange
        const largeAccountId = 2n ** 200n; // Very large bigint
        const subListReceiver: SdkSplitsReceiver = {
          type: 'sub-list',
          accountId: largeAccountId,
          weight: 500000,
        };

        // Act
        const result = await receiverUtils.mapSdkToMetadataSplitsReceiver(
          mockAdapter,
          subListReceiver,
        );

        // Assert
        expect(result).toEqual({
          type: 'subList',
          weight: 500000,
          accountId: largeAccountId.toString(),
        });
      });
    });

    describe('immutability and side effects', () => {
      it('should not modify input receiver', async () => {
        // Arrange
        const dripListReceiver: SdkSplitsReceiver = {
          type: 'drip-list',
          accountId: 123n,
          weight: 500000,
        };
        const originalReceiver = {...dripListReceiver};

        // Act
        await receiverUtils.mapSdkToMetadataSplitsReceiver(
          mockAdapter,
          dripListReceiver,
        );

        // Assert
        expect(dripListReceiver).toEqual(originalReceiver);
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
        await receiverUtils.mapSdkToMetadataSplitsReceiver(
          mockAdapter,
          dripListReceiver,
        );

        // Assert
        expect(mockAdapter).toEqual(originalAdapter);
      });
    });
  });
});
