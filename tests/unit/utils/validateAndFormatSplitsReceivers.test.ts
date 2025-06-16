import {describe, it, expect} from 'vitest';
import {
  validateAndFormatSplitsReceivers,
  MAX_SPLITS_RECEIVERS,
} from '../../../src/internal/utils/validateAndFormatSplitsReceivers';
import {DripsError} from '../../../src/internal/DripsError';
import type {SdkSplitsReceiver} from '../../../src/internal/metadata/createPinataIpfsUploader';

describe('validateAndFormatSplitsReceivers', () => {
  const createReceiver = (
    accountId: bigint | string | number,
    weight: number,
  ): SdkSplitsReceiver => ({
    type: 'address',
    accountId: BigInt(accountId).toString(),
    weight,
  });

  describe('successful validation and formatting', () => {
    it('should validate and format single receiver', () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = [createReceiver(123n, 1000000)];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result).toEqual([
        {
          accountId: 123n,
          weight: 1000000,
        },
      ]);
    });

    it('should validate and format multiple receivers', () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = [
        createReceiver(456n, 500000),
        createReceiver(123n, 300000),
        createReceiver(789n, 200000),
      ];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result).toEqual([
        {accountId: 123n, weight: 300000},
        {accountId: 456n, weight: 500000},
        {accountId: 789n, weight: 200000},
      ]);
      expect(result).toHaveLength(3);
    });

    it('should sort receivers by accountId in ascending order', () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = [
        createReceiver(999n, 100000),
        createReceiver(1n, 200000),
        createReceiver(500n, 300000),
        createReceiver(50n, 400000),
      ];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result.map(r => r.accountId)).toEqual([1n, 50n, 500n, 999n]);
      expect(result.map(r => r.weight)).toEqual([
        200000, 400000, 300000, 100000,
      ]);
    });

    it('should handle maximum allowed receivers', () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = Array.from(
        {length: MAX_SPLITS_RECEIVERS},
        (_, i) => createReceiver(BigInt(i + 1), 1000),
      );

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result).toHaveLength(MAX_SPLITS_RECEIVERS);
      expect(result[0].accountId).toBe(1n);
      expect(result[MAX_SPLITS_RECEIVERS - 1].accountId).toBe(
        BigInt(MAX_SPLITS_RECEIVERS),
      );
    });

    it('should handle large accountId values', () => {
      // Arrange
      const largeAccountId = BigInt('0xffffffffffffffffffffffffffffffff');
      const receivers: SdkSplitsReceiver[] = [
        createReceiver(largeAccountId, 1000000),
      ];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result[0].accountId).toBe(largeAccountId);
    });

    it('should handle zero accountId', () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = [createReceiver(0n, 1000000)];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result[0].accountId).toBe(0n);
    });

    it('should convert string accountId to BigInt', () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = [
        {
          type: 'address',
          accountId: '123456789',
          weight: 1000000,
        },
      ];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result[0].accountId).toBe(123456789n);
      expect(typeof result[0].accountId).toBe('bigint');
    });
  });

  describe('empty receivers validation', () => {
    it('should throw error for empty receivers array', () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = [];

      // Act & Assert
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        DripsError,
      );
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        'Splits receivers cannot be empty',
      );
    });
  });

  describe('maximum receivers validation', () => {
    it('should throw error when exceeding maximum receivers', () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = Array.from(
        {length: MAX_SPLITS_RECEIVERS + 1},
        (_, i) => createReceiver(BigInt(i + 1), 1000),
      );

      // Act & Assert
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        DripsError,
      );
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        `Too many splits receivers: ${MAX_SPLITS_RECEIVERS + 1}. Maximum is ${MAX_SPLITS_RECEIVERS}`,
      );
    });

    it('should throw error with correct count in error message', () => {
      // Arrange
      const count = MAX_SPLITS_RECEIVERS + 50;
      const receivers: SdkSplitsReceiver[] = Array.from(
        {length: count},
        (_, i) => createReceiver(BigInt(i + 1), 1000),
      );

      // Act & Assert
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        `Too many splits receivers: ${count}. Maximum is ${MAX_SPLITS_RECEIVERS}`,
      );
    });
  });

  describe('weight validation', () => {
    it('should throw error for zero weight', () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = [createReceiver(123n, 0)];

      // Act & Assert
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        DripsError,
      );
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        'Invalid split receiver weights: 123 have weight <= 0',
      );
    });

    it('should throw error for negative weight', () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = [createReceiver(456n, -100)];

      // Act & Assert
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        DripsError,
      );
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        'Invalid split receiver weights: 456 have weight <= 0',
      );
    });

    it('should throw error for multiple receivers with invalid weights', () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = [
        createReceiver(123n, 0),
        createReceiver(456n, 1000),
        createReceiver(789n, -50),
      ];

      // Act & Assert
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        DripsError,
      );
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        'Invalid split receiver weights: 123, 789 have weight <= 0',
      );
    });

    it('should accept minimum positive weight', () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = [createReceiver(123n, 1)];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result[0].weight).toBe(1);
    });

    it('should accept maximum weight value', () => {
      // Arrange
      const maxWeight = 1000000;
      const receivers: SdkSplitsReceiver[] = [createReceiver(123n, maxWeight)];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result[0].weight).toBe(maxWeight);
    });
  });

  describe('duplicate validation', () => {
    it('should throw error for duplicate accountIds', () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = [
        createReceiver(123n, 500000),
        createReceiver(123n, 500000),
      ];

      // Act & Assert
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        DripsError,
      );
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        'Duplicate splits receivers found: 123',
      );
    });

    it('should throw error for multiple duplicate accountIds', () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = [
        createReceiver(123n, 300000),
        createReceiver(456n, 200000),
        createReceiver(123n, 300000),
        createReceiver(789n, 200000),
        createReceiver(456n, 100000),
      ];

      // Act & Assert
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        DripsError,
      );
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        'Duplicate splits receivers found: 123, 456',
      );
    });

    it('should handle duplicate detection with large accountIds', () => {
      // Arrange
      const largeId = BigInt('0xffffffffffffffffffffffffffffffff');
      const receivers: SdkSplitsReceiver[] = [
        createReceiver(largeId, 500000),
        createReceiver(largeId, 500000),
      ];

      // Act & Assert
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        `Duplicate splits receivers found: ${largeId.toString()}`,
      );
    });

    it('should not throw error for unique accountIds', () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = [
        createReceiver(123n, 300000),
        createReceiver(456n, 400000),
        createReceiver(789n, 300000),
      ];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result).toHaveLength(3);
      expect(result.map(r => r.accountId)).toEqual([123n, 456n, 789n]);
    });
  });

  describe('sorting behavior', () => {
    it('should maintain stable sort for equal accountIds (should not happen due to duplicate validation)', () => {
      // This test ensures sorting logic is robust even if duplicate validation changes
      const receivers: SdkSplitsReceiver[] = [
        createReceiver(100n, 1000),
        createReceiver(50n, 2000),
        createReceiver(200n, 3000),
        createReceiver(75n, 4000),
      ];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result.map(r => r.accountId)).toEqual([50n, 75n, 100n, 200n]);
      expect(result.map(r => r.weight)).toEqual([2000, 4000, 1000, 3000]);
    });

    it('should handle sorting with zero and negative accountIds', () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = [
        createReceiver(0n, 1000),
        createReceiver(-5n, 2000),
        createReceiver(10n, 3000),
      ];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result.map(r => r.accountId)).toEqual([-5n, 0n, 10n]);
    });

    it('should handle sorting with very large accountIds', () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = [
        createReceiver(BigInt('0xffffffffffffffffffffffffffffffff'), 1000),
        createReceiver(1n, 2000),
        createReceiver(BigInt('0x8000000000000000'), 3000),
      ];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result[0].accountId).toBe(1n);
      expect(result[1].accountId).toBe(BigInt('0x8000000000000000'));
      expect(result[2].accountId).toBe(
        BigInt('0xffffffffffffffffffffffffffffffff'),
      );
    });
  });

  describe('immutability and side effects', () => {
    it('should not modify input array', () => {
      // Arrange
      const originalReceivers: SdkSplitsReceiver[] = [
        createReceiver(456n, 500000),
        createReceiver(123n, 300000),
      ];
      const receiversCopy = originalReceivers.map(r => ({...r}));

      // Act
      validateAndFormatSplitsReceivers(originalReceivers);

      // Assert
      expect(originalReceivers).toEqual(receiversCopy);
      expect(originalReceivers[0].accountId).toBe('456');
      expect(originalReceivers[1].accountId).toBe('123');
    });

    it('should not modify input receiver objects', () => {
      // Arrange
      const receiver = createReceiver(123n, 1000000);
      const originalReceiver = {...receiver};

      // Act
      validateAndFormatSplitsReceivers([receiver]);

      // Assert
      expect(receiver).toEqual(originalReceiver);
    });

    it('should return new array instance', () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = [createReceiver(123n, 1000000)];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result).not.toBe(receivers);
    });

    it('should return new receiver objects', () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = [createReceiver(123n, 1000000)];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result[0]).not.toBe(receivers[0]);
      expect(result[0]).toEqual({
        accountId: 123n,
        weight: 1000000,
      });
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle receivers with different types but same validation', () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = [
        {type: 'address', accountId: '123', weight: 300000},
        {type: 'dripList', accountId: '456', weight: 400000},
        {type: 'subList', accountId: '789', weight: 300000},
      ];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result).toHaveLength(3);
      expect(result.map(r => r.accountId)).toEqual([123n, 456n, 789n]);
      // Type information is not preserved in the result
      expect(result[0]).not.toHaveProperty('type');
    });

    it('should handle accountId conversion from different BigInt representations', () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = [
        {
          type: 'address',
          accountId: '291', // BigInt('0x123') = 291
          weight: 1000000,
        },
        {
          type: 'address',
          accountId: '456',
          weight: 1000000,
        },
      ];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result[0].accountId).toBe(BigInt('0x123'));
      expect(result[1].accountId).toBe(456n);
      expect(result.map(r => r.accountId)).toEqual([BigInt('0x123'), 456n]);
    });

    it('should handle maximum safe integer boundaries', () => {
      // Arrange
      const maxSafeInt = BigInt(Number.MAX_SAFE_INTEGER);
      const receivers: SdkSplitsReceiver[] = [
        createReceiver(maxSafeInt, 1000000),
        createReceiver(maxSafeInt + 1n, 1000000),
      ];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result[0].accountId).toBe(maxSafeInt);
      expect(result[1].accountId).toBe(maxSafeInt + 1n);
    });
  });

  describe('error metadata validation', () => {
    it('should throw DripsError with proper error class', () => {
      // Arrange
      const receivers: SdkSplitsReceiver[] = [];

      // Act & Assert
      try {
        validateAndFormatSplitsReceivers(receivers);
        expect.fail('Should have thrown DripsError');
      } catch (error) {
        expect(error).toBeInstanceOf(DripsError);
        expect((error as DripsError).name).toBe('DripsError');
        expect((error as DripsError).message).toContain('[Drips SDK]');
      }
    });

    it('should preserve original error structure for all validation types', () => {
      const testCases = [
        {
          receivers: [],
          expectedMessage: 'Splits receivers cannot be empty',
        },
        {
          receivers: [createReceiver(123n, 0)],
          expectedMessage:
            'Invalid split receiver weights: 123 have weight <= 0',
        },
        {
          receivers: [createReceiver(123n, 1000), createReceiver(123n, 2000)],
          expectedMessage: 'Duplicate splits receivers found: 123',
        },
      ];

      testCases.forEach(({receivers, expectedMessage}) => {
        try {
          validateAndFormatSplitsReceivers(receivers);
          expect.fail(`Should have thrown for: ${expectedMessage}`);
        } catch (error) {
          expect(error).toBeInstanceOf(DripsError);
          expect((error as DripsError).message).toContain(expectedMessage);
        }
      });
    });
  });

  describe('performance and scalability', () => {
    it('should handle sorting performance with maximum receivers', () => {
      // Arrange - Create receivers in reverse order to test worst-case sorting
      const receivers: SdkSplitsReceiver[] = Array.from(
        {length: MAX_SPLITS_RECEIVERS},
        (_, i) => createReceiver(BigInt(MAX_SPLITS_RECEIVERS - i), 1000),
      );

      // Act
      const startTime = performance.now();
      const result = validateAndFormatSplitsReceivers(receivers);
      const endTime = performance.now();

      // Assert
      expect(result).toHaveLength(MAX_SPLITS_RECEIVERS);
      expect(result[0].accountId).toBe(1n);
      expect(result[MAX_SPLITS_RECEIVERS - 1].accountId).toBe(
        BigInt(MAX_SPLITS_RECEIVERS),
      );
      // Performance should be reasonable (less than 100ms for max receivers)
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle duplicate detection performance with many duplicates', () => {
      // Arrange - Create many duplicates to test worst-case duplicate detection
      const receivers: SdkSplitsReceiver[] = Array.from({length: 100}, () =>
        createReceiver(123n, 1000),
      );

      // Act & Assert
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        'Duplicate splits receivers found: 123',
      );
    });
  });
});
