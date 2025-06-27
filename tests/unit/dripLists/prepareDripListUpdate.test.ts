import {describe, it, expect, vi, beforeEach} from 'vitest';
import {prepareDripListUpdate} from '../../../src/internal/drip-lists/prepareDripListUpdate';
import {DripsError} from '../../../src/internal/shared/DripsError';
import type {
  WriteBlockchainAdapter,
  PreparedTx,
} from '../../../src/internal/blockchain/BlockchainAdapter';
import type {
  IpfsMetadataUploaderFn,
  DripListMetadata,
} from '../../../src/internal/shared/createPinataIpfsMetadataUploader';
import type {DripsGraphQLClient} from '../../../src/internal/graphql/createGraphQLClient';
import type {
  SupportedChain,
  Driver,
} from '../../../src/internal/graphql/__generated__/base-types';

vi.mock('../../../src/internal/shared/assertions', () => ({
  requireWriteAccess: vi.fn(),
  requireSupportedChain: vi.fn(),
}));

vi.mock('../../../src/internal/shared/buildTx', () => ({
  buildTx: vi.fn(),
}));

vi.mock('../../../src/internal/shared/convertToCallerCall', () => ({
  convertToCallerCall: vi.fn(),
}));

vi.mock('../../../src/internal/shared/encodeMetadataKeyValue', () => ({
  encodeMetadataKeyValue: vi.fn(),
  USER_METADATA_KEY: 'user-metadata',
}));

vi.mock('../../../src/internal/shared/receiverUtils', () => ({
  mapToOnChainSplitsReceiver: vi.fn(),
  mapSdkToMetadataSplitsReceiver: vi.fn(),
  mapApiToMetadataSplitsReceiver: vi.fn(),
}));

vi.mock(
  '../../../src/internal/shared/validateAndFormatSplitsReceivers',
  () => ({
    validateAndFormatSplitsReceivers: vi.fn(),
  }),
);

vi.mock('../../../src/internal/drip-lists/buildDripListMetadata', () => ({
  buildDripListMetadata: vi.fn(),
}));

vi.mock('../../../src/internal/drip-lists/getDripListById', () => ({
  getDripListById: vi.fn(),
}));

import {
  requireWriteAccess,
  requireSupportedChain,
} from '../../../src/internal/shared/assertions';
import {buildTx} from '../../../src/internal/shared/buildTx';
import {convertToCallerCall} from '../../../src/internal/shared/convertToCallerCall';
import {encodeMetadataKeyValue} from '../../../src/internal/shared/encodeMetadataKeyValue';
import {validateAndFormatSplitsReceivers} from '../../../src/internal/shared/validateAndFormatSplitsReceivers';
import {buildDripListMetadata} from '../../../src/internal/drip-lists/buildDripListMetadata';
import {getDripListById} from '../../../src/internal/drip-lists/getDripListById';
import {
  mapToOnChainSplitsReceiver,
  mapSdkToMetadataSplitsReceiver,
  mapApiToMetadataSplitsReceiver,
} from '../../../src/internal/shared/receiverUtils';

describe('prepareDripListUpdate', () => {
  const mockAdapter: WriteBlockchainAdapter = {
    call: vi.fn(),
    getChainId: vi.fn(),
    getAddress: vi.fn(),
    sendTx: vi.fn(),
    signMsg: vi.fn(),
  };

  const mockGraphQLClient: DripsGraphQLClient = {
    query: vi.fn(),
  };

  const mockIpfsMetadataUploader: IpfsMetadataUploaderFn<DripListMetadata> =
    vi.fn();

  const mockDripListId = 123n;
  const mockChainId = 11155111;
  const mockIpfsHash = '0xipfshash' as const;

  const mockExistingDripList = {
    __typename: 'DripList' as const,
    account: {
      __typename: 'NftDriverAccount' as const,
      accountId: '123',
      driver: 'NFT' as Driver,
    },
    chain: 'SEPOLIA' as SupportedChain,
    creator: '0x1234567890123456789012345678901234567890',
    description: 'Existing description',
    isVisible: true,
    lastProcessedIpfsHash: null,
    latestMetadataIpfsHash: null,
    latestVotingRoundId: null,
    name: 'Existing Name',
    owner: {
      __typename: 'AddressDriverAccount' as const,
      accountId: '456',
      driver: 'ADDRESS' as Driver,
      address: '0x1234567890123456789012345678901234567890',
    },
    previousOwnerAddress: '0x0000000000000000000000000000000000000000',
    splits: [
      {
        __typename: 'AddressReceiver' as const,
        weight: 500000,
        account: {
          __typename: 'AddressDriverAccount' as const,
          accountId: '789',
          driver: 'ADDRESS' as Driver,
          address: '0x1111111111111111111111111111111111111111',
        },
        driver: 'ADDRESS' as Driver,
      },
      {
        __typename: 'DripListReceiver' as const,
        weight: 500000,
        account: {
          __typename: 'NftDriverAccount' as const,
          accountId: '456',
          driver: 'NFT' as Driver,
        },
        driver: 'NFT' as Driver,
      },
    ],
    support: [],
    totalEarned: [],
  };

  const validUpdateConfig = {
    dripListId: mockDripListId,
    metadata: {
      name: 'Updated Name',
      description: 'Updated description',
      isVisible: false,
    },
    receivers: [
      {
        type: 'address' as const,
        address: '0x2222222222222222222222222222222222222222' as const,
        weight: 600000,
      },
      {
        type: 'drip-list' as const,
        accountId: 789n,
        weight: 400000,
      },
    ],
  };

  const mockMetadata = {
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

  const mockOnChainReceivers = [
    {accountId: 111n, weight: 600000},
    {accountId: 789n, weight: 400000},
  ];

  const mockFormattedReceivers = [
    {accountId: 111n, weight: 600000},
    {accountId: 789n, weight: 400000},
  ];

  const mockEncodedMetadata = {
    key: '0x757365722d6d65746164617461' as const,
    value: '0xipfshash' as const,
  };

  const mockEmitMetadataTx = {
    to: '0xAddressDriver' as const,
    data: '0xemitmetadata' as const,
  };

  const mockSetSplitsTx = {
    to: '0xNftDriver' as const,
    data: '0xsetsplits' as const,
  };

  const mockCallerCall1 = {
    target: '0xAddressDriver' as const,
    data: '0xemitmetadata' as const,
    value: 0n,
  };

  const mockCallerCall2 = {
    target: '0xNftDriver' as const,
    data: '0xsetsplits' as const,
    value: 0n,
  };

  const mockBatchedTx: PreparedTx = {
    to: '0xCaller' as const,
    data: '0xbatcheddata' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset all mocks to their default successful behavior
    vi.mocked(mockAdapter.getChainId).mockResolvedValue(mockChainId);
    vi.mocked(requireWriteAccess).mockImplementation(() => {});
    vi.mocked(requireSupportedChain).mockImplementation(() => {});
    vi.mocked(getDripListById).mockResolvedValue(mockExistingDripList);
    vi.mocked(mapSdkToMetadataSplitsReceiver)
      .mockResolvedValueOnce({
        type: 'address',
        accountId: '111',
        weight: 600000,
      })
      .mockResolvedValueOnce({
        type: 'dripList',
        accountId: '789',
        weight: 400000,
      });
    vi.mocked(buildDripListMetadata).mockReturnValue(mockMetadata);
    vi.mocked(mockIpfsMetadataUploader).mockResolvedValue(mockIpfsHash);
    vi.mocked(encodeMetadataKeyValue).mockReturnValue(mockEncodedMetadata);
    vi.mocked(mapToOnChainSplitsReceiver)
      .mockResolvedValueOnce(mockOnChainReceivers[0])
      .mockResolvedValueOnce(mockOnChainReceivers[1]);
    vi.mocked(validateAndFormatSplitsReceivers).mockReturnValue(
      mockFormattedReceivers,
    );
    vi.mocked(buildTx)
      .mockReturnValueOnce(mockEmitMetadataTx)
      .mockReturnValueOnce(mockSetSplitsTx)
      .mockReturnValueOnce(mockBatchedTx);
    vi.mocked(convertToCallerCall)
      .mockReturnValueOnce(mockCallerCall1)
      .mockReturnValueOnce(mockCallerCall2);
  });

  describe('successful execution', () => {
    it('should prepare drip list update with both metadata and receivers', async () => {
      // Act
      const result = await prepareDripListUpdate(
        mockAdapter,
        mockIpfsMetadataUploader,
        validUpdateConfig,
        mockGraphQLClient,
      );

      // Assert
      expect(mockAdapter.getChainId).toHaveBeenCalled();
      expect(requireSupportedChain).toHaveBeenCalledWith(mockChainId);
      expect(requireWriteAccess).toHaveBeenCalledWith(
        mockAdapter,
        'prepareDripListUpdate',
      );
      expect(getDripListById).toHaveBeenCalledWith(
        mockDripListId,
        mockChainId,
        mockGraphQLClient,
      );
      expect(mapSdkToMetadataSplitsReceiver).toHaveBeenCalledTimes(2);
      expect(buildDripListMetadata).toHaveBeenCalledWith({
        dripListId: mockDripListId,
        receivers: expect.any(Array),
        name: 'Updated Name',
        isVisible: false,
        description: 'Updated description',
      });
      expect(mockIpfsMetadataUploader).toHaveBeenCalledWith(mockMetadata);
      expect(mapToOnChainSplitsReceiver).toHaveBeenCalledTimes(2);
      expect(validateAndFormatSplitsReceivers).toHaveBeenCalledWith(
        mockOnChainReceivers,
      );
      expect(encodeMetadataKeyValue).toHaveBeenCalledWith({
        key: 'user-metadata',
        value: mockIpfsHash,
      });

      expect(result).toEqual({
        preparedTx: mockBatchedTx,
        ipfsHash: mockIpfsHash,
        metadata: mockMetadata,
      });
    });

    it('should prepare drip list update with only metadata changes', async () => {
      // Arrange
      const metadataOnlyConfig = {
        dripListId: mockDripListId,
        metadata: {
          name: 'New Name Only',
          description: 'New description only',
        },
      };

      vi.mocked(mapApiToMetadataSplitsReceiver)
        .mockReturnValueOnce({
          type: 'address',
          accountId: '789',
          weight: 500000,
        })
        .mockReturnValueOnce({
          type: 'dripList',
          accountId: '456',
          weight: 500000,
        });

      vi.mocked(buildTx).mockReset();
      vi.mocked(buildTx)
        .mockReturnValueOnce(mockEmitMetadataTx)
        .mockReturnValueOnce(mockBatchedTx);

      vi.mocked(convertToCallerCall).mockReset();
      vi.mocked(convertToCallerCall).mockReturnValueOnce(mockCallerCall1);

      // Act
      const result = await prepareDripListUpdate(
        mockAdapter,
        mockIpfsMetadataUploader,
        metadataOnlyConfig,
        mockGraphQLClient,
      );

      // Assert
      expect(mapSdkToMetadataSplitsReceiver).not.toHaveBeenCalled();
      expect(mapApiToMetadataSplitsReceiver).toHaveBeenCalledTimes(2);
      expect(buildDripListMetadata).toHaveBeenCalledWith({
        dripListId: mockDripListId,
        receivers: expect.any(Array),
        name: 'New Name Only',
        isVisible: true, // Should use existing value
        description: 'New description only',
      });
      expect(mapToOnChainSplitsReceiver).not.toHaveBeenCalled();
      expect(validateAndFormatSplitsReceivers).not.toHaveBeenCalled();
      expect(buildTx).toHaveBeenCalledTimes(2); // Only emit metadata and batched tx
      expect(result.preparedTx).toBe(mockBatchedTx);
    });

    it('should prepare drip list update with only receiver changes', async () => {
      // Arrange
      const receiversOnlyConfig = {
        dripListId: mockDripListId,
        receivers: [
          {
            type: 'address' as const,
            address: '0x3333333333333333333333333333333333333333' as const,
            weight: 1000000,
          },
        ],
      };

      vi.mocked(mapSdkToMetadataSplitsReceiver).mockReset();
      vi.mocked(mapSdkToMetadataSplitsReceiver).mockResolvedValueOnce({
        type: 'address',
        accountId: '333',
        weight: 1000000,
      });

      vi.mocked(mapToOnChainSplitsReceiver).mockReset();
      vi.mocked(mapToOnChainSplitsReceiver).mockResolvedValueOnce({
        accountId: 333n,
        weight: 1000000,
      });

      vi.mocked(validateAndFormatSplitsReceivers).mockReturnValue([
        {accountId: 333n, weight: 1000000},
      ]);

      // Act
      const result = await prepareDripListUpdate(
        mockAdapter,
        mockIpfsMetadataUploader,
        receiversOnlyConfig,
        mockGraphQLClient,
      );

      // Assert
      expect(mapSdkToMetadataSplitsReceiver).toHaveBeenCalledTimes(1);
      expect(buildDripListMetadata).toHaveBeenCalledWith({
        dripListId: mockDripListId,
        receivers: expect.any(Array),
        name: 'Existing Name', // Should use existing values
        isVisible: true,
        description: 'Existing description',
      });
      expect(mapToOnChainSplitsReceiver).toHaveBeenCalledTimes(1);
      expect(validateAndFormatSplitsReceivers).toHaveBeenCalledWith([
        {accountId: 333n, weight: 1000000},
      ]);
      expect(buildTx).toHaveBeenCalledTimes(3); // Emit metadata, set splits, and batched tx
      expect(result.preparedTx).toBe(mockBatchedTx);
    });

    it('should work with different adapters', async () => {
      // Arrange
      const customAdapter: WriteBlockchainAdapter = {
        call: vi.fn(),
        getChainId: vi.fn().mockResolvedValue(mockChainId),
        getAddress: vi.fn(),
        sendTx: vi.fn(),
        signMsg: vi.fn(),
      };

      // Act
      const result = await prepareDripListUpdate(
        customAdapter,
        mockIpfsMetadataUploader,
        validUpdateConfig,
        mockGraphQLClient,
      );

      // Assert
      expect(customAdapter.getChainId).toHaveBeenCalled();
      expect(requireWriteAccess).toHaveBeenCalledWith(
        customAdapter,
        'prepareDripListUpdate',
      );
      expect(mockAdapter.getChainId).not.toHaveBeenCalled();
      expect(result.preparedTx).toBe(mockBatchedTx);
    });

    it('should work with different IPFS uploaders', async () => {
      // Arrange
      const customIpfsMetadataUploader: IpfsMetadataUploaderFn<DripListMetadata> =
        vi.fn().mockResolvedValue(mockIpfsHash);

      // Act
      await prepareDripListUpdate(
        mockAdapter,
        customIpfsMetadataUploader,
        validUpdateConfig,
        mockGraphQLClient,
      );

      // Assert
      expect(customIpfsMetadataUploader).toHaveBeenCalledWith(mockMetadata);
      expect(mockIpfsMetadataUploader).not.toHaveBeenCalled();
    });

    it('should work without GraphQL client', async () => {
      // Act
      await prepareDripListUpdate(
        mockAdapter,
        mockIpfsMetadataUploader,
        validUpdateConfig,
      );

      // Assert
      expect(getDripListById).toHaveBeenCalledWith(
        mockDripListId,
        mockChainId,
        undefined,
      );
    });

    it('should handle different supported chain', async () => {
      // Arrange
      vi.mocked(mockAdapter.getChainId).mockResolvedValue(31337);

      // Act
      await prepareDripListUpdate(
        mockAdapter,
        mockIpfsMetadataUploader,
        validUpdateConfig,
        mockGraphQLClient,
      );

      // Assert
      expect(mockAdapter.getChainId).toHaveBeenCalled();
      expect(requireSupportedChain).toHaveBeenCalledWith(31337);
      expect(getDripListById).toHaveBeenCalledWith(
        mockDripListId,
        31337,
        mockGraphQLClient,
      );
    });

    it('should include batchedTxOverrides in batched transaction', async () => {
      // Arrange
      const configWithOverrides = {
        ...validUpdateConfig,
        batchedTxOverrides: {
          gasLimit: 1000000n,
          value: 100n,
        },
      };

      // Act
      await prepareDripListUpdate(
        mockAdapter,
        mockIpfsMetadataUploader,
        configWithOverrides,
        mockGraphQLClient,
      );

      // Assert
      expect(buildTx).toHaveBeenCalledWith(
        expect.objectContaining({
          batchedTxOverrides: configWithOverrides.batchedTxOverrides,
        }),
      );
    });

    it('should handle empty receivers array', async () => {
      // Arrange
      const configWithEmptyReceivers = {
        dripListId: mockDripListId,
        receivers: [],
      };

      // Act
      await prepareDripListUpdate(
        mockAdapter,
        mockIpfsMetadataUploader,
        configWithEmptyReceivers,
        mockGraphQLClient,
      );

      // Assert
      expect(mapSdkToMetadataSplitsReceiver).not.toHaveBeenCalled();
      expect(mapToOnChainSplitsReceiver).not.toHaveBeenCalled();
      expect(validateAndFormatSplitsReceivers).toHaveBeenCalledWith([]);
    });

    it('should handle partial metadata updates', async () => {
      // Arrange
      const partialMetadataConfig = {
        dripListId: mockDripListId,
        metadata: {
          name: 'Only Name Updated',
        },
      };

      // Act
      await prepareDripListUpdate(
        mockAdapter,
        mockIpfsMetadataUploader,
        partialMetadataConfig,
        mockGraphQLClient,
      );

      // Assert
      expect(buildDripListMetadata).toHaveBeenCalledWith({
        dripListId: mockDripListId,
        receivers: expect.any(Array),
        name: 'Only Name Updated',
        isVisible: true, // Should use existing value
        description: 'Existing description', // Should use existing value
      });
    });

    it('should handle different receiver types', async () => {
      // Arrange
      const configWithMixedReceivers = {
        dripListId: mockDripListId,
        receivers: [
          {
            type: 'project' as const,
            url: 'https://github.com/owner/repo',
            weight: 300000,
          },
          {
            type: 'drip-list' as const,
            accountId: 789n,
            weight: 400000,
          },
          {
            type: 'address' as const,
            address: '0x1234567890123456789012345678901234567890' as const,
            weight: 300000,
          },
        ],
      };

      const mockMixedOnChainReceivers = [
        {accountId: 111n, weight: 300000},
        {accountId: 789n, weight: 400000},
        {accountId: 333n, weight: 300000},
      ];

      vi.mocked(mapToOnChainSplitsReceiver).mockReset();
      vi.mocked(mapToOnChainSplitsReceiver)
        .mockResolvedValueOnce(mockMixedOnChainReceivers[0])
        .mockResolvedValueOnce(mockMixedOnChainReceivers[1])
        .mockResolvedValueOnce(mockMixedOnChainReceivers[2]);

      vi.mocked(mapSdkToMetadataSplitsReceiver).mockReset();
      vi.mocked(mapSdkToMetadataSplitsReceiver)
        .mockResolvedValueOnce({
          type: 'repoDriver',
          weight: 300000,
          accountId: '111',
          source: {
            forge: 'github',
            url: 'https://github.com/owner/repo',
            ownerName: 'owner',
            repoName: 'repo',
          },
        })
        .mockResolvedValueOnce({
          type: 'dripList',
          weight: 400000,
          accountId: '789',
        })
        .mockResolvedValueOnce({
          type: 'address',
          weight: 300000,
          accountId: '333',
        });

      // Act
      await prepareDripListUpdate(
        mockAdapter,
        mockIpfsMetadataUploader,
        configWithMixedReceivers,
        mockGraphQLClient,
      );

      // Assert
      expect(mapSdkToMetadataSplitsReceiver).toHaveBeenCalledTimes(3);
      expect(mapToOnChainSplitsReceiver).toHaveBeenCalledTimes(3);
      expect(validateAndFormatSplitsReceivers).toHaveBeenCalledWith(
        mockMixedOnChainReceivers,
      );
    });
  });

  describe('error handling', () => {
    it('should propagate getChainId errors', async () => {
      // Arrange
      const chainIdError = new Error('Failed to get chain ID');
      vi.mocked(mockAdapter.getChainId).mockRejectedValue(chainIdError);

      // Act & Assert
      await expect(
        prepareDripListUpdate(
          mockAdapter,
          mockIpfsMetadataUploader,
          validUpdateConfig,
          mockGraphQLClient,
        ),
      ).rejects.toThrow(chainIdError);
      expect(requireWriteAccess).not.toHaveBeenCalled();
      expect(requireSupportedChain).not.toHaveBeenCalled();
    });

    it('should propagate chain validation errors', async () => {
      // Arrange
      const chainError = new DripsError('Unsupported chain ID: 999');
      vi.mocked(requireSupportedChain).mockImplementation(() => {
        throw chainError;
      });

      // Act & Assert
      await expect(
        prepareDripListUpdate(
          mockAdapter,
          mockIpfsMetadataUploader,
          validUpdateConfig,
          mockGraphQLClient,
        ),
      ).rejects.toThrow(chainError);
      expect(getDripListById).not.toHaveBeenCalled();
    });

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
        prepareDripListUpdate(
          mockAdapter,
          mockIpfsMetadataUploader,
          validUpdateConfig,
          mockGraphQLClient,
        ),
      ).rejects.toThrow(accessError);
      expect(getDripListById).not.toHaveBeenCalled();
    });

    it('should throw error when drip list not found', async () => {
      // Arrange
      vi.mocked(getDripListById).mockResolvedValue(null);

      // Act & Assert
      await expect(
        prepareDripListUpdate(
          mockAdapter,
          mockIpfsMetadataUploader,
          validUpdateConfig,
          mockGraphQLClient,
        ),
      ).rejects.toThrow(
        new DripsError(`Drip list with ID ${mockDripListId} not found`, {
          meta: {
            operation: 'prepareDripListUpdate',
          },
        }),
      );
      expect(buildDripListMetadata).not.toHaveBeenCalled();
    });

    it('should throw error when nothing to update', async () => {
      // Arrange
      const emptyConfig = {
        dripListId: mockDripListId,
      };

      // Act & Assert
      await expect(
        prepareDripListUpdate(
          mockAdapter,
          mockIpfsMetadataUploader,
          emptyConfig,
          mockGraphQLClient,
        ),
      ).rejects.toThrow(
        new DripsError('Nothing to update: no receivers or metadata provided', {
          meta: {operation: 'prepareDripListUpdate'},
        }),
      );
      expect(buildDripListMetadata).not.toHaveBeenCalled();
    });

    it('should propagate getDripListById errors', async () => {
      // Arrange
      const getDripListError = new Error('Failed to get drip list');
      vi.mocked(getDripListById).mockRejectedValue(getDripListError);

      // Act & Assert
      await expect(
        prepareDripListUpdate(
          mockAdapter,
          mockIpfsMetadataUploader,
          validUpdateConfig,
          mockGraphQLClient,
        ),
      ).rejects.toThrow(getDripListError);
      expect(buildDripListMetadata).not.toHaveBeenCalled();
    });

    it('should propagate IPFS upload errors', async () => {
      // Arrange
      const ipfsError = new Error('IPFS upload failed');
      vi.mocked(mockIpfsMetadataUploader).mockRejectedValue(ipfsError);

      // Act & Assert
      await expect(
        prepareDripListUpdate(
          mockAdapter,
          mockIpfsMetadataUploader,
          validUpdateConfig,
          mockGraphQLClient,
        ),
      ).rejects.toThrow(ipfsError);
      expect(encodeMetadataKeyValue).not.toHaveBeenCalled();
    });

    it('should propagate mapSdkToMetadataSplitsReceiver errors', async () => {
      // Arrange
      const mapError = new Error('Failed to map receiver to metadata format');
      vi.mocked(mapSdkToMetadataSplitsReceiver).mockReset();
      vi.mocked(mapSdkToMetadataSplitsReceiver).mockRejectedValueOnce(mapError);

      // Act & Assert
      await expect(
        prepareDripListUpdate(
          mockAdapter,
          mockIpfsMetadataUploader,
          validUpdateConfig,
          mockGraphQLClient,
        ),
      ).rejects.toThrow(mapError);
      expect(buildDripListMetadata).not.toHaveBeenCalled();
    });

    it('should propagate mapToOnChainSplitsReceiver errors', async () => {
      // Arrange
      const mapError = new Error('Failed to map receiver to on-chain format');
      vi.mocked(mapToOnChainSplitsReceiver).mockReset();
      vi.mocked(mapToOnChainSplitsReceiver).mockRejectedValueOnce(mapError);

      // Act & Assert
      await expect(
        prepareDripListUpdate(
          mockAdapter,
          mockIpfsMetadataUploader,
          validUpdateConfig,
          mockGraphQLClient,
        ),
      ).rejects.toThrow(mapError);
      expect(validateAndFormatSplitsReceivers).not.toHaveBeenCalled();
    });

    it('should propagate splits receiver validation errors', async () => {
      // Arrange
      const validationError = new Error('Invalid splits receivers');
      vi.mocked(validateAndFormatSplitsReceivers).mockImplementation(() => {
        throw validationError;
      });

      // Act & Assert
      await expect(
        prepareDripListUpdate(
          mockAdapter,
          mockIpfsMetadataUploader,
          validUpdateConfig,
          mockGraphQLClient,
        ),
      ).rejects.toThrow(validationError);
    });

    it('should propagate metadata encoding errors', async () => {
      // Arrange
      const encodingError = new Error('Failed to encode metadata');
      vi.mocked(encodeMetadataKeyValue).mockImplementation(() => {
        throw encodingError;
      });

      // Act & Assert
      await expect(
        prepareDripListUpdate(
          mockAdapter,
          mockIpfsMetadataUploader,
          validUpdateConfig,
          mockGraphQLClient,
        ),
      ).rejects.toThrow(encodingError);
    });

    it('should propagate transaction building errors', async () => {
      // Arrange
      const txError = new Error('Failed to build transaction');
      vi.mocked(buildTx).mockReset();
      vi.mocked(buildTx).mockImplementationOnce(() => {
        throw txError;
      });

      // Act & Assert
      await expect(
        prepareDripListUpdate(
          mockAdapter,
          mockIpfsMetadataUploader,
          validUpdateConfig,
          mockGraphQLClient,
        ),
      ).rejects.toThrow(txError);
    });
  });

  describe('edge cases', () => {
    it('should handle zero drip list ID', async () => {
      // Arrange
      const configWithZeroId = {
        ...validUpdateConfig,
        dripListId: 0n,
      };

      // Act
      const result = await prepareDripListUpdate(
        mockAdapter,
        mockIpfsMetadataUploader,
        configWithZeroId,
        mockGraphQLClient,
      );

      // Assert
      expect(getDripListById).toHaveBeenCalledWith(
        0n,
        mockChainId,
        mockGraphQLClient,
      );
      expect(buildDripListMetadata).toHaveBeenCalledWith(
        expect.objectContaining({
          dripListId: 0n,
        }),
      );
      expect(result.preparedTx).toBe(mockBatchedTx);
    });

    it('should handle large drip list ID', async () => {
      // Arrange
      const largeDripListId = BigInt(
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      );
      const configWithLargeId = {
        ...validUpdateConfig,
        dripListId: largeDripListId,
      };

      // Act
      const result = await prepareDripListUpdate(
        mockAdapter,
        mockIpfsMetadataUploader,
        configWithLargeId,
        mockGraphQLClient,
      );

      // Assert
      expect(getDripListById).toHaveBeenCalledWith(
        largeDripListId,
        mockChainId,
        mockGraphQLClient,
      );
      expect(buildDripListMetadata).toHaveBeenCalledWith(
        expect.objectContaining({
          dripListId: largeDripListId,
        }),
      );
      expect(result.preparedTx).toBe(mockBatchedTx);
    });

    it('should handle empty string metadata values', async () => {
      // Arrange
      const configWithEmptyStrings = {
        dripListId: mockDripListId,
        metadata: {
          name: '',
          description: '',
          isVisible: false,
        },
      };

      // Act
      await prepareDripListUpdate(
        mockAdapter,
        mockIpfsMetadataUploader,
        configWithEmptyStrings,
        mockGraphQLClient,
      );

      // Assert
      expect(buildDripListMetadata).toHaveBeenCalledWith({
        dripListId: mockDripListId,
        receivers: expect.any(Array),
        name: '',
        isVisible: false,
        description: '',
      });
    });

    it('should handle drip list with null metadata fields', async () => {
      // Arrange
      const dripListWithNullFields = {
        ...mockExistingDripList,
        name: 'Default Name', // name is required in the type
        description: null,
      };
      vi.mocked(getDripListById).mockResolvedValue(dripListWithNullFields);

      const configWithMetadata = {
        dripListId: mockDripListId,
        metadata: {
          name: 'New Name',
        },
      };

      // Act
      await prepareDripListUpdate(
        mockAdapter,
        mockIpfsMetadataUploader,
        configWithMetadata,
        mockGraphQLClient,
      );

      // Assert
      expect(buildDripListMetadata).toHaveBeenCalledWith({
        dripListId: mockDripListId,
        receivers: expect.any(Array),
        name: 'New Name',
        isVisible: true,
        description: null, // Should use existing null value
      });
    });

    it('should handle drip list with empty splits array', async () => {
      // Arrange
      const dripListWithEmptySplits = {
        ...mockExistingDripList,
        splits: [],
      };
      vi.mocked(getDripListById).mockResolvedValue(dripListWithEmptySplits);

      const configWithMetadata = {
        dripListId: mockDripListId,
        metadata: {
          name: 'Updated Name',
        },
      };

      // Act
      await prepareDripListUpdate(
        mockAdapter,
        mockIpfsMetadataUploader,
        configWithMetadata,
        mockGraphQLClient,
      );

      // Assert
      expect(mapApiToMetadataSplitsReceiver).not.toHaveBeenCalled();
      expect(buildDripListMetadata).toHaveBeenCalledWith({
        dripListId: mockDripListId,
        receivers: [],
        name: 'Updated Name',
        isVisible: true,
        description: 'Existing description',
      });
    });
  });

  describe('transaction structure validation', () => {
    it('should build emit metadata transaction with correct parameters', async () => {
      // Act
      await prepareDripListUpdate(
        mockAdapter,
        mockIpfsMetadataUploader,
        validUpdateConfig,
        mockGraphQLClient,
      );

      // Assert
      expect(buildTx).toHaveBeenNthCalledWith(1, {
        abi: expect.any(Array), // addressDriverAbi
        functionName: 'emitAccountMetadata',
        args: [[mockEncodedMetadata]],
        contract: expect.any(String),
      });
    });

    it('should build setSplits transaction with correct parameters when receivers provided', async () => {
      // Act
      await prepareDripListUpdate(
        mockAdapter,
        mockIpfsMetadataUploader,
        validUpdateConfig,
        mockGraphQLClient,
      );

      // Assert
      expect(buildTx).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          abi: expect.any(Array), // nftDriverAbi
          functionName: 'setSplits',
          args: [mockDripListId, mockFormattedReceivers],
          contract: expect.any(String),
        }),
      );
    });

    it('should build batched transaction with correct parameters', async () => {
      // Act
      await prepareDripListUpdate(
        mockAdapter,
        mockIpfsMetadataUploader,
        validUpdateConfig,
        mockGraphQLClient,
      );

      // Assert
      expect(buildTx).toHaveBeenNthCalledWith(3, {
        abi: expect.any(Array), // callerAbi
        contract: expect.any(String),
        functionName: 'callBatched',
        args: [[mockCallerCall1, mockCallerCall2]],
        batchedTxOverrides: undefined,
      });
    });

    it('should convert transactions to caller calls', async () => {
      // Act
      await prepareDripListUpdate(
        mockAdapter,
        mockIpfsMetadataUploader,
        validUpdateConfig,
        mockGraphQLClient,
      );

      // Assert
      expect(convertToCallerCall).toHaveBeenCalledTimes(2);
      expect(convertToCallerCall).toHaveBeenCalledWith(
        mockEmitMetadataTx,
        expect.any(Number),
        expect.any(Array),
      );
      expect(convertToCallerCall).toHaveBeenCalledWith(
        mockSetSplitsTx,
        expect.any(Number),
        expect.any(Array),
      );
    });

    it('should only include emit metadata transaction when no receivers provided', async () => {
      // Arrange
      const metadataOnlyConfig = {
        dripListId: mockDripListId,
        metadata: {
          name: 'New Name Only',
        },
      };

      vi.mocked(buildTx).mockReset();
      vi.mocked(buildTx)
        .mockReturnValueOnce(mockEmitMetadataTx)
        .mockReturnValueOnce(mockBatchedTx);

      vi.mocked(convertToCallerCall).mockReset();
      vi.mocked(convertToCallerCall).mockReturnValueOnce(mockCallerCall1);

      // Act
      await prepareDripListUpdate(
        mockAdapter,
        mockIpfsMetadataUploader,
        metadataOnlyConfig,
        mockGraphQLClient,
      );

      // Assert
      expect(buildTx).toHaveBeenCalledTimes(2); // Only emit metadata and batched tx
      expect(convertToCallerCall).toHaveBeenCalledTimes(1);
      expect(convertToCallerCall).toHaveBeenCalledWith(
        mockEmitMetadataTx,
        expect.any(Number),
        expect.any(Array),
      );
    });
  });

  describe('function call order', () => {
    it('should call functions in correct order', async () => {
      // Arrange
      const callOrder: string[] = [];
      vi.mocked(requireSupportedChain).mockImplementation(() => {
        callOrder.push('requireSupportedChain');
      });
      vi.mocked(requireWriteAccess).mockImplementation(() => {
        callOrder.push('requireWriteAccess');
      });
      vi.mocked(getDripListById).mockImplementation(async () => {
        callOrder.push('getDripListById');
        return mockExistingDripList;
      });
      vi.mocked(mapSdkToMetadataSplitsReceiver).mockImplementation(async () => {
        callOrder.push('mapSdkToMetadataSplitsReceiver');
        return {
          type: 'address',
          weight: 600000,
          accountId: '111',
        };
      });
      vi.mocked(buildDripListMetadata).mockImplementation(() => {
        callOrder.push('buildDripListMetadata');
        return mockMetadata;
      });
      vi.mocked(mockIpfsMetadataUploader).mockImplementation(async () => {
        callOrder.push('ipfsMetadataUploader');
        return mockIpfsHash;
      });
      vi.mocked(mapToOnChainSplitsReceiver).mockImplementation(async () => {
        callOrder.push('mapToOnChainSplitsReceiver');
        return {
          accountId: 111n,
          weight: 600000,
        };
      });

      // Act
      await prepareDripListUpdate(
        mockAdapter,
        mockIpfsMetadataUploader,
        validUpdateConfig,
        mockGraphQLClient,
      );

      // Assert
      expect(callOrder).toContain('requireSupportedChain');
      expect(callOrder).toContain('requireWriteAccess');
      expect(callOrder).toContain('getDripListById');
      expect(callOrder).toContain('buildDripListMetadata');
      expect(callOrder).toContain('ipfsMetadataUploader');

      // Check the relative order of key functions
      expect(callOrder.indexOf('requireSupportedChain')).toBeLessThan(
        callOrder.indexOf('requireWriteAccess'),
      );
      expect(callOrder.indexOf('requireWriteAccess')).toBeLessThan(
        callOrder.indexOf('getDripListById'),
      );
      expect(callOrder.indexOf('getDripListById')).toBeLessThan(
        callOrder.indexOf('buildDripListMetadata'),
      );
      expect(callOrder.indexOf('buildDripListMetadata')).toBeLessThan(
        callOrder.indexOf('ipfsMetadataUploader'),
      );
    });
  });
});
