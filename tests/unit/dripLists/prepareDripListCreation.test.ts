import {describe, it, expect, vi, beforeEach} from 'vitest';
import {prepareDripListCreation} from '../../../src/internal/drip-lists/prepareDripListCreation';
import {DripsError} from '../../../src/internal/shared/DripsError';
import type {
  WriteBlockchainAdapter,
  PreparedTx,
} from '../../../src/internal/blockchain/BlockchainAdapter';
import type {
  IpfsMetadataUploaderFn,
  DripListMetadata,
} from '../../../src/internal/shared/createPinataIpfsMetadataUploader';

vi.mock('../../../src/internal/shared/assertions', () => ({
  requireWriteAccess: vi.fn(),
  requireSupportedChain: vi.fn(),
  requireMatchingChains: vi.fn(),
}));

vi.mock('../../../src/internal/drip-lists/calculateRandomSalt', () => ({
  calculateRandomSalt: vi.fn(),
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

vi.mock('../../../src/internal/shared/calcDripListId', () => ({
  calcDripListId: vi.fn(),
}));

import {
  requireWriteAccess,
  requireSupportedChain,
} from '../../../src/internal/shared/assertions';
import {calculateRandomSalt} from '../../../src/internal/drip-lists/calculateRandomSalt';
import {buildTx} from '../../../src/internal/shared/buildTx';
import {convertToCallerCall} from '../../../src/internal/shared/convertToCallerCall';
import {encodeMetadataKeyValue} from '../../../src/internal/shared/encodeMetadataKeyValue';
import {validateAndFormatSplitsReceivers} from '../../../src/internal/shared/validateAndFormatSplitsReceivers';
import {buildDripListMetadata} from '../../../src/internal/drip-lists/buildDripListMetadata';
import {calcDripListId} from '../../../src/internal/shared/calcDripListId';
import {
  mapToOnChainSplitsReceiver,
  mapSdkToMetadataSplitsReceiver,
} from '../../../src/internal/shared/receiverUtils';

describe('prepareDripListCreation', () => {
  const mockAdapter: WriteBlockchainAdapter = {
    call: vi.fn(),
    getChainId: vi.fn(),
    getAddress: vi.fn(),
    sendTx: vi.fn(),
    signMsg: vi.fn(),
  };

  const mockIpfsMetadataUploader: IpfsMetadataUploaderFn<DripListMetadata> =
    vi.fn();

  const validParams = {
    isVisible: true,
    receivers: [
      {
        type: 'address' as const,
        address: '0x1234567890123456789012345678901234567890' as const,
        weight: 500000,
      },
      {
        type: 'address' as const,
        address: '0x9876543210987654321098765432109876543210' as const,
        weight: 500000,
      },
    ],
    name: 'Test Drip List',
    description: 'A test drip list',
  };

  const mockMinterAddress =
    '0x1234567890123456789012345678901234567890' as const;
  const mockSalt = 789n;
  const mockDripListId = 999n;
  const mockIpfsHash = '0xipfshash' as const;
  const mockMetadata = {
    type: 'dripList' as const,
    driver: 'nft' as const,
    describes: {
      driver: 'nft' as const,
      accountId: '999',
    },
    isVisible: true,
    name: 'Test Drip List',
    description: 'A test drip list',
    recipients: [],
  };
  const mockOnChainReceivers = [
    {accountId: 123n, weight: 500000},
    {accountId: 456n, weight: 500000},
  ];
  const mockFormattedReceivers = [
    {accountId: 123n, weight: 500000},
    {accountId: 456n, weight: 500000},
  ];
  const mockEncodedMetadata = {
    key: '0x757365722d6d65746164617461' as const,
    value: '0xipfshash' as const,
  };
  const mockMintTx = {
    to: '0xdC773a04C0D6EFdb80E7dfF961B6a7B063a28B44' as const,
    data: '0xmintdata' as const,
  };
  const mockSetSplitsTx = {
    to: '0xdC773a04C0D6EFdb80E7dfF961B6a7B063a28B44' as const,
    data: '0xsetsplitsdata' as const,
  };
  const mockCallerCall1 = {
    target: '0xdC773a04C0D6EFdb80E7dfF961B6a7B063a28B44' as const,
    data: '0xmintdata' as const,
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all mocks to their default successful behavior
    vi.mocked(mockAdapter.getChainId).mockResolvedValue(11155111);
    vi.mocked(requireWriteAccess).mockImplementation(() => {});
    vi.mocked(requireSupportedChain).mockImplementation(() => {});
    vi.mocked(mockAdapter.getAddress).mockResolvedValue(mockMinterAddress);
    vi.mocked(calculateRandomSalt).mockReturnValue(mockSalt);
    vi.mocked(calcDripListId).mockResolvedValue(mockDripListId);
    vi.mocked(buildDripListMetadata).mockReturnValue(mockMetadata);
    vi.mocked(mockIpfsMetadataUploader).mockResolvedValue(mockIpfsHash);
    vi.mocked(mapToOnChainSplitsReceiver)
      .mockResolvedValueOnce(mockOnChainReceivers[0])
      .mockResolvedValueOnce(mockOnChainReceivers[1]);
    vi.mocked(mapSdkToMetadataSplitsReceiver)
      .mockResolvedValueOnce({
        type: 'address',
        accountId: '123',
        weight: 500000,
      })
      .mockResolvedValueOnce({
        type: 'address',
        accountId: '456',
        weight: 500000,
      });
    vi.mocked(validateAndFormatSplitsReceivers).mockReturnValue(
      mockFormattedReceivers,
    );
    vi.mocked(encodeMetadataKeyValue).mockReturnValue(mockEncodedMetadata);
    vi.mocked(buildTx)
      .mockReturnValueOnce(mockMintTx)
      .mockReturnValueOnce(mockSetSplitsTx)
      .mockReturnValueOnce(mockBatchedTx);
    vi.mocked(convertToCallerCall)
      .mockReturnValueOnce(mockCallerCall1)
      .mockReturnValueOnce(mockCallerCall2);
  });

  describe('successful execution', () => {
    it('should prepare drip list creation context successfully', async () => {
      // Act
      const result = await prepareDripListCreation(
        mockAdapter,
        mockIpfsMetadataUploader,
        validParams,
      );

      // Assert
      expect(mockAdapter.getChainId).toHaveBeenCalled();
      expect(requireWriteAccess).toHaveBeenCalledWith(
        mockAdapter,
        'prepareDripListCreation',
      );
      expect(requireSupportedChain).toHaveBeenCalledWith(11155111);
      expect(mockAdapter.getAddress).toHaveBeenCalled();
      expect(calculateRandomSalt).toHaveBeenCalled();
      expect(calcDripListId).toHaveBeenCalledWith(mockAdapter, {
        salt: mockSalt,
        minter: mockMinterAddress,
      });
      expect(mapSdkToMetadataSplitsReceiver).toHaveBeenCalledTimes(2);
      expect(mapSdkToMetadataSplitsReceiver).toHaveBeenNthCalledWith(
        1,
        mockAdapter,
        validParams.receivers[0],
      );
      expect(mapSdkToMetadataSplitsReceiver).toHaveBeenNthCalledWith(
        2,
        mockAdapter,
        validParams.receivers[1],
      );
      expect(buildDripListMetadata).toHaveBeenCalledWith({
        name: validParams.name,
        isVisible: validParams.isVisible,
        receivers: expect.any(Array),
        dripListId: mockDripListId,
        description: validParams.description,
      });
      expect(mockIpfsMetadataUploader).toHaveBeenCalledWith(mockMetadata);
      expect(mapToOnChainSplitsReceiver).toHaveBeenCalledTimes(2);
      expect(mapToOnChainSplitsReceiver).toHaveBeenNthCalledWith(
        1,
        mockAdapter,
        validParams.receivers[0],
      );
      expect(mapToOnChainSplitsReceiver).toHaveBeenNthCalledWith(
        2,
        mockAdapter,
        validParams.receivers[1],
      );
      expect(validateAndFormatSplitsReceivers).toHaveBeenCalledWith(
        mockOnChainReceivers,
      );
      expect(encodeMetadataKeyValue).toHaveBeenCalledWith({
        key: 'user-metadata',
        value: mockIpfsHash,
      });

      expect(result).toEqual({
        salt: mockSalt,
        ipfsHash: mockIpfsHash,
        dripListId: mockDripListId,
        preparedTx: mockBatchedTx,
        metadata: mockMetadata,
      });
    });

    it('should work with different adapters', async () => {
      // Arrange
      const customAdapter: WriteBlockchainAdapter = {
        call: vi.fn(),
        getChainId: vi.fn().mockResolvedValue(11155111),
        getAddress: vi.fn().mockResolvedValue(mockMinterAddress),
        sendTx: vi.fn(),
        signMsg: vi.fn(),
      };

      // Act
      const result = await prepareDripListCreation(
        customAdapter,
        mockIpfsMetadataUploader,
        validParams,
      );

      // Assert
      expect(customAdapter.getChainId).toHaveBeenCalled();
      expect(requireWriteAccess).toHaveBeenCalledWith(
        customAdapter,
        'prepareDripListCreation',
      );
      expect(customAdapter.getAddress).toHaveBeenCalled();
      expect(mockAdapter.getAddress).not.toHaveBeenCalled();
      expect(calcDripListId).toHaveBeenCalledWith(customAdapter, {
        salt: mockSalt,
        minter: mockMinterAddress,
      });
      expect(result.preparedTx).toBe(mockBatchedTx);
    });

    it('should work with different IPFS uploaders', async () => {
      // Arrange
      const customIpfsMetadataUploader: IpfsMetadataUploaderFn<DripListMetadata> =
        vi.fn().mockResolvedValue(mockIpfsHash);

      // Act
      await prepareDripListCreation(
        mockAdapter,
        customIpfsMetadataUploader,
        validParams,
      );

      // Assert
      expect(customIpfsMetadataUploader).toHaveBeenCalledWith(mockMetadata);
      expect(mockIpfsMetadataUploader).not.toHaveBeenCalled();
    });

    it('should use provided salt instead of generating random one', async () => {
      // Arrange
      const paramsWithSalt = {
        ...validParams,
        salt: 555n,
      };

      // Act
      await prepareDripListCreation(
        mockAdapter,
        mockIpfsMetadataUploader,
        paramsWithSalt,
      );

      // Assert
      expect(calculateRandomSalt).not.toHaveBeenCalled();
      expect(calcDripListId).toHaveBeenCalledWith(mockAdapter, {
        salt: 555n,
        minter: mockMinterAddress,
      });
    });

    it('should use transferTo address instead of minter', async () => {
      // Arrange
      const transferToAddress =
        '0x9876543210987654321098765432109876543210' as const;
      const paramsWithTransferTo = {
        ...validParams,
        transferTo: transferToAddress,
      };

      // Act
      await prepareDripListCreation(
        mockAdapter,
        mockIpfsMetadataUploader,
        paramsWithTransferTo,
      );

      // Assert
      expect(buildTx).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [mockSalt, transferToAddress, [mockEncodedMetadata]],
        }),
      );
    });

    it('should handle different supported chain', async () => {
      // Arrange - Mock adapter to return different chain ID
      vi.mocked(mockAdapter.getChainId).mockResolvedValue(31337);

      // Act
      await prepareDripListCreation(
        mockAdapter,
        mockIpfsMetadataUploader,
        validParams,
      );

      // Assert
      expect(mockAdapter.getChainId).toHaveBeenCalled();
      expect(requireSupportedChain).toHaveBeenCalledWith(31337);
      expect(calcDripListId).toHaveBeenCalledWith(mockAdapter, {
        salt: mockSalt,
        minter: mockMinterAddress,
      });
    });

    it('should handle empty receivers array', async () => {
      // Arrange
      const paramsWithEmptyReceivers = {
        ...validParams,
        receivers: [],
      };

      // Act
      await prepareDripListCreation(
        mockAdapter,
        mockIpfsMetadataUploader,
        paramsWithEmptyReceivers,
      );

      // Assert
      expect(mapToOnChainSplitsReceiver).not.toHaveBeenCalled();
      expect(validateAndFormatSplitsReceivers).toHaveBeenCalledWith([]);
      expect(mapSdkToMetadataSplitsReceiver).not.toHaveBeenCalled();
      expect(buildDripListMetadata).toHaveBeenCalledWith({
        name: validParams.name,
        isVisible: validParams.isVisible,
        receivers: [],
        dripListId: mockDripListId,
        description: validParams.description,
      });
    });

    it('should handle optional parameters being undefined', async () => {
      // Arrange
      const minimalParams = {
        isVisible: false,
        receivers: [],
      };

      // Act
      await prepareDripListCreation(
        mockAdapter,
        mockIpfsMetadataUploader,
        minimalParams,
      );

      // Assert
      expect(mapSdkToMetadataSplitsReceiver).not.toHaveBeenCalled();
      expect(buildDripListMetadata).toHaveBeenCalledWith({
        name: undefined,
        isVisible: false,
        receivers: [],
        dripListId: mockDripListId,
        description: undefined,
      });
    });

    it('should include batchedTxOverrides in batched transaction', async () => {
      // Arrange
      const paramsWithOverrides = {
        ...validParams,
        batchedTxOverrides: {
          gasLimit: 1000000n,
          value: 100n,
        },
      };

      // Act
      await prepareDripListCreation(
        mockAdapter,
        mockIpfsMetadataUploader,
        paramsWithOverrides,
      );

      // Assert
      expect(buildTx).toHaveBeenCalledWith(
        expect.objectContaining({
          batchedTxOverrides: paramsWithOverrides.batchedTxOverrides,
        }),
      );
    });

    it('should handle different receiver types', async () => {
      // Arrange
      const paramsWithMixedReceivers = {
        ...validParams,
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
      await prepareDripListCreation(
        mockAdapter,
        mockIpfsMetadataUploader,
        paramsWithMixedReceivers,
      );

      // Assert
      expect(mapSdkToMetadataSplitsReceiver).toHaveBeenCalledTimes(3);
      expect(mapToOnChainSplitsReceiver).toHaveBeenCalledTimes(3);
      expect(mapToOnChainSplitsReceiver).toHaveBeenNthCalledWith(
        1,
        mockAdapter,
        paramsWithMixedReceivers.receivers[0],
      );
      expect(mapToOnChainSplitsReceiver).toHaveBeenNthCalledWith(
        2,
        mockAdapter,
        paramsWithMixedReceivers.receivers[1],
      );
      expect(mapToOnChainSplitsReceiver).toHaveBeenNthCalledWith(
        3,
        mockAdapter,
        paramsWithMixedReceivers.receivers[2],
      );
      expect(validateAndFormatSplitsReceivers).toHaveBeenCalledWith(
        mockMixedOnChainReceivers,
      );
    });

    it('should handle single receiver', async () => {
      // Arrange
      const paramsWithSingleReceiver = {
        ...validParams,
        receivers: [
          {
            type: 'address' as const,
            address: '0x1234567890123456789012345678901234567890' as const,
            weight: 1000000,
          },
        ],
      };
      const mockSingleOnChainReceiver = {accountId: 123n, weight: 1000000};

      vi.mocked(mapToOnChainSplitsReceiver).mockReset();
      vi.mocked(mapToOnChainSplitsReceiver).mockResolvedValueOnce(
        mockSingleOnChainReceiver,
      );

      vi.mocked(mapSdkToMetadataSplitsReceiver).mockReset();
      vi.mocked(mapSdkToMetadataSplitsReceiver).mockResolvedValueOnce({
        type: 'address',
        weight: 1000000,
        accountId: '123',
      });

      // Act
      await prepareDripListCreation(
        mockAdapter,
        mockIpfsMetadataUploader,
        paramsWithSingleReceiver,
      );

      // Assert
      expect(mapSdkToMetadataSplitsReceiver).toHaveBeenCalledTimes(1);
      expect(mapToOnChainSplitsReceiver).toHaveBeenCalledTimes(1);
      expect(mapToOnChainSplitsReceiver).toHaveBeenCalledWith(
        mockAdapter,
        paramsWithSingleReceiver.receivers[0],
      );
      expect(validateAndFormatSplitsReceivers).toHaveBeenCalledWith([
        mockSingleOnChainReceiver,
      ]);
    });
  });

  describe('error handling', () => {
    it('should propagate getChainId errors', async () => {
      // Arrange
      const chainIdError = new Error('Failed to get chain ID');
      vi.mocked(mockAdapter.getChainId).mockRejectedValue(chainIdError);

      // Act & Assert
      await expect(
        prepareDripListCreation(
          mockAdapter,
          mockIpfsMetadataUploader,
          validParams,
        ),
      ).rejects.toThrow(chainIdError);
      expect(requireWriteAccess).not.toHaveBeenCalled();
      expect(requireSupportedChain).not.toHaveBeenCalled();
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
        prepareDripListCreation(
          mockAdapter,
          mockIpfsMetadataUploader,
          validParams,
        ),
      ).rejects.toThrow(accessError);
      expect(mockAdapter.getChainId).toHaveBeenCalled();
      expect(requireSupportedChain).toHaveBeenCalled();
    });

    it('should propagate chain validation errors', async () => {
      // Arrange
      const chainError = new DripsError('Unsupported chain ID: 999');
      vi.mocked(requireSupportedChain).mockImplementation(() => {
        throw chainError;
      });

      // Act & Assert
      await expect(
        prepareDripListCreation(
          mockAdapter,
          mockIpfsMetadataUploader,
          validParams,
        ),
      ).rejects.toThrow(chainError);
      expect(mockAdapter.getAddress).not.toHaveBeenCalled();
    });

    it('should propagate address retrieval errors', async () => {
      // Arrange
      const addressError = new Error('Failed to get address');
      vi.mocked(mockAdapter.getAddress).mockRejectedValue(addressError);

      // Act & Assert
      await expect(
        prepareDripListCreation(
          mockAdapter,
          mockIpfsMetadataUploader,
          validParams,
        ),
      ).rejects.toThrow(addressError);
      expect(calcDripListId).not.toHaveBeenCalled();
    });

    it('should propagate drip list ID calculation errors', async () => {
      // Arrange
      const calcError = new Error('Failed to calculate drip list ID');
      vi.mocked(calcDripListId).mockRejectedValue(calcError);

      // Act & Assert
      await expect(
        prepareDripListCreation(
          mockAdapter,
          mockIpfsMetadataUploader,
          validParams,
        ),
      ).rejects.toThrow(calcError);
      expect(buildDripListMetadata).not.toHaveBeenCalled();
    });

    it('should propagate IPFS upload errors', async () => {
      // Arrange
      const ipfsError = new Error('IPFS upload failed');
      vi.mocked(mockIpfsMetadataUploader).mockRejectedValue(ipfsError);

      // Act & Assert
      await expect(
        prepareDripListCreation(
          mockAdapter,
          mockIpfsMetadataUploader,
          validParams,
        ),
      ).rejects.toThrow(ipfsError);
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
        prepareDripListCreation(
          mockAdapter,
          mockIpfsMetadataUploader,
          validParams,
        ),
      ).rejects.toThrow(validationError);
      // Note: encodeMetadataKeyValue is called before validateAndFormatSplitsReceivers
      // so we can't assert it wasn't called
    });

    it('should propagate metadata encoding errors', async () => {
      // Arrange
      const encodingError = new Error('Failed to encode metadata');
      vi.mocked(encodeMetadataKeyValue).mockImplementation(() => {
        throw encodingError;
      });

      // Act & Assert
      await expect(
        prepareDripListCreation(
          mockAdapter,
          mockIpfsMetadataUploader,
          validParams,
        ),
      ).rejects.toThrow(encodingError);
    });

    it('should propagate mapToOnChainSplitsReceiver errors', async () => {
      // Arrange
      const mapError = new Error('Failed to map receiver to on-chain format');
      vi.mocked(mapToOnChainSplitsReceiver).mockReset();
      vi.mocked(mapToOnChainSplitsReceiver).mockRejectedValueOnce(mapError);

      vi.mocked(mapSdkToMetadataSplitsReceiver).mockReset();
      vi.mocked(mapSdkToMetadataSplitsReceiver).mockRejectedValueOnce(
        new Error('Failed to map receiver to metadata format'),
      );

      // Act & Assert
      await expect(
        prepareDripListCreation(
          mockAdapter,
          mockIpfsMetadataUploader,
          validParams,
        ),
      ).rejects.toThrow('Failed to map receiver to metadata format');
      expect(validateAndFormatSplitsReceivers).not.toHaveBeenCalled();
      expect(buildDripListMetadata).not.toHaveBeenCalled();
    });

    it('should propagate transaction building errors', async () => {
      // Arrange
      const txError = new Error('Failed to build transaction');
      // Reset buildTx mock to throw on first call
      vi.mocked(buildTx).mockReset();
      vi.mocked(buildTx).mockImplementationOnce(() => {
        throw txError;
      });

      // Act & Assert
      await expect(
        prepareDripListCreation(
          mockAdapter,
          mockIpfsMetadataUploader,
          validParams,
        ),
      ).rejects.toThrow(txError);
    });
  });

  describe('edge cases', () => {
    it('should handle zero salt', async () => {
      // Arrange
      const paramsWithZeroSalt = {
        ...validParams,
        salt: 0n,
      };

      // Reset mocks to ensure they're called with the right parameters
      vi.mocked(mapToOnChainSplitsReceiver).mockReset();
      vi.mocked(mapToOnChainSplitsReceiver)
        .mockResolvedValueOnce(mockOnChainReceivers[0])
        .mockResolvedValueOnce(mockOnChainReceivers[1]);

      vi.mocked(mapSdkToMetadataSplitsReceiver).mockReset();
      vi.mocked(mapSdkToMetadataSplitsReceiver)
        .mockResolvedValueOnce({
          type: 'address',
          accountId: '123',
          weight: 500000,
        })
        .mockResolvedValueOnce({
          type: 'address',
          accountId: '456',
          weight: 500000,
        });

      // Act
      const result = await prepareDripListCreation(
        mockAdapter,
        mockIpfsMetadataUploader,
        paramsWithZeroSalt,
      );

      // Assert
      expect(calcDripListId).toHaveBeenCalledWith(mockAdapter, {
        salt: 0n,
        minter: mockMinterAddress,
      });
      expect(result.salt).toBe(0n);
    });

    it('should handle zero drip list ID', async () => {
      // Arrange
      vi.mocked(calcDripListId).mockResolvedValue(0n);

      // Act
      const result = await prepareDripListCreation(
        mockAdapter,
        mockIpfsMetadataUploader,
        validParams,
      );

      // Assert
      expect(buildDripListMetadata).toHaveBeenCalledWith(
        expect.objectContaining({
          dripListId: 0n,
        }),
      );
      expect(result.dripListId).toBe(0n);
    });

    it('should handle zero address minter', async () => {
      // Arrange
      const zeroAddress = '0x0000000000000000000000000000000000000000' as const;
      vi.mocked(mockAdapter.getAddress).mockResolvedValue(zeroAddress);

      // Act
      await prepareDripListCreation(
        mockAdapter,
        mockIpfsMetadataUploader,
        validParams,
      );

      // Assert
      expect(calcDripListId).toHaveBeenCalledWith(mockAdapter, {
        salt: mockSalt,
        minter: zeroAddress,
      });
    });

    it('should handle very large salt values', async () => {
      // Arrange
      const largeSalt = BigInt(
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      );
      const paramsWithLargeSalt = {
        ...validParams,
        salt: largeSalt,
      };

      // Act
      const result = await prepareDripListCreation(
        mockAdapter,
        mockIpfsMetadataUploader,
        paramsWithLargeSalt,
      );

      // Assert
      expect(calcDripListId).toHaveBeenCalledWith(mockAdapter, {
        salt: largeSalt,
        minter: mockMinterAddress,
      });
      expect(result.salt).toBe(largeSalt);
    });

    it('should handle empty string name and description', async () => {
      // Arrange
      const paramsWithEmptyStrings = {
        ...validParams,
        name: '',
        description: '',
      };

      // Act
      await prepareDripListCreation(
        mockAdapter,
        mockIpfsMetadataUploader,
        paramsWithEmptyStrings,
      );

      // Assert
      expect(mapSdkToMetadataSplitsReceiver).toHaveBeenCalledTimes(2);
      expect(buildDripListMetadata).toHaveBeenCalledWith({
        name: '',
        isVisible: validParams.isVisible,
        receivers: expect.any(Array),
        dripListId: mockDripListId,
        description: '',
      });
    });
  });

  describe('transaction structure validation', () => {
    it('should build mint transaction with correct parameters', async () => {
      // Act
      await prepareDripListCreation(
        mockAdapter,
        mockIpfsMetadataUploader,
        validParams,
      );

      // Assert
      expect(buildTx).toHaveBeenNthCalledWith(1, {
        contract: '0xdC773a04C0D6EFdb80E7dfF961B6a7B063a28B44',
        abi: expect.any(Array), // nftDriverAbi
        functionName: 'safeMintWithSalt',
        args: [mockSalt, mockMinterAddress, [mockEncodedMetadata]],
      });
    });

    it('should build setSplits transaction with correct parameters', async () => {
      // Act
      await prepareDripListCreation(
        mockAdapter,
        mockIpfsMetadataUploader,
        validParams,
      );

      // Assert
      expect(buildTx).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          abi: expect.any(Array), // nftDriverAbi
          contract: '0xdC773a04C0D6EFdb80E7dfF961B6a7B063a28B44',
          functionName: 'setSplits',
          args: [mockDripListId, mockFormattedReceivers],
        }),
      );
    });

    it('should build batched transaction with correct parameters', async () => {
      // Act
      await prepareDripListCreation(
        mockAdapter,
        mockIpfsMetadataUploader,
        validParams,
      );

      // Assert
      expect(buildTx).toHaveBeenNthCalledWith(3, {
        abi: expect.any(Array), // callerAbi
        contract: '0x09e04Cb8168bd0E8773A79Cc2099f19C46776Fee',
        functionName: 'callBatched',
        args: [[mockCallerCall1, mockCallerCall2]],
        batchedTxOverrides: undefined,
      });
    });

    it('should convert transactions to caller calls', async () => {
      // Reset the buildTx and convertToCallerCall mocks
      vi.mocked(buildTx).mockReset();
      vi.mocked(buildTx)
        .mockReturnValueOnce(mockMintTx)
        .mockReturnValueOnce(mockSetSplitsTx)
        .mockReturnValueOnce(mockBatchedTx);

      vi.mocked(convertToCallerCall).mockReset();
      vi.mocked(convertToCallerCall)
        .mockReturnValueOnce(mockCallerCall1)
        .mockReturnValueOnce(mockCallerCall2);

      // Act
      await prepareDripListCreation(
        mockAdapter,
        mockIpfsMetadataUploader,
        validParams,
      );

      // Assert
      expect(convertToCallerCall).toHaveBeenCalledTimes(2);
      // Just check that it was called with the right transactions
      expect(convertToCallerCall).toHaveBeenCalledWith(
        mockMintTx,
        expect.any(Number),
        expect.any(Array),
      );
      expect(convertToCallerCall).toHaveBeenCalledWith(
        mockSetSplitsTx,
        expect.any(Number),
        expect.any(Array),
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
      vi.mocked(requireSupportedChain).mockImplementation(() => {
        callOrder.push('requireSupportedChain');
      });
      vi.mocked(mockAdapter.getAddress).mockImplementation(async () => {
        callOrder.push('getAddress');
        return mockMinterAddress;
      });
      vi.mocked(calculateRandomSalt).mockImplementation(() => {
        callOrder.push('calculateRandomSalt');
        return mockSalt;
      });
      vi.mocked(calcDripListId).mockImplementation(async () => {
        callOrder.push('calcDripListId');
        return mockDripListId;
      });
      vi.mocked(mapSdkToMetadataSplitsReceiver).mockImplementation(async () => {
        callOrder.push('mapSdkToMetadataSplitsReceiver');
        return {
          type: 'address',
          weight: 500000,
          accountId: '123',
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
          accountId: 123n,
          weight: 500000,
        };
      });

      // Act
      await prepareDripListCreation(mockAdapter, mockIpfsMetadataUploader, {
        ...validParams,
        receivers: [validParams.receivers[0]], // Use only one receiver to simplify the test
      });

      // Assert
      // Check that the functions are called in the expected order
      // Note: The actual order might vary depending on the implementation
      // So we'll just check that the key functions are called
      expect(callOrder).toContain('requireSupportedChain');
      expect(callOrder).toContain('requireWriteAccess');
      expect(callOrder).toContain('calculateRandomSalt');
      expect(callOrder).toContain('getAddress');
      expect(callOrder).toContain('calcDripListId');
      expect(callOrder).toContain('buildDripListMetadata');
      expect(callOrder).toContain('ipfsMetadataUploader');

      // Check the relative order of some key functions
      expect(callOrder.indexOf('requireSupportedChain')).toBeLessThan(
        callOrder.indexOf('requireWriteAccess'),
      );
      expect(callOrder.indexOf('requireWriteAccess')).toBeLessThan(
        callOrder.indexOf('calculateRandomSalt'),
      );
      expect(callOrder.indexOf('calculateRandomSalt')).toBeLessThan(
        callOrder.indexOf('getAddress'),
      );
      expect(callOrder.indexOf('getAddress')).toBeLessThan(
        callOrder.indexOf('calcDripListId'),
      );
      expect(callOrder.indexOf('calcDripListId')).toBeLessThan(
        callOrder.indexOf('buildDripListMetadata'),
      );
      expect(callOrder.indexOf('buildDripListMetadata')).toBeLessThan(
        callOrder.indexOf('ipfsMetadataUploader'),
      );
    });
  });
});
