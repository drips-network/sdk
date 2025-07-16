import {describe, it, expect} from 'vitest';
import {
  parseStreamRate,
  validateStreamRate,
  formatStreamRate,
  TimeUnit,
  AMT_PER_SEC_MULTIPLIER,
  AMT_PER_SEC_EXTRA_DECIMALS,
  CYCLE_SECS,
  encodeStreamConfig,
  decodeStreamConfig,
} from '../../../src/internal/shared/streamRateUtils';
import {DripsError} from '../../../src/internal/shared/DripsError';

describe('streamRateUtils', () => {
  describe('parseStreamRate', () => {
    it('should parse stream rate correctly for different time units', () => {
      // Test with USDC (6 decimals)
      const amount = '100';
      const tokenDecimals = 6;

      // 100 USDC per day
      const perDay = parseStreamRate(amount, TimeUnit.DAY, tokenDecimals);
      expect(perDay).toBe(1157407407407n); // 100 * 10^15 / 86400

      // 100 USDC per week
      const perWeek = parseStreamRate(amount, TimeUnit.WEEK, tokenDecimals);
      expect(perWeek).toBe(165343915343n); // 100 * 10^15 / 604800

      // 100 USDC per second
      const perSecond = parseStreamRate(amount, TimeUnit.SECOND, tokenDecimals);
      expect(perSecond).toBe(100000000000000000n); // 100 * 10^15
    });

    it('should handle different token decimals', () => {
      const amount = '1';

      // ETH (18 decimals)
      const ethPerDay = parseStreamRate(amount, TimeUnit.DAY, 18);
      expect(ethPerDay).toBe(11574074074074074074074n);

      // USDC (6 decimals)
      const usdcPerDay = parseStreamRate(amount, TimeUnit.DAY, 6);
      expect(usdcPerDay).toBe(11574074074n);
    });

    it('should handle fractional amounts', () => {
      const amount = '0.5';
      const tokenDecimals = 18;

      const perDay = parseStreamRate(amount, TimeUnit.DAY, tokenDecimals);
      expect(perDay).toBe(5787037037037037037037n); // 0.5 * 10^27 / 86400
    });
  });

  describe('validateStreamRate', () => {
    it('should validate minimum stream rate (1 wei per week)', () => {
      // Calculate minimum valid rate: 1 wei per week
      // Need to ensure that amountPerSecond * CYCLE_SECS / AMT_PER_SEC_MULTIPLIER >= 1
      const minValidRate =
        BigInt(AMT_PER_SEC_MULTIPLIER) / BigInt(CYCLE_SECS) + 1n;

      // Should not throw for valid rate
      expect(() => validateStreamRate(minValidRate)).not.toThrow();

      // Test rate below minimum - should throw DripsError
      expect(() => validateStreamRate(1n)).toThrow(DripsError);
      expect(() => validateStreamRate(1n)).toThrow(
        'Stream rate must be higher than 1 wei per week',
      );
    });

    it('should validate higher stream rates', () => {
      const highRate = parseStreamRate('1000', TimeUnit.DAY, 18);
      // Should not throw for valid high rate
      expect(() => validateStreamRate(highRate)).not.toThrow();
    });
  });

  describe('formatStreamRate', () => {
    it('should format stream rate back to human-readable format', () => {
      const tokenDecimals = 6; // USDC

      // Parse 100 USDC per day
      const amountPerSecond = parseStreamRate(
        '100',
        TimeUnit.DAY,
        tokenDecimals,
      );

      // Format back to per day
      const formatted = formatStreamRate(
        amountPerSecond,
        TimeUnit.DAY,
        tokenDecimals,
      );
      expect(parseFloat(formatted)).toBeCloseTo(100.0, 1); // Should be close to original

      // Format to per week
      const perWeek = formatStreamRate(
        amountPerSecond,
        TimeUnit.WEEK,
        tokenDecimals,
      );
      expect(parseFloat(perWeek)).toBeCloseTo(700.0, 1); // Should be 7x the daily amount (100 * 7)
    });

    it('should handle round-trip conversion accurately', () => {
      const originalAmount = '50.25';
      const tokenDecimals = 18;
      const timeUnit = TimeUnit.WEEK;

      // Parse and format back
      const amountPerSecond = parseStreamRate(
        originalAmount,
        timeUnit,
        tokenDecimals,
      );
      const formatted = formatStreamRate(
        amountPerSecond,
        timeUnit,
        tokenDecimals,
      );

      // Should be very close to original (allowing for precision differences)
      expect(parseFloat(formatted)).toBeCloseTo(parseFloat(originalAmount), 1);
    });
  });

  describe('encodeStreamConfig and decodeStreamConfig', () => {
    it('should pack and unpack stream config correctly', () => {
      const originalConfig = {
        dripId: 123n,
        amountPerSec: 1000000000000000n,
        start: 1672531200n,
        duration: 86400n,
      };

      const packed = encodeStreamConfig(originalConfig);
      const unpacked = decodeStreamConfig(packed);

      expect(unpacked).toEqual(originalConfig);
    });

    it('should handle maximum values', () => {
      const maxConfig = {
        dripId: (1n << 32n) - 1n, // Max 32-bit value
        amountPerSec: (1n << 160n) - 1n, // Max 160-bit value
        start: (1n << 32n) - 1n, // Max 32-bit value
        duration: (1n << 32n) - 1n, // Max 32-bit value
      };

      const packed = encodeStreamConfig(maxConfig);
      const unpacked = decodeStreamConfig(packed);

      expect(unpacked).toEqual(maxConfig);
    });

    it('should handle zero values', () => {
      const zeroConfig = {
        dripId: 0n,
        amountPerSec: 1n, // Must be > 0 for valid stream
        start: 0n,
        duration: 0n,
      };

      const packed = encodeStreamConfig(zeroConfig);
      const unpacked = decodeStreamConfig(packed);

      expect(unpacked).toEqual(zeroConfig);
    });
  });

  describe('TimeUnit enum', () => {
    it('should have correct time unit values', () => {
      expect(TimeUnit.SECOND).toBe(1);
      expect(TimeUnit.MINUTE).toBe(60);
      expect(TimeUnit.HOUR).toBe(3600);
      expect(TimeUnit.DAY).toBe(86400);
      expect(TimeUnit.WEEK).toBe(604800);
      expect(TimeUnit.MONTH).toBe(2592000); // 30 days
      expect(TimeUnit.YEAR).toBe(31536000); // 365 days
    });
  });

  describe('Constants', () => {
    it('should have correct constant values', () => {
      expect(AMT_PER_SEC_MULTIPLIER).toBe(1_000_000_000);
      expect(AMT_PER_SEC_EXTRA_DECIMALS).toBe(9);
      expect(CYCLE_SECS).toBe(604800); // 1 week
    });
  });

  describe('Integration tests', () => {
    it('should handle complete workflow: parse -> validate -> pack -> unpack -> format', () => {
      const originalAmount = '100';
      const timeUnit = TimeUnit.DAY;
      const tokenDecimals = 6; // USDC

      // 1. Parse user input
      const amountPerSec = parseStreamRate(
        originalAmount,
        timeUnit,
        tokenDecimals,
      );

      // 2. Validate - should not throw for valid rate
      expect(() => validateStreamRate(amountPerSec)).not.toThrow();

      // 3. Create and pack stream config
      const streamConfig = {
        dripId: 999n,
        amountPerSec,
        start: 1672531200n,
        duration: 86400n,
      };
      const packed = encodeStreamConfig(streamConfig);

      // 4. Unpack
      const unpacked = decodeStreamConfig(packed);
      expect(unpacked.dripId).toBe(999n);
      expect(unpacked.amountPerSec).toBe(amountPerSec);

      // 5. Format back to human-readable
      const formatted = formatStreamRate(
        unpacked.amountPerSec,
        timeUnit,
        tokenDecimals,
      );
      expect(parseFloat(formatted)).toBeCloseTo(parseFloat(originalAmount), 1);
    });

    it('should handle edge case: very small amounts', () => {
      const smallAmount = '0.000001'; // 1 micro-token
      const timeUnit = TimeUnit.YEAR;
      const tokenDecimals = 18;

      const amountPerSecond = parseStreamRate(
        smallAmount,
        timeUnit,
        tokenDecimals,
      );

      // This might be invalid due to minimum rate requirement
      try {
        validateStreamRate(amountPerSecond);
        // If validation passes, test formatting
        const formatted = formatStreamRate(
          amountPerSecond,
          timeUnit,
          tokenDecimals,
        );
        expect(parseFloat(formatted)).toBeCloseTo(parseFloat(smallAmount), 6);
      } catch (error) {
        // If validation fails, check it's the expected error
        expect(error).toBeInstanceOf(DripsError);
        expect((error as DripsError).message).toContain(
          'Stream rate must be higher than 1 wei per week',
        );
      }
    });

    it('should handle edge case: very large amounts', () => {
      const largeAmount = '1000000'; // 1 million tokens
      const timeUnit = TimeUnit.SECOND;
      const tokenDecimals = 18;

      const amountPerSecond = parseStreamRate(
        largeAmount,
        timeUnit,
        tokenDecimals,
      );

      // Should not throw for valid large rate
      expect(() => validateStreamRate(amountPerSecond)).not.toThrow();

      const formatted = formatStreamRate(
        amountPerSecond,
        timeUnit,
        tokenDecimals,
      );
      expect(parseFloat(formatted)).toBeCloseTo(parseFloat(largeAmount), 10);
    });
  });
});
