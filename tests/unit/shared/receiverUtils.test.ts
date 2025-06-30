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

  // Test parseSplitsReceivers
  describe('parseSplitsReceivers', () => {
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

    it('should parse valid splits receivers', async () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = [
        {
          type: 'project',
          url: 'https://github.com/owner/repo',
          weight: 500000,
        },
        {
          type: 'drip-list',
          accountId: 789n,
          weight: 500000,
        },
      ];

      // Act
      const result = await receiverUtils.parseSplitsReceivers(
        mockAdapter,
        receivers,
      );

      // Assert
      expect(result.onChain).toHaveLength(2);
      expect(result.metadata).toHaveLength(2);
      expect(result.onChain[0]).toEqual({
        accountId: 123n,
        weight: 500000,
      });
      expect(result.onChain[1]).toEqual({
        accountId: 789n,
        weight: 500000,
      });
    });

    it('should throw error when total weight is not 1,000,000', async () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = [
        {
          type: 'drip-list',
          accountId: 123n,
          weight: 500000,
        },
        {
          type: 'drip-list',
          accountId: 456n,
          weight: 400000, // Total: 900,000 (not 1,000,000)
        },
      ];

      // Act & Assert
      await expect(
        receiverUtils.parseSplitsReceivers(mockAdapter, receivers),
      ).rejects.toThrow(DripsError);
      await expect(
        receiverUtils.parseSplitsReceivers(mockAdapter, receivers),
      ).rejects.toThrow('Total weight must be exactly 1000000, but got 900000');
    });

    it('should throw error when there are too many receivers', async () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = Array.from(
        {length: 201},
        (_, i) => ({
          type: 'drip-list' as const,
          accountId: BigInt(i),
          weight: Math.floor(1000000 / 201),
        }),
      );

      // Act & Assert
      await expect(
        receiverUtils.parseSplitsReceivers(mockAdapter, receivers),
      ).rejects.toThrow(DripsError);
      await expect(
        receiverUtils.parseSplitsReceivers(mockAdapter, receivers),
      ).rejects.toThrow('Maximum of 200 receivers allowed');
    });

    it('should throw error for duplicate receivers', async () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = [
        {
          type: 'drip-list',
          accountId: 123n,
          weight: 500000,
        },
        {
          type: 'drip-list',
          accountId: 123n, // Duplicate
          weight: 500000,
        },
      ];

      // Act & Assert
      await expect(
        receiverUtils.parseSplitsReceivers(mockAdapter, receivers),
      ).rejects.toThrow(DripsError);
      await expect(
        receiverUtils.parseSplitsReceivers(mockAdapter, receivers),
      ).rejects.toThrow('Duplicate splits receivers found: 123');
    });

    it('should throw error for invalid weight', async () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = [
        {
          type: 'drip-list',
          accountId: 123n,
          weight: 0, // Invalid weight
        },
      ];

      // Act & Assert
      await expect(
        receiverUtils.parseSplitsReceivers(mockAdapter, receivers),
      ).rejects.toThrow(DripsError);
      await expect(
        receiverUtils.parseSplitsReceivers(mockAdapter, receivers),
      ).rejects.toThrow('Total weight must be exactly 1000000, but got 0');
    });

    it('should sort receivers by accountId', async () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = [
        {
          type: 'drip-list',
          accountId: 999n,
          weight: 500000,
        },
        {
          type: 'drip-list',
          accountId: 123n,
          weight: 500000,
        },
      ];

      // Act
      const result = await receiverUtils.parseSplitsReceivers(
        mockAdapter,
        receivers,
      );

      // Assert
      expect(result.onChain[0].accountId).toBe(123n);
      expect(result.onChain[1].accountId).toBe(999n);
    });
  });
});
