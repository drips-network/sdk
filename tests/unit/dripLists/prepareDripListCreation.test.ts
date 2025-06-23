import {describe, it, expect, vi, beforeEach} from 'vitest';
import {prepareDripListCreation} from '../../../src/internal/drip-lists/prepareDripListCreation';
import {DripsError} from '../../../src/internal/shared/DripsError';
import type {
  WriteBlockchainAdapter,
  PreparedTx,
} from '../../../src/internal/blockchain/BlockchainAdapter';
import type {
  IpfsUploaderFn,
  DripListMetadata,
} from '../../../src/internal/metadata/createPinataIpfsUploader';

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

vi.mock('../../../src/internal/metadata/encodeMetadataKeyValue', () => ({
  encodeMetadataKeyValue: vi.fn(),
  USER_METADATA_KEY: 'user-metadata',
}));

vi.mock('../../../src/internal/shared/receiverUtils', () => ({
  mapToOnChainSplitsReceiver: vi.fn(),
}));

vi.mock(
  '../../../src/internal/shared/validateAndFormatSplitsReceivers',
  () => ({
    validateAndFormatSplitsReceivers: vi.fn(),
  }),
);

vi.mock('../../../src/internal/metadata/buildDripListMetadata', () => ({
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
import {encodeMetadataKeyValue} from '../../../src/internal/metadata/encodeMetadataKeyValue';
import {validateAndFormatSplitsReceivers} from '../../../src/internal/shared/validateAndFormatSplitsReceivers';
import {buildDripListMetadata} from '../../../src/internal/metadata/buildDripListMetadata';
import {calcDripListId} from '../../../src/internal/shared/calcDripListId';
import {mapToOnChainSplitsReceiver} from '../../../src/internal/shared/receiverUtils';

describe('prepareDripListCreation', () => {
  const mockAdapter: WriteBlockchainAdapter = {
    call: vi.fn(),
    getChainId: vi.fn(),
    getAddress: vi.fn(),
    sendTx: vi.fn(),
    signMsg: vi.fn(),
  };

  const mockIpfsUploader: IpfsUploaderFn<DripListMetadata> = vi.fn();

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
    vi.mocked(buildDripListMetadata).mockResolvedValue(mockMetadata);
    vi.mocked(mockIpfsUploader).mockResolvedValue(mockIpfsHash);
    vi.mocked(mapToOnChainSplitsReceiver)
      .mockResolvedValueOnce(mockOnChainReceivers[0])
      .mockResolvedValueOnce(mockOnChainReceivers[1]);
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
        mockIpfsUploader,
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
      expect(buildDripListMetadata).toHaveBeenCalledWith(mockAdapter, {
        name: validParams.name,
        isVisible: validParams.isVisible,
        receivers: validParams.receivers,
        dripListId: mockDripListId,
        description: validParams.description,
      });
      expect(mockIpfsUploader).toHaveBeenCalledWith(mockMetadata);
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
        mockIpfsUploader,
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
      const customIpfsUploader: IpfsUploaderFn<DripListMetadata> = vi
        .fn()
        .mockResolvedValue(mockIpfsHash);

      // Act
      await prepareDripListCreation(
        mockAdapter,
        customIpfsUploader,
        validParams,
      );

      // Assert
      expect(customIpfsUploader).toHaveBeenCalledWith(mockMetadata);
      expect(mockIpfsUploader).not.toHaveBeenCalled();
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
        mockIpfsUploader,
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
        mockIpfsUploader,
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
      await prepareDripListCreation(mockAdapter, mockIpfsUploader, validParams);

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
        mockIpfsUploader,
        paramsWithEmptyReceivers,
      );

      // Assert
      expect(mapToOnChainSplitsReceiver).not.toHaveBeenCalled();
      expect(validateAndFormatSplitsReceivers).toHaveBeenCalledWith([]);
      expect(buildDripListMetadata).toHaveBeenCalledWith(mockAdapter, {
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
        mockIpfsUploader,
        minimalParams,
      );

      // Assert
      expect(buildDripListMetadata).toHaveBeenCalledWith(mockAdapter, {
        name: undefined,
        isVisible: false,
        receivers: [],
        dripListId: mockDripListId,
        description: undefined,
      });
    });

    it('should include txOverrides in batched transaction', async () => {
      // Arrange
      const paramsWithOverrides = {
        ...validParams,
        txOverrides: {
          gasLimit: 1000000n,
          value: 100n,
        },
      };

      // Act
      await prepareDripListCreation(
        mockAdapter,
        mockIpfsUploader,
        paramsWithOverrides,
      );

      // Assert
      expect(buildTx).toHaveBeenCalledWith(
        expect.objectContaining({
          txOverrides: paramsWithOverrides.txOverrides,
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

      // Act
      await prepareDripListCreation(
        mockAdapter,
        mockIpfsUploader,
        paramsWithMixedReceivers,
      );

      // Assert
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

      // Act
      await prepareDripListCreation(
        mockAdapter,
        mockIpfsUploader,
        paramsWithSingleReceiver,
      );

      // Assert
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
        prepareDripListCreation(mockAdapter, mockIpfsUploader, validParams),
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
        prepareDripListCreation(mockAdapter, mockIpfsUploader, validParams),
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
        prepareDripListCreation(mockAdapter, mockIpfsUploader, validParams),
      ).rejects.toThrow(chainError);
      expect(mockAdapter.getAddress).not.toHaveBeenCalled();
    });

    it('should propagate address retrieval errors', async () => {
      // Arrange
      const addressError = new Error('Failed to get address');
      vi.mocked(mockAdapter.getAddress).mockRejectedValue(addressError);

      // Act & Assert
      await expect(
        prepareDripListCreation(mockAdapter, mockIpfsUploader, validParams),
      ).rejects.toThrow(addressError);
      expect(calcDripListId).not.toHaveBeenCalled();
    });

    it('should propagate drip list ID calculation errors', async () => {
      // Arrange
      const calcError = new Error('Failed to calculate drip list ID');
      vi.mocked(calcDripListId).mockRejectedValue(calcError);

      // Act & Assert
      await expect(
        prepareDripListCreation(mockAdapter, mockIpfsUploader, validParams),
      ).rejects.toThrow(calcError);
      expect(buildDripListMetadata).not.toHaveBeenCalled();
    });

    it('should propagate IPFS upload errors', async () => {
      // Arrange
      const ipfsError = new Error('IPFS upload failed');
      vi.mocked(mockIpfsUploader).mockRejectedValue(ipfsError);

      // Act & Assert
      await expect(
        prepareDripListCreation(mockAdapter, mockIpfsUploader, validParams),
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
        prepareDripListCreation(mockAdapter, mockIpfsUploader, validParams),
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
        prepareDripListCreation(mockAdapter, mockIpfsUploader, validParams),
      ).rejects.toThrow(encodingError);
    });

    it('should propagate mapToOnChainSplitsReceiver errors', async () => {
      // Arrange
      const mapError = new Error('Failed to map receiver to on-chain format');
      vi.mocked(mapToOnChainSplitsReceiver).mockReset();
      vi.mocked(mapToOnChainSplitsReceiver).mockRejectedValueOnce(mapError);

      // Act & Assert
      await expect(
        prepareDripListCreation(mockAdapter, mockIpfsUploader, validParams),
      ).rejects.toThrow(mapError);
      expect(validateAndFormatSplitsReceivers).not.toHaveBeenCalled();
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
        prepareDripListCreation(mockAdapter, mockIpfsUploader, validParams),
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

      // Act
      const result = await prepareDripListCreation(
        mockAdapter,
        mockIpfsUploader,
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
        mockIpfsUploader,
        validParams,
      );

      // Assert
      expect(buildDripListMetadata).toHaveBeenCalledWith(
        mockAdapter,
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
      await prepareDripListCreation(mockAdapter, mockIpfsUploader, validParams);

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
        mockIpfsUploader,
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
        mockIpfsUploader,
        paramsWithEmptyStrings,
      );

      // Assert
      expect(buildDripListMetadata).toHaveBeenCalledWith(mockAdapter, {
        name: '',
        isVisible: validParams.isVisible,
        receivers: validParams.receivers,
        dripListId: mockDripListId,
        description: '',
      });
    });
  });

  describe('transaction structure validation', () => {
    it('should build mint transaction with correct parameters', async () => {
      // Act
      await prepareDripListCreation(mockAdapter, mockIpfsUploader, validParams);

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
      await prepareDripListCreation(mockAdapter, mockIpfsUploader, validParams);

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
      await prepareDripListCreation(mockAdapter, mockIpfsUploader, validParams);

      // Assert
      expect(buildTx).toHaveBeenNthCalledWith(3, {
        abi: expect.any(Array), // callerAbi
        contract: '0x09e04Cb8168bd0E8773A79Cc2099f19C46776Fee',
        functionName: 'callBatched',
        args: [[mockCallerCall1, mockCallerCall2]],
        txOverrides: undefined,
      });
    });

    it('should convert transactions to caller calls', async () => {
      // Act
      await prepareDripListCreation(mockAdapter, mockIpfsUploader, validParams);

      // Assert
      expect(convertToCallerCall).toHaveBeenCalledTimes(2);
      // When used with .map(), convertToCallerCall receives additional parameters (index, array)
      expect(convertToCallerCall).toHaveBeenNthCalledWith(1, mockMintTx, 0, [
        mockMintTx,
        mockSetSplitsTx,
      ]);
      expect(convertToCallerCall).toHaveBeenNthCalledWith(
        2,
        mockSetSplitsTx,
        1,
        [mockMintTx, mockSetSplitsTx],
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
      vi.mocked(buildDripListMetadata).mockImplementation(async () => {
        callOrder.push('buildDripListMetadata');
        return mockMetadata;
      });
      vi.mocked(mockIpfsUploader).mockImplementation(async () => {
        callOrder.push('ipfsUploader');
        return mockIpfsHash;
      });

      // Act
      await prepareDripListCreation(mockAdapter, mockIpfsUploader, validParams);

      // Assert
      expect(callOrder).toEqual([
        'requireSupportedChain',
        'requireWriteAccess',
        'calculateRandomSalt',
        'getAddress',
        'calcDripListId',
        'buildDripListMetadata',
        'ipfsUploader',
      ]);
    });
  });
});
