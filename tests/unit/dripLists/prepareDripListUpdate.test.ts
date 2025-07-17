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
import {
  SupportedChain,
  Driver,
} from '../../../src/internal/graphql/__generated__/base-types';

vi.mock('../../../src/internal/shared/assertions', () => ({
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
  parseSplitsReceivers: vi.fn(),
  mapApiSplitsToSdkSplitsReceivers: vi.fn(),
}));

vi.mock('../../../src/internal/drip-lists/buildDripListMetadata', () => ({
  buildDripListMetadata: vi.fn(),
}));

vi.mock('../../../src/internal/drip-lists/getDripListById', () => ({
  getDripListById: vi.fn(),
}));

import {requireSupportedChain} from '../../../src/internal/shared/assertions';
import {buildTx} from '../../../src/internal/shared/buildTx';
import {convertToCallerCall} from '../../../src/internal/shared/convertToCallerCall';
import {encodeMetadataKeyValue} from '../../../src/internal/shared/encodeMetadataKeyValue';
import {buildDripListMetadata} from '../../../src/internal/drip-lists/buildDripListMetadata';
import {getDripListById} from '../../../src/internal/drip-lists/getDripListById';
import {
  parseSplitsReceivers,
  mapApiSplitsToSdkSplitsReceivers,
} from '../../../src/internal/shared/receiverUtils';

describe('prepareDripListUpdate', () => {
  const mockAdapter: WriteBlockchainAdapter = {
    call: vi.fn(),
    getChainId: vi.fn(),
    getAddress: vi.fn(),
    sendTx: vi.fn(),
    signMsg: vi.fn(),
  };

  const mockIpfsMetadataUploader: IpfsMetadataUploaderFn<DripListMetadata> =
    vi.fn();

  const mockGraphqlClient = {} as DripsGraphQLClient;

  const mockDripListId = 999n;
  const validConfig = {
    dripListId: mockDripListId,
    metadata: {
      name: 'Updated Test Drip List',
      description: 'An updated test drip list',
      isVisible: false,
    },
    receivers: [
      {
        type: 'address' as const,
        address: '0x1234567890123456789012345678901234567890' as const,
        weight: 600000,
      },
      {
        type: 'address' as const,
        address: '0x9876543210987654321098765432109876543210' as const,
        weight: 400000,
      },
    ],
  };

  const mockExistingDripList = {
    __typename: 'DripList' as const,
    chain: SupportedChain.Sepolia,
    description: 'Original description',
    isVisible: true,
    lastProcessedIpfsHash: null,
    latestMetadataIpfsHash: null,
    latestVotingRoundId: null,
    name: 'Original Test Drip List',
    creator: '0x1234567890123456789012345678901234567890',
    owner: {
      __typename: 'AddressDriverAccount' as const,
      accountId: '999',
      driver: Driver.Address,
      address: '0x1234567890123456789012345678901234567890' as const,
    },
    previousOwnerAddress: '0x0000000000000000000000000000000000000000',
    account: {
      __typename: 'NftDriverAccount' as const,
      accountId: '999',
      driver: Driver.Nft,
    },
    splits: [
      {
        __typename: 'AddressReceiver' as const,
        weight: 500000,
        account: {
          __typename: 'AddressDriverAccount' as const,
          accountId: '123',
          driver: Driver.Address,
          address: '0x1234567890123456789012345678901234567890' as const,
        },
      },
      {
        __typename: 'AddressReceiver' as const,
        weight: 500000,
        account: {
          __typename: 'AddressDriverAccount' as const,
          accountId: '456',
          driver: Driver.Address,
          address: '0x9876543210987654321098765432109876543210' as const,
        },
      },
    ],
    support: [],
    totalEarned: [],
  };

  const mockIpfsHash = '0xipfshash' as const;
  const mockMetadata = {
    type: 'dripList' as const,
    driver: 'nft' as const,
    describes: {
      driver: 'nft' as const,
      accountId: '999',
    },
    isVisible: false,
    name: 'Updated Test Drip List',
    description: 'An updated test drip list',
    recipients: [],
  };
  const mockOnChainReceivers = [
    {accountId: 123n, weight: 600000},
    {accountId: 456n, weight: 400000},
  ];
  const mockMetadataReceivers = [
    {
      type: 'address' as const,
      accountId: '123',
      weight: 600000,
    },
    {
      type: 'address' as const,
      accountId: '456',
      weight: 400000,
    },
  ];
  const mockEncodedMetadata = {
    key: '0x757365722d6d65746164617461' as const,
    value: '0xipfshash' as const,
  };
  const mockEmitMetadataTx: PreparedTx = {
    to: '0xdC773a04C0D6EFdb80E7dfF961B6a7B063a28B44' as const,
    data: '0xemitmetadata' as const,
    abiFunctionName: 'emitAccountMetadata',
  };
  const mockSetSplitsTx: PreparedTx = {
    to: '0xdC773a04C0D6EFdb80E7dfF961B6a7B063a28B44' as const,
    data: '0xsetsplitsdata' as const,
    abiFunctionName: 'setSplits',
  };
  const mockCallerCall1 = {
    target: '0xdC773a04C0D6EFdb80E7dfF961B6a7B063a28B44' as const,
    data: '0xemitmetadata' as const,
    value: 0n,
  };
  const mockCallerCall2 = {
    target: '0xdC773a04C0D6EFdb80E7dfF961B6a7B063a28B44' as const,
    data: '0xsetsplitsdata' as const,
    value: 0n,
  };
  const mockBatchedTx: PreparedTx = {
    to: '0x09e04Cb8168bd0E8773A79Cc2099f19C46776Fee' as const,
    data: '0xbatcheddata' as const,
    abiFunctionName: 'callBatched',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all mocks to their default successful behavior
    vi.mocked(mockAdapter.getChainId).mockResolvedValue(11155111);
    vi.mocked(requireSupportedChain).mockImplementation(() => {});
    vi.mocked(getDripListById).mockResolvedValue(mockExistingDripList);
    vi.mocked(mapApiSplitsToSdkSplitsReceivers).mockReturnValue([]);
    vi.mocked(parseSplitsReceivers).mockResolvedValue({
      onChain: mockOnChainReceivers,
      metadata: mockMetadataReceivers,
    });
    vi.mocked(buildDripListMetadata).mockReturnValue(mockMetadata);
    vi.mocked(mockIpfsMetadataUploader).mockResolvedValue(mockIpfsHash);
    vi.mocked(encodeMetadataKeyValue).mockReturnValue(mockEncodedMetadata);
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
        validConfig,
        mockGraphqlClient,
      );

      // Assert
      expect(mockAdapter.getChainId).toHaveBeenCalled();
      expect(requireSupportedChain).toHaveBeenCalledWith(11155111);
      expect(getDripListById).toHaveBeenCalledWith(
        mockDripListId,
        11155111,
        mockGraphqlClient,
      );
      expect(parseSplitsReceivers).toHaveBeenCalledWith(
        mockAdapter,
        validConfig.receivers,
      );
      expect(buildDripListMetadata).toHaveBeenCalledWith({
        dripListId: mockDripListId,
        receivers: mockMetadataReceivers,
        name: validConfig.metadata!.name,
        isVisible: validConfig.metadata!.isVisible,
        description: validConfig.metadata!.description,
      });
      expect(mockIpfsMetadataUploader).toHaveBeenCalledWith(mockMetadata);
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

    it('should prepare drip list update with only metadata', async () => {
      // Arrange
      const configWithOnlyMetadata = {
        dripListId: mockDripListId,
        metadata: {
          name: 'Updated Name Only',
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
        configWithOnlyMetadata,
        mockGraphqlClient,
      );

      // Assert
      expect(mapApiSplitsToSdkSplitsReceivers).toHaveBeenCalledWith(
        mockExistingDripList.splits,
      );
      expect(buildDripListMetadata).toHaveBeenCalledWith({
        dripListId: mockDripListId,
        receivers: mockMetadataReceivers,
        name: 'Updated Name Only',
        isVisible: mockExistingDripList.isVisible,
        description: mockExistingDripList.description,
      });
      // Should only build emit metadata tx, not setSplits tx
      expect(buildTx).toHaveBeenCalledTimes(2); // emit metadata + batched
      expect(convertToCallerCall).toHaveBeenCalledTimes(1); // only emit metadata
    });

    it('should prepare drip list update with only receivers', async () => {
      // Arrange
      const configWithOnlyReceivers = {
        dripListId: mockDripListId,
        receivers: validConfig.receivers,
      };

      // Act
      await prepareDripListUpdate(
        mockAdapter,
        mockIpfsMetadataUploader,
        configWithOnlyReceivers,
        mockGraphqlClient,
      );

      // Assert
      expect(buildDripListMetadata).toHaveBeenCalledWith({
        dripListId: mockDripListId,
        receivers: mockMetadataReceivers,
        name: mockExistingDripList.name,
        isVisible: mockExistingDripList.isVisible,
        description: mockExistingDripList.description,
      });
      // Should build both emit metadata and setSplits txs
      expect(buildTx).toHaveBeenCalledTimes(3); // emit metadata + setSplits + batched
      expect(convertToCallerCall).toHaveBeenCalledTimes(2); // both txs
    });

    it('should use existing drip list values when metadata fields are not provided', async () => {
      // Arrange
      const configWithPartialMetadata = {
        dripListId: mockDripListId,
        metadata: {
          name: 'New Name',
          // description and isVisible not provided
        },
      };

      // Act
      await prepareDripListUpdate(
        mockAdapter,
        mockIpfsMetadataUploader,
        configWithPartialMetadata,
        mockGraphqlClient,
      );

      // Assert
      expect(buildDripListMetadata).toHaveBeenCalledWith({
        dripListId: mockDripListId,
        receivers: mockMetadataReceivers,
        name: 'New Name',
        isVisible: mockExistingDripList.isVisible, // from existing
        description: mockExistingDripList.description, // from existing
      });
    });

    it('should handle batchedTxOverrides', async () => {
      // Arrange
      const configWithOverrides = {
        ...validConfig,
        batchedTxOverrides: {
          gasLimit: 500000n,
        },
      };

      // Act
      await prepareDripListUpdate(
        mockAdapter,
        mockIpfsMetadataUploader,
        configWithOverrides,
        mockGraphqlClient,
      );

      // Assert
      expect(buildTx).toHaveBeenNthCalledWith(3, {
        abi: expect.any(Array), // callerAbi
        contract: '0x09e04Cb8168bd0E8773A79Cc2099f19C46776Fee',
        functionName: 'callBatched',
        args: [[mockCallerCall2, mockCallerCall1]],
        batchedTxOverrides: {gasLimit: 500000n},
      });
    });
  });

  describe('error handling', () => {
    it('should throw error when drip list is not found', async () => {
      // Arrange
      vi.mocked(getDripListById).mockResolvedValue(null);

      // Act & Assert
      await expect(
        prepareDripListUpdate(
          mockAdapter,
          mockIpfsMetadataUploader,
          validConfig,
          mockGraphqlClient,
        ),
      ).rejects.toThrow(
        new DripsError(`Drip list with ID ${mockDripListId} not found`, {
          meta: {operation: 'prepareDripListUpdate'},
        }),
      );
    });

    it('should throw error when nothing to update', async () => {
      // Arrange
      const configWithNothing = {
        dripListId: mockDripListId,
        // no metadata or receivers
      };

      // Act & Assert
      await expect(
        prepareDripListUpdate(
          mockAdapter,
          mockIpfsMetadataUploader,
          configWithNothing,
          mockGraphqlClient,
        ),
      ).rejects.toThrow('Nothing to update: no receivers or metadata provided');
    });

    it('should propagate getChainId errors', async () => {
      // Arrange
      const chainIdError = new Error('Failed to get chain ID');
      vi.mocked(mockAdapter.getChainId).mockRejectedValue(chainIdError);

      // Act & Assert
      await expect(
        prepareDripListUpdate(
          mockAdapter,
          mockIpfsMetadataUploader,
          validConfig,
          mockGraphqlClient,
        ),
      ).rejects.toThrow(chainIdError);
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
          validConfig,
          mockGraphqlClient,
        ),
      ).rejects.toThrow(getDripListError);
    });

    it('should propagate parseSplitsReceivers errors', async () => {
      // Arrange
      const parseError = new Error('Invalid splits receivers');
      vi.mocked(parseSplitsReceivers).mockRejectedValue(parseError);

      // Act & Assert
      await expect(
        prepareDripListUpdate(
          mockAdapter,
          mockIpfsMetadataUploader,
          validConfig,
          mockGraphqlClient,
        ),
      ).rejects.toThrow(parseError);
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
          validConfig,
          mockGraphqlClient,
        ),
      ).rejects.toThrow(ipfsError);
    });
  });

  describe('transaction structure validation', () => {
    it('should build emit metadata transaction with correct parameters', async () => {
      // Act
      await prepareDripListUpdate(
        mockAdapter,
        mockIpfsMetadataUploader,
        validConfig,
        mockGraphqlClient,
      );

      // Assert
      expect(buildTx).toHaveBeenNthCalledWith(1, {
        abi: expect.any(Array), // nftDriverAbi
        functionName: 'emitAccountMetadata',
        args: [mockDripListId, [mockEncodedMetadata]],
        contract: '0xdC773a04C0D6EFdb80E7dfF961B6a7B063a28B44',
      });
    });

    it('should build setSplits transaction with correct parameters when receivers are provided', async () => {
      // Act
      await prepareDripListUpdate(
        mockAdapter,
        mockIpfsMetadataUploader,
        validConfig,
        mockGraphqlClient,
      );

      // Assert
      expect(buildTx).toHaveBeenNthCalledWith(2, {
        abi: expect.any(Array), // nftDriverAbi
        contract: '0xdC773a04C0D6EFdb80E7dfF961B6a7B063a28B44',
        functionName: 'setSplits',
        args: [mockDripListId, mockOnChainReceivers],
      });
    });

    it('should build batched transaction with correct parameters', async () => {
      // Act
      await prepareDripListUpdate(
        mockAdapter,
        mockIpfsMetadataUploader,
        validConfig,
        mockGraphqlClient,
      );

      // Assert
      expect(buildTx).toHaveBeenNthCalledWith(3, {
        abi: expect.any(Array), // callerAbi
        contract: '0x09e04Cb8168bd0E8773A79Cc2099f19C46776Fee',
        functionName: 'callBatched',
        args: [[mockCallerCall2, mockCallerCall1]],
        batchedTxOverrides: undefined,
      });
    });
  });
});
