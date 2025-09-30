import {describe, it, expect} from 'vitest';
import {resolveDriverName} from '../../../src/internal/shared/resolveDriverName';

describe('resolveDriverName', () => {
  describe('successful execution', () => {
    it('should return "address" for driver ID 0', () => {
      // Arrange
      const driverBits = 0n;
      const accountId = driverBits << 224n;

      // Act
      const result = resolveDriverName(accountId);

      // Assert
      expect(result).toBe('address');
    });

    it('should return "nft" for driver ID 1', () => {
      // Arrange
      const driverBits = 1n;
      const accountId = driverBits << 224n;

      // Act
      const result = resolveDriverName(accountId);

      // Assert
      expect(result).toBe('nft');
    });

    it('should return "immutableSplits" for driver ID 2', () => {
      // Arrange
      const driverBits = 2n;
      const accountId = driverBits << 224n;

      // Act
      const result = resolveDriverName(accountId);

      // Assert
      expect(result).toBe('immutableSplits');
    });

    it('should return "repo" for driver ID 3', () => {
      // Arrange
      const driverBits = 3n;
      const accountId = driverBits << 224n;

      // Act
      const result = resolveDriverName(accountId);

      // Assert
      expect(result).toBe('repo');
    });

    it('should return "repoSubAccount" for driver ID 4', () => {
      // Arrange
      const driverBits = 4n;
      const accountId = driverBits << 224n;

      // Act
      const result = resolveDriverName(accountId);

      // Assert
      expect(result).toBe('repoSubAccount');
    });

    it('should return "deadline" for driver ID 5', () => {
      // Arrange
      const driverBits = 5n;
      const accountId = driverBits << 224n;

      // Act
      const result = resolveDriverName(accountId);

      // Assert
      expect(result).toBe('repoDeadline');
    });

    it('should correctly identify driver type regardless of other bits', () => {
      // Arrange - Set all bits except the driver ID bits
      const driverBits = 2n; // immutableSplits
      const otherBits = (1n << 224n) - 1n; // All lower 224 bits set
      const accountId = (driverBits << 224n) | otherBits;

      // Act
      const result = resolveDriverName(accountId);

      // Assert
      expect(result).toBe('immutableSplits');
    });
  });

  describe('error handling', () => {
    it('should throw error for negative accountId', () => {
      // Arrange
      const accountId = -1n;

      // Act & Assert
      expect(() => resolveDriverName(accountId)).toThrow(
        `Could not get bits: ${accountId} is not a valid positive number within the range of a uint256.`,
      );
    });

    it('should throw error for accountId exceeding uint256 range', () => {
      // Arrange
      const MAX_UINT256 = 2n ** 256n;
      const accountId = MAX_UINT256;

      // Act & Assert
      expect(() => resolveDriverName(accountId)).toThrow(
        `Could not get bits: ${accountId} is not a valid positive number within the range of a uint256.`,
      );
    });

    it('should throw error for unknown driver ID', () => {
      // Arrange - Use a driver ID that doesn't exist (6)
      const driverBits = 6n;
      const accountId = driverBits << 224n;

      // Act & Assert
      expect(() => resolveDriverName(accountId)).toThrow(
        `Unknown  for ID ${accountId}.`,
      );
    });

    it('should throw error for maximum possible driver ID', () => {
      // Arrange - Use the maximum 32-bit value for driver ID
      const driverBits = (1n << 32n) - 1n; // 2^32 - 1
      const accountId = driverBits << 224n;

      // Act & Assert
      expect(() => resolveDriverName(accountId)).toThrow(
        `Unknown  for ID ${accountId}.`,
      );
    });
  });

  describe('edge cases', () => {
    it('should handle zero accountId', () => {
      // Arrange
      const accountId = 0n;

      // Act
      const result = resolveDriverName(accountId);

      // Assert
      expect(result).toBe('address');
    });

    it('should handle accountId with max uint256 value but valid driver ID', () => {
      // Arrange - Set all bits except the driver ID bits, which we set to a valid value
      const driverBits = 4n; // repoSubAccount
      const otherBits = (1n << 224n) - 1n; // All lower 224 bits set
      const accountId = (driverBits << 224n) | otherBits;

      // Act
      const result = resolveDriverName(accountId);

      // Assert
      expect(result).toBe('repoSubAccount');
    });

    it('should handle accountId with exactly MAX_UINT256 - 1 value', () => {
      // Arrange
      const MAX_UINT256_MINUS_1 = 2n ** 256n - 1n;

      // This would normally be invalid because driver ID bits are all 1s (unknown driver)

      // Act & Assert
      expect(() => resolveDriverName(MAX_UINT256_MINUS_1)).toThrow(
        `Unknown  for ID ${MAX_UINT256_MINUS_1}.`,
      );
    });
  });

  describe('bit manipulation correctness', () => {
    it('should correctly extract driver ID bits', () => {
      // Test each valid driver ID
      const driverIds = [0n, 1n, 2n, 3n, 4n, 5n];
      const expectedNames = [
        'address',
        'nft',
        'immutableSplits',
        'repo',
        'repoSubAccount',
        'repoDeadline',
      ];

      for (let i = 0; i < driverIds.length; i++) {
        // Arrange - Set only the driver ID bits
        const accountId = driverIds[i] << 224n;

        // Act
        const result = resolveDriverName(accountId);

        // Assert
        expect(result).toBe(expectedNames[i]);
      }
    });

    it('should ignore lower bits when extracting driver ID', () => {
      // Test with different patterns in the lower bits
      const driverBits = 3n; // repo
      const testPatterns = [
        0n, // All zeros
        1n, // Just the lowest bit
        (1n << 160n) - 1n, // All address bits set
        (1n << 223n) - 1n, // All bits below driver ID set
      ];

      for (const pattern of testPatterns) {
        // Arrange
        const accountId = (driverBits << 224n) | pattern;

        // Act
        const result = resolveDriverName(accountId);

        // Assert
        expect(result).toBe('repo');
      }
    });

    it('should correctly handle each bit in the driver ID portion', () => {
      // Test with each bit in the 32-bit driver ID space set individually
      for (let i = 0; i < 32; i++) {
        // Arrange - Set only one bit in the driver ID portion
        const driverBit = 1n << BigInt(i);
        const accountId = driverBit << 224n;

        // Act & Assert
        if (i === 0) {
          // When bit 0 is set, that's a value of 1, which corresponds to 'nft'
          const result = resolveDriverName(accountId);
          expect(result).toBe('nft');
        } else if (i === 1) {
          // When bit 1 is set, that's a value of 2, which corresponds to 'immutableSplits'
          const result = resolveDriverName(accountId);
          expect(result).toBe('immutableSplits');
        } else if (i === 2) {
          // When bit 2 is set, that's a value of 4, which corresponds to 'repoSubAccount'
          const result = resolveDriverName(accountId);
          expect(result).toBe('repoSubAccount');
        } else {
          // Any other bit set should result in an unknown driver error
          expect(() => resolveDriverName(accountId)).toThrow(
            `Unknown  for ID ${accountId}.`,
          );
        }
      }
    });
  });

  describe('performance and reliability', () => {
    it('should handle multiple sequential calls with different inputs', () => {
      // Arrange
      const inputs = [
        0n, // address
        1n << 224n, // nft
        2n << 224n, // immutableSplits
        3n << 224n, // repo
        4n << 224n, // repoSubAccount
        5n << 224n, // deadline
      ];
      const expected = [
        'address',
        'nft',
        'immutableSplits',
        'repo',
        'repoSubAccount',
        'repoDeadline',
      ];

      // Act
      const results = inputs.map(input => resolveDriverName(input));

      // Assert
      expect(results).toEqual(expected);
    });

    it('should return consistent results for the same input', () => {
      // Arrange
      const accountId = 3n << 224n; // repo

      // Act
      const result1 = resolveDriverName(accountId);
      const result2 = resolveDriverName(accountId);

      // Assert
      expect(result1).toBe(result2);
      expect(result1).toBe('repo');
    });
  });

  describe('real-world examples', () => {
    it('should handle real-world account IDs', () => {
      // These are example account IDs that might be encountered in the real system
      const examples = [
        // [accountId, expectedDriverName]
        [0n, 'address'],
        [1n << 224n, 'nft'],
        [
          (2n << 224n) | 0x1234567890123456789012345678901234567890n,
          'immutableSplits',
        ],
        [(3n << 224n) | 0xd8da6bf26964af9d7eed9e03e53415d37aa96045n, 'repo'],
        [
          (4n << 224n) | 0xfffffffffffffffffffffffffffffffffffn,
          'repoSubAccount',
        ],
      ];

      for (const [accountId, expectedName] of examples) {
        // Act
        const result = resolveDriverName(accountId as bigint);

        // Assert
        expect(result).toBe(expectedName);
      }
    });
  });
});
