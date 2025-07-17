import {describe, it, expect, vi, beforeEach} from 'vitest';
import {resolveAddressFromAddressDriverId} from '../../../src/internal/shared/resolveAddressFromAddressDriverId';
import {Address} from 'viem';

vi.mock('viem', async () => {
  const actual = await vi.importActual('viem');
  return {
    ...actual,
    checksumAddress: vi.fn(address => address),
  };
});

import {checksumAddress} from 'viem';

describe('resolveAddressFromAddressDriverId', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checksumAddress).mockImplementation(address => address);
  });

  describe('successful execution', () => {
    it('should extract address from a valid accountId', () => {
      // Arrange
      // AddressDriver layout: [32 bits driverId | 64 bits zero | 160 bits address]
      // 0x00000001 (driverId) + 0x0000000000000000 (64 bits zero) + 0x1234567890123456789012345678901234567890 (address)
      const driverId = 1n << 224n;
      const address = 0x1234567890123456789012345678901234567890n;
      const accountId = driverId | address;

      // Act
      const result = resolveAddressFromAddressDriverId(accountId);

      // Assert
      expect(result).toBe('0x1234567890123456789012345678901234567890');
      expect(checksumAddress).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
      );
    });

    it('should handle zero address', () => {
      // Arrange
      const driverId = 1n << 224n;
      const address = 0n; // Zero address
      const accountId = driverId | address;

      // Act
      const result = resolveAddressFromAddressDriverId(accountId);

      // Assert
      expect(result).toBe('0x0000000000000000000000000000000000000000');
      expect(checksumAddress).toHaveBeenCalledWith(
        '0x0000000000000000000000000000000000000000',
      );
    });

    it('should handle max address value', () => {
      // Arrange
      const driverId = 1n << 224n;
      const address = (1n << 160n) - 1n; // Max 160-bit value
      const accountId = driverId | address;

      // Act
      const result = resolveAddressFromAddressDriverId(accountId);

      // Assert
      expect(result).toBe('0xffffffffffffffffffffffffffffffffffffffff');
      expect(checksumAddress).toHaveBeenCalledWith(
        '0xffffffffffffffffffffffffffffffffffffffff',
      );
    });

    it('should handle accountId with only address bits set', () => {
      // Arrange
      const address = 0x1234567890123456789012345678901234567890n;
      const accountId = address; // No driver ID bits set

      // Act
      const result = resolveAddressFromAddressDriverId(accountId);

      // Assert
      expect(result).toBe('0x1234567890123456789012345678901234567890');
    });

    it('should properly pad address with leading zeros', () => {
      // Arrange
      const driverId = 1n << 224n;
      const address = 0x1n; // Very small address that needs padding
      const accountId = driverId | address;

      // Act
      const result = resolveAddressFromAddressDriverId(accountId);

      // Assert
      expect(result).toBe('0x0000000000000000000000000000000000000001');
      expect(checksumAddress).toHaveBeenCalledWith(
        '0x0000000000000000000000000000000000000001',
      );
    });

    it('should apply checksumming to the address', () => {
      // Arrange
      const driverId = 1n << 224n;
      const address = 0xabcdef1234567890abcdef1234567890abcdef12n;
      const accountId = driverId | address;

      const checksummedAddress: Address =
        '0xaBcDeF1234567890aBcDeF1234567890aBcDeF12';
      vi.mocked(checksumAddress).mockReturnValue(checksummedAddress);

      // Act
      const result = resolveAddressFromAddressDriverId(accountId);

      // Assert
      expect(result).toBe(checksummedAddress);
      expect(checksumAddress).toHaveBeenCalledWith(
        '0xabcdef1234567890abcdef1234567890abcdef12',
      );
    });

    it('should handle different driver IDs', () => {
      // Arrange
      const driverId1 = 1n << 224n; // Driver ID 1
      const driverId2 = 2n << 224n; // Driver ID 2
      const address = 0x1234567890123456789012345678901234567890n;

      const accountId1 = driverId1 | address;
      const accountId2 = driverId2 | address;

      // Act
      const result1 = resolveAddressFromAddressDriverId(accountId1);
      const result2 = resolveAddressFromAddressDriverId(accountId2);

      // Assert
      expect(result1).toBe('0x1234567890123456789012345678901234567890');
      expect(result2).toBe('0x1234567890123456789012345678901234567890');
      expect(checksumAddress).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should throw error for negative accountId', () => {
      // Arrange
      const accountId = -1n;

      // Act & Assert
      expect(() => resolveAddressFromAddressDriverId(accountId)).toThrow(
        'Invalid accountId: -1 is outside the uint256 range.',
      );
      expect(checksumAddress).not.toHaveBeenCalled();
    });

    it('should throw error for accountId exceeding uint256 range', () => {
      // Arrange
      const MAX_UINT256 = 1n << 256n;
      const accountId = MAX_UINT256;

      // Act & Assert
      expect(() => resolveAddressFromAddressDriverId(accountId)).toThrow(
        `Invalid accountId: ${accountId} is outside the uint256 range.`,
      );
      expect(checksumAddress).not.toHaveBeenCalled();
    });

    it('should throw error when bits 160-223 are not zero', () => {
      // Arrange
      const driverId = 1n << 224n;
      const invalidBits = 1n << 200n; // Set a bit in the middle section that should be zero
      const address = 0x1234567890123456789012345678901234567890n;
      const accountId = driverId | invalidBits | address;

      // Act & Assert
      expect(() => resolveAddressFromAddressDriverId(accountId)).toThrow(
        'Invalid AddressDriver ID: bits 160–223 must be zero.',
      );
      expect(checksumAddress).not.toHaveBeenCalled();
    });

    it('should throw error when any bit in the middle section is set', () => {
      // Arrange - Test with each bit in the middle section set
      const driverId = 1n << 224n;
      const address = 0x1234567890123456789012345678901234567890n;

      for (let i = 160; i < 224; i++) {
        const invalidBit = 1n << BigInt(i);
        const accountId = driverId | invalidBit | address;

        // Act & Assert
        expect(() => resolveAddressFromAddressDriverId(accountId)).toThrow(
          'Invalid AddressDriver ID: bits 160–223 must be zero.',
        );
      }

      // No checksumAddress calls should have been made
      expect(checksumAddress).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle accountId with max uint256 value but valid middle bits', () => {
      // Arrange
      // Set all bits except the middle section (bits 160-223)
      const highBits =
        ((1n << 256n) - 1n) & ~(((1n << 224n) - 1n) ^ ((1n << 160n) - 1n));
      const lowBits = (1n << 160n) - 1n;
      const accountId = highBits | lowBits;

      // Act
      const result = resolveAddressFromAddressDriverId(accountId);

      // Assert
      expect(result).toBe('0xffffffffffffffffffffffffffffffffffffffff');
    });

    it('should handle accountId with only driver ID bits set', () => {
      // Arrange
      const driverId = 1n << 224n;
      const accountId = driverId; // No address bits set

      // Act
      const result = resolveAddressFromAddressDriverId(accountId);

      // Assert
      expect(result).toBe('0x0000000000000000000000000000000000000000');
    });

    it('should handle accountId with max driver ID value', () => {
      // Arrange
      // Max 32-bit value for driver ID
      const driverId = ((1n << 32n) - 1n) << 224n;
      const address = 0x1234567890123456789012345678901234567890n;
      const accountId = driverId | address;

      // Act
      const result = resolveAddressFromAddressDriverId(accountId);

      // Assert
      expect(result).toBe('0x1234567890123456789012345678901234567890');
    });

    it('should handle zero accountId', () => {
      // Arrange
      const accountId = 0n;

      // Act
      const result = resolveAddressFromAddressDriverId(accountId);

      // Assert
      expect(result).toBe('0x0000000000000000000000000000000000000000');
    });

    it('should handle accountId with exactly MAX_UINT256 value', () => {
      // Arrange
      const MAX_UINT256 = (1n << 256n) - 1n;

      // This would normally be invalid because middle bits are set,
      // but we'll test the range check first

      // Act & Assert
      expect(() => resolveAddressFromAddressDriverId(MAX_UINT256)).toThrow(
        'Invalid AddressDriver ID: bits 160–223 must be zero.',
      );
    });
  });

  describe('bit manipulation correctness', () => {
    it('should correctly extract address bits', () => {
      // Arrange
      // Create an accountId with all bits set in the address portion
      const addressBits = (1n << 160n) - 1n;
      const accountId = addressBits;

      // Act
      const result = resolveAddressFromAddressDriverId(accountId);

      // Assert
      expect(result).toBe('0xffffffffffffffffffffffffffffffffffffffff');
    });

    it('should ignore driver ID bits when extracting address', () => {
      // Arrange
      // Set all possible driver ID bits (32 bits starting at position 224)
      const driverIdBits = ((1n << 32n) - 1n) << 224n;
      const addressBits = 0xabcdef0123456789abcdef0123456789abcdef01n;
      const accountId = driverIdBits | addressBits;

      // Act
      const result = resolveAddressFromAddressDriverId(accountId);

      // Assert
      expect(result.toLowerCase()).toBe(
        '0xabcdef0123456789abcdef0123456789abcdef01',
      );
    });

    it('should correctly handle each bit in the address portion', () => {
      // Test each bit position in the address portion
      for (let i = 0; i < 160; i++) {
        // Arrange - Set only one bit in the address portion
        const addressBit = 1n << BigInt(i);
        const accountId = addressBit;

        // Act
        const result = resolveAddressFromAddressDriverId(accountId);

        // Assert - The result should have only the corresponding bit set
        const expectedAddress =
          '0x' + addressBit.toString(16).padStart(40, '0');
        expect(result.toLowerCase()).toBe(expectedAddress);
      }
    });
  });

  describe('performance and reliability', () => {
    it('should handle multiple sequential calls with different inputs', () => {
      // Arrange
      const inputs = [
        0x1n,
        0x2n,
        0x3n,
        0xabcdefn,
        0x1234567890123456789012345678901234567890n,
      ];

      // Act
      const results = inputs.map(input =>
        resolveAddressFromAddressDriverId(input),
      );

      // Assert
      expect(results).toHaveLength(inputs.length);
      expect(checksumAddress).toHaveBeenCalledTimes(inputs.length);
    });

    it('should return consistent results for the same input', () => {
      // Arrange
      const accountId = 0x1234567890123456789012345678901234567890n;

      // Act
      const result1 = resolveAddressFromAddressDriverId(accountId);
      const result2 = resolveAddressFromAddressDriverId(accountId);

      // Assert
      expect(result1).toBe(result2);
    });
  });

  describe('real-world examples', () => {
    it('should handle real-world address driver account IDs', () => {
      // These are example account IDs that might be encountered in the real system
      const examples = [
        // [accountId, expectedAddress]
        [
          0x0000000000000000000000000000000000000000n,
          '0x0000000000000000000000000000000000000000',
        ],
        [
          0x000000000000000000000000000000000000ffffn,
          '0x000000000000000000000000000000000000ffff',
        ],
        [
          0x0000000000000000000000000000000000abcdef01n,
          '0x00000000000000000000000000000000abcdef01',
        ],
        [
          0xd8da6bf26964af9d7eed9e03e53415d37aa96045n,
          '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
        ],
        [
          0x1234567890123456789012345678901234567890n,
          '0x1234567890123456789012345678901234567890',
        ],
      ];

      for (const [accountId, expectedAddress] of examples) {
        // Mock checksumAddress to return the input for this test
        vi.mocked(checksumAddress).mockImplementation(addr => addr as Address);

        // Act
        const result = resolveAddressFromAddressDriverId(accountId as bigint);

        // Assert
        expect(result.toLowerCase()).toBe(
          (expectedAddress as string).toLowerCase(),
        );
      }
    });
  });
});
