import {describe, it, expect, vi, beforeEach} from 'vitest';
import {calcAddressId} from '../../../src/internal/shared/calcAddressId';
import type {ReadBlockchainAdapter} from '../../../src/internal/blockchain/BlockchainAdapter';
import type {Address} from 'viem';

vi.mock('../../../src/internal/shared/assertions', () => ({
  requireSupportedChain: vi.fn(),
}));

vi.mock('viem', async () => {
  const actual = await vi.importActual('viem');
  return {
    ...actual,
    decodeFunctionResult: vi.fn(),
  };
});

vi.mock('../../../src/internal/shared/buildTx', () => ({
  buildTx: vi.fn(),
}));

import {requireSupportedChain} from '../../../src/internal/shared/assertions';
import {decodeFunctionResult} from 'viem';
import {buildTx} from '../../../src/internal/shared/buildTx';

describe('calcAddressId', () => {
  const mockAdapter: ReadBlockchainAdapter = {
    call: vi.fn(),
    getChainId: vi.fn(),
  };

  const testAddress: Address = '0x1234567890123456789012345678901234567890';
  const mockTxData = {
    to: '0x70E1E1437AeFe8024B6780C94490662b45C3B567' as const,
    data: '0xcalcaccountdata' as const,
    abiFunctionName: 'calcAccountId',
  };
  const mockEncodedResult = '0xencodedresult' as const;
  const mockAccountId = 123456789n;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to default successful behavior
    vi.mocked(mockAdapter.getChainId).mockResolvedValue(11155111);
    vi.mocked(requireSupportedChain).mockImplementation(() => {});
    vi.mocked(buildTx).mockReturnValue(mockTxData);
    vi.mocked(mockAdapter.call).mockResolvedValue(mockEncodedResult);
    vi.mocked(decodeFunctionResult).mockReturnValue(mockAccountId);
  });

  describe('successful execution', () => {
    it('should calculate address ID successfully', async () => {
      // Act
      const result = await calcAddressId(mockAdapter, testAddress);

      // Assert
      expect(mockAdapter.getChainId).toHaveBeenCalled();
      expect(requireSupportedChain).toHaveBeenCalledWith(11155111);
      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array), // addressDriverAbi
        contract: '0x70E1E1437AeFe8024B6780C94490662b45C3B567',
        functionName: 'calcAccountId',
        args: [testAddress],
      });
      expect(mockAdapter.call).toHaveBeenCalledWith(mockTxData);
      expect(decodeFunctionResult).toHaveBeenCalledWith({
        abi: expect.any(Array), // addressDriverAbi
        functionName: 'calcAccountId',
        data: mockEncodedResult,
      });
      expect(result).toBe(mockAccountId);
    });

    it('should work with different adapters', async () => {
      // Arrange
      const customAdapter: ReadBlockchainAdapter = {
        call: vi.fn().mockResolvedValue(mockEncodedResult),
        getChainId: vi.fn().mockResolvedValue(11155111),
      };

      // Act
      const result = await calcAddressId(customAdapter, testAddress);

      // Assert
      expect(customAdapter.getChainId).toHaveBeenCalled();
      expect(customAdapter.call).toHaveBeenCalledWith(mockTxData);
      expect(mockAdapter.call).not.toHaveBeenCalled();
      expect(result).toBe(mockAccountId);
    });

    it('should work with different supported chains', async () => {
      // Arrange - Mock adapter to return mainnet chain ID
      vi.mocked(mockAdapter.getChainId).mockResolvedValue(1);
      const mainnetTxData = {
        to: '0x1455d9bD6B98f95dd8FEB2b3D60ed825fcef0610' as const,
        data: '0xcalcaccountdata' as const,
        abiFunctionName: 'calcAccountId',
      };
      vi.mocked(buildTx).mockReturnValue(mainnetTxData);

      // Act
      await calcAddressId(mockAdapter, testAddress);

      // Assert
      expect(mockAdapter.getChainId).toHaveBeenCalled();
      expect(requireSupportedChain).toHaveBeenCalledWith(1);
      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        contract: '0x1455d9bD6B98f95dd8FEB2b3D60ed825fcef0610', // mainnet contract
        functionName: 'calcAccountId',
        args: [testAddress],
      });
    });

    it('should work with localhost chain', async () => {
      // Arrange
      vi.mocked(mockAdapter.getChainId).mockResolvedValue(31337);
      const localhostTxData = {
        to: '0x1707De7b41A3915F990A663d27AD3a952D50151d' as const,
        data: '0xcalcaccountdata' as const,
        abiFunctionName: 'calcAccountId',
      };
      vi.mocked(buildTx).mockReturnValue(localhostTxData);

      // Act
      await calcAddressId(mockAdapter, testAddress);

      // Assert
      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        contract: '0x1707De7b41A3915F990A663d27AD3a952D50151d', // localhost contract
        functionName: 'calcAccountId',
        args: [testAddress],
      });
    });

    it('should handle different addresses', async () => {
      // Arrange
      const customAddress: Address =
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

      // Act
      await calcAddressId(mockAdapter, customAddress);

      // Assert
      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        contract: '0x70E1E1437AeFe8024B6780C94490662b45C3B567',
        functionName: 'calcAccountId',
        args: [customAddress],
      });
    });

    it('should return different account IDs', async () => {
      // Arrange
      const customAccountId = 987654321n;
      vi.mocked(decodeFunctionResult).mockReturnValue(customAccountId);

      // Act
      const result = await calcAddressId(mockAdapter, testAddress);

      // Assert
      expect(result).toBe(customAccountId);
    });
  });

  describe('address formats', () => {
    it('should handle zero address', async () => {
      // Arrange
      const zeroAddress: Address = '0x0000000000000000000000000000000000000000';

      // Act
      await calcAddressId(mockAdapter, zeroAddress);

      // Assert
      expect(buildTx).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [zeroAddress],
        }),
      );
    });

    it('should handle checksummed addresses', async () => {
      // Arrange
      const checksummedAddress: Address =
        '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed';

      // Act
      await calcAddressId(mockAdapter, checksummedAddress);

      // Assert
      expect(buildTx).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [checksummedAddress],
        }),
      );
    });

    it('should handle lowercase addresses', async () => {
      // Arrange
      const lowercaseAddress: Address =
        '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed';

      // Act
      await calcAddressId(mockAdapter, lowercaseAddress);

      // Assert
      expect(buildTx).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [lowercaseAddress],
        }),
      );
    });

    it('should handle uppercase addresses', async () => {
      // Arrange
      const uppercaseAddress: Address =
        '0x5AAEB6053F3E94C9B9A09F33669435E7EF1BEAED';

      // Act
      await calcAddressId(mockAdapter, uppercaseAddress);

      // Assert
      expect(buildTx).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [uppercaseAddress],
        }),
      );
    });

    it('should handle addresses with all zeros except last byte', async () => {
      // Arrange
      const minimalAddress: Address =
        '0x0000000000000000000000000000000000000001';

      // Act
      await calcAddressId(mockAdapter, minimalAddress);

      // Assert
      expect(buildTx).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [minimalAddress],
        }),
      );
    });

    it('should handle addresses with all Fs', async () => {
      // Arrange
      const maxAddress: Address = '0xffffffffffffffffffffffffffffffffffffffff';

      // Act
      await calcAddressId(mockAdapter, maxAddress);

      // Assert
      expect(buildTx).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [maxAddress],
        }),
      );
    });
  });

  describe('error handling', () => {
    it('should propagate getChainId errors', async () => {
      // Arrange
      const chainIdError = new Error('Failed to get chain ID');
      vi.mocked(mockAdapter.getChainId).mockRejectedValue(chainIdError);

      // Act & Assert
      await expect(calcAddressId(mockAdapter, testAddress)).rejects.toThrow(
        chainIdError,
      );
      expect(requireSupportedChain).not.toHaveBeenCalled();
      expect(buildTx).not.toHaveBeenCalled();
      expect(mockAdapter.call).not.toHaveBeenCalled();
    });

    it('should propagate chain validation errors', async () => {
      // Arrange
      const chainError = new Error('Unsupported chain ID: 999');
      vi.mocked(requireSupportedChain).mockImplementation(() => {
        throw chainError;
      });

      // Act & Assert
      await expect(calcAddressId(mockAdapter, testAddress)).rejects.toThrow(
        chainError,
      );
      expect(mockAdapter.getChainId).toHaveBeenCalled();
      expect(buildTx).not.toHaveBeenCalled();
      expect(mockAdapter.call).not.toHaveBeenCalled();
    });

    it('should propagate transaction building errors', async () => {
      // Arrange
      const buildError = new Error('Failed to build transaction');
      vi.mocked(buildTx).mockImplementation(() => {
        throw buildError;
      });

      // Act & Assert
      await expect(calcAddressId(mockAdapter, testAddress)).rejects.toThrow(
        buildError,
      );
      expect(requireSupportedChain).toHaveBeenCalled();
      expect(mockAdapter.call).not.toHaveBeenCalled();
    });

    it('should propagate adapter call errors', async () => {
      // Arrange
      const callError = new Error('Blockchain call failed');
      vi.mocked(mockAdapter.call).mockRejectedValue(callError);

      // Act & Assert
      await expect(calcAddressId(mockAdapter, testAddress)).rejects.toThrow(
        callError,
      );
      expect(requireSupportedChain).toHaveBeenCalled();
      expect(buildTx).toHaveBeenCalled();
      expect(decodeFunctionResult).not.toHaveBeenCalled();
    });

    it('should propagate decoding errors', async () => {
      // Arrange
      const decodeError = new Error('Failed to decode function result');
      vi.mocked(decodeFunctionResult).mockImplementation(() => {
        throw decodeError;
      });

      // Act & Assert
      await expect(calcAddressId(mockAdapter, testAddress)).rejects.toThrow(
        decodeError,
      );
      expect(requireSupportedChain).toHaveBeenCalled();
      expect(buildTx).toHaveBeenCalled();
      expect(mockAdapter.call).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      // Arrange
      const networkError = new Error('Network connection failed');
      vi.mocked(mockAdapter.call).mockRejectedValue(networkError);

      // Act & Assert
      await expect(calcAddressId(mockAdapter, testAddress)).rejects.toThrow(
        networkError,
      );
    });

    it('should handle timeout errors', async () => {
      // Arrange
      const timeoutError = new Error('Request timeout');
      vi.mocked(mockAdapter.call).mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(calcAddressId(mockAdapter, testAddress)).rejects.toThrow(
        timeoutError,
      );
    });
  });

  describe('edge cases', () => {
    it('should handle zero account ID result', async () => {
      // Arrange
      vi.mocked(decodeFunctionResult).mockReturnValue(0n);

      // Act
      const result = await calcAddressId(mockAdapter, testAddress);

      // Assert
      expect(result).toBe(0n);
    });

    it('should handle very large account ID result', async () => {
      // Arrange
      const largeAccountId = BigInt(
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      );
      vi.mocked(decodeFunctionResult).mockReturnValue(largeAccountId);

      // Act
      const result = await calcAddressId(mockAdapter, testAddress);

      // Assert
      expect(result).toBe(largeAccountId);
    });

    it('should handle maximum uint256 account ID', async () => {
      // Arrange
      const maxUint256 = BigInt(2) ** BigInt(256) - BigInt(1);
      vi.mocked(decodeFunctionResult).mockReturnValue(maxUint256);

      // Act
      const result = await calcAddressId(mockAdapter, testAddress);

      // Assert
      expect(result).toBe(maxUint256);
    });

    it('should handle empty encoded result', async () => {
      // Arrange
      vi.mocked(mockAdapter.call).mockResolvedValue('0x');
      vi.mocked(decodeFunctionResult).mockImplementation(() => {
        throw new Error('Cannot decode empty data');
      });

      // Act & Assert
      await expect(calcAddressId(mockAdapter, testAddress)).rejects.toThrow(
        'Cannot decode empty data',
      );
    });
  });

  describe('function call order', () => {
    it('should call functions in correct order', async () => {
      // Arrange
      const callOrder: string[] = [];
      vi.mocked(mockAdapter.getChainId).mockImplementation(async () => {
        callOrder.push('adapter.getChainId');
        return 11155111;
      });
      vi.mocked(requireSupportedChain).mockImplementation(() => {
        callOrder.push('requireSupportedChain');
      });
      vi.mocked(buildTx).mockImplementation(() => {
        callOrder.push('buildTx');
        return mockTxData;
      });
      vi.mocked(mockAdapter.call).mockImplementation(async () => {
        callOrder.push('adapter.call');
        return mockEncodedResult;
      });
      vi.mocked(decodeFunctionResult).mockImplementation(() => {
        callOrder.push('decodeFunctionResult');
        return mockAccountId;
      });

      // Act
      await calcAddressId(mockAdapter, testAddress);

      // Assert
      expect(callOrder).toEqual([
        'adapter.getChainId',
        'requireSupportedChain',
        'buildTx',
        'adapter.call',
        'decodeFunctionResult',
      ]);
    });

    it('should not call subsequent functions if chain validation fails', async () => {
      // Arrange
      vi.mocked(requireSupportedChain).mockImplementation(() => {
        throw new Error('Chain validation failed');
      });

      // Act & Assert
      await expect(calcAddressId(mockAdapter, testAddress)).rejects.toThrow(
        'Chain validation failed',
      );
      expect(buildTx).not.toHaveBeenCalled();
      expect(mockAdapter.call).not.toHaveBeenCalled();
      expect(decodeFunctionResult).not.toHaveBeenCalled();
    });

    it('should not call subsequent functions if buildTx fails', async () => {
      // Arrange
      vi.mocked(buildTx).mockImplementation(() => {
        throw new Error('Build transaction failed');
      });

      // Act & Assert
      await expect(calcAddressId(mockAdapter, testAddress)).rejects.toThrow(
        'Build transaction failed',
      );
      expect(mockAdapter.call).not.toHaveBeenCalled();
      expect(decodeFunctionResult).not.toHaveBeenCalled();
    });
  });

  describe('parameter validation', () => {
    it('should use correct contract address for each chain', async () => {
      const chainConfigs = [
        {chainId: 1, contract: '0x1455d9bD6B98f95dd8FEB2b3D60ed825fcef0610'}, // mainnet
        {
          chainId: 80002,
          contract: '0x004310a6d47893Dd6e443cbE471c24aDA1e6c619',
        }, // polygon amoy
        {
          chainId: 11155420,
          contract: '0x70E1E1437AeFe8024B6780C94490662b45C3B567',
        }, // optimism sepolia
        {
          chainId: 11155111,
          contract: '0x70E1E1437AeFe8024B6780C94490662b45C3B567',
        }, // sepolia
        {
          chainId: 31337,
          contract: '0x1707De7b41A3915F990A663d27AD3a952D50151d',
        }, // localhost
        {
          chainId: 84532,
          contract: '0x004310a6d47893Dd6e443cbE471c24aDA1e6c619',
        }, // base sepolia
        {chainId: 314, contract: '0x04693D13826a37dDdF973Be4275546Ad978cb9EE'}, // filecoin
        {chainId: 1088, contract: '0x04693D13826a37dDdF973Be4275546Ad978cb9EE'}, // metis
        {chainId: 10, contract: '0x04693D13826a37dDdF973Be4275546Ad978cb9EE'}, // optimism
      ];

      for (const {chainId, contract} of chainConfigs) {
        vi.mocked(mockAdapter.getChainId).mockResolvedValue(chainId);
        const chainTxData = {
          to: contract as `0x${string}`,
          data: '0xcalcaccountdata' as `0x${string}`,
          abiFunctionName: 'calcAccountId',
        };
        vi.mocked(buildTx).mockReturnValue(chainTxData);

        await calcAddressId(mockAdapter, testAddress);

        expect(buildTx).toHaveBeenCalledWith(
          expect.objectContaining({
            contract,
          }),
        );
      }
    });

    it('should pass correct function name and arguments', async () => {
      // Act
      await calcAddressId(mockAdapter, testAddress);

      // Assert
      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        contract: expect.any(String),
        functionName: 'calcAccountId',
        args: [testAddress],
      });

      expect(decodeFunctionResult).toHaveBeenCalledWith({
        abi: expect.any(Array),
        functionName: 'calcAccountId',
        data: mockEncodedResult,
      });
    });

    it('should use addressDriverAbi for both buildTx and decodeFunctionResult', async () => {
      // Act
      await calcAddressId(mockAdapter, testAddress);

      // Assert
      const buildTxCall = vi.mocked(buildTx).mock.calls[0][0];
      const decodeCall = vi.mocked(decodeFunctionResult).mock.calls[0][0];

      expect(buildTxCall.abi).toBeDefined();
      expect(decodeCall.abi).toBeDefined();
      expect(buildTxCall.abi).toEqual(decodeCall.abi);
    });
  });

  describe('integration scenarios', () => {
    it('should handle real-world addresses', async () => {
      const realWorldAddresses: Address[] = [
        '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', // vitalik.eth
        '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD', // uniswap
        '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', // uniswap router
        '0xA0b86a33E6441b8C4c7C4b1C3C4C4C4C4C4C4C4C', // random address
        '0x1111111254fb6c44bAC0beD2854e76F90643097d', // 1inch
      ];

      for (const address of realWorldAddresses) {
        await calcAddressId(mockAdapter, address);

        expect(buildTx).toHaveBeenCalledWith(
          expect.objectContaining({
            args: [address],
          }),
        );
      }
    });

    it('should work across different supported chains with same address', async () => {
      const supportedChains = [
        1, 80002, 11155420, 11155111, 31337, 84532, 314, 1088, 10,
      ];
      const testAddr: Address = '0x1234567890123456789012345678901234567890';

      for (const chainId of supportedChains) {
        vi.mocked(mockAdapter.getChainId).mockResolvedValue(chainId);

        await calcAddressId(mockAdapter, testAddr);

        expect(requireSupportedChain).toHaveBeenCalledWith(chainId);
        expect(buildTx).toHaveBeenCalledWith(
          expect.objectContaining({
            args: [testAddr],
          }),
        );
      }
    });

    it('should handle concurrent calls with different addresses', async () => {
      // Arrange
      const addresses: Address[] = [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
        '0x3333333333333333333333333333333333333333',
      ];
      const expectedIds = [111n, 222n, 333n];

      vi.mocked(decodeFunctionResult)
        .mockReturnValueOnce(expectedIds[0])
        .mockReturnValueOnce(expectedIds[1])
        .mockReturnValueOnce(expectedIds[2]);

      // Act
      const results = await Promise.all(
        addresses.map(address => calcAddressId(mockAdapter, address)),
      );

      // Assert
      expect(results).toEqual(expectedIds);
      expect(buildTx).toHaveBeenCalledTimes(3);
      addresses.forEach((address, index) => {
        expect(buildTx).toHaveBeenNthCalledWith(
          index + 1,
          expect.objectContaining({
            args: [address],
          }),
        );
      });
    });
  });

  describe('performance and reliability', () => {
    it('should handle multiple sequential calls efficiently', async () => {
      // Arrange
      const addresses = Array.from(
        {length: 10},
        (_, i) => `0x${i.toString().padStart(40, '0')}` as Address,
      );

      // Act
      const startTime = performance.now();
      const results = [];
      for (const address of addresses) {
        results.push(await calcAddressId(mockAdapter, address));
      }
      const endTime = performance.now();

      // Assert
      expect(results).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(100); // Should be fast with mocks
      expect(buildTx).toHaveBeenCalledTimes(10);
    });

    it('should handle mixed success and failure scenarios', async () => {
      // Arrange
      const successAddress: Address =
        '0x1111111111111111111111111111111111111111';
      const failureAddress: Address =
        '0x2222222222222222222222222222222222222222';

      vi.mocked(mockAdapter.call)
        .mockResolvedValueOnce(mockEncodedResult)
        .mockRejectedValueOnce(new Error('Call failed'));

      // Act
      const successPromise = calcAddressId(mockAdapter, successAddress);
      const failurePromise = calcAddressId(mockAdapter, failureAddress);

      // Assert
      await expect(successPromise).resolves.toBe(mockAccountId);
      await expect(failurePromise).rejects.toThrow('Call failed');
    });

    it('should not have side effects between calls', async () => {
      // Arrange
      const address1: Address = '0x1111111111111111111111111111111111111111';
      const address2: Address = '0x2222222222222222222222222222222222222222';

      // Act
      await calcAddressId(mockAdapter, address1);
      await calcAddressId(mockAdapter, address2);

      // Assert
      expect(buildTx).toHaveBeenCalledTimes(2);
      expect(buildTx).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({args: [address1]}),
      );
      expect(buildTx).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({args: [address2]}),
      );
    });
  });

  describe('immutability', () => {
    it('should not modify input parameters', async () => {
      // Arrange
      const originalAddress = testAddress;
      const originalAdapter = {...mockAdapter};

      // Act
      await calcAddressId(mockAdapter, testAddress);

      // Assert
      expect(testAddress).toBe(originalAddress);
      expect(mockAdapter).toEqual(originalAdapter);
    });

    it('should return consistent results for same inputs', async () => {
      // Act
      const result1 = await calcAddressId(mockAdapter, testAddress);
      const result2 = await calcAddressId(mockAdapter, testAddress);

      // Assert
      expect(result1).toBe(result2);
      expect(result1).toBe(mockAccountId);
    });
  });
});
