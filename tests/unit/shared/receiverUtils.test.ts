import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import type {Address} from 'viem';
import {ReadBlockchainAdapter} from '../../../src/internal/blockchain/BlockchainAdapter';
import * as receiverUtils from '../../../src/internal/shared/receiverUtils';
import {SdkSplitsReceiver} from '../../../src/internal/shared/receiverUtils';
import {calcProjectId} from '../../../src/internal/projects/calcProjectId';
import {destructProjectUrl} from '../../../src/internal/projects/destructProjectUrl';
import {calcAddressId} from '../../../src/internal/shared/calcAddressId';
import {DripsError} from '../../../src/internal/shared/DripsError';
import {DripList} from '../../../src/internal/drip-lists/getDripListById';

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

    it('should return empty arrays when no receivers are provided', async () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = [];

      // Act
      const result = await receiverUtils.parseSplitsReceivers(
        mockAdapter,
        receivers,
      );

      // Assert
      expect(result.onChain).toEqual([]);
      expect(result.metadata).toEqual([]);
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
      ).rejects.toThrow(
        'Splits receivers not strictly sorted or deduplicated: 123 after 123',
      );
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
      ).rejects.toThrow('Invalid weight: 0');
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

    it('should throw error for weight exceeding maximum', async () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = [
        {
          type: 'drip-list',
          accountId: 123n,
          weight: 1_000_001, // Exceeds maximum
        },
      ];

      // Act & Assert
      await expect(
        receiverUtils.parseSplitsReceivers(mockAdapter, receivers),
      ).rejects.toThrow(DripsError);
      await expect(
        receiverUtils.parseSplitsReceivers(mockAdapter, receivers),
      ).rejects.toThrow('Invalid weight: 1000001');
    });

    it('should throw error for negative weight', async () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = [
        {
          type: 'drip-list',
          accountId: 123n,
          weight: -1, // Negative weight
        },
      ];

      // Act & Assert
      await expect(
        receiverUtils.parseSplitsReceivers(mockAdapter, receivers),
      ).rejects.toThrow(DripsError);
      await expect(
        receiverUtils.parseSplitsReceivers(mockAdapter, receivers),
      ).rejects.toThrow('Invalid weight: -1');
    });

    it('should handle all receiver types in metadata', async () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = [
        {
          type: 'project',
          url: 'https://github.com/owner/repo',
          weight: 250000,
        },
        {
          type: 'drip-list',
          accountId: 789n,
          weight: 250000,
        },
        {
          type: 'sub-list',
          accountId: 456n,
          weight: 250000,
        },
        {
          type: 'address',
          address: '0x1234567890123456789012345678901234567890' as Address,
          weight: 250000,
        },
      ];

      // Act
      const result = await receiverUtils.parseSplitsReceivers(
        mockAdapter,
        receivers,
      );

      // Assert - Results are sorted by accountId: 123n (project), 456n (sub-list), 789n (drip-list), 999n (address)
      expect(result.metadata).toHaveLength(4);
      expect(result.metadata[0]).toMatchObject({
        type: 'repoDriver',
        weight: 250000,
      });
      expect(result.metadata[1]).toMatchObject({
        type: 'subList',
        weight: 250000,
      });
      expect(result.metadata[2]).toMatchObject({
        type: 'dripList',
        weight: 250000,
      });
      expect(result.metadata[3]).toMatchObject({
        type: 'address',
        weight: 250000,
      });
    });
  });

  describe('mapApiSplitsToSdkSplitsReceivers', () => {
    it('should map REPO driver splits to project receivers', () => {
      // Arrange
      const splits: DripList['splits'] = [
        {
          weight: 500000,
          account: {
            driver: 'REPO',
            accountId: '123',
            address: '0x123' as Address,
          },
          project: {
            source: {
              url: 'https://github.com/owner/repo',
            },
          },
        } as any,
      ];

      // Act
      const result = receiverUtils.mapApiSplitsToSdkSplitsReceivers(splits);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'project',
        url: 'https://github.com/owner/repo',
        weight: 500000,
      });
    });

    it('should map NFT driver splits to drip-list receivers', () => {
      // Arrange
      const splits: DripList['splits'] = [
        {
          weight: 750000,
          account: {
            driver: 'NFT',
            accountId: '456',
            address: '0x456' as Address,
          },
        } as any,
      ];

      // Act
      const result = receiverUtils.mapApiSplitsToSdkSplitsReceivers(splits);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'drip-list',
        accountId: 456n,
        weight: 750000,
      });
    });

    it('should map IMMUTABLE_SPLITS driver splits to sub-list receivers', () => {
      // Arrange
      const splits: DripList['splits'] = [
        {
          weight: 300000,
          account: {
            driver: 'IMMUTABLE_SPLITS',
            accountId: '789',
            address: '0x789' as Address,
          },
        } as any,
      ];

      // Act
      const result = receiverUtils.mapApiSplitsToSdkSplitsReceivers(splits);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'sub-list',
        accountId: 789n,
        weight: 300000,
      });
    });

    it('should map ADDRESS driver splits to address receivers', () => {
      // Arrange
      const splits: DripList['splits'] = [
        {
          weight: 200000,
          account: {
            driver: 'ADDRESS',
            accountId: '999',
            address: '0x1234567890123456789012345678901234567890' as Address,
          },
        } as any,
      ];

      // Act
      const result = receiverUtils.mapApiSplitsToSdkSplitsReceivers(splits);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: 'address',
        address: '0x1234567890123456789012345678901234567890',
        weight: 200000,
      });
    });

    it('should throw error for REPO receiver without project URL', () => {
      // Arrange
      const splits: DripList['splits'] = [
        {
          weight: 500000,
          account: {
            driver: 'REPO',
            accountId: '123',
            address: '0x123' as Address,
          },
          project: null, // Missing project
        } as any,
      ];

      // Act & Assert
      expect(() =>
        receiverUtils.mapApiSplitsToSdkSplitsReceivers(splits),
      ).toThrow(DripsError);
      expect(() =>
        receiverUtils.mapApiSplitsToSdkSplitsReceivers(splits),
      ).toThrow('Missing project URL for REPO receiver');
    });

    it('should throw error for unsupported driver', () => {
      // Arrange
      const splits: DripList['splits'] = [
        {
          weight: 500000,
          account: {
            driver: 'UNSUPPORTED' as any,
            accountId: '123',
            address: '0x123' as Address,
          },
        } as any,
      ];

      // Act & Assert
      expect(() =>
        receiverUtils.mapApiSplitsToSdkSplitsReceivers(splits),
      ).toThrow(DripsError);
      expect(() =>
        receiverUtils.mapApiSplitsToSdkSplitsReceivers(splits),
      ).toThrow('Unsupported account driver: UNSUPPORTED');
    });

    it('should handle mixed driver types', () => {
      // Arrange
      const splits: DripList['splits'] = [
        {
          weight: 250000,
          account: {
            driver: 'REPO',
            accountId: '123',
            address: '0x123' as Address,
          },
          project: {
            source: {
              url: 'https://github.com/owner/repo',
            },
          },
        } as any,
        {
          weight: 250000,
          account: {
            driver: 'NFT',
            accountId: '456',
            address: '0x456' as Address,
          },
        } as any,
        {
          weight: 250000,
          account: {
            driver: 'IMMUTABLE_SPLITS',
            accountId: '789',
            address: '0x789' as Address,
          },
        } as any,
        {
          weight: 250000,
          account: {
            driver: 'ADDRESS',
            accountId: '999',
            address: '0x1234567890123456789012345678901234567890' as Address,
          },
        } as any,
      ];

      // Act
      const result = receiverUtils.mapApiSplitsToSdkSplitsReceivers(splits);

      // Assert
      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({
        type: 'project',
        url: 'https://github.com/owner/repo',
        weight: 250000,
      });
      expect(result[1]).toEqual({
        type: 'drip-list',
        accountId: 456n,
        weight: 250000,
      });
      expect(result[2]).toEqual({
        type: 'sub-list',
        accountId: 789n,
        weight: 250000,
      });
      expect(result[3]).toEqual({
        type: 'address',
        address: '0x1234567890123456789012345678901234567890',
        weight: 250000,
      });
    });
  });
});
