import {describe, it, expect} from 'vitest';
import {buildTx} from '../../../src/internal/utils/buildTx';
import type {Address, Abi} from 'viem';

describe('buildTx', () => {
  const mockContract: Address = '0x1234567890123456789012345678901234567890';
  const mockAbi = [
    {
      name: 'testFunction',
      type: 'function',
      inputs: [
        {name: 'param1', type: 'uint256'},
        {name: 'param2', type: 'string'},
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
  ] as const satisfies Abi;

  describe('basic functionality', () => {
    it('should build transaction with function name and args', () => {
      // Arrange
      const request = {
        abi: mockAbi,
        functionName: 'testFunction',
        args: [123n, 'test'],
        contract: mockContract,
      } as any;

      // Act
      const result = buildTx(request);

      // Assert
      expect(result).toHaveProperty('to', mockContract);
      expect(result).toHaveProperty('abiFunctionName', 'testFunction');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('value', 0n);
      expect(typeof result.data).toBe('string');
      expect(result.data.startsWith('0x')).toBe(true);
    });

    it('should build transaction without args', () => {
      // Arrange
      const simpleAbi = [
        {
          name: 'simpleFunction',
          type: 'function',
          inputs: [],
          outputs: [],
          stateMutability: 'nonpayable',
        },
      ] as const satisfies Abi;

      const request = {
        abi: simpleAbi,
        functionName: 'simpleFunction',
        contract: mockContract,
      } as any;

      // Act
      const result = buildTx(request);

      // Assert
      expect(result.to).toBe(mockContract);
      expect(result.abiFunctionName).toBe('simpleFunction');
      expect(result.data).toBeDefined();
      expect(result.value).toBe(0n);
    });

    it('should include txOverrides when provided', () => {
      // Arrange
      const txOverrides = {
        value: 1000n,
        gasLimit: 21000n,
        gasPrice: 20000000000n,
      };

      const request = {
        abi: mockAbi,
        functionName: 'testFunction',
        args: [456n, 'override-test'],
        contract: mockContract,
        txOverrides,
      } as any;

      // Act
      const result = buildTx(request);

      // Assert
      expect(result.to).toBe(mockContract);
      expect(result.abiFunctionName).toBe('testFunction');
      expect(result.value).toBe(1000n);
      expect(result.gasLimit).toBe(21000n);
      expect(result.gasPrice).toBe(20000000000n);
    });

    it('should default value to 0n when not provided in txOverrides', () => {
      // Arrange
      const txOverrides = {
        gasLimit: 21000n,
      };

      const request = {
        abi: mockAbi,
        functionName: 'testFunction',
        args: [789n, 'no-value-test'],
        contract: mockContract,
        txOverrides,
      } as any;

      // Act
      const result = buildTx(request);

      // Assert
      expect(result.value).toBe(0n);
      expect(result.gasLimit).toBe(21000n);
    });

    it('should preserve value from txOverrides when provided', () => {
      // Arrange
      const txOverrides = {
        value: 5000n,
      };

      const request = {
        abi: mockAbi,
        functionName: 'testFunction',
        args: [999n, 'value-test'],
        contract: mockContract,
        txOverrides,
      } as any;

      // Act
      const result = buildTx(request);

      // Assert
      expect(result.value).toBe(5000n);
    });
  });

  describe('function encoding', () => {
    it('should encode function with different parameter types', () => {
      // Arrange
      const complexAbi = [
        {
          name: 'complexFunction',
          type: 'function',
          inputs: [
            {name: 'uintParam', type: 'uint256'},
            {name: 'stringParam', type: 'string'},
            {name: 'boolParam', type: 'bool'},
            {name: 'addressParam', type: 'address'},
          ],
          outputs: [],
          stateMutability: 'nonpayable',
        },
      ] as const satisfies Abi;

      const request = {
        abi: complexAbi,
        functionName: 'complexFunction',
        args: [
          123n,
          'test string',
          true,
          '0x1234567890123456789012345678901234567890',
        ],
        contract: mockContract,
      } as any;

      // Act
      const result = buildTx(request);

      // Assert
      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(10); // Should be encoded data
      expect(result.abiFunctionName).toBe('complexFunction');
    });

    it('should encode function with array parameters', () => {
      // Arrange
      const arrayAbi = [
        {
          name: 'arrayFunction',
          type: 'function',
          inputs: [
            {name: 'numbers', type: 'uint256[]'},
            {name: 'addresses', type: 'address[]'},
          ],
          outputs: [],
          stateMutability: 'nonpayable',
        },
      ] as const satisfies Abi;

      const request = {
        abi: arrayAbi,
        functionName: 'arrayFunction',
        args: [
          [1n, 2n, 3n],
          [
            '0x1111111111111111111111111111111111111111',
            '0x2222222222222222222222222222222222222222',
          ],
        ],
        contract: mockContract,
      } as any;

      // Act
      const result = buildTx(request);

      // Assert
      expect(result.data).toBeDefined();
      expect(result.abiFunctionName).toBe('arrayFunction');
    });

    it('should encode payable function', () => {
      // Arrange
      const payableAbi = [
        {
          name: 'payableFunction',
          type: 'function',
          inputs: [{name: 'amount', type: 'uint256'}],
          outputs: [],
          stateMutability: 'payable',
        },
      ] as const satisfies Abi;

      const request = {
        abi: payableAbi,
        functionName: 'payableFunction',
        args: [1000n],
        contract: mockContract,
        txOverrides: {value: 1000n},
      } as any;

      // Act
      const result = buildTx(request);

      // Assert
      expect(result.data).toBeDefined();
      expect(result.value).toBe(1000n);
      expect(result.abiFunctionName).toBe('payableFunction');
    });
  });

  describe('error handling', () => {
    it('should throw unreachable error when functionName is missing', () => {
      // Arrange
      const request = {
        abi: mockAbi,
        // functionName is missing
        args: [123n, 'test'],
        contract: mockContract,
      } as any;

      // Act & Assert
      expect(() => buildTx(request)).toThrow('Missing function name');
    });

    it('should throw unreachable error when functionName is undefined', () => {
      // Arrange
      const request = {
        abi: mockAbi,
        functionName: undefined,
        args: [123n, 'test'],
        contract: mockContract,
      } as any;

      // Act & Assert
      expect(() => buildTx(request)).toThrow('Missing function name');
    });

    it('should throw unreachable error when functionName is null', () => {
      // Arrange
      const request = {
        abi: mockAbi,
        functionName: null,
        args: [123n, 'test'],
        contract: mockContract,
      } as any;

      // Act & Assert
      expect(() => buildTx(request)).toThrow('Missing function name');
    });

    it('should throw unreachable error when functionName is empty string', () => {
      // Arrange
      const request = {
        abi: mockAbi,
        functionName: '',
        args: [123n, 'test'],
        contract: mockContract,
      } as any;

      // Act & Assert
      expect(() => buildTx(request)).toThrow('Missing function name');
    });
  });

  describe('contract address handling', () => {
    it('should handle different contract address formats', () => {
      const addresses: Address[] = [
        '0x1234567890123456789012345678901234567890',
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        '0x0000000000000000000000000000000000000000',
      ];

      addresses.forEach(address => {
        const request = {
          abi: mockAbi,
          functionName: 'testFunction',
          args: [123n, 'test'],
          contract: address,
        } as any;

        const result = buildTx(request);
        expect(result.to).toBe(address);
      });
    });

    it('should handle checksummed addresses', () => {
      // Arrange
      const checksummedAddress: Address =
        '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';

      const request = {
        abi: mockAbi,
        functionName: 'testFunction',
        args: [123n, 'test'],
        contract: checksummedAddress,
      } as any;

      // Act
      const result = buildTx(request);

      // Assert
      expect(result.to).toBe(checksummedAddress);
    });
  });

  describe('transaction overrides', () => {
    it('should handle all common transaction override fields', () => {
      // Arrange
      const txOverrides = {
        value: 1000n,
        gasLimit: 21000n,
        gasPrice: 20000000000n,
        nonce: 42,
      };

      const request = {
        abi: mockAbi,
        functionName: 'testFunction',
        args: [123n, 'test'],
        contract: mockContract,
        txOverrides,
      } as any;

      // Act
      const result = buildTx(request);

      // Assert
      expect(result.value).toBe(1000n);
      expect(result.gasLimit).toBe(21000n);
      expect(result.gasPrice).toBe(20000000000n);
      expect(result.nonce).toBe(42);
    });

    it('should handle EIP-1559 transaction fields', () => {
      // Arrange
      const txOverrides = {
        maxFeePerGas: 30000000000n,
        maxPriorityFeePerGas: 2000000000n,
        value: 500n,
      };

      const request = {
        abi: mockAbi,
        functionName: 'testFunction',
        args: [123n, 'test'],
        contract: mockContract,
        txOverrides,
      } as any;

      // Act
      const result = buildTx(request);

      // Assert
      expect(result.maxFeePerGas).toBe(30000000000n);
      expect(result.maxPriorityFeePerGas).toBe(2000000000n);
      expect(result.value).toBe(500n);
    });

    it('should handle empty txOverrides object', () => {
      // Arrange
      const request = {
        abi: mockAbi,
        functionName: 'testFunction',
        args: [123n, 'test'],
        contract: mockContract,
        txOverrides: {},
      } as any;

      // Act
      const result = buildTx(request);

      // Assert
      expect(result.value).toBe(0n);
      expect(result.to).toBe(mockContract);
      expect(result.data).toBeDefined();
    });
  });

  describe('data encoding verification', () => {
    it('should produce consistent encoding for same inputs', () => {
      // Arrange
      const request = {
        abi: mockAbi,
        functionName: 'testFunction',
        args: [123n, 'consistent'],
        contract: mockContract,
      } as any;

      // Act
      const result1 = buildTx(request);
      const result2 = buildTx(request);

      // Assert
      expect(result1.data).toBe(result2.data);
      expect(result1.abiFunctionName).toBe(result2.abiFunctionName);
    });

    it('should produce different encoding for different args', () => {
      // Arrange
      const request1 = {
        abi: mockAbi,
        functionName: 'testFunction',
        args: [123n, 'first'],
        contract: mockContract,
      } as any;

      const request2 = {
        abi: mockAbi,
        functionName: 'testFunction',
        args: [456n, 'second'],
        contract: mockContract,
      } as any;

      // Act
      const result1 = buildTx(request1);
      const result2 = buildTx(request2);

      // Assert
      expect(result1.data).not.toBe(result2.data);
      expect(result1.abiFunctionName).toBe(result2.abiFunctionName);
    });

    it('should include function selector in encoded data', () => {
      // Arrange
      const request = {
        abi: mockAbi,
        functionName: 'testFunction',
        args: [123n, 'test'],
        contract: mockContract,
      } as any;

      // Act
      const result = buildTx(request);

      // Assert
      expect(result.data.startsWith('0x')).toBe(true);
      expect(result.data.length).toBeGreaterThan(10); // At least function selector (4 bytes = 8 hex chars + 0x)
    });
  });

  describe('edge cases and boundary conditions', () => {
    it('should handle zero value in txOverrides', () => {
      // Arrange
      const request = {
        abi: mockAbi,
        functionName: 'testFunction',
        args: [123n, 'test'],
        contract: mockContract,
        txOverrides: {value: 0n},
      } as any;

      // Act
      const result = buildTx(request);

      // Assert
      expect(result.value).toBe(0n);
    });

    it('should handle very large values', () => {
      // Arrange
      const largeValue = BigInt('0xffffffffffffffffffffffffffffffff');
      const request = {
        abi: mockAbi,
        functionName: 'testFunction',
        args: [largeValue, 'large-value'],
        contract: mockContract,
        txOverrides: {value: largeValue},
      } as any;

      // Act
      const result = buildTx(request);

      // Assert
      expect(result.value).toBe(largeValue);
      expect(result.data).toBeDefined();
    });

    it('should handle empty string arguments', () => {
      // Arrange
      const request = {
        abi: mockAbi,
        functionName: 'testFunction',
        args: [0n, ''],
        contract: mockContract,
      } as any;

      // Act
      const result = buildTx(request);

      // Assert
      expect(result.data).toBeDefined();
      expect(result.abiFunctionName).toBe('testFunction');
    });

    it('should not modify input parameters', () => {
      // Arrange
      const originalRequest = {
        abi: mockAbi,
        functionName: 'testFunction',
        args: [123n, 'test'],
        contract: mockContract,
        txOverrides: {value: 1000n},
      } as any;
      // Create a deep copy manually since JSON.stringify can't handle BigInt
      const requestCopy = {
        abi: originalRequest.abi,
        functionName: originalRequest.functionName,
        args: [...originalRequest.args],
        contract: originalRequest.contract,
        txOverrides: {...originalRequest.txOverrides},
      } as any;

      // Act
      buildTx(originalRequest);

      // Assert
      expect(originalRequest).toEqual(requestCopy);
    });
  });

  describe('performance', () => {
    it('should handle multiple transaction builds efficiently', () => {
      // Arrange
      const requests = Array.from({length: 100}, (_, i) => ({
        abi: mockAbi,
        functionName: 'testFunction',
        args: [BigInt(i), `test-${i}`],
        contract: mockContract,
      })) as any[];

      // Act
      const startTime = performance.now();
      const results = requests.map(request => buildTx(request));
      const endTime = performance.now();

      // Assert
      expect(results).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(50); // Should be fast
      results.forEach(result => {
        expect(result.abiFunctionName).toBe('testFunction');
        expect(result.to).toBe(mockContract);
        expect(result.data).toBeDefined();
      });
    });
  });
});
