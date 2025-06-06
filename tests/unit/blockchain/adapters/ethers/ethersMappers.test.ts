import {describe, it, expect, vi} from 'vitest';
import {
  mapToEthersTransactionRequest,
  mapFromEthersResponse,
} from '../../../../../src/internal/blockchain/adapters/ethers/ethersMappers';
import {PreparedTx} from '../../../../../src/internal/blockchain/BlockchainAdapter';
import {DripsError} from '../../../../../src/sdk/DripsError';
import type {TransactionResponse, TransactionReceipt} from 'ethers';
import {Hex} from 'viem';

describe('ethersMappers', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as const;
  const mockData = '0x123456' as Hex;
  const mockHash =
    '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as Hex;

  const createBasePreparedTx = (): PreparedTx => ({
    to: mockAddress,
    data: mockData,
  });

  describe('mapToEthersTransactionRequest', () => {
    it('should map basic transaction parameters', () => {
      // Arrange
      const tx: PreparedTx = {
        ...createBasePreparedTx(),
        value: BigInt(1000),
        gasLimit: BigInt(21000),
        nonce: 42,
      };

      // Act
      const result = mapToEthersTransactionRequest(tx);

      // Assert
      expect(result).toEqual({
        to: mockAddress,
        data: mockData,
        value: BigInt(1000),
        gasLimit: BigInt(21000),
        nonce: 42,
      });
    });

    it('should handle undefined optional parameters', () => {
      // Arrange
      const tx = createBasePreparedTx();

      // Act
      const result = mapToEthersTransactionRequest(tx);

      // Assert
      expect(result).toEqual({
        to: mockAddress,
        data: mockData,
        value: undefined,
        gasLimit: undefined,
        nonce: undefined,
      });
    });

    it('should map EIP-1559 gas parameters', () => {
      // Arrange
      const tx: PreparedTx = {
        ...createBasePreparedTx(),
        maxFeePerGas: BigInt(30000000000),
        maxPriorityFeePerGas: BigInt(2000000000),
      };

      // Act
      const result = mapToEthersTransactionRequest(tx);

      // Assert
      expect(result).toEqual({
        to: mockAddress,
        data: mockData,
        value: undefined,
        gasLimit: undefined,
        nonce: undefined,
        maxFeePerGas: BigInt(30000000000),
        maxPriorityFeePerGas: BigInt(2000000000),
      });
    });

    it('should map legacy gas price', () => {
      // Arrange
      const tx: PreparedTx = {
        ...createBasePreparedTx(),
        gasPrice: BigInt(20000000000),
      };

      // Act
      const result = mapToEthersTransactionRequest(tx);

      // Assert
      expect(result).toEqual({
        to: mockAddress,
        data: mockData,
        value: undefined,
        gasLimit: undefined,
        nonce: undefined,
        gasPrice: BigInt(20000000000),
      });
    });

    it('should throw error when both EIP-1559 and legacy gas parameters are provided', () => {
      // Arrange
      const tx: PreparedTx = {
        ...createBasePreparedTx(),
        gasPrice: BigInt(20000000000),
        maxFeePerGas: BigInt(30000000000),
      };

      // Act & Assert
      expect(() => mapToEthersTransactionRequest(tx)).toThrow(DripsError);
      expect(() => mapToEthersTransactionRequest(tx)).toThrow(
        'Cannot specify both EIP-1559 and legacy gas parameters.',
      );
    });

    it('should throw error when gasPrice and maxPriorityFeePerGas are both provided', () => {
      // Arrange
      const tx: PreparedTx = {
        ...createBasePreparedTx(),
        gasPrice: BigInt(20000000000),
        maxPriorityFeePerGas: BigInt(2000000000),
      };

      // Act & Assert
      expect(() => mapToEthersTransactionRequest(tx)).toThrow(DripsError);
    });

    it('should handle partial EIP-1559 parameters', () => {
      // Arrange
      const tx: PreparedTx = {
        ...createBasePreparedTx(),
        maxFeePerGas: BigInt(30000000000),
      };

      // Act
      const result = mapToEthersTransactionRequest(tx);

      // Assert
      expect(result).toEqual({
        to: mockAddress,
        data: mockData,
        value: undefined,
        gasLimit: undefined,
        nonce: undefined,
        maxFeePerGas: BigInt(30000000000),
        maxPriorityFeePerGas: undefined,
      });
    });
  });

  describe('mapFromEthersResponse', () => {
    const createMockTransactionResponse = (): TransactionResponse =>
      ({
        hash: mockHash,
        wait: vi.fn(),
      }) as unknown as TransactionResponse;

    const createMockTransactionReceipt = (): TransactionReceipt =>
      ({
        status: 1,
        gasUsed: BigInt(21000),
        hash: mockHash,
        blockNumber: 12345,
        logs: [],
        from: mockAddress,
        to: mockAddress,
      }) as unknown as TransactionReceipt;

    it('should map transaction response with hash', () => {
      // Arrange
      const ethersResponse = createMockTransactionResponse();

      // Act
      const result = mapFromEthersResponse(ethersResponse);

      // Assert
      expect(result.hash).toBe(mockHash);
      expect(typeof result.wait).toBe('function');
    });

    it('should map transaction receipt on wait', async () => {
      // Arrange
      const mockReceipt = createMockTransactionReceipt();
      const ethersResponse = createMockTransactionResponse();
      vi.mocked(ethersResponse.wait).mockResolvedValue(mockReceipt);

      const txResponse = mapFromEthersResponse(ethersResponse);

      // Act
      const receipt = await txResponse.wait();

      // Assert
      expect(ethersResponse.wait).toHaveBeenCalledWith(1);
      expect(receipt).toEqual({
        from: mockAddress,
        logs: [],
        gasUsed: BigInt(21000),
        blockNumber: BigInt(12345),
        to: mockAddress,
        hash: mockHash,
        status: 'success',
      });
    });

    it('should map transaction receipt with custom confirmations', async () => {
      // Arrange
      const mockReceipt = createMockTransactionReceipt();
      const ethersResponse = createMockTransactionResponse();
      vi.mocked(ethersResponse.wait).mockResolvedValue(mockReceipt);

      const txResponse = mapFromEthersResponse(ethersResponse);

      // Act
      await txResponse.wait(3);

      // Assert
      expect(ethersResponse.wait).toHaveBeenCalledWith(3);
    });

    it('should map reverted transaction status', async () => {
      // Arrange
      const mockReceipt = {
        ...createMockTransactionReceipt(),
        status: 0,
      } as TransactionReceipt;
      const ethersResponse = createMockTransactionResponse();
      vi.mocked(ethersResponse.wait).mockResolvedValue(mockReceipt);

      const txResponse = mapFromEthersResponse(ethersResponse);

      // Act
      const receipt = await txResponse.wait();

      // Assert
      expect(receipt.status).toBe('reverted');
    });

    it('should handle null to address', async () => {
      // Arrange
      const mockReceipt = {
        ...createMockTransactionReceipt(),
        to: null,
      } as TransactionReceipt;
      const ethersResponse = createMockTransactionResponse();
      vi.mocked(ethersResponse.wait).mockResolvedValue(mockReceipt);

      const txResponse = mapFromEthersResponse(ethersResponse);

      // Act
      const receipt = await txResponse.wait();

      // Assert
      expect(receipt.to).toBeUndefined();
    });

    it('should throw error when receipt is null', async () => {
      // Arrange
      const ethersResponse = createMockTransactionResponse();
      vi.mocked(ethersResponse.wait).mockResolvedValue(null);

      const txResponse = mapFromEthersResponse(ethersResponse);

      // Act & Assert
      await expect(txResponse.wait()).rejects.toThrow(DripsError);
      await expect(txResponse.wait()).rejects.toThrow(
        'Transaction receipt not found',
      );
    });
  });
});
