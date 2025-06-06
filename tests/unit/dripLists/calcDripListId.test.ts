import {describe, it, expect, vi, beforeEach} from 'vitest';
import {calcDripListId} from '../../../src/internal/drip-lists/calcDripListId';
import {DripsError} from '../../../src/sdk/DripsError';
import type {ReadBlockchainAdapter} from '../../../src/internal/blockchain/BlockchainAdapter';

// Only mock what cannot be injected
vi.mock('../../../src/internal/utils/assertions', () => ({
  requireSupportedChain: vi.fn(),
  requireMatchingChains: vi.fn(),
}));

// Mock viem's decodeFunctionResult since it's a pure utility function
vi.mock('viem', async () => {
  const actual = await vi.importActual('viem');
  return {
    ...actual,
    decodeFunctionResult: vi.fn(),
  };
});

// Mock buildTx utility - this could potentially be injected in the future
vi.mock('../../../src/internal/utils/buildTx', () => ({
  buildTx: vi.fn(),
}));

import {requireSupportedChain} from '../../../src/internal/utils/assertions';
import {decodeFunctionResult} from 'viem';
import {buildTx} from '../../../src/internal/utils/buildTx';

describe('calcDripListId', () => {
  const mockAdapter: ReadBlockchainAdapter = {
    call: vi.fn(),
    getChainId: vi.fn(),
  };

  const validParams = {
    salt: 789n,
    minter: '0x1234567890123456789012345678901234567890' as const,
  };

  const mockTxData = {
    to: '0xdC773a04C0D6EFdb80E7dfF961B6a7B063a28B44' as const,
    data: '0xcalctokendata' as const,
  };

  const mockEncodedResult = '0xencodedresult' as const;
  const mockDripListId = 999n;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to default successful behavior
    vi.mocked(mockAdapter.getChainId).mockResolvedValue(11155111);
    vi.mocked(requireSupportedChain).mockImplementation(() => {});
    vi.mocked(buildTx).mockReturnValue(mockTxData);
    vi.mocked(mockAdapter.call).mockResolvedValue(mockEncodedResult);
    vi.mocked(decodeFunctionResult).mockReturnValue(mockDripListId);
  });

  describe('successful execution', () => {
    it('should calculate drip list ID successfully', async () => {
      // Act - Inject the adapter dependency
      const result = await calcDripListId(mockAdapter, validParams);

      // Assert
      expect(mockAdapter.getChainId).toHaveBeenCalled();
      expect(requireSupportedChain).toHaveBeenCalledWith(11155111);
      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array), // nftDriverAbi
        contract: '0xdC773a04C0D6EFdb80E7dfF961B6a7B063a28B44',
        functionName: 'calcTokenIdWithSalt',
        args: [validParams.minter, validParams.salt],
      });
      expect(mockAdapter.call).toHaveBeenCalledWith(mockTxData);
      expect(decodeFunctionResult).toHaveBeenCalledWith({
        abi: expect.any(Array), // nftDriverAbi
        functionName: 'calcTokenIdWithSalt',
        data: mockEncodedResult,
      });
      expect(result).toBe(mockDripListId);
    });

    it('should work with different adapters', async () => {
      // Arrange
      const customAdapter: ReadBlockchainAdapter = {
        call: vi.fn().mockResolvedValue(mockEncodedResult),
        getChainId: vi.fn().mockResolvedValue(11155111),
      };

      // Act
      const result = await calcDripListId(customAdapter, validParams);

      // Assert
      expect(customAdapter.getChainId).toHaveBeenCalled();
      expect(customAdapter.call).toHaveBeenCalledWith(mockTxData);
      expect(mockAdapter.call).not.toHaveBeenCalled();
      expect(result).toBe(mockDripListId);
    });

    it('should work with different supported chains', async () => {
      // Arrange - Mock adapter to return localhost chain ID
      vi.mocked(mockAdapter.getChainId).mockResolvedValue(31337);
      const localhostTxData = {
        to: '0xf98e07d281Ff9b83612DBeF0A067d710716720eA' as const,
        data: '0xcalctokendata' as const,
      };
      vi.mocked(buildTx).mockReturnValue(localhostTxData);

      // Act
      await calcDripListId(mockAdapter, validParams);

      // Assert
      expect(mockAdapter.getChainId).toHaveBeenCalled();
      expect(requireSupportedChain).toHaveBeenCalledWith(31337);
      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        contract: '0xf98e07d281Ff9b83612DBeF0A067d710716720eA', // localhost contract
        functionName: 'calcTokenIdWithSalt',
        args: [validParams.minter, validParams.salt],
      });
    });

    it('should handle different minter addresses', async () => {
      // Arrange
      const customParams = {
        ...validParams,
        minter: '0x9876543210987654321098765432109876543210' as const,
      };

      // Act
      await calcDripListId(mockAdapter, customParams);

      // Assert
      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        contract: '0xdC773a04C0D6EFdb80E7dfF961B6a7B063a28B44',
        functionName: 'calcTokenIdWithSalt',
        args: [customParams.minter, customParams.salt],
      });
    });

    it('should handle different salt values', async () => {
      // Arrange
      const customParams = {
        ...validParams,
        salt: 12345n,
      };

      // Act
      await calcDripListId(mockAdapter, customParams);

      // Assert
      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        contract: '0xdC773a04C0D6EFdb80E7dfF961B6a7B063a28B44',
        functionName: 'calcTokenIdWithSalt',
        args: [customParams.minter, customParams.salt],
      });
    });

    it('should return different drip list IDs', async () => {
      // Arrange
      const customDripListId = 12345n;
      vi.mocked(decodeFunctionResult).mockReturnValue(customDripListId);

      // Act
      const result = await calcDripListId(mockAdapter, validParams);

      // Assert
      expect(result).toBe(customDripListId);
    });
  });

  describe('error handling', () => {
    it('should propagate getChainId errors', async () => {
      // Arrange
      const chainIdError = new Error('Failed to get chain ID');
      vi.mocked(mockAdapter.getChainId).mockRejectedValue(chainIdError);

      // Act & Assert
      await expect(calcDripListId(mockAdapter, validParams)).rejects.toThrow(
        chainIdError,
      );
      expect(requireSupportedChain).not.toHaveBeenCalled();
      expect(buildTx).not.toHaveBeenCalled();
      expect(mockAdapter.call).not.toHaveBeenCalled();
    });

    it('should propagate chain validation errors', async () => {
      // Arrange
      const chainError = new DripsError('Unsupported chain ID: 999');
      vi.mocked(requireSupportedChain).mockImplementation(() => {
        throw chainError;
      });

      // Act & Assert
      await expect(calcDripListId(mockAdapter, validParams)).rejects.toThrow(
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
      await expect(calcDripListId(mockAdapter, validParams)).rejects.toThrow(
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
      await expect(calcDripListId(mockAdapter, validParams)).rejects.toThrow(
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
      await expect(calcDripListId(mockAdapter, validParams)).rejects.toThrow(
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
      await expect(calcDripListId(mockAdapter, validParams)).rejects.toThrow(
        networkError,
      );
    });
  });

  describe('edge cases', () => {
    it('should handle zero salt', async () => {
      // Arrange
      const zeroSaltParams = {
        ...validParams,
        salt: 0n,
      };

      // Act
      await calcDripListId(mockAdapter, zeroSaltParams);

      // Assert
      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        contract: '0xdC773a04C0D6EFdb80E7dfF961B6a7B063a28B44',
        functionName: 'calcTokenIdWithSalt',
        args: [zeroSaltParams.minter, 0n],
      });
    });

    it('should handle very large salt values', async () => {
      // Arrange
      const largeSalt = BigInt(
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      );
      const largeSaltParams = {
        ...validParams,
        salt: largeSalt,
      };

      // Act
      await calcDripListId(mockAdapter, largeSaltParams);

      // Assert
      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        contract: '0xdC773a04C0D6EFdb80E7dfF961B6a7B063a28B44',
        functionName: 'calcTokenIdWithSalt',
        args: [largeSaltParams.minter, largeSalt],
      });
    });

    it('should handle zero address minter', async () => {
      // Arrange
      const zeroAddressParams = {
        ...validParams,
        minter: '0x0000000000000000000000000000000000000000' as const,
      };

      // Act
      await calcDripListId(mockAdapter, zeroAddressParams);

      // Assert
      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        contract: '0xdC773a04C0D6EFdb80E7dfF961B6a7B063a28B44',
        functionName: 'calcTokenIdWithSalt',
        args: [zeroAddressParams.minter, zeroAddressParams.salt],
      });
    });

    it('should handle zero drip list ID result', async () => {
      // Arrange
      vi.mocked(decodeFunctionResult).mockReturnValue(0n);

      // Act
      const result = await calcDripListId(mockAdapter, validParams);

      // Assert
      expect(result).toBe(0n);
    });

    it('should handle very large drip list ID result', async () => {
      // Arrange
      const largeDripListId = BigInt(
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      );
      vi.mocked(decodeFunctionResult).mockReturnValue(largeDripListId);

      // Act
      const result = await calcDripListId(mockAdapter, validParams);

      // Assert
      expect(result).toBe(largeDripListId);
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
        return mockDripListId;
      });

      // Act
      await calcDripListId(mockAdapter, validParams);

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
      await expect(calcDripListId(mockAdapter, validParams)).rejects.toThrow(
        'Chain validation failed',
      );
      expect(buildTx).not.toHaveBeenCalled();
      expect(mockAdapter.call).not.toHaveBeenCalled();
      expect(decodeFunctionResult).not.toHaveBeenCalled();
    });
  });

  describe('parameter validation', () => {
    it('should use correct contract address for each chain', async () => {
      // Test Sepolia
      vi.mocked(mockAdapter.getChainId).mockResolvedValue(11155111);
      await calcDripListId(mockAdapter, {...validParams});
      expect(buildTx).toHaveBeenLastCalledWith(
        expect.objectContaining({
          contract: '0xdC773a04C0D6EFdb80E7dfF961B6a7B063a28B44',
        }),
      );

      // Test Localhost
      vi.mocked(mockAdapter.getChainId).mockResolvedValue(31337);
      const localhostTxData = {
        to: '0xf98e07d281Ff9b83612DBeF0A067d710716720eA' as const,
        data: '0xcalctokendata' as const,
      };
      vi.mocked(buildTx).mockReturnValue(localhostTxData);
      await calcDripListId(mockAdapter, {...validParams});
      expect(buildTx).toHaveBeenLastCalledWith(
        expect.objectContaining({
          contract: '0xf98e07d281Ff9b83612DBeF0A067d710716720eA',
        }),
      );
    });

    it('should pass correct function name and arguments', async () => {
      // Act
      await calcDripListId(mockAdapter, validParams);

      // Assert
      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        contract: expect.any(String),
        functionName: 'calcTokenIdWithSalt',
        args: [validParams.minter, validParams.salt],
      });

      expect(decodeFunctionResult).toHaveBeenCalledWith({
        abi: expect.any(Array),
        functionName: 'calcTokenIdWithSalt',
        data: mockEncodedResult,
      });
    });
  });
});
