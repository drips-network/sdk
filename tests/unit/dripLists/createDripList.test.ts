import {describe, it, expect, vi, beforeEach} from 'vitest';
import {createDripList} from '../../../src/internal/drip-lists/createDripList';
import {DripsError} from '../../../src/internal/shared/DripsError';
import type {
  WriteBlockchainAdapter,
  TxResponse,
} from '../../../src/internal/blockchain/BlockchainAdapter';
import type {
  IpfsUploaderFn,
  Metadata,
} from '../../../src/internal/metadata/createPinataIpfsUploader';

vi.mock('../../../src/internal/shared/assertions', () => ({
  requireWriteAccess: vi.fn(),
}));

vi.mock('../../../src/internal/drip-lists/prepareDripListCreation', () => ({
  prepareDripListCreation: vi.fn(),
}));

import {requireWriteAccess} from '../../../src/internal/shared/assertions';
import {prepareDripListCreation} from '../../../src/internal/drip-lists/prepareDripListCreation';
import {Address} from 'viem';

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
        address: '0x1234567890123456789012345678901234567890' as Address,
        weight: 500000,
      },
      {
        type: 'address' as const,
        address: '0x3334567890123456789012345678901234567890' as Address,
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
    metadata: {
      type: 'dripList' as const,
      describes: {
        driver: 'nft' as const,
        accountId: '999',
      },
      driver: 'nft' as const,
      isVisible: true,
      recipients: [],
      name: 'Test Drip List',
      description: 'A test drip list',
      latestVersion: 'v2',
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
    vi.mocked(prepareDripListCreation).mockResolvedValue(mockCreationContext);
    vi.mocked(mockAdapter.sendTx).mockResolvedValue(mockTxResponse);
  });

  describe('successful execution', () => {
    it('should create drip list successfully', async () => {
      // Act
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
      expect(prepareDripListCreation).toHaveBeenCalledWith(
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
        metadata: mockCreationContext.metadata,
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
      expect(prepareDripListCreation).toHaveBeenCalledWith(
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
      expect(prepareDripListCreation).toHaveBeenCalledWith(
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
        batchedTxOverrides: {
          gasLimit: 1000000n,
          value: 100n,
        },
      };

      // Act
      await createDripList(mockAdapter, mockIpfsUploader, customParams);

      // Assert
      expect(prepareDripListCreation).toHaveBeenCalledWith(
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
      expect(prepareDripListCreation).toHaveBeenCalledWith(
        mockAdapter,
        mockIpfsUploader,
        minimalParams,
      );
      expect(result).toEqual({
        salt: mockCreationContext.salt,
        ipfsHash: mockCreationContext.ipfsHash,
        dripListId: mockCreationContext.dripListId,
        txResponse: mockTxResponse,
        metadata: mockCreationContext.metadata,
      });
    });

    it('should handle large datasets', async () => {
      // Arrange
      const largeParams = {
        ...validParams,
        receivers: Array.from({length: 100}, (_, i) => ({
          type: 'address' as const,
          address: `0x${i}${'1'.repeat(39)}` as Address,
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
      expect(prepareDripListCreation).toHaveBeenCalledWith(
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
        metadata: {
          type: 'dripList' as const,
          describes: {
            driver: 'nft' as const,
            accountId: '67890',
          },
          driver: 'nft' as const,
          isVisible: true,
          recipients: [],
          name: 'Custom List',
          description: 'Custom description',
          latestVersion: 'v2',
        },
      };
      vi.mocked(prepareDripListCreation).mockResolvedValue(customContext);

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
      expect(prepareDripListCreation).not.toHaveBeenCalled();
      expect(mockAdapter.sendTx).not.toHaveBeenCalled();
    });

    it('should propagate preparation context errors', async () => {
      // Arrange
      const preparationError = new Error('Failed to prepare creation context');
      vi.mocked(prepareDripListCreation).mockRejectedValue(preparationError);

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
      expect(prepareDripListCreation).toHaveBeenCalled();
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
        metadata: {
          type: 'dripList' as const,
          describes: {
            driver: 'nft' as const,
            accountId: '0',
          },
          driver: 'nft' as const,
          isVisible: true,
          recipients: [],
          latestVersion: 'v2',
        },
      };
      vi.mocked(prepareDripListCreation).mockResolvedValue(zeroContext);

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
        metadata: {
          type: 'dripList' as const,
          describes: {
            driver: 'nft' as const,
            accountId:
              'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
          },
          driver: 'nft' as const,
          isVisible: true,
          recipients: [],
          name: 'Large List',
          description: 'Large description',
          latestVersion: 'v2',
        },
      };
      vi.mocked(prepareDripListCreation).mockResolvedValue(largeContext);

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
      expect(prepareDripListCreation).toHaveBeenCalledWith(
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
      vi.mocked(prepareDripListCreation).mockImplementation(async () => {
        callOrder.push('prepareDripListCreation');
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
        'prepareDripListCreation',
        'sendTx',
      ]);
    });

    it('should not call sendTx if preparation fails', async () => {
      // Arrange
      vi.mocked(prepareDripListCreation).mockRejectedValue(
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
    it('should pass through all parameters to prepareDripListCreation', async () => {
      // Arrange
      const complexParams = {
        isVisible: false,
        receivers: [
          {
            type: 'address' as const,
            address: '0x2222222222222222222222222222222222222222' as Address,
            weight: 250000,
          },
          {
            type: 'address' as const,
            address: '0x4444444444444444444444444444444444444444' as Address,
            weight: 250000,
          },
        ],
        transferTo: '0x1111111111111111111111111111111111111111' as const,
        salt: 42n,
        name: 'Complex List',
        description: 'Complex description',
        batchedTxOverrides: {gasLimit: 500000n},
      };

      // Act
      await createDripList(mockAdapter, mockIpfsUploader, complexParams);

      // Assert
      expect(prepareDripListCreation).toHaveBeenCalledWith(
        mockAdapter,
        mockIpfsUploader,
        complexParams,
      );
    });
  });
});
