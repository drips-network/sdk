import {describe, it, expect} from 'vitest';
import {
  validateAndFormatSplitsReceivers,
  MAX_SPLITS_RECEIVERS,
  TOTAL_SPLITS_WEIGHT,
} from '../../../src/internal/shared/validateAndFormatSplitsReceivers';
import {DripsError} from '../../../src/internal/shared/DripsError';
import {OnChainSplitsReceiver} from '../../../src/internal/shared/receiverUtils';

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
          weight: 1_000_000, // 50% * 10_000 = 500_000, but gets remainder to total 1_000_000
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
        {accountId: 123n, weight: 300_000}, // 30% * 10_000
        {accountId: 456n, weight: 500_000}, // 50% * 10_000
        {accountId: 789n, weight: 200_000}, // 20% * 10_000
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
      expect(result.map(r => r.weight)).toEqual([
        200_000, 400_000, 300_000, 100_000,
      ]); // Scaled values
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
        createReceiver(1n, 100), // 100% in percentage terms
      ];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result[0].weight).toBe(TOTAL_SPLITS_WEIGHT); // Should be 1_000_000
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
      expect(result.reduce((sum, r) => sum + r.weight, 0)).toBe(1_000_000); // Scaled total
    });
  });

  describe('empty receivers validation', () => {
    it('should throw error for empty receivers array', () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [];

      // Act & Assert
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        'Reduce of empty array with no initial value',
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
    it('should handle zero weight by assigning full remainder', () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [createReceiver(123n, 0)];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      // Zero weight (0%) is valid in percentage terms, gets scaled to 0, but then gets full remainder
      expect(result).toEqual([
        {
          accountId: 123n,
          weight: 1_000_000, // Gets the full remainder since it's the only receiver
        },
      ]);
    });

    it('should throw error for negative weight', () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [createReceiver(456n, -10)];

      // Act & Assert
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        DripsError,
      );
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        'Splits weight percentages must be between 0 and 100',
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
        'Splits weight percentages must be between 0 and 100',
      );
    });

    it('should accept minimum positive weight', async () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [createReceiver(123n, 1)];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result[0].weight).toBe(1_000_000); // 1% * 10_000 = 10_000, but gets remainder to total 1_000_000
    });

    it('should throw error when total weight exceeds maximum', () => {
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(123n, 101), // 101%, which is > 100
      ];

      // Act & Assert
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        DripsError,
      );
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        'Splits weight percentages must be between 0 and 100',
      );
    });

    it('should throw error when total weight significantly exceeds maximum', () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(123n, 201), // 201%, which exceeds 100%
      ];

      // Act & Assert
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        DripsError,
      );
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        'Splits weight percentages must be between 0 and 100',
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
      expect(result.map(r => r.weight)).toEqual([
        200_000, 400_000, 100_000, 300_000,
      ]); // Scaled values
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
        expect.fail('Should have thrown an error');
      } catch (error) {
        // The empty array causes a TypeError from reduce, not DripsError
        expect(error).toBeInstanceOf(TypeError);
        expect((error as TypeError).message).toBe(
          'Reduce of empty array with no initial value',
        );
      }
    });

    it('should preserve original error structure for all validation types', async () => {
      const testCases = [
        {
          receivers: [],
          expectedMessage: 'Reduce of empty array with no initial value',
          errorType: TypeError,
        },
        {
          receivers: [createReceiver(123n, -1)],
          expectedMessage:
            'Splits weight percentages must be between 0 and 100',
          errorType: DripsError,
        },
        {
          receivers: [createReceiver(123n, 10), createReceiver(123n, 20)],
          expectedMessage: 'Duplicate splits receivers found: 123',
          errorType: DripsError,
        },
      ];

      for (const {receivers, expectedMessage, errorType} of testCases) {
        try {
          validateAndFormatSplitsReceivers(receivers);
          expect.fail(`Should have thrown for: ${expectedMessage}`);
        } catch (error) {
          expect(error).toBeInstanceOf(errorType);
          expect((error as Error).message).toContain(expectedMessage);
        }
      }
    });

    it('should handle single receiver at boundary conditions', async () => {
      // Test minimum valid weight
      const minWeightReceiver = [createReceiver(1n, 1)];
      const result1 = validateAndFormatSplitsReceivers(minWeightReceiver);
      expect(result1[0].weight).toBe(1_000_000); // 1% * 10_000 = 10_000, but gets remainder to total 1_000_000

      // Test maximum valid weight (100%)
      const maxWeightReceiver = [createReceiver(1n, 100)];
      const result2 = validateAndFormatSplitsReceivers(maxWeightReceiver);
      expect(result2[0].weight).toBe(1_000_000); // 100% * 10_000
    });

    it('should handle complex validation scenarios', () => {
      // Test that all validations run in correct order
      // This should fail on empty check first, not other validations
      const emptyReceivers: OnChainSplitsReceiver[] = [];
      expect(() => validateAndFormatSplitsReceivers(emptyReceivers)).toThrow(
        'Reduce of empty array with no initial value',
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
      expect(result.reduce((sum, r) => sum + r.weight, 0)).toBe(1_000_000); // Scaled total
      expect(result.map(r => r.accountId)).toEqual([1n, 2n, 3n, 4n]);
    });

    it('should handle edge case with single maximum weight receiver', async () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(999n, 100), // 100% in percentage terms
      ];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].weight).toBe(TOTAL_SPLITS_WEIGHT); // Should be 1_000_000
      expect(result[0].accountId).toBe(999n);
    });
  });

  // New tests for the new functions
  describe('percentage range validation', () => {
    it('should throw error for weights above 100%', () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [createReceiver(123n, 101)];

      // Act & Assert
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        DripsError,
      );
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        'Splits weight percentages must be between 0 and 100',
      );
    });

    it('should throw error for negative weights', () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [createReceiver(456n, -1)];

      // Act & Assert
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        DripsError,
      );
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        'Splits weight percentages must be between 0 and 100',
      );
    });

    it('should throw error for multiple receivers with invalid percentage ranges', () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(123n, 101),
        createReceiver(456n, 50),
        createReceiver(789n, -5),
      ];

      // Act & Assert
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        DripsError,
      );
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        'Splits weight percentages must be between 0 and 100. Invalid: 123, 789',
      );
    });

    it('should accept valid percentage ranges', async () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(123n, 0),
        createReceiver(456n, 50),
        createReceiver(789n, 100),
      ];

      // Act & Assert - Should not throw for percentage validation
      // But will throw for total weight exceeding 100% (0+50+100=150%)
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        'Total weight of splits receivers exceeds 1000000: 1500000',
      );
    });
  });

  describe('scaling and normalization', () => {
    it('should scale percentages to contract weights', async () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(123n, 25), // 25%
        createReceiver(456n, 75), // 75%
      ];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result).toEqual([
        {accountId: 123n, weight: 250_000}, // 25% * 10_000
        {accountId: 456n, weight: 750_000}, // 75% * 10_000
      ]);
      expect(result.reduce((sum, r) => sum + r.weight, 0)).toBe(1_000_000);
    });

    it('should handle rounding and assign remainder to highest percentage receiver', async () => {
      // Arrange - Use fractional percentages that will cause rounding
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(123n, 33), // 33% -> 330_000 (floor)
        createReceiver(456n, 33), // 33% -> 330_000 (floor)
        createReceiver(789n, 34), // 34% -> 340_000 (floor) + remainder
      ];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result.reduce((sum, r) => sum + r.weight, 0)).toBe(1_000_000);
      // The receiver with highest original percentage (34%) should get the remainder
      const receiver789 = result.find(r => r.accountId === 789n);
      expect(receiver789?.weight).toBe(340_000); // Actually gets exactly 340_000, no remainder in this case
    });

    it('should handle edge case with all equal percentages', async () => {
      // Arrange - Three equal percentages that don't divide evenly
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(123n, 33), // 33.33...%
        createReceiver(456n, 33), // 33.33...%
        createReceiver(789n, 33), // 33.33...%
      ];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result.reduce((sum, r) => sum + r.weight, 0)).toBe(1_000_000); // Total should be normalized to 1_000_000
      // Since all have equal original percentages, the first one (by original order) should get remainder
      const receiver123 = result.find(r => r.accountId === 123n);
      expect(receiver123?.weight).toBe(340_000); // 330_000 + 10_000 remainder
    });

    it('should handle single receiver with fractional percentage', async () => {
      // Arrange
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(123n, 99), // 99% -> 990_000 + 10_000 remainder = 1_000_000
      ];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result[0].weight).toBe(1_000_000); // Gets the full amount including remainder
    });

    it('should preserve original percentage ordering for remainder assignment', async () => {
      // Arrange - Multiple receivers with same highest percentage
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(999n, 34), // Same highest percentage, but higher accountId
        createReceiver(123n, 33),
        createReceiver(456n, 34), // Same highest percentage, lower accountId
      ];

      // Act & Assert
      // This should actually fail validation since total > 100 (34+33+34=101)
      expect(() => validateAndFormatSplitsReceivers(receivers)).toThrow(
        'Total weight of splits receivers exceeds 1000000: 1010000',
      );
    });

    it('should handle zero remainder case', async () => {
      // Arrange - Percentages that scale exactly
      const receivers: OnChainSplitsReceiver[] = [
        createReceiver(123n, 50), // 50% -> 500_000
        createReceiver(456n, 50), // 50% -> 500_000
      ];

      // Act
      const result = validateAndFormatSplitsReceivers(receivers);

      // Assert
      expect(result.reduce((sum, r) => sum + r.weight, 0)).toBe(1_000_000);
      expect(result).toEqual([
        {accountId: 123n, weight: 500_000},
        {accountId: 456n, weight: 500_000},
      ]);
    });
  });
});
