import {describe, it, expect, vi, beforeEach} from 'vitest';
import {prepareDripListCreation} from '../../../src/internal/drip-lists/prepareDripListCreation';
import type {
  WriteBlockchainAdapter,
  PreparedTx,
} from '../../../src/internal/blockchain/BlockchainAdapter';
import type {
  IpfsMetadataUploaderFn,
  DripListMetadata,
} from '../../../src/internal/shared/createPinataIpfsMetadataUploader';

vi.mock('../../../src/internal/shared/assertions', () => ({
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
  parseSplitsReceivers: vi.fn(),
}));

vi.mock('../../../src/internal/drip-lists/buildDripListMetadata', () => ({
  buildDripListMetadata: vi.fn(),
}));

vi.mock('../../../src/internal/shared/calcDripListId', () => ({
  calcDripListId: vi.fn(),
}));

vi.mock('../../../src/internal/shared/calcAddressId', () => ({
  calcAddressId: vi.fn(),
}));

import {requireSupportedChain} from '../../../src/internal/shared/assertions';
import {calculateRandomSalt} from '../../../src/internal/drip-lists/calculateRandomSalt';
import {buildTx} from '../../../src/internal/shared/buildTx';
import {convertToCallerCall} from '../../../src/internal/shared/convertToCallerCall';
import {encodeMetadataKeyValue} from '../../../src/internal/shared/encodeMetadataKeyValue';
import {buildDripListMetadata} from '../../../src/internal/drip-lists/buildDripListMetadata';
import {calcDripListId} from '../../../src/internal/shared/calcDripListId';
import {parseSplitsReceivers} from '../../../src/internal/shared/receiverUtils';
import {calcAddressId} from '../../../src/internal/shared/calcAddressId';

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
    latestVotingRoundId: 'latestVotingRoundId',
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
    allowExternalDonations: true,
    name: 'Test Drip List',
    description: 'A test drip list',
    recipients: [],
  };
  const mockOnChainReceivers = [
    {accountId: 123n, weight: 500000},
    {accountId: 456n, weight: 500000},
  ];
  const mockMetadataReceivers = [
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
  ];
  const mockEncodedMetadata = {
    key: '0x757365722d6d65746164617461' as const,
    value: '0xipfshash' as const,
  };
  const mockMintTx: PreparedTx = {
    to: '0xdC773a04C0D6EFdb80E7dfF961B6a7B063a28B44' as const,
    data: '0xmintdata' as const,
    abiFunctionName: 'safeMintWithSalt',
  };
  const mockSetSplitsTx: PreparedTx = {
    to: '0xdC773a04C0D6EFdb80E7dfF961B6a7B063a28B44' as const,
    data: '0xsetsplitsdata' as const,
    abiFunctionName: 'setSplits',
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
    abiFunctionName: 'callBatched',
  };
  const mockOwnerAccountId = 2024n;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all mocks to their default successful behavior
    vi.mocked(mockAdapter.getChainId).mockResolvedValue(11155111);
    vi.mocked(requireSupportedChain).mockImplementation(() => {});
    vi.mocked(mockAdapter.getAddress).mockResolvedValue(mockMinterAddress);
    vi.mocked(calculateRandomSalt).mockReturnValue(mockSalt);
    vi.mocked(calcDripListId).mockResolvedValue(mockDripListId);
    vi.mocked(parseSplitsReceivers).mockResolvedValue({
      onChain: mockOnChainReceivers,
      metadata: mockMetadataReceivers,
    });
    vi.mocked(buildDripListMetadata).mockReturnValue(mockMetadata);
    vi.mocked(mockIpfsMetadataUploader).mockResolvedValue(mockIpfsHash);
    vi.mocked(encodeMetadataKeyValue).mockReturnValue(mockEncodedMetadata);
    vi.mocked(buildTx)
      .mockReturnValueOnce(mockMintTx)
      .mockReturnValueOnce(mockSetSplitsTx)
      .mockReturnValueOnce(mockBatchedTx);
    vi.mocked(convertToCallerCall)
      .mockReturnValueOnce(mockCallerCall1)
      .mockReturnValueOnce(mockCallerCall2);
    vi.mocked(calcAddressId).mockResolvedValue(mockOwnerAccountId);
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
      expect(requireSupportedChain).toHaveBeenCalledWith(11155111);
      expect(mockAdapter.getAddress).toHaveBeenCalled();
      expect(calculateRandomSalt).toHaveBeenCalled();
      expect(calcDripListId).toHaveBeenCalledWith(mockAdapter, {
        salt: mockSalt,
        minter: mockMinterAddress,
      });
      expect(calcAddressId).toHaveBeenCalledWith(
        mockAdapter,
        mockMinterAddress,
      );
      expect(parseSplitsReceivers).toHaveBeenCalledWith(
        mockAdapter,
        validParams.receivers,
        undefined,
      );
      expect(buildDripListMetadata).toHaveBeenCalledWith({
        name: validParams.name,
        isVisible: validParams.isVisible,
        receivers: mockMetadataReceivers,
        dripListId: mockDripListId,
        description: validParams.description,
        latestVotingRoundId: validParams.latestVotingRoundId,
        allowExternalDonations: true,
      });
      expect(mockIpfsMetadataUploader).toHaveBeenCalledWith(mockMetadata);
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
        allowExternalDonations: true,
      });
    });

    it('should handle empty receivers array', async () => {
      // Arrange
      const paramsWithEmptyReceivers = {
        ...validParams,
        receivers: [],
      };
      vi.mocked(parseSplitsReceivers).mockResolvedValue({
        onChain: [],
        metadata: [],
      });
      vi.mocked(buildTx).mockReset();
      vi.mocked(buildTx)
        .mockReturnValueOnce(mockMintTx)
        .mockReturnValueOnce(mockBatchedTx);
      vi.mocked(convertToCallerCall).mockReset();
      vi.mocked(convertToCallerCall).mockReturnValueOnce(mockCallerCall1);

      // Act
      await prepareDripListCreation(
        mockAdapter,
        mockIpfsMetadataUploader,
        paramsWithEmptyReceivers,
      );

      // Assert
      expect(parseSplitsReceivers).toHaveBeenCalledWith(
        mockAdapter,
        [],
        undefined,
      );
      expect(buildDripListMetadata).toHaveBeenCalledWith({
        name: validParams.name,
        isVisible: validParams.isVisible,
        receivers: [],
        dripListId: mockDripListId,
        description: validParams.description,
        latestVotingRoundId: validParams.latestVotingRoundId,
        allowExternalDonations: true,
      });
      // Should only build mint tx, not setSplits tx
      expect(buildTx).toHaveBeenCalledTimes(2); // mint + batched
      expect(convertToCallerCall).toHaveBeenCalledTimes(1); // only mint
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
      expect(calcAddressId).toHaveBeenCalledWith(
        mockAdapter,
        transferToAddress,
      );
      expect(buildTx).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [mockSalt, transferToAddress, [mockEncodedMetadata]],
        }),
      );
    });

    it('should pass deadlineConfig to parseSplitsReceivers when provided', async () => {
      // Arrange
      const deadlineConfig = {
        deadline: new Date('2025-12-31'),
        refundAddress: mockMinterAddress,
      };
      const paramsWithDeadline = {
        ...validParams,
        deadlineConfig,
      };

      // Act
      await prepareDripListCreation(
        mockAdapter,
        mockIpfsMetadataUploader,
        paramsWithDeadline,
      );

      // Assert
      expect(parseSplitsReceivers).toHaveBeenCalledWith(
        mockAdapter,
        validParams.receivers,
        {deadlineConfig},
      );
    });

    it('should set allowExternalDonations to false when deadline receiver refund account matches owner', async () => {
      // Arrange
      const deadlineMetadataReceivers = [
        {
          type: 'deadline' as const,
          accountId: '123',
          weight: 500000,
          deadline: new Date('2025-12-31'),
          claimableProject: {
            accountId: '789',
            source: {
              forge: 'github' as const,
              repoName: 'test-repo',
              ownerName: 'test-owner',
              url: 'https://github.com/test-owner/test-repo',
            },
          },
          recipientAccountId: '456',
          refundAccountId: mockOwnerAccountId.toString(),
        },
        {
          type: 'address' as const,
          accountId: '456',
          weight: 500000,
        },
      ];
      vi.mocked(parseSplitsReceivers).mockResolvedValue({
        onChain: mockOnChainReceivers,
        metadata: deadlineMetadataReceivers,
      });

      // Act
      const result = await prepareDripListCreation(
        mockAdapter,
        mockIpfsMetadataUploader,
        validParams,
      );

      // Assert
      expect(result.allowExternalDonations).toBe(false);
      expect(buildDripListMetadata).toHaveBeenCalledWith(
        expect.objectContaining({
          allowExternalDonations: false,
        }),
      );
    });

    it('should set allowExternalDonations to true when no deadline receivers', async () => {
      // Act
      const result = await prepareDripListCreation(
        mockAdapter,
        mockIpfsMetadataUploader,
        validParams,
      );

      // Assert
      expect(result.allowExternalDonations).toBe(true);
    });

    it('should set allowExternalDonations to true when deadline receiver refund account does not match owner', async () => {
      // Arrange
      const differentAccountId = 9999n;
      const deadlineMetadataReceivers = [
        {
          type: 'deadline' as const,
          accountId: '123',
          weight: 500000,
          deadline: new Date('2025-12-31'),
          claimableProject: {
            accountId: '789',
            source: {
              forge: 'github' as const,
              repoName: 'test-repo',
              ownerName: 'test-owner',
              url: 'https://github.com/test-owner/test-repo',
            },
          },
          recipientAccountId: '456',
          refundAccountId: differentAccountId.toString(),
        },
        {
          type: 'address' as const,
          accountId: '456',
          weight: 500000,
        },
      ];
      vi.mocked(parseSplitsReceivers).mockResolvedValue({
        onChain: mockOnChainReceivers,
        metadata: deadlineMetadataReceivers,
      });

      // Act
      const result = await prepareDripListCreation(
        mockAdapter,
        mockIpfsMetadataUploader,
        validParams,
      );

      // Assert
      expect(result.allowExternalDonations).toBe(true);
      expect(buildDripListMetadata).toHaveBeenCalledWith(
        expect.objectContaining({
          allowExternalDonations: true,
        }),
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
        prepareDripListCreation(
          mockAdapter,
          mockIpfsMetadataUploader,
          validParams,
        ),
      ).rejects.toThrow(chainIdError);
      expect(requireSupportedChain).not.toHaveBeenCalled();
    });

    it('should propagate parseSplitsReceivers errors', async () => {
      // Arrange
      const parseError = new Error('Invalid splits receivers');
      vi.mocked(parseSplitsReceivers).mockRejectedValue(parseError);

      // Act & Assert
      await expect(
        prepareDripListCreation(
          mockAdapter,
          mockIpfsMetadataUploader,
          validParams,
        ),
      ).rejects.toThrow(parseError);
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
        prepareDripListCreation(
          mockAdapter,
          mockIpfsMetadataUploader,
          validParams,
        ),
      ).rejects.toThrow(txError);
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

    it('should build setSplits transaction with correct parameters when receivers exist', async () => {
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
          args: [mockDripListId, mockOnChainReceivers],
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
  });
});
