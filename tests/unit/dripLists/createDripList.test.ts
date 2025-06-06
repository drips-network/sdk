import {describe, it, expect, vi, beforeEach} from 'vitest';
import {createDripList} from '../../../src/internal/drip-lists/createDripList';
import {DripsError} from '../../../src/sdk/DripsError';
import type {
  WriteBlockchainAdapter,
  TxResponse,
} from '../../../src/internal/blockchain/BlockchainAdapter';
import type {
  IpfsUploaderFn,
  Metadata,
} from '../../../src/internal/metadata/createPinataIpfsUploader';

// Only mock what cannot be injected
vi.mock('../../../src/internal/utils/assertions', () => ({
  requireWriteAccess: vi.fn(),
}));

vi.mock('../../../src/internal/drip-lists/prepareDripListCreationCtx', () => ({
  prepareDripListCreationCtx: vi.fn(),
}));

import {requireWriteAccess} from '../../../src/internal/utils/assertions';
import {prepareDripListCreationCtx} from '../../../src/internal/drip-lists/prepareDripListCreationCtx';

describe('createDripList', () => {
  const mockAdapter: WriteBlockchainAdapter = {
    call: vi.fn(),
    getAddress: vi.fn(),
    sendTx: vi.fn(),
    signMsg: vi.fn(),
    getChainId: vi.fn(),
  };

  const mockIpfsUploader: IpfsUploaderFn<Metadata> = vi.fn();

  const validParams = {
    isVisible: true,
    receivers: [
      {
        type: 'address' as const,
        accountId: '123',
        weight: 500000,
      },
      {
        type: 'address' as const,
        accountId: '456',
        weight: 500000,
      },
    ],
    name: 'Test Drip List',
    description: 'A test drip list',
  };

  const mockCreationContext = {
    salt: 789n,
    ipfsHash: '0xipfshash' as const,
    dripListId: 999n,
    preparedTx: {
      to: '0x1234567890123456789012345678901234567890' as const,
      data: '0xdata' as const,
    },
  };

  const mockTxResponse: TxResponse = {
    hash: '0xtxhash' as const,
    wait: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to default successful behavior
    vi.mocked(requireWriteAccess).mockImplementation(() => {});
    vi.mocked(prepareDripListCreationCtx).mockResolvedValue(
      mockCreationContext,
    );
    vi.mocked(mockAdapter.sendTx).mockResolvedValue(mockTxResponse);
  });

  describe('successful execution', () => {
    it('should create drip list successfully', async () => {
      // Act - Inject all dependencies
      const result = await createDripList(
        mockAdapter,
        mockIpfsUploader,
        validParams,
      );

      // Assert
      expect(requireWriteAccess).toHaveBeenCalledWith(
        mockAdapter,
        'createDripList',
      );
      expect(prepareDripListCreationCtx).toHaveBeenCalledWith(
        mockAdapter,
        mockIpfsUploader,
        validParams,
      );
      expect(mockAdapter.sendTx).toHaveBeenCalledWith(
        mockCreationContext.preparedTx,
      );

      expect(result).toEqual({
        salt: mockCreationContext.salt,
        ipfsHash: mockCreationContext.ipfsHash,
        dripListId: mockCreationContext.dripListId,
        txResponse: mockTxResponse,
      });
    });

    it('should work with different adapters', async () => {
      // Arrange
      const customAdapter: WriteBlockchainAdapter = {
        call: vi.fn(),
        getAddress: vi.fn(),
        sendTx: vi.fn().mockResolvedValue(mockTxResponse),
        signMsg: vi.fn(),
        getChainId: vi.fn(),
      };

      // Act
      const result = await createDripList(
        customAdapter,
        mockIpfsUploader,
        validParams,
      );

      // Assert
      expect(requireWriteAccess).toHaveBeenCalledWith(
        customAdapter,
        'createDripList',
      );
      expect(prepareDripListCreationCtx).toHaveBeenCalledWith(
        customAdapter,
        mockIpfsUploader,
        validParams,
      );
      expect(customAdapter.sendTx).toHaveBeenCalledWith(
        mockCreationContext.preparedTx,
      );
      expect(mockAdapter.sendTx).not.toHaveBeenCalled();
      expect(result.txResponse).toBe(mockTxResponse);
    });

    it('should work with different IPFS uploaders', async () => {
      // Arrange
      const customIpfsUploader: IpfsUploaderFn<Metadata> = vi.fn();

      // Act
      await createDripList(mockAdapter, customIpfsUploader, validParams);

      // Assert
      expect(prepareDripListCreationCtx).toHaveBeenCalledWith(
        mockAdapter,
        customIpfsUploader,
        validParams,
      );
      expect(mockIpfsUploader).not.toHaveBeenCalled();
    });

    it('should handle different creation parameters', async () => {
      // Arrange
      const customParams = {
        isVisible: false,
        receivers: [],
        transferTo: '0x9876543210987654321098765432109876543210' as const,
        salt: 555n,
        name: 'Custom List',
        description: 'Custom description',
        txOverrides: {
          gasLimit: 1000000n,
          value: 100n,
        },
      };

      // Act
      await createDripList(mockAdapter, mockIpfsUploader, customParams);

      // Assert
      expect(prepareDripListCreationCtx).toHaveBeenCalledWith(
        mockAdapter,
        mockIpfsUploader,
        customParams,
      );
    });

    it('should handle minimal parameters', async () => {
      // Arrange
      const minimalParams = {
        isVisible: true,
        receivers: [],
      };

      // Act
      const result = await createDripList(
        mockAdapter,
        mockIpfsUploader,
        minimalParams,
      );

      // Assert
      expect(prepareDripListCreationCtx).toHaveBeenCalledWith(
        mockAdapter,
        mockIpfsUploader,
        minimalParams,
      );
      expect(result).toEqual({
        salt: mockCreationContext.salt,
        ipfsHash: mockCreationContext.ipfsHash,
        dripListId: mockCreationContext.dripListId,
        txResponse: mockTxResponse,
      });
    });

    it('should handle large datasets', async () => {
      // Arrange
      const largeParams = {
        ...validParams,
        receivers: Array.from({length: 100}, (_, i) => ({
          type: 'address' as const,
          accountId: BigInt(i + 1).toString(),
          weight: 10000,
        })),
        name: 'A'.repeat(1000),
        description: 'B'.repeat(5000),
      };

      // Act
      const result = await createDripList(
        mockAdapter,
        mockIpfsUploader,
        largeParams,
      );

      // Assert
      expect(prepareDripListCreationCtx).toHaveBeenCalledWith(
        mockAdapter,
        mockIpfsUploader,
        largeParams,
      );
      expect(result.txResponse).toBe(mockTxResponse);
    });

    it('should preserve all context data in result', async () => {
      // Arrange
      const customContext = {
        salt: 12345n,
        ipfsHash: '0xcustomhash' as const,
        dripListId: 67890n,
        preparedTx: {
          to: '0xabcdef1234567890abcdef1234567890abcdef12' as const,
          data: '0xcustomdata' as const,
        },
      };
      vi.mocked(prepareDripListCreationCtx).mockResolvedValue(customContext);

      // Act
      const result = await createDripList(
        mockAdapter,
        mockIpfsUploader,
        validParams,
      );

      // Assert
      expect(result.salt).toBe(customContext.salt);
      expect(result.ipfsHash).toBe(customContext.ipfsHash);
      expect(result.dripListId).toBe(customContext.dripListId);
      expect(result.txResponse).toBe(mockTxResponse);
    });
  });

  describe('error handling', () => {
    it('should propagate write access validation errors', async () => {
      // Arrange
      const accessError = new DripsError(
        'Operation requires signer permissions',
      );
      vi.mocked(requireWriteAccess).mockImplementation(() => {
        throw accessError;
      });

      // Act & Assert
      await expect(
        createDripList(mockAdapter, mockIpfsUploader, validParams),
      ).rejects.toThrow(accessError);
      expect(prepareDripListCreationCtx).not.toHaveBeenCalled();
      expect(mockAdapter.sendTx).not.toHaveBeenCalled();
    });

    it('should propagate preparation context errors', async () => {
      // Arrange
      const preparationError = new Error('Failed to prepare creation context');
      vi.mocked(prepareDripListCreationCtx).mockRejectedValue(preparationError);

      // Act & Assert
      await expect(
        createDripList(mockAdapter, mockIpfsUploader, validParams),
      ).rejects.toThrow(preparationError);
      expect(requireWriteAccess).toHaveBeenCalled();
      expect(mockAdapter.sendTx).not.toHaveBeenCalled();
    });

    it('should propagate transaction sending errors', async () => {
      // Arrange
      const txError = new Error('Transaction failed');
      vi.mocked(mockAdapter.sendTx).mockRejectedValue(txError);

      // Act & Assert
      await expect(
        createDripList(mockAdapter, mockIpfsUploader, validParams),
      ).rejects.toThrow(txError);
      expect(requireWriteAccess).toHaveBeenCalled();
      expect(prepareDripListCreationCtx).toHaveBeenCalled();
    });

    it('should handle network errors during transaction', async () => {
      // Arrange
      const networkError = new Error('Network connection failed');
      vi.mocked(mockAdapter.sendTx).mockRejectedValue(networkError);

      // Act & Assert
      await expect(
        createDripList(mockAdapter, mockIpfsUploader, validParams),
      ).rejects.toThrow(networkError);
    });

    it('should handle adapter method errors', async () => {
      // Arrange
      const adapterError = new Error('Adapter method not supported');
      const faultyAdapter = {
        ...mockAdapter,
        sendTx: vi.fn().mockRejectedValue(adapterError),
      };

      // Act & Assert
      await expect(
        createDripList(faultyAdapter, mockIpfsUploader, validParams),
      ).rejects.toThrow(adapterError);
    });
  });

  describe('edge cases', () => {
    it('should handle zero values in creation context', async () => {
      // Arrange
      const zeroContext = {
        salt: 0n,
        ipfsHash: '0x' as const,
        dripListId: 0n,
        preparedTx: {
          to: '0x0000000000000000000000000000000000000000' as const,
          data: '0x' as const,
        },
      };
      vi.mocked(prepareDripListCreationCtx).mockResolvedValue(zeroContext);

      // Act
      const result = await createDripList(
        mockAdapter,
        mockIpfsUploader,
        validParams,
      );

      // Assert
      expect(result.salt).toBe(0n);
      expect(result.ipfsHash).toBe('0x');
      expect(result.dripListId).toBe(0n);
    });

    it('should handle very large values', async () => {
      // Arrange
      const largeContext = {
        salt: BigInt(
          '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        ),
        ipfsHash: `0x${'f'.repeat(64)}` as const,
        dripListId: BigInt(
          '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        ),
        preparedTx: {
          to: '0xffffffffffffffffffffffffffffffffffffffff' as const,
          data: `0x${'f'.repeat(1000)}` as const,
        },
      };
      vi.mocked(prepareDripListCreationCtx).mockResolvedValue(largeContext);

      // Act
      const result = await createDripList(
        mockAdapter,
        mockIpfsUploader,
        validParams,
      );

      // Assert
      expect(result.salt).toBe(largeContext.salt);
      expect(result.dripListId).toBe(largeContext.dripListId);
    });

    it('should handle empty receivers array', async () => {
      // Arrange
      const emptyReceiversParams = {
        ...validParams,
        receivers: [],
      };

      // Act
      await createDripList(mockAdapter, mockIpfsUploader, emptyReceiversParams);

      // Assert
      expect(prepareDripListCreationCtx).toHaveBeenCalledWith(
        mockAdapter,
        mockIpfsUploader,
        emptyReceiversParams,
      );
    });
  });

  describe('function call order', () => {
    it('should call functions in correct order', async () => {
      // Arrange
      const callOrder: string[] = [];
      vi.mocked(requireWriteAccess).mockImplementation(() => {
        callOrder.push('requireWriteAccess');
      });
      vi.mocked(prepareDripListCreationCtx).mockImplementation(async () => {
        callOrder.push('prepareDripListCreationCtx');
        return mockCreationContext;
      });
      vi.mocked(mockAdapter.sendTx).mockImplementation(async () => {
        callOrder.push('sendTx');
        return mockTxResponse;
      });

      // Act
      await createDripList(mockAdapter, mockIpfsUploader, validParams);

      // Assert
      expect(callOrder).toEqual([
        'requireWriteAccess',
        'prepareDripListCreationCtx',
        'sendTx',
      ]);
    });

    it('should not call sendTx if preparation fails', async () => {
      // Arrange
      vi.mocked(prepareDripListCreationCtx).mockRejectedValue(
        new Error('Preparation failed'),
      );

      // Act & Assert
      await expect(
        createDripList(mockAdapter, mockIpfsUploader, validParams),
      ).rejects.toThrow('Preparation failed');
      expect(mockAdapter.sendTx).not.toHaveBeenCalled();
    });
  });

  describe('parameter validation', () => {
    it('should pass through all parameters to prepareDripListCreationCtx', async () => {
      // Arrange
      const complexParams = {
        isVisible: false,
        receivers: [
          {type: 'address' as const, accountId: '1', weight: 250000},
          {type: 'address' as const, accountId: '2', weight: 750000},
        ],
        transferTo: '0x1111111111111111111111111111111111111111' as const,
        salt: 42n,
        name: 'Complex List',
        description: 'Complex description',
        txOverrides: {gasLimit: 500000n},
      };

      // Act
      await createDripList(mockAdapter, mockIpfsUploader, complexParams);

      // Assert
      expect(prepareDripListCreationCtx).toHaveBeenCalledWith(
        mockAdapter,
        mockIpfsUploader,
        complexParams,
      );
    });
  });
});
