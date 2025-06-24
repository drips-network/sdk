import {describe, it, expect, vi, beforeEach} from 'vitest';
import {
  validateAndFormatStreamReceivers,
  MAX_STREAMS_RECEIVERS,
  OnChainStreamReceiver,
} from '../../../src/internal/shared/validateAndFormatStreamReceivers';
import {DripsError} from '../../../src/internal/shared/DripsError';
import * as streamConfigUtils from '../../../src/internal/shared/streamConfigUtils';

vi.mock('../../../src/internal/shared/streamConfigUtils');

describe('validateAndFormatStreamReceivers', () => {
  const createReceiver = (
    accountId: bigint,
    config: bigint,
  ): OnChainStreamReceiver => ({
    accountId,
    config,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation for decodeStreamConfig
    vi.mocked(streamConfigUtils.decodeStreamConfig).mockImplementation(() => ({
      streamId: 1n,
      amountPerSec: 100n, // Default to non-zero amount
      start: 0n,
      duration: 1n,
    }));
  });

  describe('successful validation and formatting', () => {
    it('should validate and format single receiver', () => {
      // Arrange
      const receivers: OnChainStreamReceiver[] = [createReceiver(123n, 456n)];

      // Act
      const result = validateAndFormatStreamReceivers(receivers);

      // Assert
      expect(result).toEqual([
        {
          accountId: 123n,
          config: 456n,
        },
      ]);
    });

    it('should validate and format multiple receivers', () => {
      // Arrange
      const receivers: OnChainStreamReceiver[] = [
        createReceiver(456n, 100n),
        createReceiver(123n, 200n),
        createReceiver(789n, 300n),
      ];

      // Act
      const result = validateAndFormatStreamReceivers(receivers);

      // Assert
      expect(result).toEqual([
        {accountId: 123n, config: 200n},
        {accountId: 456n, config: 100n},
        {accountId: 789n, config: 300n},
      ]);
      expect(result).toHaveLength(3);
    });

    it('should sort receivers by accountId in ascending order', () => {
      // Arrange
      const receivers: OnChainStreamReceiver[] = [
        createReceiver(999n, 100n),
        createReceiver(1n, 200n),
        createReceiver(500n, 300n),
        createReceiver(50n, 400n),
      ];

      // Act
      const result = validateAndFormatStreamReceivers(receivers);

      // Assert
      expect(result.map(r => r.accountId)).toEqual([1n, 50n, 500n, 999n]);
      expect(result.map(r => r.config)).toEqual([200n, 400n, 300n, 100n]);
    });

    it('should handle maximum allowed receivers', () => {
      // Arrange - Use MAX_STREAMS_RECEIVERS receivers
      const receivers: OnChainStreamReceiver[] = Array.from(
        {length: MAX_STREAMS_RECEIVERS},
        (_, i) => createReceiver(BigInt(i + 1), 100n),
      );

      // Act
      const result = validateAndFormatStreamReceivers(receivers);

      // Assert
      expect(result).toHaveLength(MAX_STREAMS_RECEIVERS);
      expect(result[0].accountId).toBe(1n);
      expect(result[MAX_STREAMS_RECEIVERS - 1].accountId).toBe(
        BigInt(MAX_STREAMS_RECEIVERS),
      );
    });

    it('should handle large accountId values', () => {
      // Arrange
      const largeAccountId = BigInt('0xffffffffffffffffffffffffffffffff');
      const receivers: OnChainStreamReceiver[] = [
        createReceiver(largeAccountId, 100n),
      ];

      // Act
      const result = validateAndFormatStreamReceivers(receivers);

      // Assert
      expect(result[0].accountId).toBe(largeAccountId);
    });

    it('should handle zero accountId', () => {
      // Arrange
      const receivers: OnChainStreamReceiver[] = [createReceiver(0n, 100n)];

      // Act
      const result = validateAndFormatStreamReceivers(receivers);

      // Assert
      expect(result[0].accountId).toBe(0n);
    });
  });

  describe('maximum receivers validation', () => {
    it('should throw error when exceeding maximum receivers', () => {
      // Arrange
      const receivers: OnChainStreamReceiver[] = Array.from(
        {length: MAX_STREAMS_RECEIVERS + 1},
        (_, i) => createReceiver(BigInt(i + 1), 100n),
      );

      // Act & Assert
      expect(() => validateAndFormatStreamReceivers(receivers)).toThrow(
        DripsError,
      );
      expect(() => validateAndFormatStreamReceivers(receivers)).toThrow(
        `Too many stream receivers: ${MAX_STREAMS_RECEIVERS + 1}. Maximum is ${MAX_STREAMS_RECEIVERS}`,
      );
    });

    it('should throw error with correct count in error message', () => {
      // Arrange
      const count = MAX_STREAMS_RECEIVERS + 50;
      const receivers: OnChainStreamReceiver[] = Array.from(
        {length: count},
        (_, i) => createReceiver(BigInt(i + 1), 100n),
      );

      // Act & Assert
      expect(() => validateAndFormatStreamReceivers(receivers)).toThrow(
        `Too many stream receivers: ${count}. Maximum is ${MAX_STREAMS_RECEIVERS}`,
      );
    });

    it('should accept exactly maximum receivers', () => {
      // Arrange
      const receivers: OnChainStreamReceiver[] = Array.from(
        {length: MAX_STREAMS_RECEIVERS},
        (_, i) => createReceiver(BigInt(i + 1), 100n),
      );

      // Act
      const result = validateAndFormatStreamReceivers(receivers);

      // Assert
      expect(result).toHaveLength(MAX_STREAMS_RECEIVERS);
    });
  });

  describe('non-zero amtPerSec validation', () => {
    it('should throw error for zero amtPerSec', () => {
      // Arrange
      const receivers: OnChainStreamReceiver[] = [createReceiver(123n, 456n)];

      // Mock decodeStreamConfig to return zero amtPerSec
      vi.mocked(streamConfigUtils.decodeStreamConfig).mockReturnValue({
        streamId: 1n,
        amountPerSec: 0n, // Zero amount
        start: 0n,
        duration: 1n,
      });

      // Act & Assert
      expect(() => validateAndFormatStreamReceivers(receivers)).toThrow(
        DripsError,
      );
      expect(() => validateAndFormatStreamReceivers(receivers)).toThrow(
        'Stream receivers with 0 amtPerSec: 123',
      );
    });

    it('should throw error for multiple receivers with zero amtPerSec', () => {
      // Arrange
      const receivers: OnChainStreamReceiver[] = [
        createReceiver(123n, 100n),
        createReceiver(456n, 200n),
        createReceiver(789n, 300n),
      ];

      // Mock decodeStreamConfig to return zero amtPerSec for specific configs
      vi.mocked(streamConfigUtils.decodeStreamConfig).mockImplementation(
        (config: bigint) => {
          if (config === 100n || config === 300n) {
            return {
              streamId: 1n,
              amountPerSec: 0n, // Zero amount
              start: 0n,
              duration: 1n,
            };
          }
          return {
            streamId: 1n,
            amountPerSec: 100n, // Non-zero amount
            start: 0n,
            duration: 1n,
          };
        },
      );

      // Act & Assert
      expect(() => validateAndFormatStreamReceivers(receivers)).toThrow(
        DripsError,
      );
      expect(() => validateAndFormatStreamReceivers(receivers)).toThrow(
        'Stream receivers with 0 amtPerSec: 123, 789',
      );
    });

    it('should accept receivers with non-zero amtPerSec', () => {
      // Arrange
      const receivers: OnChainStreamReceiver[] = [
        createReceiver(123n, 100n),
        createReceiver(456n, 200n),
      ];

      // Mock decodeStreamConfig to return non-zero amtPerSec
      vi.mocked(streamConfigUtils.decodeStreamConfig).mockImplementation(
        (config: bigint) => ({
          streamId: 1n,
          amountPerSec: 100n, // Non-zero amount
          start: 0n,
          duration: 1n,
        }),
      );

      // Act
      const result = validateAndFormatStreamReceivers(receivers);

      // Assert
      expect(result).toHaveLength(2);
    });
  });

  describe('duplicate validation', () => {
    it('should throw error for duplicate accountIds', () => {
      // Arrange
      const receivers: OnChainStreamReceiver[] = [
        createReceiver(123n, 100n),
        createReceiver(123n, 200n), // Same accountId
      ];

      // Act & Assert
      expect(() => validateAndFormatStreamReceivers(receivers)).toThrow(
        DripsError,
      );
      expect(() => validateAndFormatStreamReceivers(receivers)).toThrow(
        'Duplicate stream receivers found: 123',
      );
    });

    it('should throw error for multiple duplicate accountIds', () => {
      // Arrange
      const receivers: OnChainStreamReceiver[] = [
        createReceiver(123n, 100n),
        createReceiver(456n, 200n),
        createReceiver(123n, 300n), // Duplicate
        createReceiver(999n, 400n),
        createReceiver(456n, 500n), // Duplicate
      ];

      // Act & Assert
      expect(() => validateAndFormatStreamReceivers(receivers)).toThrow(
        DripsError,
      );
      expect(() => validateAndFormatStreamReceivers(receivers)).toThrow(
        'Duplicate stream receivers found: 123, 456',
      );
    });

    it('should handle duplicate detection with large accountIds', () => {
      // Arrange
      const largeId = BigInt('0xffffffffffffffffffffffffffffffff');
      const receivers: OnChainStreamReceiver[] = [
        createReceiver(largeId, 100n),
        createReceiver(largeId, 200n), // Duplicate
      ];

      // Act & Assert
      expect(() => validateAndFormatStreamReceivers(receivers)).toThrow(
        `Duplicate stream receivers found: ${largeId.toString()}`,
      );
    });

    it('should not throw error for unique accountIds', () => {
      // Arrange
      const receivers: OnChainStreamReceiver[] = [
        createReceiver(123n, 100n),
        createReceiver(456n, 200n),
        createReceiver(789n, 300n),
      ];

      // Act
      const result = validateAndFormatStreamReceivers(receivers);

      // Assert
      expect(result).toHaveLength(3);
      expect(result.map(r => r.accountId)).toEqual([123n, 456n, 789n]);
    });

    it('should handle multiple occurrences of same duplicate', () => {
      // Arrange
      const receivers: OnChainStreamReceiver[] = [
        createReceiver(123n, 100n),
        createReceiver(123n, 200n), // First duplicate
        createReceiver(456n, 300n),
        createReceiver(123n, 400n), // Second duplicate of same ID
      ];

      // Act & Assert
      expect(() => validateAndFormatStreamReceivers(receivers)).toThrow(
        'Duplicate stream receivers found: 123',
      );
    });
  });

  describe('sorting behavior', () => {
    it('should sort receivers by accountId in ascending order', () => {
      // Arrange
      const receivers: OnChainStreamReceiver[] = [
        createReceiver(100n, 100n),
        createReceiver(50n, 200n),
        createReceiver(200n, 300n),
        createReceiver(75n, 400n),
      ];

      // Act
      const result = validateAndFormatStreamReceivers(receivers);

      // Assert
      expect(result.map(r => r.accountId)).toEqual([50n, 75n, 100n, 200n]);
      expect(result.map(r => r.config)).toEqual([200n, 400n, 100n, 300n]);
    });

    it('should handle sorting with zero accountId', () => {
      // Arrange
      const receivers: OnChainStreamReceiver[] = [
        createReceiver(10n, 100n),
        createReceiver(0n, 200n),
        createReceiver(5n, 300n),
      ];

      // Act
      const result = validateAndFormatStreamReceivers(receivers);

      // Assert
      expect(result.map(r => r.accountId)).toEqual([0n, 5n, 10n]);
    });

    it('should handle sorting with very large accountIds', () => {
      // Arrange
      const receivers: OnChainStreamReceiver[] = [
        createReceiver(BigInt('0xffffffffffffffffffffffffffffffff'), 100n),
        createReceiver(1n, 200n),
        createReceiver(BigInt('0x8000000000000000'), 300n),
      ];

      // Act
      const result = validateAndFormatStreamReceivers(receivers);

      // Assert
      expect(result[0].accountId).toBe(1n);
      expect(result[1].accountId).toBe(BigInt('0x8000000000000000'));
      expect(result[2].accountId).toBe(
        BigInt('0xffffffffffffffffffffffffffffffff'),
      );
    });

    it('should maintain original array immutability', () => {
      // Arrange
      const receivers: OnChainStreamReceiver[] = [
        createReceiver(100n, 100n),
        createReceiver(50n, 200n),
      ];
      const originalOrder = [...receivers];

      // Act
      const result = validateAndFormatStreamReceivers(receivers);

      // Assert
      expect(receivers).toEqual(originalOrder); // Original array unchanged
      expect(result).not.toBe(receivers); // Different array reference
      expect(result.map(r => r.accountId)).toEqual([50n, 100n]); // Sorted result
    });
  });

  describe('error handling and edge cases', () => {
    it('should throw DripsError with proper error class', () => {
      // Arrange
      const receivers: OnChainStreamReceiver[] = [createReceiver(123n, 456n)];

      // Mock decodeStreamConfig to return zero amtPerSec
      vi.mocked(streamConfigUtils.decodeStreamConfig).mockReturnValue({
        streamId: 1n,
        amountPerSec: 0n, // Zero amount
        start: 0n,
        duration: 1n,
      });

      // Act & Assert
      try {
        validateAndFormatStreamReceivers(receivers);
        expect.fail('Should have thrown DripsError');
      } catch (error) {
        expect(error).toBeInstanceOf(DripsError);
        expect((error as DripsError).name).toBe('DripsError');
        expect((error as DripsError).message).toContain('[Drips SDK]');
      }
    });

    it('should preserve original error structure for all validation types', () => {
      // Test max receivers validation
      try {
        const receivers = Array.from(
          {length: MAX_STREAMS_RECEIVERS + 1},
          (_, i) => createReceiver(BigInt(i + 1), 100n),
        );
        validateAndFormatStreamReceivers(receivers);
        expect.fail('Should have thrown for max receivers');
      } catch (error) {
        expect(error).toBeInstanceOf(DripsError);
        expect((error as DripsError).message).toContain(
          `Too many stream receivers: ${MAX_STREAMS_RECEIVERS + 1}. Maximum is ${MAX_STREAMS_RECEIVERS}`,
        );
      }

      // Test zero amtPerSec validation
      try {
        vi.mocked(streamConfigUtils.decodeStreamConfig).mockReturnValue({
          streamId: 1n,
          amountPerSec: 0n,
          start: 0n,
          duration: 1n,
        });
        const receivers = [createReceiver(123n, 456n)];
        validateAndFormatStreamReceivers(receivers);
        expect.fail('Should have thrown for zero amtPerSec');
      } catch (error) {
        expect(error).toBeInstanceOf(DripsError);
        expect((error as DripsError).message).toContain(
          'Stream receivers with 0 amtPerSec: 123',
        );
      }

      // Reset the mock to avoid affecting other tests
      vi.mocked(streamConfigUtils.decodeStreamConfig).mockImplementation(
        () => ({
          streamId: 1n,
          amountPerSec: 100n, // Non-zero amount
          start: 0n,
          duration: 1n,
        }),
      );

      // Test duplicate receivers validation
      try {
        const receivers = [
          createReceiver(123n, 100n),
          createReceiver(123n, 200n),
        ];
        validateAndFormatStreamReceivers(receivers);
        expect.fail('Should have thrown for duplicate receivers');
      } catch (error) {
        expect(error).toBeInstanceOf(DripsError);
        expect((error as DripsError).message).toContain(
          'Duplicate stream receivers found: 123',
        );
      }
    });

    it('should handle empty receivers array', () => {
      // Arrange
      const receivers: OnChainStreamReceiver[] = [];

      // Act
      const result = validateAndFormatStreamReceivers(receivers);

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('integration with streamConfigUtils', () => {
    it('should call decodeStreamConfig for each receiver', () => {
      // Arrange
      const receivers: OnChainStreamReceiver[] = [
        createReceiver(123n, 100n),
        createReceiver(456n, 200n),
        createReceiver(789n, 300n),
      ];

      // Act
      validateAndFormatStreamReceivers(receivers);

      // Assert
      expect(streamConfigUtils.decodeStreamConfig).toHaveBeenCalledTimes(3);
      expect(streamConfigUtils.decodeStreamConfig).toHaveBeenCalledWith(100n);
      expect(streamConfigUtils.decodeStreamConfig).toHaveBeenCalledWith(200n);
      expect(streamConfigUtils.decodeStreamConfig).toHaveBeenCalledWith(300n);
    });

    it('should propagate errors from decodeStreamConfig', () => {
      // Arrange
      const receivers: OnChainStreamReceiver[] = [createReceiver(123n, 100n)];

      // Mock decodeStreamConfig to throw an error
      vi.mocked(streamConfigUtils.decodeStreamConfig).mockImplementation(() => {
        throw new Error('Invalid stream config');
      });

      // Act & Assert
      expect(() => validateAndFormatStreamReceivers(receivers)).toThrow(
        'Invalid stream config',
      );
    });
  });

  describe('validateMaxReceiversCount function', () => {
    it('should return receivers when count is within limit', () => {
      // This is testing an internal function through the public API
      const receivers: OnChainStreamReceiver[] = Array.from(
        {length: MAX_STREAMS_RECEIVERS},
        (_, i) => createReceiver(BigInt(i + 1), 100n),
      );

      const result = validateAndFormatStreamReceivers(receivers);

      expect(result).toHaveLength(MAX_STREAMS_RECEIVERS);
    });

    it('should throw when count exceeds limit', () => {
      const receivers: OnChainStreamReceiver[] = Array.from(
        {length: MAX_STREAMS_RECEIVERS + 1},
        (_, i) => createReceiver(BigInt(i + 1), 100n),
      );

      expect(() => validateAndFormatStreamReceivers(receivers)).toThrow(
        DripsError,
      );
    });
  });

  describe('validateNonZeroAmtPerSec function', () => {
    it('should return receivers when all have non-zero amtPerSec', () => {
      // This is testing an internal function through the public API
      const receivers: OnChainStreamReceiver[] = [
        createReceiver(123n, 100n),
        createReceiver(456n, 200n),
      ];

      vi.mocked(streamConfigUtils.decodeStreamConfig).mockImplementation(
        () => ({
          streamId: 1n,
          amountPerSec: 100n, // Non-zero
          start: 0n,
          duration: 1n,
        }),
      );

      const result = validateAndFormatStreamReceivers(receivers);

      expect(result).toHaveLength(2);
    });

    it('should throw when any receiver has zero amtPerSec', () => {
      const receivers: OnChainStreamReceiver[] = [
        createReceiver(123n, 100n),
        createReceiver(456n, 200n),
      ];

      vi.mocked(streamConfigUtils.decodeStreamConfig).mockImplementation(
        (config: bigint) => {
          if (config === 200n) {
            return {
              streamId: 1n,
              amountPerSec: 0n, // Zero
              start: 0n,
              duration: 1n,
            };
          }
          return {
            streamId: 1n,
            amountPerSec: 100n,
            start: 0n,
            duration: 1n,
          };
        },
      );

      expect(() => validateAndFormatStreamReceivers(receivers)).toThrow(
        DripsError,
      );
    });
  });

  describe('validateNoDuplicateStreamReceivers function', () => {
    it('should return receivers when all accountIds are unique', () => {
      // This is testing an internal function through the public API
      const receivers: OnChainStreamReceiver[] = [
        createReceiver(123n, 100n),
        createReceiver(456n, 200n),
      ];

      const result = validateAndFormatStreamReceivers(receivers);

      expect(result).toHaveLength(2);
    });

    it('should throw when duplicate accountIds are found', () => {
      const receivers: OnChainStreamReceiver[] = [
        createReceiver(123n, 100n),
        createReceiver(123n, 200n), // Duplicate
      ];

      expect(() => validateAndFormatStreamReceivers(receivers)).toThrow(
        DripsError,
      );
    });
  });

  describe('sortStreamReceiversByAccountId function', () => {
    it('should sort receivers by accountId in ascending order', () => {
      // This is testing an internal function through the public API
      const receivers: OnChainStreamReceiver[] = [
        createReceiver(300n, 100n),
        createReceiver(100n, 200n),
        createReceiver(200n, 300n),
      ];

      const result = validateAndFormatStreamReceivers(receivers);

      expect(result.map(r => r.accountId)).toEqual([100n, 200n, 300n]);
    });
  });
});
