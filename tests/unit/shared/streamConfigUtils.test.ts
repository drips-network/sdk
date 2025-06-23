import {describe, it, expect} from 'vitest';
import {
  StreamConfig,
  encodeStreamConfig,
  decodeStreamConfig,
} from '../../../src/internal/shared/streamConfigUtils';

describe('streamConfigUtils', () => {
  describe('encodeStreamConfig', () => {
    it('should correctly encode a valid stream config', () => {
      // Arrange
      const config: StreamConfig = {
        streamId: 123n,
        amountPerSec: 456n,
        start: 789n,
        duration: 101112n,
      };

      // Act
      const result = encodeStreamConfig(config);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('bigint');

      // Verify by decoding
      const decoded = decodeStreamConfig(result);
      expect(decoded).toEqual(config);
    });

    it('should throw error for streamId that is too large', () => {
      // Arrange
      const config: StreamConfig = {
        streamId: 1n << 32n, // 2^32, which is too large
        amountPerSec: 456n,
        start: 789n,
        duration: 101112n,
      };

      // Act & Assert
      expect(() => encodeStreamConfig(config)).toThrow(
        "'streamId' must be in [0, 4294967295]",
      );
    });

    it('should throw error for negative streamId', () => {
      // Arrange
      const config: StreamConfig = {
        streamId: -1n,
        amountPerSec: 456n,
        start: 789n,
        duration: 101112n,
      };

      // Act & Assert
      expect(() => encodeStreamConfig(config)).toThrow(
        "'streamId' must be in [0, 4294967295]",
      );
    });

    it('should throw error for amountPerSec that is too large', () => {
      // Arrange
      const config: StreamConfig = {
        streamId: 123n,
        amountPerSec: 1n << 160n, // 2^160, which is too large
        start: 789n,
        duration: 101112n,
      };

      // Act & Assert
      expect(() => encodeStreamConfig(config)).toThrow(
        "'amtPerSec' must be in (0, 1461501637330902918203684832716283019655932542975]",
      );
    });

    it('should throw error for zero amountPerSec', () => {
      // Arrange
      const config: StreamConfig = {
        streamId: 123n,
        amountPerSec: 0n,
        start: 789n,
        duration: 101112n,
      };

      // Act & Assert
      expect(() => encodeStreamConfig(config)).toThrow(
        "'amtPerSec' must be in (0, 1461501637330902918203684832716283019655932542975]",
      );
    });

    it('should throw error for negative amountPerSec', () => {
      // Arrange
      const config: StreamConfig = {
        streamId: 123n,
        amountPerSec: -1n,
        start: 789n,
        duration: 101112n,
      };

      // Act & Assert
      expect(() => encodeStreamConfig(config)).toThrow(
        "'amtPerSec' must be in (0, 1461501637330902918203684832716283019655932542975]",
      );
    });

    it('should throw error for start that is too large', () => {
      // Arrange
      const config: StreamConfig = {
        streamId: 123n,
        amountPerSec: 456n,
        start: 1n << 32n, // 2^32, which is too large
        duration: 101112n,
      };

      // Act & Assert
      expect(() => encodeStreamConfig(config)).toThrow(
        "'start' must be in [0, 4294967295]",
      );
    });

    it('should throw error for negative start', () => {
      // Arrange
      const config: StreamConfig = {
        streamId: 123n,
        amountPerSec: 456n,
        start: -1n,
        duration: 101112n,
      };

      // Act & Assert
      expect(() => encodeStreamConfig(config)).toThrow(
        "'start' must be in [0, 4294967295]",
      );
    });

    it('should throw error for duration that is too large', () => {
      // Arrange
      const config: StreamConfig = {
        streamId: 123n,
        amountPerSec: 456n,
        start: 789n,
        duration: 1n << 32n, // 2^32, which is too large
      };

      // Act & Assert
      expect(() => encodeStreamConfig(config)).toThrow(
        "'duration' must be in [0, 4294967295]",
      );
    });

    it('should throw error for negative duration', () => {
      // Arrange
      const config: StreamConfig = {
        streamId: 123n,
        amountPerSec: 456n,
        start: 789n,
        duration: -1n,
      };

      // Act & Assert
      expect(() => encodeStreamConfig(config)).toThrow(
        "'duration' must be in [0, 4294967295]",
      );
    });

    it('should handle maximum valid values', () => {
      // Arrange
      const config: StreamConfig = {
        streamId: (1n << 32n) - 1n, // 2^32 - 1
        amountPerSec: (1n << 160n) - 1n, // 2^160 - 1
        start: (1n << 32n) - 1n, // 2^32 - 1
        duration: (1n << 32n) - 1n, // 2^32 - 1
      };

      // Act
      const result = encodeStreamConfig(config);

      // Assert
      expect(result).toBeDefined();

      // Verify by decoding
      const decoded = decodeStreamConfig(result);
      expect(decoded).toEqual(config);
    });

    it('should handle minimum valid values', () => {
      // Arrange
      const config: StreamConfig = {
        streamId: 0n,
        amountPerSec: 1n, // Minimum valid value is 1
        start: 0n,
        duration: 0n,
      };

      // Act
      const result = encodeStreamConfig(config);

      // Assert
      expect(result).toBeDefined();

      // Verify by decoding
      const decoded = decodeStreamConfig(result);
      expect(decoded).toEqual(config);
    });
  });

  describe('decodeStreamConfig', () => {
    it('should correctly decode a valid packed value', () => {
      // Arrange
      const originalConfig: StreamConfig = {
        streamId: 123n,
        amountPerSec: 456n,
        start: 789n,
        duration: 101112n,
      };
      const packed = encodeStreamConfig(originalConfig);

      // Act
      const result = decodeStreamConfig(packed);

      // Assert
      expect(result).toEqual(originalConfig);
    });

    it('should correctly extract each component from the packed value', () => {
      // Arrange
      // Create a packed value with known components
      const streamId = 12345n;
      const amountPerSec = 67890n;
      const start = 13579n;
      const duration = 24680n;

      // Manually pack the values (simplified version of the actual encoding)
      const packed =
        (((((streamId << 160n) | amountPerSec) << 32n) | start) << 32n) |
        duration;

      // Act
      const result = decodeStreamConfig(packed);

      // Assert
      expect(result.streamId).toBe(streamId);
      expect(result.amountPerSec).toBe(amountPerSec);
      expect(result.start).toBe(start);
      expect(result.duration).toBe(duration);
    });

    it('should validate the decoded config', () => {
      // Arrange
      // Create an invalid packed value (with amountPerSec = 0)
      const streamId = 12345n;
      const amountPerSec = 0n; // Invalid
      const start = 13579n;
      const duration = 24680n;

      // Manually pack the values
      const packed =
        (((((streamId << 160n) | amountPerSec) << 32n) | start) << 32n) |
        duration;

      // Act & Assert
      expect(() => decodeStreamConfig(packed)).toThrow(
        "'amtPerSec' must be in (0, 1461501637330902918203684832716283019655932542975]",
      );
    });

    it('should handle maximum valid values', () => {
      // Arrange
      const originalConfig: StreamConfig = {
        streamId: (1n << 32n) - 1n, // 2^32 - 1
        amountPerSec: (1n << 160n) - 1n, // 2^160 - 1
        start: (1n << 32n) - 1n, // 2^32 - 1
        duration: (1n << 32n) - 1n, // 2^32 - 1
      };
      const packed = encodeStreamConfig(originalConfig);

      // Act
      const result = decodeStreamConfig(packed);

      // Assert
      expect(result).toEqual(originalConfig);
    });

    it('should handle minimum valid values', () => {
      // Arrange
      const originalConfig: StreamConfig = {
        streamId: 0n,
        amountPerSec: 1n, // Minimum valid value is 1
        start: 0n,
        duration: 0n,
      };
      const packed = encodeStreamConfig(originalConfig);

      // Act
      const result = decodeStreamConfig(packed);

      // Assert
      expect(result).toEqual(originalConfig);
    });
  });

  describe('round trip encoding/decoding', () => {
    it('should preserve values through encode-decode cycle', () => {
      // Test with various valid configs
      const testCases: StreamConfig[] = [
        {
          streamId: 123n,
          amountPerSec: 456n,
          start: 789n,
          duration: 101112n,
        },
        {
          streamId: 0n,
          amountPerSec: 1n,
          start: 0n,
          duration: 0n,
        },
        {
          streamId: 4294967295n, // 2^32 - 1
          amountPerSec: 1461501637330902918203684832716283019655932542975n, // 2^160 - 1
          start: 4294967295n, // 2^32 - 1
          duration: 4294967295n, // 2^32 - 1
        },
        {
          streamId: 42n,
          amountPerSec: 1000000000000000000n, // 1 ETH per second
          start: 1672531200n, // Jan 1, 2023 timestamp in seconds
          duration: 86400n, // 1 day
        },
      ];

      for (const config of testCases) {
        // Act
        const encoded = encodeStreamConfig(config);
        const decoded = decodeStreamConfig(encoded);

        // Assert
        expect(decoded).toEqual(config);
      }
    });
  });
});
