import {describe, it, expect} from 'vitest';
import {buildDripListMetadata} from '../../../src/internal/metadata/buildDripListMetadata';
import type {SdkSplitsReceiver} from '../../../src/internal/metadata/createPinataIpfsUploader';

describe('buildDripListMetadata', () => {
  const mockDripListId = 123n;
  const mockReceivers: SdkSplitsReceiver[] = [
    {
      type: 'address',
      accountId: '456',
      weight: 500000,
    },
    {
      type: 'address',
      accountId: '789',
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
    it('should build complete drip list metadata with all fields', () => {
      // Act
      const result = buildDripListMetadata(baseParams);

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
            accountId: '456',
            weight: 500000,
          },
          {
            type: 'address',
            accountId: '789',
            weight: 500000,
          },
        ],
      });
    });

    it('should handle undefined name', () => {
      // Arrange
      const params = {
        ...baseParams,
        name: undefined,
      };

      // Act
      const result = buildDripListMetadata(params);

      // Assert
      expect(result.name).toBeUndefined();
      expect(result.type).toBe('dripList');
      expect(result.driver).toBe('nft');
    });

    it('should handle undefined description', () => {
      // Arrange
      const params = {
        ...baseParams,
        description: undefined,
      };

      // Act
      const result = buildDripListMetadata(params);

      // Assert
      expect(result.description).toBeUndefined();
      expect(result.type).toBe('dripList');
      expect(result.driver).toBe('nft');
    });

    it('should handle both name and description undefined', () => {
      // Arrange
      const params = {
        ...baseParams,
        name: undefined,
        description: undefined,
      };

      // Act
      const result = buildDripListMetadata(params);

      // Assert
      expect(result.name).toBeUndefined();
      expect(result.description).toBeUndefined();
      expect(result.type).toBe('dripList');
      expect(result.driver).toBe('nft');
    });

    it('should handle empty receivers array', () => {
      // Arrange
      const params = {
        ...baseParams,
        receivers: [],
      };

      // Act
      const result = buildDripListMetadata(params);

      // Assert
      expect(result.recipients).toEqual([]);
      expect(result.type).toBe('dripList');
      expect(result.driver).toBe('nft');
    });

    it('should handle isVisible false', () => {
      // Arrange
      const params = {
        ...baseParams,
        isVisible: false,
      };

      // Act
      const result = buildDripListMetadata(params);

      // Assert
      expect(result.isVisible).toBe(false);
      expect(result.type).toBe('dripList');
      expect(result.driver).toBe('nft');
    });

    it('should handle empty string name and description', () => {
      // Arrange
      const params = {
        ...baseParams,
        name: '',
        description: '',
      };

      // Act
      const result = buildDripListMetadata(params);

      // Assert
      expect(result.name).toBe('');
      expect(result.description).toBe('');
      expect(result.type).toBe('dripList');
      expect(result.driver).toBe('nft');
    });
  });

  describe('dripListId conversion', () => {
    it('should convert zero dripListId to string', () => {
      // Arrange
      const params = {
        ...baseParams,
        dripListId: 0n,
      };

      // Act
      const result = buildDripListMetadata(params);

      // Assert
      expect(result.describes.accountId).toBe('0');
      expect(typeof result.describes.accountId).toBe('string');
    });

    it('should convert large dripListId to string', () => {
      // Arrange
      const largeDripListId = BigInt('0xffffffffffffffffffffffffffffffff');
      const params = {
        ...baseParams,
        dripListId: largeDripListId,
      };

      // Act
      const result = buildDripListMetadata(params);

      // Assert
      expect(result.describes.accountId).toBe(largeDripListId.toString());
      expect(typeof result.describes.accountId).toBe('string');
    });

    it('should convert negative dripListId to string', () => {
      // Arrange
      const params = {
        ...baseParams,
        dripListId: -123n,
      };

      // Act
      const result = buildDripListMetadata(params);

      // Assert
      expect(result.describes.accountId).toBe('-123');
      expect(typeof result.describes.accountId).toBe('string');
    });
  });

  describe('receivers serialization', () => {
    it('should serialize single receiver correctly', () => {
      // Arrange
      const singleReceiver: SdkSplitsReceiver[] = [
        {
          type: 'address',
          accountId: '999',
          weight: 1000000,
        },
      ];
      const params = {
        ...baseParams,
        receivers: singleReceiver,
      };

      // Act
      const result = buildDripListMetadata(params);

      // Assert
      expect(result.recipients).toHaveLength(1);
      expect(result.recipients[0]).toEqual({
        type: 'address',
        accountId: '999',
        weight: 1000000,
      });
    });

    it('should serialize multiple receivers with different types', () => {
      // Arrange
      const mixedReceivers: SdkSplitsReceiver[] = [
        {
          type: 'address',
          accountId: '111',
          weight: 300000,
        },
        {
          type: 'dripList',
          accountId: '222',
          weight: 700000,
        },
      ];
      const params = {
        ...baseParams,
        receivers: mixedReceivers,
      };

      // Act
      const result = buildDripListMetadata(params);

      // Assert
      expect(result.recipients).toHaveLength(2);
      expect(result.recipients[0]).toEqual({
        type: 'address',
        accountId: '111',
        weight: 300000,
      });
      expect(result.recipients[1]).toEqual({
        type: 'dripList',
        accountId: '222',
        weight: 700000,
      });
    });

    it('should serialize receivers with zero accountId', () => {
      // Arrange
      const receiversWithZero: SdkSplitsReceiver[] = [
        {
          type: 'address',
          accountId: '0',
          weight: 1000000,
        },
      ];
      const params = {
        ...baseParams,
        receivers: receiversWithZero,
      };

      // Act
      const result = buildDripListMetadata(params);

      // Assert
      expect(result.recipients[0].accountId).toBe('0');
      expect(typeof result.recipients[0].accountId).toBe('string');
    });

    it('should serialize receivers with large accountId', () => {
      // Arrange
      const largeAccountId = BigInt('0x123456789abcdef0123456789abcdef0');
      const receiversWithLarge: SdkSplitsReceiver[] = [
        {
          type: 'address',
          accountId: largeAccountId.toString(),
          weight: 1000000,
        },
      ];
      const params = {
        ...baseParams,
        receivers: receiversWithLarge,
      };

      // Act
      const result = buildDripListMetadata(params);

      // Assert
      expect(result.recipients[0].accountId).toBe(largeAccountId.toString());
      expect(typeof result.recipients[0].accountId).toBe('string');
    });

    it('should preserve all receiver properties except accountId conversion', () => {
      // Arrange
      const receiverWithAllProps: SdkSplitsReceiver[] = [
        {
          type: 'subList',
          accountId: '555',
          weight: 250000,
        },
      ];
      const params = {
        ...baseParams,
        receivers: receiverWithAllProps,
      };

      // Act
      const result = buildDripListMetadata(params);

      // Assert
      expect(result.recipients[0]).toEqual({
        type: 'subList',
        accountId: '555',
        weight: 250000,
      });
    });
  });

  describe('metadata structure validation', () => {
    it('should always have correct driver and type', () => {
      // Arrange
      const minimalParams = {
        dripListId: 1n,
        receivers: [],
        isVisible: false,
      };

      // Act
      const result = buildDripListMetadata(minimalParams);

      // Assert
      expect(result.driver).toBe('nft');
      expect(result.type).toBe('dripList');
      expect(result.describes.driver).toBe('nft');
    });

    it('should maintain describes structure', () => {
      // Act
      const result = buildDripListMetadata(baseParams);

      // Assert
      expect(result.describes).toEqual({
        accountId: mockDripListId.toString(),
        driver: 'nft',
      });
      expect(typeof result.describes.accountId).toBe('string');
      expect(result.describes.driver).toBe('nft');
    });

    it('should include all required fields', () => {
      // Act
      const result = buildDripListMetadata(baseParams);

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
    it('should handle maximum safe integer dripListId', () => {
      // Arrange
      const maxSafeInt = BigInt(Number.MAX_SAFE_INTEGER);
      const params = {
        ...baseParams,
        dripListId: maxSafeInt,
      };

      // Act
      const result = buildDripListMetadata(params);

      // Assert
      expect(result.describes.accountId).toBe(maxSafeInt.toString());
    });

    it('should handle receivers with zero weight', () => {
      // Arrange
      const receiversWithZeroWeight: SdkSplitsReceiver[] = [
        {
          type: 'address',
          accountId: '123',
          weight: 0,
        },
      ];
      const params = {
        ...baseParams,
        receivers: receiversWithZeroWeight,
      };

      // Act
      const result = buildDripListMetadata(params);

      // Assert
      expect(result.recipients[0].weight).toBe(0);
    });

    it('should handle receivers with maximum weight', () => {
      // Arrange
      const receiversWithMaxWeight: SdkSplitsReceiver[] = [
        {
          type: 'address',
          accountId: '123',
          weight: 1000000,
        },
      ];
      const params = {
        ...baseParams,
        receivers: receiversWithMaxWeight,
      };

      // Act
      const result = buildDripListMetadata(params);

      // Assert
      expect(result.recipients[0].weight).toBe(1000000);
    });

    it('should handle very long name and description', () => {
      // Arrange
      const longString = 'a'.repeat(10000);
      const params = {
        ...baseParams,
        name: longString,
        description: longString,
      };

      // Act
      const result = buildDripListMetadata(params);

      // Assert
      expect(result.name).toBe(longString);
      expect(result.description).toBe(longString);
      expect(result.name?.length).toBe(10000);
      expect(result.description?.length).toBe(10000);
    });

    it('should handle special characters in name and description', () => {
      // Arrange
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?`~"\'\\';
      const params = {
        ...baseParams,
        name: specialChars,
        description: specialChars,
      };

      // Act
      const result = buildDripListMetadata(params);

      // Assert
      expect(result.name).toBe(specialChars);
      expect(result.description).toBe(specialChars);
    });

    it('should handle unicode characters in name and description', () => {
      // Arrange
      const unicodeString = '🚀 Test Drip List 测试 🎉';
      const params = {
        ...baseParams,
        name: unicodeString,
        description: unicodeString,
      };

      // Act
      const result = buildDripListMetadata(params);

      // Assert
      expect(result.name).toBe(unicodeString);
      expect(result.description).toBe(unicodeString);
    });
  });

  describe('immutability and side effects', () => {
    it('should not modify input parameters', () => {
      // Arrange
      const originalParams = {
        dripListId: 123n,
        receivers: [
          {
            type: 'address' as const,
            accountId: '456',
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
            accountId: r.accountId.toString(),
          })),
        }),
      );

      // Act
      buildDripListMetadata(originalParams);

      // Assert
      expect(originalParams.name).toBe('Original Name');
      expect(originalParams.description).toBe('Original Description');
      expect(originalParams.isVisible).toBe(true);
      expect(originalParams.dripListId).toBe(123n);
      expect(originalParams.receivers[0].accountId).toBe('456');
      // Verify the structure hasn't changed
      expect(
        JSON.stringify({
          ...originalParams,
          dripListId: originalParams.dripListId.toString(),
          receivers: originalParams.receivers.map(r => ({
            ...r,
            accountId: r.accountId.toString(),
          })),
        }),
      ).toBe(JSON.stringify(paramsCopy));
    });

    it('should return new object instances', () => {
      // Act
      const result1 = buildDripListMetadata(baseParams);
      const result2 = buildDripListMetadata(baseParams);

      // Assert
      expect(result1).not.toBe(result2);
      expect(result1.describes).not.toBe(result2.describes);
      expect(result1.recipients).not.toBe(result2.recipients);
      expect(result1).toEqual(result2);
    });
  });
});
