import {describe, it, expect} from 'vitest';
import {
  validateAndFormatSplitsReceivers,
  MAX_SPLITS_RECEIVERS,
  TOTAL_SPLITS_WEIGHT,
  type OnChainSplitsReceiver,
} from '../../../src/internal/shared/validateAndFormatSplitsReceivers';
import {DripsError} from '../../../src/internal/shared/DripsError';

describe('validateAndFormatSplitsReceivers', () => {
  const createReceiver = (
    accountId: bigint,
    weight: number,
  ): OnChainSplitsReceiver => ({
    accountId,
    weight,
  });

  describe('successful validation and formatting', () => {
    it('should validate and format single receiver', async () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [createReceiver(123n, 50)];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result).toEqual([
        {
          accountId: 123n,
          weight: 50,
        },
      ]);
    });

    it('should validate and format multiple receivers', async () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(456n, 50),
        createReceiver(123n, 30),
        createReceiver(789n, 20),
      ];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result).toEqual([
        {accountId: 123n, weight: 30},
        {accountId: 456n, weight: 50},
        {accountId: 789n, weight: 20},
      ]);
      expect(result).toHaveLength(3);
    });

    it('should sort receivers by accountId in ascending order', async () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(999n, 10),
        createReceiver(1n, 20),
        createReceiver(500n, 30),
        createReceiver(50n, 40),
      ];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result.map(r => r.accountId)).toEqual([1n, 50n, 500n, 999n]);
      expect(result.map(r => r.weight)).toEqual([20, 40, 30, 10]);
    });

    it('should handle maximum allowed receivers', async () => {
      // Arrange - Use 100 receivers with weight 1 each (total = 100)
      const receivers: OnChainSplitsReceiver[] = Array.from(
        {length: 100},
        (_, i) => createReceiver(BigInt(i + 1), 1),
      );

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result).toHaveLength(100);
      expect(result[0].accountId).toBe(1n);
      expect(result[99].accountId).toBe(100n);
    });

    it('should handle large accountId values', async () => {
      // Arrange
      const largeAccountId = BigInt('0xffffffffffffffffffffffffffffffff');
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(largeAccountId, 100),
      ];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result[0].accountId).toBe(largeAccountId);
    });

    it('should handle zero accountId', async () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [createReceiver(0n, 100)];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result[0].accountId).toBe(0n);
    });

    it('should handle maximum total weight exactly', async () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(1n, TOTAL_SPLITS_WEIGHT),
      ];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result[0].weight).toBe(TOTAL_SPLITS_WEIGHT);
    });

    it('should handle weight distribution that sums to maximum', async () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(1n, 50),
        createReceiver(2n, 30),
        createReceiver(3n, 20),
      ];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result.reduce((sum, r) => sum + r.weight, 0)).toBe(100);
    });
  });

  describe('empty receivers validation', () => {
    it('should throw error for empty receivers array', () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [];

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
      const receivers: OnChainSplitsReceiver[] = Array.from(
        {length: MAX_SPLITS_RECEIVERS + 1},
        (_, i) => createReceiver(BigInt(i + 1), 1),
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
      const receivers: OnChainSplitsReceiver[] = Array.from(
        {length: count},
        (_, i) => createReceiver(BigInt(i + 1), 1),
      );

      // Act & Assert
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        `Too many splits receivers: ${count}. Maximum is ${MAX_SPLITS_RECEIVERS}`,
      );
    });

    it('should accept exactly maximum receivers', async () => {
      // Arrange - Use 100 receivers with weight 1 each (total = 100)
      const receivers: OnChainSplitsReceiver[] = Array.from(
        {length: 100},
        (_, i) => createReceiver(BigInt(i + 1), 1),
      );

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result).toHaveLength(100);
    });
  });

  describe('weight validation', () => {
    it('should throw error for zero weight', () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [createReceiver(123n, 0)];

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
      const receivers: OnChainSplitsReceiver[] = [createReceiver(456n, -10)];

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
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(123n, 0),
        createReceiver(456n, 10),
        createReceiver(789n, -5),
      ];

      // Act & Assert
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        DripsError,
      );
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        'Invalid split receiver weights: 123, 789 have weight <= 0',
      );
    });

    it('should accept minimum positive weight', async () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [createReceiver(123n, 1)];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result[0].weight).toBe(1);
    });

    it('should throw error when total weight exceeds maximum', () => {
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(123n, TOTAL_SPLITS_WEIGHT + 1), // 101, which is > 100 but < 200
      ];

      // Act & Assert
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        DripsError,
      );
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        `Total weight of splits receivers exceeds ${TOTAL_SPLITS_WEIGHT}: ${TOTAL_SPLITS_WEIGHT + 1}`,
      );
    });

    it('should throw error when total weight significantly exceeds maximum', () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(123n, MAX_SPLITS_RECEIVERS + 1), // 201, which exceeds both limits
      ];

      // Act & Assert
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        DripsError,
      );
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        `Total weight of splits receivers exceeds ${TOTAL_SPLITS_WEIGHT}: ${MAX_SPLITS_RECEIVERS + 1}`,
      );
    });

    it('should throw error when multiple receivers total weight exceeds maximum', () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(123n, 60),
        createReceiver(456n, 50), // Total: 110, exceeds TOTAL_SPLITS_WEIGHT (100)
      ];

      // Act & Assert
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        DripsError,
      );
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        `Total weight of splits receivers exceeds ${TOTAL_SPLITS_WEIGHT}: 110`,
      );
    });

    it('should handle fractional weights that sum to exceed maximum', () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(1n, 33),
        createReceiver(2n, 33),
        createReceiver(3n, 35), // Total: 101, exceeds TOTAL_SPLITS_WEIGHT (100)
      ];

      // Act & Assert
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        DripsError,
      );
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        `Total weight of splits receivers exceeds ${TOTAL_SPLITS_WEIGHT}: 101`,
      );
    });
  });

  describe('duplicate validation', () => {
    it('should throw error for duplicate accountIds', () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(123n, 50),
        createReceiver(123n, 50), // Same accountId
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
      // Arrange - Use weights that don't exceed total weight limit
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(123n, 10),
        createReceiver(456n, 10),
        createReceiver(123n, 10), // Duplicate
        createReceiver(999n, 10),
        createReceiver(456n, 10), // Duplicate
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
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(largeId, 50),
        createReceiver(largeId, 50), // Duplicate
      ];

      // Act & Assert
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        `Duplicate splits receivers found: ${largeId.toString()}`,
      );
    });

    it('should not throw error for unique accountIds', async () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(123n, 30),
        createReceiver(456n, 40),
        createReceiver(789n, 30),
      ];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result).toHaveLength(3);
      expect(result.map(r => r.accountId)).toEqual([123n, 456n, 789n]);
    });

    it('should handle multiple occurrences of same duplicate', () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(123n, 10),
        createReceiver(123n, 20), // First duplicate
        createReceiver(456n, 30),
        createReceiver(123n, 40), // Second duplicate of same ID
      ];

      // Act & Assert
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        'Duplicate splits receivers found: 123',
      );
    });
  });

  describe('sorting behavior', () => {
    it('should sort receivers by accountId in ascending order', async () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(100n, 10),
        createReceiver(50n, 20),
        createReceiver(200n, 30),
        createReceiver(75n, 40),
      ];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result.map(r => r.accountId)).toEqual([50n, 75n, 100n, 200n]);
      expect(result.map(r => r.weight)).toEqual([20, 40, 10, 30]);
    });

    it('should handle sorting with zero accountId', async () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(10n, 30),
        createReceiver(0n, 10),
        createReceiver(5n, 60),
      ];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result.map(r => r.accountId)).toEqual([0n, 5n, 10n]);
    });

    it('should handle sorting with very large accountIds', async () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(BigInt('0xffffffffffffffffffffffffffffffff'), 10),
        createReceiver(1n, 20),
        createReceiver(BigInt('0x8000000000000000'), 30),
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

    it('should maintain original array immutability', async () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(100n, 10),
        createReceiver(50n, 20),
      ];
      const originalOrder = [...receivers];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(receivers).toEqual(originalOrder); // Original array unchanged
      expect(result).not.toBe(receivers); // Different array reference
      expect(result.map(r => r.accountId)).toEqual([50n, 100n]); // Sorted result
    });
  });

  describe('error handling and edge cases', () => {
    it('should throw DripsError with proper error class', async () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [];

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

    it('should preserve original error structure for all validation types', async () => {
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
          receivers: [createReceiver(123n, 10), createReceiver(123n, 20)],
          expectedMessage: 'Duplicate splits receivers found: 123',
        },
      ];

      for (const {receivers, expectedMessage} of testCases) {
        try {
          validateAndFormatSplitsReceivers(receivers);
          expect.fail(`Should have thrown for: ${expectedMessage}`);
        } catch (error) {
          expect(error).toBeInstanceOf(DripsError);
          expect((error as DripsError).message).toContain(expectedMessage);
        }
      }
    });

    it('should handle single receiver at boundary conditions', async () => {
      // Test minimum valid weight
      const minWeightReceiver = [createReceiver(1n, 1)];
      const result1 = validateAndFormatSplitsReceivers(minWeightReceiver);
      expect(result1[0].weight).toBe(1);

      // Test maximum valid weight
      const maxWeightReceiver = [createReceiver(1n, TOTAL_SPLITS_WEIGHT)];
      const result2 = validateAndFormatSplitsReceivers(maxWeightReceiver);
      expect(result2[0].weight).toBe(TOTAL_SPLITS_WEIGHT);
    });

    it('should handle complex validation scenarios', () => {
      // Test that all validations run in correct order
      // This should fail on empty check first, not other validations
      const emptyReceivers: OnChainSplitsReceiver[] = [];
      expect(() => validateAndFormatSplitsReceivers(emptyReceivers)).toThrow(
        'Splits receivers cannot be empty',
      );
    });
  });

  describe('performance and scalability', () => {
    it('should handle sorting performance with maximum receivers', async () => {
      // Arrange - Create 100 receivers in reverse order to test worst-case sorting
      // Use weight 1 each (total = 100)
      const receivers: OnChainSplitsReceiver[] = Array.from(
        {length: 100},
        (_, i) => createReceiver(BigInt(100 - i), 1),
      );

      // Act
      const startTime = performance.now();
      const result = validateAndFormatSplitsReceivers(receivers);
      const endTime = performance.now();

      // Assert
      expect(result).toHaveLength(100);
      expect(result[0].accountId).toBe(1n);
      expect(result[99].accountId).toBe(100n);
      // Performance should be reasonable (less than 1000ms for 100 receivers)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle duplicate detection performance with many duplicates', () => {
      // Arrange - Create many duplicates to test worst-case duplicate detection
      const receivers: OnChainSplitsReceiver[] = Array.from({length: 100}, () =>
        createReceiver(123n, 1),
      );

      // Act & Assert
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        'Duplicate splits receivers found: 123',
      );
    });

    it('should handle large weight calculations', () => {
      // Arrange - Test with large weights that could cause overflow issues
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(1n, Number.MAX_SAFE_INTEGER),
      ];

      // Act & Assert
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        DripsError,
      );
    });
  });

  describe('integration scenarios', () => {
    it('should handle realistic distribution scenarios', async () => {
      // Arrange - Realistic percentage distributions
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(1n, 40), // 40%
        createReceiver(2n, 35), // 35%
        createReceiver(3n, 15), // 15%
        createReceiver(4n, 10), // 10%
      ];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result).toHaveLength(4);
      expect(result.reduce((sum, r) => sum + r.weight, 0)).toBe(100);
      expect(result.map(r => r.accountId)).toEqual([1n, 2n, 3n, 4n]);
    });

    it('should handle edge case with single maximum weight receiver', async () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(999n, TOTAL_SPLITS_WEIGHT),
      ];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].weight).toBe(TOTAL_SPLITS_WEIGHT);
      expect(result[0].accountId).toBe(999n);
    });
  });
});
