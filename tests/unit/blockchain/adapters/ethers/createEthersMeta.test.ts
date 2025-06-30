import {describe, it, expect} from 'vitest';
import {createEthersMeta} from '../../../../../src/internal/blockchain/adapters/ethers/createEthersMeta';
import {PreparedTx} from '../../../../../src/internal/blockchain/BlockchainAdapter';
import type {Provider, Signer} from 'ethers';

describe('createEthersMeta', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as const;
  const mockAccount = '0xabcdef1234567890abcdef1234567890abcdef12';

  const createBasePreparedTx = (): PreparedTx => ({
    to: mockAddress,
    data: '0x123456',
    abiFunctionName: 'testFunction',
  });

  const createMockProvider = (): Provider => ({}) as Provider;

  const createMockSigner = (): Signer => ({}) as Signer;

  it('should create basic meta with required fields', () => {
    // Arrange
    const tx: PreparedTx = {
      to: mockAddress,
      data: '0x123456',
      // No abiFunctionName
    };
    const provider = createMockProvider();
    const operationFallback = 'test-operation';

    // Act
    const result = createEthersMeta(tx, {
      provider,
      operationFallback,
    });

    // Assert
    expect(result).toEqual({
      to: mockAddress,
      funcName: undefined,
      account: undefined,
      chainId: undefined,
      operation: operationFallback,
      gas: {
        gasLimit: undefined,
        gasPrice: undefined,
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined,
      },
    });
  });

  it('should include ABI function name when provided', () => {
    // Arrange
    const tx: PreparedTx = {
      ...createBasePreparedTx(),
      abiFunctionName: 'transfer',
    };
    const provider = createMockProvider();

    // Act
    const result = createEthersMeta(tx, {
      provider,
      operationFallback: 'fallback',
    });

    // Assert
    expect(result.funcName).toBe('transfer');
    expect(result.operation).toBe('transfer');
  });

  it('should use operation fallback when no ABI function name', () => {
    // Arrange
    const tx: PreparedTx = {
      to: mockAddress,
      data: '0x123456',
      // No abiFunctionName
    };
    const provider = createMockProvider();
    const operationFallback = 'custom-operation';

    // Act
    const result = createEthersMeta(tx, {
      provider,
      operationFallback,
    });

    // Assert
    expect(result.funcName).toBeUndefined();
    expect(result.operation).toBe(operationFallback);
  });

  it('should include account when provided', () => {
    // Arrange
    const tx = createBasePreparedTx();
    const signer = createMockSigner();

    // Act
    const result = createEthersMeta(tx, {
      provider: signer,
      account: mockAccount,
      operationFallback: 'test',
    });

    // Assert
    expect(result.account).toBe(mockAccount);
  });

  it('should include chainId when provided', () => {
    // Arrange
    const tx = createBasePreparedTx();
    const provider = createMockProvider();
    const chainId = 1;

    // Act
    const result = createEthersMeta(tx, {
      provider,
      chainId,
      operationFallback: 'test',
    });

    // Assert
    expect(result.chainId).toBe(chainId);
  });

  it('should include gas parameters when provided', () => {
    // Arrange
    const tx: PreparedTx = {
      ...createBasePreparedTx(),
      gasLimit: BigInt(21000),
      gasPrice: BigInt(20000000000),
      maxFeePerGas: BigInt(30000000000),
      maxPriorityFeePerGas: BigInt(2000000000),
    };
    const provider = createMockProvider();

    // Act
    const result = createEthersMeta(tx, {
      provider,
      operationFallback: 'test',
    });

    // Assert
    expect(result.gas).toEqual({
      gasLimit: BigInt(21000),
      gasPrice: BigInt(20000000000),
      maxFeePerGas: BigInt(30000000000),
      maxPriorityFeePerGas: BigInt(2000000000),
    });
  });

  it('should handle partial gas parameters', () => {
    // Arrange
    const tx: PreparedTx = {
      ...createBasePreparedTx(),
      gasLimit: BigInt(21000),
      maxFeePerGas: BigInt(30000000000),
    };
    const provider = createMockProvider();

    // Act
    const result = createEthersMeta(tx, {
      provider,
      operationFallback: 'test',
    });

    // Assert
    expect(result.gas).toEqual({
      gasLimit: BigInt(21000),
      gasPrice: undefined,
      maxFeePerGas: BigInt(30000000000),
      maxPriorityFeePerGas: undefined,
    });
  });
});
