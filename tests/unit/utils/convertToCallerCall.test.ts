import {describe, it, expect} from 'vitest';
import {convertToCallerCall} from '../../../src/internal/shared/convertToCallerCall';
import type {PreparedTx} from '../../../src/internal/blockchain/BlockchainAdapter';
import type {Address, Hex} from 'viem';

describe('convertToCallerCall', () => {
  describe('basic functionality', () => {
    it('should convert PreparedTx to CallerCall format', () => {
      // Arrange
      const preparedTx: PreparedTx = {
        to: '0x1234567890123456789012345678901234567890' as Address,
        data: '0xabcdef' as Hex,
        value: 1000n,
        abiFunctionName: 'testFunction',
      };

      // Act
      const result = convertToCallerCall(preparedTx);

      // Assert
      expect(result).toEqual({
        target: '0x1234567890123456789012345678901234567890',
        data: '0xabcdef',
        value: 1000n,
      });
    });

    it('should handle zero value', () => {
      // Arrange
      const preparedTx: PreparedTx = {
        to: '0x1234567890123456789012345678901234567890' as Address,
        data: '0x123456' as Hex,
        value: 0n,
        abiFunctionName: 'zeroValueFunction',
      };

      // Act
      const result = convertToCallerCall(preparedTx);

      // Assert
      expect(result).toEqual({
        target: '0x1234567890123456789012345678901234567890',
        data: '0x123456',
        value: 0n,
      });
    });

    it('should handle undefined value by converting to 0n', () => {
      // Arrange
      const preparedTx: PreparedTx = {
        to: '0x1234567890123456789012345678901234567890' as Address,
        data: '0x789abc' as Hex,
        value: undefined as any,
        abiFunctionName: 'undefinedValueFunction',
      };

      // Act
      const result = convertToCallerCall(preparedTx);

      // Assert
      expect(result).toEqual({
        target: '0x1234567890123456789012345678901234567890',
        data: '0x789abc',
        value: 0n,
      });
    });

    it('should handle null value by converting to 0n', () => {
      // Arrange
      const preparedTx: PreparedTx = {
        to: '0x1234567890123456789012345678901234567890' as Address,
        data: '0xdef123' as Hex,
        value: null as any,
        abiFunctionName: 'nullValueFunction',
      };

      // Act
      const result = convertToCallerCall(preparedTx);

      // Assert
      expect(result).toEqual({
        target: '0x1234567890123456789012345678901234567890',
        data: '0xdef123',
        value: 0n,
      });
    });
  });

  describe('data handling', () => {
    it('should preserve hex data exactly', () => {
      // Arrange
      const hexData =
        '0xa9059cbb000000000000000000000000742d35cc6634c0532925a3b8d';
      const preparedTx: PreparedTx = {
        to: '0x1234567890123456789012345678901234567890' as Address,
        data: hexData as Hex,
        value: 500n,
        abiFunctionName: 'transfer',
      };

      // Act
      const result = convertToCallerCall(preparedTx);

      // Assert
      expect(result.data).toBe(hexData);
    });

    it('should handle empty data', () => {
      // Arrange
      const preparedTx: PreparedTx = {
        to: '0x1234567890123456789012345678901234567890' as Address,
        data: '0x' as Hex,
        value: 100n,
        abiFunctionName: 'emptyData',
      };

      // Act
      const result = convertToCallerCall(preparedTx);

      // Assert
      expect(result.data).toBe('0x');
    });

    it('should handle long encoded function data', () => {
      // Arrange
      const longData = '0x' + 'a'.repeat(1000);
      const preparedTx: PreparedTx = {
        to: '0x1234567890123456789012345678901234567890' as Address,
        data: longData as Hex,
        value: 2000n,
        abiFunctionName: 'complexFunction',
      };

      // Act
      const result = convertToCallerCall(preparedTx);

      // Assert
      expect(result.data).toBe(longData);
    });
  });

  describe('address handling', () => {
    it('should handle different address formats', () => {
      const addresses: Address[] = [
        '0x0000000000000000000000000000000000000000',
        '0xffffffffffffffffffffffffffffffffffffffff',
        '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
        '0xdE709f2102306220921060314715629080e2fb77',
      ];

      addresses.forEach(address => {
        const preparedTx: PreparedTx = {
          to: address,
          data: '0x123' as Hex,
          value: 100n,
          abiFunctionName: 'testFunction',
        };

        const result = convertToCallerCall(preparedTx);
        expect(result.target).toBe(address);
      });
    });

    it('should preserve checksummed addresses', () => {
      // Arrange
      const checksummedAddress =
        '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed' as Address;
      const preparedTx: PreparedTx = {
        to: checksummedAddress,
        data: '0x456' as Hex,
        value: 300n,
        abiFunctionName: 'checksumTest',
      };

      // Act
      const result = convertToCallerCall(preparedTx);

      // Assert
      expect(result.target).toBe(checksummedAddress);
    });
  });

  describe('value conversion', () => {
    it('should handle large values', () => {
      // Arrange
      const largeValue = BigInt('0xffffffffffffffffffffffffffffffff');
      const preparedTx: PreparedTx = {
        to: '0x1234567890123456789012345678901234567890' as Address,
        data: '0x789' as Hex,
        value: largeValue,
        abiFunctionName: 'largeValueFunction',
      };

      // Act
      const result = convertToCallerCall(preparedTx);

      // Assert
      expect(result.value).toBe(largeValue);
    });

    it('should handle string values by converting to BigInt', () => {
      // Arrange
      const preparedTx: PreparedTx = {
        to: '0x1234567890123456789012345678901234567890' as Address,
        data: '0xabc' as Hex,
        value: '1000' as any,
        abiFunctionName: 'stringValueFunction',
      };

      // Act
      const result = convertToCallerCall(preparedTx);

      // Assert
      expect(result.value).toBe(1000n);
    });

    it('should handle number values by converting to BigInt', () => {
      // Arrange
      const preparedTx: PreparedTx = {
        to: '0x1234567890123456789012345678901234567890' as Address,
        data: '0xdef' as Hex,
        value: 500 as any,
        abiFunctionName: 'numberValueFunction',
      };

      // Act
      const result = convertToCallerCall(preparedTx);

      // Assert
      expect(result.value).toBe(500n);
    });

    it('should handle hex string values', () => {
      // Arrange
      const preparedTx: PreparedTx = {
        to: '0x1234567890123456789012345678901234567890' as Address,
        data: '0x123' as Hex,
        value: '0x3e8' as any, // 1000 in hex
        abiFunctionName: 'hexValueFunction',
      };

      // Act
      const result = convertToCallerCall(preparedTx);

      // Assert
      expect(result.value).toBe(1000n);
    });
  });

  describe('property mapping', () => {
    it('should only include target, data, and value properties', () => {
      // Arrange
      const preparedTx: PreparedTx = {
        to: '0x1234567890123456789012345678901234567890' as Address,
        data: '0x123456' as Hex,
        value: 1000n,
        abiFunctionName: 'testFunction',
        gasLimit: 21000n,
        gasPrice: 20000000000n,
        nonce: 42,
      } as any;

      // Act
      const result = convertToCallerCall(preparedTx);

      // Assert
      expect(Object.keys(result)).toEqual(['target', 'data', 'value']);
      expect(result).not.toHaveProperty('abiFunctionName');
      expect(result).not.toHaveProperty('gasLimit');
      expect(result).not.toHaveProperty('gasPrice');
      expect(result).not.toHaveProperty('nonce');
    });

    it('should map properties correctly', () => {
      // Arrange
      const preparedTx: PreparedTx = {
        to: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as Address,
        data: '0xfedcba' as Hex,
        value: 2500n,
        abiFunctionName: 'mappingTest',
      };

      // Act
      const result = convertToCallerCall(preparedTx);

      // Assert
      expect(result.target).toBe(preparedTx.to);
      expect(result.data).toBe(preparedTx.data);
      expect(result.value).toBe(preparedTx.value);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle missing value property gracefully', () => {
      // Arrange
      const preparedTx = {
        to: '0x1234567890123456789012345678901234567890' as Address,
        data: '0x123' as Hex,
        abiFunctionName: 'noValueFunction',
        // value property is missing
      } as PreparedTx;

      // Act
      const result = convertToCallerCall(preparedTx);

      // Assert
      expect(result.value).toBe(0n);
    });

    it('should not modify the original PreparedTx object', () => {
      // Arrange
      const originalTx: PreparedTx = {
        to: '0x1234567890123456789012345678901234567890' as Address,
        data: '0x123456' as Hex,
        value: 1000n,
        abiFunctionName: 'immutabilityTest',
      };
      const txCopy = {...originalTx};

      // Act
      convertToCallerCall(originalTx);

      // Assert
      expect(originalTx).toEqual(txCopy);
    });

    it('should handle falsy values correctly', () => {
      const falsyValues = [0, false, '', null, undefined];

      falsyValues.forEach(falsyValue => {
        const preparedTx: PreparedTx = {
          to: '0x1234567890123456789012345678901234567890' as Address,
          data: '0x123' as Hex,
          value: falsyValue as any,
          abiFunctionName: 'falsyTest',
        };

        const result = convertToCallerCall(preparedTx);
        expect(result.value).toBe(0n);
      });
    });
  });

  describe('type safety and validation', () => {
    it('should return object with correct property types', () => {
      // Arrange
      const preparedTx: PreparedTx = {
        to: '0x1234567890123456789012345678901234567890' as Address,
        data: '0x123456' as Hex,
        value: 1000n,
        abiFunctionName: 'typeTest',
      };

      // Act
      const result = convertToCallerCall(preparedTx);

      // Assert
      expect(typeof result.target).toBe('string');
      expect(typeof result.data).toBe('string');
      expect(typeof result.value).toBe('bigint');
      expect(result.target.startsWith('0x')).toBe(true);
      expect(result.data.startsWith('0x')).toBe(true);
    });

    it('should handle complex PreparedTx with all optional fields', () => {
      // Arrange
      const complexTx: PreparedTx = {
        to: '0x1234567890123456789012345678901234567890' as Address,
        data: '0x123456789abcdef' as Hex,
        value: 5000n,
        abiFunctionName: 'complexFunction',
        gasLimit: 100000n,
        gasPrice: 30000000000n,
        maxFeePerGas: 40000000000n,
        maxPriorityFeePerGas: 2000000000n,
        nonce: 123,
      } as any;

      // Act
      const result = convertToCallerCall(complexTx);

      // Assert
      expect(result).toEqual({
        target: '0x1234567890123456789012345678901234567890',
        data: '0x123456789abcdef',
        value: 5000n,
      });
    });
  });

  describe('performance and consistency', () => {
    it('should be fast for multiple conversions', () => {
      // Arrange
      const transactions = Array.from({length: 1000}, (_, i) => ({
        to: '0x1234567890123456789012345678901234567890' as Address,
        data: `0x${i.toString(16)}` as Hex,
        value: BigInt(i),
        abiFunctionName: `function${i}`,
      }));

      // Act
      const startTime = performance.now();
      const results = transactions.map(tx => convertToCallerCall(tx));
      const endTime = performance.now();

      // Assert
      expect(results).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(50); // Should be very fast
      results.forEach((result, i) => {
        expect(result.target).toBe(
          '0x1234567890123456789012345678901234567890',
        );
        expect(result.data).toBe(`0x${i.toString(16)}`);
        expect(result.value).toBe(BigInt(i));
      });
    });

    it('should produce consistent results for same input', () => {
      // Arrange
      const preparedTx: PreparedTx = {
        to: '0x1234567890123456789012345678901234567890' as Address,
        data: '0xconsistent' as Hex,
        value: 1337n,
        abiFunctionName: 'consistencyTest',
      };

      // Act
      const result1 = convertToCallerCall(preparedTx);
      const result2 = convertToCallerCall(preparedTx);

      // Assert
      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2); // Different object instances
    });

    it('should handle concurrent conversions correctly', async () => {
      // Arrange
      const createTx = (id: number): PreparedTx => ({
        to: '0x1234567890123456789012345678901234567890' as Address,
        data: `0x${id.toString(16).padStart(8, '0')}` as Hex,
        value: BigInt(id * 100),
        abiFunctionName: `concurrentFunction${id}`,
      });

      const promises = Array.from({length: 100}, (_, i) =>
        Promise.resolve(convertToCallerCall(createTx(i))),
      );

      // Act
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(100);
      results.forEach((result, i) => {
        expect(result.target).toBe(
          '0x1234567890123456789012345678901234567890',
        );
        expect(result.data).toBe(`0x${i.toString(16).padStart(8, '0')}`);
        expect(result.value).toBe(BigInt(i * 100));
      });
    });
  });
});
