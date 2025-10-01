import {describe, it, expect, vi, beforeEach} from 'vitest';
import {updateDripList} from '../../../src/internal/drip-lists/updateDripList';
import {DripsError} from '../../../src/internal/shared/DripsError';
import type {
  WriteBlockchainAdapter,
  TxResponse,
} from '../../../src/internal/blockchain/BlockchainAdapter';
import type {
  IpfsMetadataUploaderFn,
  DripListMetadata,
} from '../../../src/internal/shared/createPinataIpfsMetadataUploader';

vi.mock('../../../src/internal/drip-lists/prepareDripListUpdate', () => ({
  prepareDripListUpdate: vi.fn(),
}));

import {prepareDripListUpdate} from '../../../src/internal/drip-lists/prepareDripListUpdate';

describe('updateDripList', () => {
  const mockAdapter: WriteBlockchainAdapter = {
    call: vi.fn(),
    getAddress: vi.fn(),
    sendTx: vi.fn(),
    signMsg: vi.fn(),
    getChainId: vi.fn(),
  };

  const mockIpfsMetadataUploader: IpfsMetadataUploaderFn<DripListMetadata> =
    vi.fn();

  const validConfig = {
    dripListId: 123n,
    metadata: {
      name: 'Updated Name',
      description: 'Updated description',
      isVisible: false,
    },
    receivers: [
      {
        type: 'address' as const,
        address: '0x1234567890123456789012345678901234567890' as const,
        weight: 600000,
      },
      {
        type: 'drip-list' as const,
        accountId: 789n,
        weight: 400000,
      },
    ],
  };

  const mockMetadata: DripListMetadata = {
    type: 'dripList' as const,
    driver: 'nft' as const,
    describes: {
      driver: 'nft' as const,
      accountId: '123',
    },
    isVisible: false,
    name: 'Updated Name',
    description: 'Updated description',
    recipients: [],
  };

  const mockPrepareResult = {
    ipfsHash: '0xipfshash' as const,
    metadata: mockMetadata,
    preparedTx: {
      to: '0x1234567890123456789012345678901234567890' as const,
      data: '0xdata' as const,
      abiFunctionName: 'updateDripList' as const,
    },
    allowExternalDonations: true,
  };

  const mockTxResponse: TxResponse = {
    hash: '0xtxhash' as const,
    wait: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to default successful behavior
    vi.mocked(prepareDripListUpdate).mockResolvedValue(mockPrepareResult);
    vi.mocked(mockAdapter.sendTx).mockResolvedValue(mockTxResponse);
  });

  describe('successful execution', () => {
    it('should update drip list successfully', async () => {
      // Act
      const result = await updateDripList(
        mockAdapter,
        mockIpfsMetadataUploader,
        validConfig,
      );

      // Assert
      expect(prepareDripListUpdate).toHaveBeenCalledWith(
        mockAdapter,
        mockIpfsMetadataUploader,
        validConfig,
        undefined,
      );
      expect(mockAdapter.sendTx).toHaveBeenCalledWith(
        mockPrepareResult.preparedTx,
      );

      expect(result).toEqual({
        ipfsHash: mockPrepareResult.ipfsHash,
        metadata: mockPrepareResult.metadata,
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
      const result = await updateDripList(
        customAdapter,
        mockIpfsMetadataUploader,
        validConfig,
      );

      // Assert
      expect(prepareDripListUpdate).toHaveBeenCalledWith(
        customAdapter,
        mockIpfsMetadataUploader,
        validConfig,
        undefined,
      );
      expect(customAdapter.sendTx).toHaveBeenCalledWith(
        mockPrepareResult.preparedTx,
      );
      expect(mockAdapter.sendTx).not.toHaveBeenCalled();
      expect(result.txResponse).toBe(mockTxResponse);
    });

    it('should work with different IPFS uploaders', async () => {
      // Arrange
      const customIpfsMetadataUploader: IpfsMetadataUploaderFn<DripListMetadata> =
        vi.fn();

      // Act
      await updateDripList(
        mockAdapter,
        customIpfsMetadataUploader,
        validConfig,
      );

      // Assert
      expect(prepareDripListUpdate).toHaveBeenCalledWith(
        mockAdapter,
        customIpfsMetadataUploader,
        validConfig,
        undefined,
      );
      expect(mockIpfsMetadataUploader).not.toHaveBeenCalled();
    });

    it('should handle metadata-only updates', async () => {
      // Arrange
      const metadataOnlyConfig = {
        dripListId: 123n,
        metadata: {
          name: 'New Name Only',
          description: 'New description only',
        },
      };

      // Act
      const result = await updateDripList(
        mockAdapter,
        mockIpfsMetadataUploader,
        metadataOnlyConfig,
      );

      // Assert
      expect(prepareDripListUpdate).toHaveBeenCalledWith(
        mockAdapter,
        mockIpfsMetadataUploader,
        metadataOnlyConfig,
        undefined,
      );
      expect(result).toEqual({
        ipfsHash: mockPrepareResult.ipfsHash,
        metadata: mockPrepareResult.metadata,
        txResponse: mockTxResponse,
      });
    });

    it('should handle receivers-only updates', async () => {
      // Arrange
      const receiversOnlyConfig = {
        dripListId: 123n,
        receivers: [
          {
            type: 'address' as const,
            address: '0x3333333333333333333333333333333333333333' as const,
            weight: 1000000,
          },
        ],
      };

      // Act
      const result = await updateDripList(
        mockAdapter,
        mockIpfsMetadataUploader,
        receiversOnlyConfig,
      );

      // Assert
      expect(prepareDripListUpdate).toHaveBeenCalledWith(
        mockAdapter,
        mockIpfsMetadataUploader,
        receiversOnlyConfig,
        undefined,
      );
      expect(result.txResponse).toBe(mockTxResponse);
    });

    it('should handle different update configurations', async () => {
      // Arrange
      const customConfig = {
        dripListId: 456n,
        metadata: {
          isVisible: true,
        },
        receivers: [],
        batchedTxOverrides: {
          gasLimit: 1000000n,
          value: 100n,
        },
      };

      // Act
      await updateDripList(mockAdapter, mockIpfsMetadataUploader, customConfig);

      // Assert
      expect(prepareDripListUpdate).toHaveBeenCalledWith(
        mockAdapter,
        mockIpfsMetadataUploader,
        customConfig,
        undefined,
      );
    });

    it('should handle complex receiver configurations', async () => {
      // Arrange
      const complexConfig = {
        dripListId: 789n,
        receivers: [
          {
            type: 'project' as const,
            url: 'https://github.com/owner/repo',
            weight: 300000,
          },
          {
            type: 'drip-list' as const,
            accountId: 456n,
            weight: 400000,
          },
          {
            type: 'address' as const,
            address: '0x1234567890123456789012345678901234567890' as const,
            weight: 300000,
          },
        ],
      };

      // Act
      const result = await updateDripList(
        mockAdapter,
        mockIpfsMetadataUploader,
        complexConfig,
      );

      // Assert
      expect(prepareDripListUpdate).toHaveBeenCalledWith(
        mockAdapter,
        mockIpfsMetadataUploader,
        complexConfig,
        undefined,
      );
      expect(result.txResponse).toBe(mockTxResponse);
    });

    it('should preserve all preparation result data', async () => {
      // Arrange
      const customPrepareResult = {
        ipfsHash: '0xcustomhash' as const,
        metadata: {
          ...mockMetadata,
          name: 'Custom Name',
          description: 'Custom description',
        },
        preparedTx: {
          to: '0xabcdef1234567890abcdef1234567890abcdef12' as const,
          data: '0xcustomdata' as const,
          abiFunctionName: 'customUpdateDripList' as const,
        },
        allowExternalDonations: true,
      };
      vi.mocked(prepareDripListUpdate).mockResolvedValue(customPrepareResult);

      // Act
      const result = await updateDripList(
        mockAdapter,
        mockIpfsMetadataUploader,
        validConfig,
      );

      // Assert
      expect(result.ipfsHash).toBe(customPrepareResult.ipfsHash);
      expect(result.metadata).toBe(customPrepareResult.metadata);
      expect(result.txResponse).toBe(mockTxResponse);
    });

    it('should handle large datasets', async () => {
      // Arrange
      const largeConfig = {
        dripListId: 999n,
        metadata: {
          name: 'A'.repeat(1000),
          description: 'B'.repeat(5000),
          isVisible: true,
        },
        receivers: Array.from({length: 100}, (_, i) => ({
          type: 'address' as const,
          address: `0x${i}${'1'.repeat(39)}` as const,
          weight: 10000,
        })),
      };

      // Act
      const result = await updateDripList(
        mockAdapter,
        mockIpfsMetadataUploader,
        largeConfig,
      );

      // Assert
      expect(prepareDripListUpdate).toHaveBeenCalledWith(
        mockAdapter,
        mockIpfsMetadataUploader,
        largeConfig,
        undefined,
      );
      expect(result.txResponse).toBe(mockTxResponse);
    });

    it('should handle partial metadata updates', async () => {
      // Arrange
      const partialMetadataConfig = {
        dripListId: 123n,
        metadata: {
          name: 'Only Name Updated',
        },
      };

      // Act
      await updateDripList(
        mockAdapter,
        mockIpfsMetadataUploader,
        partialMetadataConfig,
      );

      // Assert
      expect(prepareDripListUpdate).toHaveBeenCalledWith(
        mockAdapter,
        mockIpfsMetadataUploader,
        partialMetadataConfig,
        undefined,
      );
    });

    it('should work with GraphQL client', async () => {
      // Arrange
      const mockGraphQLClient = {query: vi.fn()} as any;

      // Act
      const result = await updateDripList(
        mockAdapter,
        mockIpfsMetadataUploader,
        validConfig,
        mockGraphQLClient,
      );

      // Assert
      expect(prepareDripListUpdate).toHaveBeenCalledWith(
        mockAdapter,
        mockIpfsMetadataUploader,
        validConfig,
        mockGraphQLClient,
      );
      expect(mockAdapter.sendTx).toHaveBeenCalledWith(
        mockPrepareResult.preparedTx,
      );

      expect(result).toEqual({
        ipfsHash: mockPrepareResult.ipfsHash,
        metadata: mockPrepareResult.metadata,
        txResponse: mockTxResponse,
      });
    });
  });

  describe('error handling', () => {
    it('should propagate preparation errors', async () => {
      // Arrange
      const preparationError = new Error('Failed to prepare update');
      vi.mocked(prepareDripListUpdate).mockRejectedValue(preparationError);

      // Act & Assert
      await expect(
        updateDripList(mockAdapter, mockIpfsMetadataUploader, validConfig),
      ).rejects.toThrow(preparationError);
      expect(mockAdapter.sendTx).not.toHaveBeenCalled();
    });

    it('should propagate transaction sending errors', async () => {
      // Arrange
      const txError = new Error('Transaction failed');
      vi.mocked(mockAdapter.sendTx).mockRejectedValue(txError);

      // Act & Assert
      await expect(
        updateDripList(mockAdapter, mockIpfsMetadataUploader, validConfig),
      ).rejects.toThrow(txError);
      expect(prepareDripListUpdate).toHaveBeenCalled();
    });

    it('should handle network errors during transaction', async () => {
      // Arrange
      const networkError = new Error('Network connection failed');
      vi.mocked(mockAdapter.sendTx).mockRejectedValue(networkError);

      // Act & Assert
      await expect(
        updateDripList(mockAdapter, mockIpfsMetadataUploader, validConfig),
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
        updateDripList(faultyAdapter, mockIpfsMetadataUploader, validConfig),
      ).rejects.toThrow(adapterError);
    });

    it('should handle IPFS-related errors from preparation', async () => {
      // Arrange
      const ipfsError = new Error('IPFS upload failed');
      vi.mocked(prepareDripListUpdate).mockRejectedValue(ipfsError);

      // Act & Assert
      await expect(
        updateDripList(mockAdapter, mockIpfsMetadataUploader, validConfig),
      ).rejects.toThrow(ipfsError);
    });

    it('should handle validation errors from preparation', async () => {
      // Arrange
      const validationError = new DripsError('Invalid drip list configuration');
      vi.mocked(prepareDripListUpdate).mockRejectedValue(validationError);

      // Act & Assert
      await expect(
        updateDripList(mockAdapter, mockIpfsMetadataUploader, validConfig),
      ).rejects.toThrow(validationError);
    });
  });

  describe('edge cases', () => {
    it('should handle zero drip list ID', async () => {
      // Arrange
      const zeroIdConfig = {
        ...validConfig,
        dripListId: 0n,
      };

      // Act
      const result = await updateDripList(
        mockAdapter,
        mockIpfsMetadataUploader,
        zeroIdConfig,
      );

      // Assert
      expect(prepareDripListUpdate).toHaveBeenCalledWith(
        mockAdapter,
        mockIpfsMetadataUploader,
        zeroIdConfig,
        undefined,
      );
      expect(result.txResponse).toBe(mockTxResponse);
    });

    it('should handle very large drip list ID', async () => {
      // Arrange
      const largeDripListId = BigInt(
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      );
      const largeIdConfig = {
        ...validConfig,
        dripListId: largeDripListId,
      };

      // Act
      const result = await updateDripList(
        mockAdapter,
        mockIpfsMetadataUploader,
        largeIdConfig,
      );

      // Assert
      expect(prepareDripListUpdate).toHaveBeenCalledWith(
        mockAdapter,
        mockIpfsMetadataUploader,
        largeIdConfig,
        undefined,
      );
      expect(result.txResponse).toBe(mockTxResponse);
    });

    it('should handle empty string metadata values', async () => {
      // Arrange
      const emptyStringConfig = {
        dripListId: 123n,
        metadata: {
          name: '',
          description: '',
          isVisible: false,
        },
      };

      // Act
      await updateDripList(
        mockAdapter,
        mockIpfsMetadataUploader,
        emptyStringConfig,
      );

      // Assert
      expect(prepareDripListUpdate).toHaveBeenCalledWith(
        mockAdapter,
        mockIpfsMetadataUploader,
        emptyStringConfig,
        undefined,
      );
    });

    it('should handle empty receivers array', async () => {
      // Arrange
      const emptyReceiversConfig = {
        dripListId: 123n,
        receivers: [],
        metadata: {
          name: 'Updated Name',
        },
      };

      // Act
      await updateDripList(
        mockAdapter,
        mockIpfsMetadataUploader,
        emptyReceiversConfig,
      );

      // Assert
      expect(prepareDripListUpdate).toHaveBeenCalledWith(
        mockAdapter,
        mockIpfsMetadataUploader,
        emptyReceiversConfig,
        undefined,
      );
    });

    it('should handle preparation result with minimal data', async () => {
      // Arrange
      const minimalPrepareResult = {
        ipfsHash: '0x' as const,
        metadata: {
          type: 'dripList' as const,
          driver: 'nft' as const,
          describes: {
            driver: 'nft' as const,
            accountId: '0',
          },
          isVisible: true,
          recipients: [],
        },
        preparedTx: {
          to: '0x0000000000000000000000000000000000000000' as const,
          data: '0x' as const,
          abiFunctionName: 'updateDripList' as const,
        },
        allowExternalDonations: true,
      };
      vi.mocked(prepareDripListUpdate).mockResolvedValue(minimalPrepareResult);

      // Act
      const result = await updateDripList(
        mockAdapter,
        mockIpfsMetadataUploader,
        validConfig,
      );

      // Assert
      expect(result.ipfsHash).toBe('0x');
      expect(result.metadata).toBe(minimalPrepareResult.metadata);
      expect(result.txResponse).toBe(mockTxResponse);
    });

    it('should handle preparation result with large data', async () => {
      // Arrange
      const largePrepareResult = {
        ipfsHash: `0x${'f'.repeat(64)}` as const,
        metadata: {
          type: 'dripList' as const,
          driver: 'nft' as const,
          describes: {
            driver: 'nft' as const,
            accountId:
              'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
          },
          isVisible: true,
          name: 'A'.repeat(1000),
          description: 'B'.repeat(5000),
          recipients: [],
        },
        preparedTx: {
          to: '0xffffffffffffffffffffffffffffffffffffffff' as const,
          data: `0x${'f'.repeat(1000)}` as const,
          abiFunctionName: 'updateDripList' as const,
        },
        allowExternalDonations: true,
      };
      vi.mocked(prepareDripListUpdate).mockResolvedValue(largePrepareResult);

      // Act
      const result = await updateDripList(
        mockAdapter,
        mockIpfsMetadataUploader,
        validConfig,
      );

      // Assert
      expect(result.ipfsHash).toBe(largePrepareResult.ipfsHash);
      expect(result.metadata).toBe(largePrepareResult.metadata);
      expect(result.txResponse).toBe(mockTxResponse);
    });
  });

  describe('function call order', () => {
    it('should call functions in correct order', async () => {
      // Arrange
      const callOrder: string[] = [];
      vi.mocked(prepareDripListUpdate).mockImplementation(async () => {
        callOrder.push('prepareDripListUpdate');
        return mockPrepareResult;
      });
      vi.mocked(mockAdapter.sendTx).mockImplementation(async () => {
        callOrder.push('sendTx');
        return mockTxResponse;
      });

      // Act
      await updateDripList(mockAdapter, mockIpfsMetadataUploader, validConfig);

      // Assert
      expect(callOrder).toEqual(['prepareDripListUpdate', 'sendTx']);
    });

    it('should not call sendTx if preparation fails', async () => {
      // Arrange
      vi.mocked(prepareDripListUpdate).mockRejectedValue(
        new Error('Preparation failed'),
      );

      // Act & Assert
      await expect(
        updateDripList(mockAdapter, mockIpfsMetadataUploader, validConfig),
      ).rejects.toThrow('Preparation failed');
      expect(mockAdapter.sendTx).not.toHaveBeenCalled();
    });
  });

  describe('parameter validation', () => {
    it('should pass through all parameters to prepareDripListUpdate', async () => {
      // Arrange
      const complexConfig = {
        dripListId: 456n,
        metadata: {
          name: 'Complex Name',
          description: 'Complex description',
          isVisible: false,
        },
        receivers: [
          {
            type: 'address' as const,
            address: '0x2222222222222222222222222222222222222222' as const,
            weight: 250000,
          },
          {
            type: 'drip-list' as const,
            accountId: 789n,
            weight: 750000,
          },
        ],
        batchedTxOverrides: {
          gasLimit: 500000n,
          value: 200n,
        },
      };

      // Act
      await updateDripList(
        mockAdapter,
        mockIpfsMetadataUploader,
        complexConfig,
      );

      // Assert
      expect(prepareDripListUpdate).toHaveBeenCalledWith(
        mockAdapter,
        mockIpfsMetadataUploader,
        complexConfig,
        undefined,
      );
    });
  });

  describe('return value structure', () => {
    it('should return object with correct structure', async () => {
      // Act
      const result = await updateDripList(
        mockAdapter,
        mockIpfsMetadataUploader,
        validConfig,
      );

      // Assert
      expect(result).toHaveProperty('ipfsHash');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('txResponse');
      expect(Object.keys(result)).toHaveLength(3);
    });

    it('should return values from both preparation and transaction', async () => {
      // Act
      const result = await updateDripList(
        mockAdapter,
        mockIpfsMetadataUploader,
        validConfig,
      );

      // Assert
      expect(result.ipfsHash).toBe(mockPrepareResult.ipfsHash);
      expect(result.metadata).toBe(mockPrepareResult.metadata);
      expect(result.txResponse).toBe(mockTxResponse);
    });
  });
});
