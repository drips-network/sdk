import {describe, it, expect, vi} from 'vitest';
import encodeStreamId, {
  decodeStreamId,
} from '../../../src/internal/shared/streamIdUtils';
import {DripsError} from '../../../src/internal/shared/DripsError';

// Mock viem isAddress function
vi.mock('viem', () => ({
  isAddress: vi.fn().mockImplementation((address: string) => {
    // Simple mock implementation that checks if the string starts with '0x' (case-insensitive) and has the right length
    return (
      typeof address === 'string' &&
      address.toLowerCase().startsWith('0x') &&
      address.length === 42
    );
  }),
}));

describe('streamIdUtils', () => {
  describe('encodeStreamId', () => {
    it('should correctly encode valid inputs', () => {
      // Arrange
      const senderAccountId = '123';
      const tokenAddress = '0x1234567890123456789012345678901234567890';
      const dripId = '456';

      // Act
      const result = encodeStreamId(senderAccountId, tokenAddress, dripId);

      // Assert
      expect(result).toBe('123-0x1234567890123456789012345678901234567890-456');
    });

    it('should convert token address to lowercase', () => {
      // Arrange
      const senderAccountId = '123';
      const tokenAddress =
        '0x1234567890123456789012345678901234567890'.toUpperCase();
      const dripId = '456';

      // Act
      const result = encodeStreamId(senderAccountId, tokenAddress, dripId);

      // Assert
      expect(result).toBe('123-0x1234567890123456789012345678901234567890-456');
    });

    it('should throw error for non-numeric senderAccountId', () => {
      // Arrange
      const senderAccountId = 'abc';
      const tokenAddress = '0x1234567890123456789012345678901234567890';
      const dripId = '456';

      // Act & Assert
      expect(() =>
        encodeStreamId(senderAccountId, tokenAddress, dripId),
      ).toThrow('Invalid values');
    });

    it('should throw error for non-numeric dripId', () => {
      // Arrange
      const senderAccountId = '123';
      const tokenAddress = '0x1234567890123456789012345678901234567890';
      const dripId = 'abc';

      // Act & Assert
      expect(() =>
        encodeStreamId(senderAccountId, tokenAddress, dripId),
      ).toThrow('Invalid values');
    });

    it('should throw error for invalid token address', () => {
      // Arrange
      const senderAccountId = '123';
      const tokenAddress = 'not-an-address';
      const dripId = '456';

      // Act & Assert
      expect(() =>
        encodeStreamId(senderAccountId, tokenAddress, dripId),
      ).toThrow('Invalid values');
    });

    it('should throw error when all inputs are invalid', () => {
      // Arrange
      const senderAccountId = 'abc';
      const tokenAddress = 'not-an-address';
      const dripId = 'def';

      // Act & Assert
      expect(() =>
        encodeStreamId(senderAccountId, tokenAddress, dripId),
      ).toThrow('Invalid values');
    });

    it('should handle large numeric values', () => {
      // Arrange
      const senderAccountId = '9007199254740991'; // Max safe integer in JS
      const tokenAddress = '0x1234567890123456789012345678901234567890';
      const dripId = '9007199254740991';

      // Act
      const result = encodeStreamId(senderAccountId, tokenAddress, dripId);

      // Assert
      expect(result).toBe(
        '9007199254740991-0x1234567890123456789012345678901234567890-9007199254740991',
      );
    });

    it('should handle zero values', () => {
      // Arrange
      const senderAccountId = '0';
      const tokenAddress = '0x1234567890123456789012345678901234567890';
      const dripId = '0';

      // Act
      const result = encodeStreamId(senderAccountId, tokenAddress, dripId);

      // Assert
      expect(result).toBe('0-0x1234567890123456789012345678901234567890-0');
    });
  });

  describe('decodeStreamId', () => {
    it('should correctly decode a valid stream ID', () => {
      // Arrange
      const streamId = '123-0x1234567890123456789012345678901234567890-456';

      // Act
      const result = decodeStreamId(streamId);

      // Assert
      expect(result).toEqual({
        senderAccountId: '123',
        tokenAddress: '0x1234567890123456789012345678901234567890',
        dripId: '456',
      });
    });

    it('should convert token address to lowercase', () => {
      // Arrange
      const streamId = '123-0X1234567890123456789012345678901234567890-456';

      // Act
      const result = decodeStreamId(streamId);

      // Assert
      expect(result).toEqual({
        senderAccountId: '123',
        tokenAddress: '0x1234567890123456789012345678901234567890',
        dripId: '456',
      });
    });

    it('should throw DripsError for invalid format (too few parts)', () => {
      // Arrange
      const streamId = '123-0x1234567890123456789012345678901234567890';

      // Act & Assert
      expect(() => decodeStreamId(streamId)).toThrow(DripsError);
      expect(() => decodeStreamId(streamId)).toThrow(
        'Invalid stream ID format',
      );
    });

    it('should throw DripsError for invalid format (too many parts)', () => {
      // Arrange
      const streamId =
        '123-0x1234567890123456789012345678901234567890-456-extra';

      // Act & Assert
      expect(() => decodeStreamId(streamId)).toThrow(DripsError);
      expect(() => decodeStreamId(streamId)).toThrow(
        'Invalid stream ID format',
      );
    });

    it('should throw Error for non-numeric senderAccountId', () => {
      // Arrange
      const streamId = 'abc-0x1234567890123456789012345678901234567890-456';

      // Act & Assert
      expect(() => decodeStreamId(streamId)).toThrow('Invalid stream ID');
    });

    it('should throw Error for non-numeric dripId', () => {
      // Arrange
      const streamId = '123-0x1234567890123456789012345678901234567890-abc';

      // Act & Assert
      expect(() => decodeStreamId(streamId)).toThrow('Invalid stream ID');
    });

    it('should throw Error for invalid token address', () => {
      // Arrange
      const streamId = '123-not-an-address-456';

      // Act & Assert
      expect(() => decodeStreamId(streamId)).toThrow('Invalid stream ID');
    });

    it('should handle large numeric values', () => {
      // Arrange
      const streamId =
        '9007199254740991-0x1234567890123456789012345678901234567890-9007199254740991';

      // Act
      const result = decodeStreamId(streamId);

      // Assert
      expect(result).toEqual({
        senderAccountId: '9007199254740991',
        tokenAddress: '0x1234567890123456789012345678901234567890',
        dripId: '9007199254740991',
      });
    });

    it('should handle zero values', () => {
      // Arrange
      const streamId = '0-0x1234567890123456789012345678901234567890-0';

      // Act
      const result = decodeStreamId(streamId);

      // Assert
      expect(result).toEqual({
        senderAccountId: '0',
        tokenAddress: '0x1234567890123456789012345678901234567890',
        dripId: '0',
      });
    });

    it('should include metadata in DripsError', () => {
      // Arrange
      const streamId = '123-456'; // Invalid format

      // Act & Assert
      try {
        decodeStreamId(streamId);
        // If we get here, the test should fail because an error was expected
        expect(true).toBe(false); // This will fail the test
      } catch (error) {
        if (error instanceof DripsError) {
          expect(error.message).toBe('[Drips SDK] Invalid stream ID format');
          expect(error.meta).toEqual({
            operation: 'decodeStreamId',
            streamId: '123-456',
            parts: ['123', '456'],
          });
        } else {
          // If we get a different error type, the test should fail
          expect(error).toBeInstanceOf(DripsError);
        }
      }
    });
  });

  describe('round trip encoding/decoding', () => {
    it('should preserve values through encode-decode cycle', () => {
      // Test with various valid inputs
      const testCases = [
        {
          senderAccountId: '123',
          tokenAddress: '0x1234567890123456789012345678901234567890',
          dripId: '456',
        },
        {
          senderAccountId: '0',
          tokenAddress: '0x0000000000000000000000000000000000000000',
          dripId: '0',
        },
        {
          senderAccountId: '9007199254740991',
          tokenAddress: '0xffffffffffffffffffffffffffffffffffffffff',
          dripId: '9007199254740991',
        },
      ];

      for (const {senderAccountId, tokenAddress, dripId} of testCases) {
        // Act
        const encoded = encodeStreamId(senderAccountId, tokenAddress, dripId);
        const decoded = decodeStreamId(encoded);

        // Assert
        expect(decoded).toEqual({
          senderAccountId,
          tokenAddress: tokenAddress.toLowerCase(),
          dripId,
        });
      }
    });
  });
});
