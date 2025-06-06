import {describe, it, expect} from 'vitest';
import {createViemMeta} from '../../../../../src/internal/blockchain/adapters/viem/createViemMeta';
import {PreparedTx} from '../../../../../src/internal/blockchain/BlockchainAdapter';
import {PublicClient, WalletClient, Account} from 'viem';

describe('createViemMeta', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as const;
  const mockChainId = 1;

  const createMockPublicClient = (chainId?: number): PublicClient =>
    ({
      chain: chainId ? {id: chainId} : undefined,
    }) as PublicClient;

  const createMockWalletClient = (chainId?: number): WalletClient =>
    ({
      chain: chainId ? {id: chainId} : undefined,
    }) as WalletClient;

  const createMockAccount = (): Account => ({
    address: mockAddress,
    type: 'json-rpc',
  });

  const createBasePreparedTx = (): PreparedTx => ({
    to: mockAddress,
    data: '0x',
  });

  it('should create basic viem meta with required fields', () => {
    // Arrange
    const tx = createBasePreparedTx();
    const client = createMockPublicClient(mockChainId);
    const context = {
      client,
      operationFallback: 'test-operation',
    };

    // Act
    const result = createViemMeta(tx, context);

    // Assert
    expect(result).toEqual({
      to: mockAddress,
      funcName: undefined,
      account: undefined,
      chainId: mockChainId,
      operation: 'test-operation',
      gas: {
        gasLimit: undefined,
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined,
      },
    });
  });

  it('should use abiFunctionName as operation when available', () => {
    // Arrange
    const tx: PreparedTx = {
      ...createBasePreparedTx(),
      abiFunctionName: 'transfer',
    };
    const client = createMockPublicClient(mockChainId);
    const context = {
      client,
      operationFallback: 'fallback-operation',
    };

    // Act
    const result = createViemMeta(tx, context);

    // Assert
    expect(result.operation).toBe('transfer');
    expect(result.funcName).toBe('transfer');
  });

  it('should use operationFallback when abiFunctionName is undefined', () => {
    // Arrange
    const tx = createBasePreparedTx();
    const client = createMockPublicClient(mockChainId);
    const context = {
      client,
      operationFallback: 'fallback-operation',
    };

    // Act
    const result = createViemMeta(tx, context);

    // Assert
    expect(result.operation).toBe('fallback-operation');
    expect(result.funcName).toBeUndefined();
  });

  it('should include account when provided in context', () => {
    // Arrange
    const tx = createBasePreparedTx();
    const client = createMockWalletClient(mockChainId);
    const account = createMockAccount();
    const context = {
      client,
      account,
      operationFallback: 'test-operation',
    };

    // Act
    const result = createViemMeta(tx, context);

    // Assert
    expect(result.account).toBe(account);
  });

  it('should include gas parameters when present in PreparedTx', () => {
    // Arrange
    const tx: PreparedTx = {
      ...createBasePreparedTx(),
      gasLimit: BigInt(21000),
      maxFeePerGas: BigInt(20000000000),
      maxPriorityFeePerGas: BigInt(1000000000),
    };
    const client = createMockPublicClient(mockChainId);
    const context = {
      client,
      operationFallback: 'test-operation',
    };

    // Act
    const result = createViemMeta(tx, context);

    // Assert
    expect(result.gas).toEqual({
      gasLimit: BigInt(21000),
      maxFeePerGas: BigInt(20000000000),
      maxPriorityFeePerGas: BigInt(1000000000),
    });
  });

  it('should handle undefined chain ID gracefully', () => {
    // Arrange
    const tx = createBasePreparedTx();
    const client = createMockPublicClient(); // No chain
    const context = {
      client,
      operationFallback: 'test-operation',
    };

    // Act
    const result = createViemMeta(tx, context);

    // Assert
    expect(result.chainId).toBeUndefined();
  });

  it('should handle partial gas parameters', () => {
    // Arrange
    const tx: PreparedTx = {
      ...createBasePreparedTx(),
      gasLimit: BigInt(21000),
      // Only gasLimit, no fee parameters
    };
    const client = createMockPublicClient(mockChainId);
    const context = {
      client,
      operationFallback: 'test-operation',
    };

    // Act
    const result = createViemMeta(tx, context);

    // Assert
    expect(result.gas).toEqual({
      gasLimit: BigInt(21000),
      maxFeePerGas: undefined,
      maxPriorityFeePerGas: undefined,
    });
  });
});
