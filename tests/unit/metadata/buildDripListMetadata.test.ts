import {describe, it, expect, vi, beforeEach} from 'vitest';
import {buildDripListMetadata} from '../../../src/internal/drip-lists/buildDripListMetadata';
import {ReadBlockchainAdapter} from '../../../src/internal/blockchain/BlockchainAdapter';
import {Address} from 'viem';

vi.mock('../../../src/internal/shared/assertions', () => ({
  requireSupportedChain: vi.fn(),
}));

vi.mock('viem', async () => {
  const actual = await vi.importActual('viem');
  return {
    ...actual,
    decodeFunctionResult: vi.fn(),
  };
});

vi.mock('../../../src/internal/shared/buildTx', () => ({
  buildTx: vi.fn(),
}));

import {requireSupportedChain} from '../../../src/internal/shared/assertions';
import {decodeFunctionResult} from 'viem';
import {buildTx} from '../../../src/internal/shared/buildTx';
import {SdkSplitsReceiver} from '../../../src/internal/shared/receiverUtils';

describe('buildDripListMetadata', () => {
  const mockAdapter: ReadBlockchainAdapter = {
    call: vi.fn(),
    getChainId: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to default successful behavior
    vi.mocked(mockAdapter.getChainId).mockResolvedValue(1);
    vi.mocked(requireSupportedChain).mockImplementation(() => {});
    vi.mocked(buildTx).mockReturnValue({
      to: '0x1455d9bD6B98f95dd8FEB2b3D60ed825fcef0610' as const,
      data: '0xcalcaccountdata' as const,
    });
    vi.mocked(mockAdapter.call).mockResolvedValue('0xencodedresult');
    vi.mocked(decodeFunctionResult).mockReturnValue(1126n); // Mock account ID for address receivers
  });

  const mockDripListId = 123n;
  const mockReceivers: SdkSplitsReceiver[] = [
    {
      type: 'address' as const,
      address: '0x1234567890123456789012345678901234567890' as Address,
      weight: 500000,
    },
    {
      type: 'address' as const,
      address: '0x3334567890123456789012345678901234567890' as Address,
      weight: 500000,
    },
  ];

  const baseParams = {
    dripListId: mockDripListId,
    receivers: mockReceivers,
    name: 'Test Drip List',
    description: 'A test drip list description',
    isVisible: true,
  };

  describe('successful metadata building', () => {
    it('should build complete drip list metadata with all fields', async () => {
      // Act
      const result = await buildDripListMetadata(mockAdapter, baseParams);

      // Assert
      expect(result).toEqual({
        driver: 'nft',
        type: 'dripList',
        describes: {
          accountId: '123',
          driver: 'nft',
        },
        name: 'Test Drip List',
        description: 'A test drip list description',
        isVisible: true,
        recipients: [
          {
            type: 'address',
            accountId: '1126',
            weight: 500000,
          },
          {
            type: 'address',
            accountId: '1126',
            weight: 500000,
          },
        ],
      });
    });

    it('should handle undefined name', async () => {
      // Arrange
      const params = {
        ...baseParams,
        name: undefined,
      };

      // Act
      const result = await buildDripListMetadata(mockAdapter, params);

      // Assert
      expect(result.name).toBeUndefined();
      expect(result.type).toBe('dripList');
      expect(result.driver).toBe('nft');
    });

    it('should handle undefined description', async () => {
      // Arrange
      const params = {
        ...baseParams,
        description: undefined,
      };

      // Act
      const result = await buildDripListMetadata(mockAdapter, params);

      // Assert
      expect(result.description).toBeUndefined();
      expect(result.type).toBe('dripList');
      expect(result.driver).toBe('nft');
    });

    it('should handle both name and description undefined', async () => {
      // Arrange
      const params = {
        ...baseParams,
        name: undefined,
        description: undefined,
      };

      // Act
      const result = await buildDripListMetadata(mockAdapter, params);

      // Assert
      expect(result.name).toBeUndefined();
      expect(result.description).toBeUndefined();
      expect(result.type).toBe('dripList');
      expect(result.driver).toBe('nft');
    });

    it('should handle empty receivers array', async () => {
      // Arrange
      const params = {
        ...baseParams,
        receivers: [],
      };

      // Act
      const result = await buildDripListMetadata(mockAdapter, params);

      // Assert
      expect(result.recipients).toEqual([]);
      expect(result.type).toBe('dripList');
      expect(result.driver).toBe('nft');
    });

    it('should handle isVisible false', async () => {
      // Arrange
      const params = {
        ...baseParams,
        isVisible: false,
      };

      // Act
      const result = await buildDripListMetadata(mockAdapter, params);

      // Assert
      expect(result.isVisible).toBe(false);
      expect(result.type).toBe('dripList');
      expect(result.driver).toBe('nft');
    });

    it('should handle empty string name and description', async () => {
      // Arrange
      const params = {
        ...baseParams,
        name: '',
        description: '',
      };

      // Act
      const result = await buildDripListMetadata(mockAdapter, params);

      // Assert
      expect(result.name).toBe('');
      expect(result.description).toBe('');
      expect(result.type).toBe('dripList');
      expect(result.driver).toBe('nft');
    });
  });

  describe('dripListId conversion', () => {
    it('should convert zero dripListId to string', async () => {
      // Arrange
      const params = {
        ...baseParams,
        dripListId: 0n,
      };

      // Act
      const result = await buildDripListMetadata(mockAdapter, params);

      // Assert
      expect(result.describes.accountId).toBe('0');
      expect(typeof result.describes.accountId).toBe('string');
    });

    it('should convert large dripListId to string', async () => {
      // Arrange
      const largeDripListId = BigInt('0xffffffffffffffffffffffffffffffff');
      const params = {
        ...baseParams,
        dripListId: largeDripListId,
      };

      // Act
      const result = await buildDripListMetadata(mockAdapter, params);

      // Assert
      expect(result.describes.accountId).toBe(largeDripListId.toString());
      expect(typeof result.describes.accountId).toBe('string');
    });

    it('should convert negative dripListId to string', async () => {
      // Arrange
      const params = {
        ...baseParams,
        dripListId: -123n,
      };

      // Act
      const result = await buildDripListMetadata(mockAdapter, params);

      // Assert
      expect(result.describes.accountId).toBe('-123');
      expect(typeof result.describes.accountId).toBe('string');
    });
  });

  describe('receivers serialization', () => {
    it('should serialize single address receiver correctly', async () => {
      // Arrange
      const singleReceiver: SdkSplitsReceiver[] = [
        {
          type: 'address',
          address: '0x1234567890123456789012345678901234567890' as Address,
          weight: 1000000,
        },
      ];
      const params = {
        ...baseParams,
        receivers: singleReceiver,
      };

      // Act
      const result = await buildDripListMetadata(mockAdapter, params);

      // Assert
      expect(result.recipients).toHaveLength(1);
      expect(result.recipients[0]).toEqual({
        type: 'address',
        accountId: '1126',
        weight: 1000000,
      });
    });

    it('should serialize multiple receivers with different types', async () => {
      // Arrange
      const mixedReceivers: SdkSplitsReceiver[] = [
        {
          type: 'address',
          address: '0x1234567890123456789012345678901234567890' as Address,
          weight: 300000,
        },
        {
          type: 'drip-list',
          accountId: 222n,
          weight: 700000,
        },
      ];
      const params = {
        ...baseParams,
        receivers: mixedReceivers,
      };

      // Act
      const result = await buildDripListMetadata(mockAdapter, params);

      // Assert
      expect(result.recipients).toHaveLength(2);
      expect(result.recipients[0]).toEqual({
        type: 'address',
        accountId: '1126',
        weight: 300000,
      });
      expect(result.recipients[1]).toEqual({
        type: 'dripList',
        accountId: '222',
        weight: 700000,
      });
    });

    it('should serialize drip-list receiver correctly', async () => {
      // Arrange
      const dripListReceiver: SdkSplitsReceiver[] = [
        {
          type: 'drip-list',
          accountId: 999n,
          weight: 1000000,
        },
      ];
      const params = {
        ...baseParams,
        receivers: dripListReceiver,
      };

      // Act
      const result = await buildDripListMetadata(mockAdapter, params);

      // Assert
      expect(result.recipients[0].accountId).toBe('999');
      expect(result.recipients[0].type).toBe('dripList');
      expect(typeof result.recipients[0].accountId).toBe('string');
    });

    it('should serialize sub-list receiver correctly', async () => {
      // Arrange
      const subListReceiver: SdkSplitsReceiver[] = [
        {
          type: 'sub-list',
          accountId: 555n,
          weight: 250000,
        },
      ];
      const params = {
        ...baseParams,
        receivers: subListReceiver,
      };

      // Act
      const result = await buildDripListMetadata(mockAdapter, params);

      // Assert
      expect(result.recipients[0]).toEqual({
        type: 'subList',
        accountId: '555',
        weight: 250000,
      });
    });
  });

  describe('metadata structure validation', () => {
    it('should always have correct driver and type', async () => {
      // Arrange
      const minimalParams = {
        dripListId: 1n,
        receivers: [],
        isVisible: false,
      };

      // Act
      const result = await buildDripListMetadata(mockAdapter, minimalParams);

      // Assert
      expect(result.driver).toBe('nft');
      expect(result.type).toBe('dripList');
      expect(result.describes.driver).toBe('nft');
    });

    it('should maintain describes structure', async () => {
      // Act
      const result = await buildDripListMetadata(mockAdapter, baseParams);

      // Assert
      expect(result.describes).toEqual({
        accountId: mockDripListId.toString(),
        driver: 'nft',
      });
      expect(typeof result.describes.accountId).toBe('string');
      expect(result.describes.driver).toBe('nft');
    });

    it('should include all required fields', async () => {
      // Act
      const result = await buildDripListMetadata(mockAdapter, baseParams);

      // Assert
      expect(result).toHaveProperty('driver');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('describes');
      expect(result).toHaveProperty('isVisible');
      expect(result).toHaveProperty('recipients');
      expect(result.describes).toHaveProperty('accountId');
      expect(result.describes).toHaveProperty('driver');
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle maximum safe integer dripListId', async () => {
      // Arrange
      const maxSafeInt = BigInt(Number.MAX_SAFE_INTEGER);
      const params = {
        ...baseParams,
        dripListId: maxSafeInt,
      };

      // Act
      const result = await buildDripListMetadata(mockAdapter, params);

      // Assert
      expect(result.describes.accountId).toBe(maxSafeInt.toString());
    });

    it('should handle receivers with zero weight', async () => {
      // Arrange
      const receiversWithZeroWeight: SdkSplitsReceiver[] = [
        {
          type: 'address',
          address: '0x1234567890123456789012345678901234567890' as Address,
          weight: 0,
        },
      ];
      const params = {
        ...baseParams,
        receivers: receiversWithZeroWeight,
      };

      // Act
      const result = await buildDripListMetadata(mockAdapter, params);

      // Assert
      expect(result.recipients[0].weight).toBe(0);
    });

    it('should handle receivers with maximum weight', async () => {
      // Arrange
      const receiversWithMaxWeight: SdkSplitsReceiver[] = [
        {
          type: 'address',
          address: '0x1234567890123456789012345678901234567890' as Address,
          weight: 1000000,
        },
      ];
      const params = {
        ...baseParams,
        receivers: receiversWithMaxWeight,
      };

      // Act
      const result = await buildDripListMetadata(mockAdapter, params);

      // Assert
      expect(result.recipients[0].weight).toBe(1000000);
    });

    it('should handle very long name and description', async () => {
      // Arrange
      const longString = 'a'.repeat(10000);
      const params = {
        ...baseParams,
        name: longString,
        description: longString,
      };

      // Act
      const result = await buildDripListMetadata(mockAdapter, params);

      // Assert
      expect(result.name).toBe(longString);
      expect(result.description).toBe(longString);
      expect(result.name?.length).toBe(10000);
      expect(result.description?.length).toBe(10000);
    });

    it('should handle special characters in name and description', async () => {
      // Arrange
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?`~"\'\\';
      const params = {
        ...baseParams,
        name: specialChars,
        description: specialChars,
      };

      // Act
      const result = await buildDripListMetadata(mockAdapter, params);

      // Assert
      expect(result.name).toBe(specialChars);
      expect(result.description).toBe(specialChars);
    });

    it('should handle unicode characters in name and description', async () => {
      // Arrange
      const unicodeString = '🚀 Test Drip List 测试 🎉';
      const params = {
        ...baseParams,
        name: unicodeString,
        description: unicodeString,
      };

      // Act
      const result = await buildDripListMetadata(mockAdapter, params);

      // Assert
      expect(result.name).toBe(unicodeString);
      expect(result.description).toBe(unicodeString);
    });
  });

  describe('immutability and side effects', () => {
    it('should not modify input parameters', async () => {
      // Arrange
      const originalParams = {
        dripListId: 123n,
        receivers: [
          {
            type: 'address' as const,
            address: '0x1234567890123456789012345678901234567890' as Address,
            weight: 500000,
          },
        ],
        name: 'Original Name',
        description: 'Original Description',
        isVisible: true,
      };
      const paramsCopy = JSON.parse(
        JSON.stringify({
          ...originalParams,
          dripListId: originalParams.dripListId.toString(),
          receivers: originalParams.receivers.map(r => ({
            ...r,
            address: r.address,
          })),
        }),
      );

      // Act
      await buildDripListMetadata(mockAdapter, originalParams);

      // Assert
      expect(originalParams.name).toBe('Original Name');
      expect(originalParams.description).toBe('Original Description');
      expect(originalParams.isVisible).toBe(true);
      expect(originalParams.dripListId).toBe(123n);
      expect(originalParams.receivers[0].address).toBe(
        '0x1234567890123456789012345678901234567890',
      );
      // Verify the structure hasn't changed
      expect(
        JSON.stringify({
          ...originalParams,
          dripListId: originalParams.dripListId.toString(),
          receivers: originalParams.receivers.map(r => ({
            ...r,
            address: r.address,
          })),
        }),
      ).toBe(JSON.stringify(paramsCopy));
    });

    it('should return new object instances', async () => {
      // Act
      const result1 = await buildDripListMetadata(mockAdapter, baseParams);
      const result2 = await buildDripListMetadata(mockAdapter, baseParams);

      // Assert
      expect(result1).not.toBe(result2);
      expect(result1.describes).not.toBe(result2.describes);
      expect(result1.recipients).not.toBe(result2.recipients);
      expect(result1).toEqual(result2);
    });
  });
});
