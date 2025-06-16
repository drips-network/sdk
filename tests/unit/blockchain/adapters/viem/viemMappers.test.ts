import {describe, it, expect, vi} from 'vitest';
import {
  mapToViemCallParameters,
  mapFromViemResponse,
} from '../../../../../src/internal/blockchain/adapters/viem/viemMappers';
import {PreparedTx} from '../../../../../src/internal/blockchain/BlockchainAdapter';
import {PublicClient, Hash, TransactionReceipt as ViemTxReceipt} from 'viem';
import {DripsError} from '../../../../../src/internal/shared/DripsError';

describe('viemMappers', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as const;
  const mockHash =
    '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as Hash;

  const createBasePreparedTx = (): PreparedTx => ({
    to: mockAddress,
    data: '0x',
  });

  describe('mapToViemCallParameters', () => {
    it('should map basic PreparedTx to CallParameters', () => {
      // Arrange
      const tx: PreparedTx = {
        ...createBasePreparedTx(),
        value: BigInt(1000),
        gasLimit: BigInt(21000),
        nonce: 42,
      };

      // Act
      const result = mapToViemCallParameters(tx);

      // Assert
      expect(result).toEqual({
        to: mockAddress,
        data: '0x',
        value: BigInt(1000),
        gas: BigInt(21000),
        nonce: 42,
      });
    });

    it('should handle EIP-1559 gas parameters', () => {
      // Arrange
      const tx: PreparedTx = {
        ...createBasePreparedTx(),
        maxFeePerGas: BigInt(20000000000),
        maxPriorityFeePerGas: BigInt(1000000000),
        gasLimit: BigInt(21000),
      };

      // Act
      const result = mapToViemCallParameters(tx);

      // Assert
      expect(result).toEqual({
        to: mockAddress,
        data: '0x',
        value: undefined,
        gas: BigInt(21000),
        nonce: undefined,
        maxFeePerGas: BigInt(20000000000),
        maxPriorityFeePerGas: BigInt(1000000000),
      });
      expect(result).not.toHaveProperty('gasPrice');
    });

    it('should handle legacy gas price', () => {
      // Arrange
      const tx: PreparedTx = {
        ...createBasePreparedTx(),
        gasPrice: BigInt(20000000000),
        gasLimit: BigInt(21000),
      };

      // Act
      const result = mapToViemCallParameters(tx);

      // Assert
      expect(result).toEqual({
        to: mockAddress,
        data: '0x',
        value: undefined,
        gas: BigInt(21000),
        nonce: undefined,
        gasPrice: BigInt(20000000000),
      });
      expect(result).not.toHaveProperty('maxFeePerGas');
      expect(result).not.toHaveProperty('maxPriorityFeePerGas');
    });

    it('should throw error when both EIP-1559 and legacy gas parameters are provided', () => {
      // Arrange
      const tx: PreparedTx = {
        ...createBasePreparedTx(),
        gasPrice: BigInt(20000000000),
        maxFeePerGas: BigInt(25000000000),
        maxPriorityFeePerGas: BigInt(1000000000),
      };

      // Act & Assert
      expect(() => mapToViemCallParameters(tx)).toThrow(DripsError);
      expect(() => mapToViemCallParameters(tx)).toThrow(
        'Cannot specify both EIP-1559 and legacy gas parameters.',
      );
    });

    it('should handle undefined optional fields', () => {
      // Arrange
      const tx: PreparedTx = {
        to: mockAddress,
        data: '0x',
        // All optional fields undefined
      };

      // Act
      const result = mapToViemCallParameters(tx);

      // Assert
      expect(result).toEqual({
        to: mockAddress,
        data: '0x',
        value: undefined,
        gas: undefined,
        nonce: undefined,
      });
    });

    it('should handle partial EIP-1559 parameters', () => {
      // Arrange
      const tx: PreparedTx = {
        ...createBasePreparedTx(),
        maxFeePerGas: BigInt(20000000000),
        // maxPriorityFeePerGas undefined
      };

      // Act
      const result = mapToViemCallParameters(tx);

      // Assert
      expect(result).toEqual({
        to: mockAddress,
        data: '0x',
        value: undefined,
        gas: undefined,
        nonce: undefined,
        maxFeePerGas: BigInt(20000000000),
        maxPriorityFeePerGas: undefined,
      });
    });
  });

  describe('mapFromViemResponse', () => {
    const createMockPublicClient = (): PublicClient => {
      const mockClient = {
        waitForTransactionReceipt: vi.fn(),
      } as unknown as PublicClient;
      return mockClient;
    };

    const createMockViemReceipt = (): ViemTxReceipt => ({
      status: 'success' as const,
      gasUsed: BigInt(21000),
      transactionHash: mockHash,
      blockNumber: BigInt(12345),
      logs: [],
      from: mockAddress,
      to: mockAddress,
      blockHash: '0xblockhash' as Hash,
      transactionIndex: 0,
      cumulativeGasUsed: BigInt(21000),
      effectiveGasPrice: BigInt(20000000000),
      type: 'eip1559',
      contractAddress: null,
      logsBloom: '0x' as Hash,
    });

    it('should create TxResponse with hash and wait function', () => {
      // Arrange
      const publicClient = createMockPublicClient();

      // Act
      const result = mapFromViemResponse(mockHash, publicClient);

      // Assert
      expect(result).toHaveProperty('hash', mockHash);
      expect(result).toHaveProperty('wait');
      expect(typeof result.wait).toBe('function');
    });

    it('should wait function calls publicClient.waitForTransactionReceipt', async () => {
      // Arrange
      const publicClient = createMockPublicClient();
      const mockReceipt = createMockViemReceipt();
      vi.mocked(publicClient.waitForTransactionReceipt).mockResolvedValue(
        mockReceipt,
      );

      const txResponse = mapFromViemResponse(mockHash, publicClient);

      // Act
      await txResponse.wait(2);

      // Assert
      expect(publicClient.waitForTransactionReceipt).toHaveBeenCalledWith({
        hash: mockHash,
        confirmations: 2,
      });
    });

    it('should wait function uses default confirmations when not provided', async () => {
      // Arrange
      const publicClient = createMockPublicClient();
      const mockReceipt = createMockViemReceipt();
      vi.mocked(publicClient.waitForTransactionReceipt).mockResolvedValue(
        mockReceipt,
      );

      const txResponse = mapFromViemResponse(mockHash, publicClient);

      // Act
      await txResponse.wait();

      // Assert
      expect(publicClient.waitForTransactionReceipt).toHaveBeenCalledWith({
        hash: mockHash,
        confirmations: 1,
      });
    });

    it('should wait function maps viem receipt to TxReceipt', async () => {
      // Arrange
      const publicClient = createMockPublicClient();
      const mockReceipt = createMockViemReceipt();
      vi.mocked(publicClient.waitForTransactionReceipt).mockResolvedValue(
        mockReceipt,
      );

      const txResponse = mapFromViemResponse(mockHash, publicClient);

      // Act
      const result = await txResponse.wait();

      // Assert
      expect(result).toEqual({
        from: mockAddress,
        logs: [],
        gasUsed: BigInt(21000),
        blockNumber: BigInt(12345),
        to: mockAddress,
        hash: mockHash,
        status: 'success',
      });
    });

    it('should handle null to field in viem receipt', async () => {
      // Arrange
      const publicClient = createMockPublicClient();
      const mockReceipt = {
        ...createMockViemReceipt(),
        to: null,
      };
      vi.mocked(publicClient.waitForTransactionReceipt).mockResolvedValue(
        mockReceipt,
      );

      const txResponse = mapFromViemResponse(mockHash, publicClient);

      // Act
      const result = await txResponse.wait();

      // Assert
      expect(result.to).toBeUndefined();
    });

    it('should handle reverted transaction status', async () => {
      // Arrange
      const publicClient = createMockPublicClient();
      const mockReceipt = {
        ...createMockViemReceipt(),
        status: 'reverted' as const,
      };
      vi.mocked(publicClient.waitForTransactionReceipt).mockResolvedValue(
        mockReceipt,
      );

      const txResponse = mapFromViemResponse(mockHash, publicClient);

      // Act
      const result = await txResponse.wait();

      // Assert
      expect(result.status).toBe('reverted');
    });
  });
});
