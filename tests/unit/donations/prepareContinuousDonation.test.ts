import {describe, it, expect, vi, beforeEach} from 'vitest';
import {
  prepareContinuousDonation,
  AMT_PER_SEC_MULTIPLIER,
} from '../../../src/internal/donations/prepareContinuousDonation';
import {WriteBlockchainAdapter} from '../../../src/internal/blockchain/BlockchainAdapter';
import {
  requireSupportedChain,
  requireWriteAccess,
} from '../../../src/internal/shared/assertions';
import {buildTx} from '../../../src/internal/shared/buildTx';
import {addressDriverAbi} from '../../../src/internal/abis/addressDriverAbi';
import {callerAbi} from '../../../src/internal/abis/callerAbi';
import {resolveReceiverAccountId} from '../../../src/internal/shared/receiverUtils';
import {getCurrentStreamsAndReceivers} from '../../../src/internal/streams/getCurrentStreamReceivers';
import {validateAndFormatStreamReceivers} from '../../../src/internal/shared/validateAndFormatStreamReceivers';
import {convertToCallerCall} from '../../../src/internal/shared/convertToCallerCall';
import {resolveAddressFromAccountId} from '../../../src/internal/shared/resolveAddressFromAccountId';
import {
  encodeStreamConfig,
  decodeStreamConfig,
} from '../../../src/internal/shared/streamConfigUtils';
import {buildStreamsMetadata} from '../../../src/internal/streams/buildStreamsMetadata';
import {
  encodeMetadataKeyValue,
  USER_METADATA_KEY,
} from '../../../src/internal/shared/encodeMetadataKeyValue';

vi.mock('../../../src/internal/shared/receiverUtils');
vi.mock('../../../src/internal/shared/assertions');
vi.mock('../../../src/internal/shared/buildTx');
vi.mock('../../../src/internal/streams/getCurrentStreamReceivers');
vi.mock('../../../src/internal/streams/buildStreamsMetadata');
vi.mock('../../../src/internal/shared/validateAndFormatStreamReceivers');
vi.mock('../../../src/internal/shared/convertToCallerCall');
vi.mock('../../../src/internal/shared/resolveAddressFromAccountId');
vi.mock('../../../src/internal/shared/encodeMetadataKeyValue');
vi.mock('../../../src/internal/shared/streamConfigUtils');
vi.mock('../../../src/internal/config/contractsRegistry', () => ({
  contractsRegistry: {
    1: {
      addressDriver: {
        address: '0xAddressDriver123',
      },
      caller: {
        address: '0xCaller123',
      },
    },
  },
}));

describe('prepareContinuousDonation', () => {
  let mockAdapter: WriteBlockchainAdapter;
  const mockChainId = 1;
  const mockAddressDriverAddress = '0xAddressDriver123';
  const mockCallerAddress = '0xCaller123';
  const mockSignerAddress = '0xSigner123';
  const mockSignerAccountId = 123n;
  const mockReceiverAccountId = 456n;
  const mockErc20 = '0xToken123' as `0x${string}`;
  const mockIpfsHash = 'QmHash123';
  const mockTransferToAddress = '0xTransferTo123';
  const mockAmountPerSec = 100n;
  const mockStreamConfig = 12345n;
  const mockMetadata = {
    describes: {
      driver: 'address' as const,
      accountId: mockSignerAccountId.toString(),
    },
    assetConfigs: [
      {
        tokenAddress: mockErc20,
        streams: [
          {
            id: 'stream1',
            initialDripsConfig: {
              raw: '222',
              dripId: '123',
              amountPerSecond: 50n,
              durationSeconds: 0,
              startTimestamp: 1672531200,
            },
            receiver: {
              driver: 'address' as const,
              accountId: '111',
            },
            archived: false,
            name: 'Stream 1',
          },
        ],
      },
    ],
    timestamp: 123456789,
    writtenByAddress: mockSignerAddress,
  };
  const mockSetStreamsTx = {
    to: mockAddressDriverAddress,
    data: '0xsetStreamsData',
  };
  const mockEmitAccountMetadataTx = {
    to: mockAddressDriverAddress,
    data: '0xemitAccountMetadataData',
  };
  const mockCallerBatchedTx = {
    to: mockCallerAddress,
    data: '0xcallBatchedData',
  };
  const mockEncodedMetadataKeyValue = '0xEncodedMetadataKeyValue';
  const mockCurrentReceivers = [
    {
      accountId: 111n,
      config: 222n,
    },
  ];
  const mockFormattedCurrentReceivers = [
    {
      accountId: 111n,
      config: 222n,
    },
  ];
  const mockNewReceivers = [
    {
      accountId: 111n,
      config: 222n,
    },
    {
      accountId: mockReceiverAccountId,
      config: mockStreamConfig,
    },
  ];
  const mockFormattedNewReceivers = [
    {
      accountId: 111n,
      config: 222n,
    },
    {
      accountId: mockReceiverAccountId,
      config: mockStreamConfig,
    },
  ];
  const mockCurrentStreams = [
    {
      __typename: 'Stream' as const,
      id: 'stream1',
      name: 'Stream 1',
      isPaused: false,
      config: {
        __typename: 'StreamConfig' as const,
        raw: '222',
        amountPerSecond: {
          __typename: 'Amount' as const,
          tokenAddress: mockErc20,
          amount: '50',
        },
        dripId: '123',
        durationSeconds: 0,
        startDate: '2023-01-01T00:00:00.000Z',
      },
      receiver: {
        __typename: 'User' as const,
        account: {
          __typename: 'AddressDriverAccount' as const,
          accountId: '111',
        },
      },
    },
  ];
  const mockIpfsMetadataUploaderFn = vi.fn().mockResolvedValue(mockIpfsHash);

  beforeEach(() => {
    mockAdapter = {
      getChainId: vi.fn().mockResolvedValue(mockChainId),
      getAddress: vi.fn().mockResolvedValue(mockSignerAddress),
    } as any;

    vi.mocked(requireSupportedChain).mockImplementation(() => {});
    vi.mocked(requireWriteAccess).mockImplementation(() => {});
    vi.mocked(resolveReceiverAccountId)
      .mockResolvedValueOnce(mockSignerAccountId)
      .mockResolvedValueOnce(mockReceiverAccountId)
      .mockResolvedValue(mockReceiverAccountId); // Default for other calls
    vi.mocked(getCurrentStreamsAndReceivers).mockResolvedValue({
      currentReceivers: mockCurrentReceivers,
      currentStreams: mockCurrentStreams,
    });
    vi.mocked(validateAndFormatStreamReceivers)
      .mockReturnValueOnce(mockFormattedCurrentReceivers)
      .mockReturnValueOnce(mockFormattedNewReceivers);
    vi.mocked(resolveAddressFromAccountId).mockReturnValue(
      mockTransferToAddress,
    );
    vi.mocked(encodeStreamConfig).mockReturnValue(mockStreamConfig);
    vi.mocked(decodeStreamConfig).mockReturnValue({
      dripId: 123n,
      amountPerSec: 50n,
      start: 0n,
      duration: 0n,
    });
    vi.mocked(buildStreamsMetadata).mockResolvedValue(mockMetadata);
    vi.mocked(encodeMetadataKeyValue).mockReturnValue(
      mockEncodedMetadataKeyValue as any,
    );
    vi.mocked(buildTx)
      .mockReturnValueOnce(mockSetStreamsTx as any)
      .mockReturnValueOnce(mockEmitAccountMetadataTx as any)
      .mockReturnValueOnce(mockCallerBatchedTx as any);
    vi.mocked(convertToCallerCall)
      .mockReturnValueOnce({
        to: mockSetStreamsTx.to,
        data: mockSetStreamsTx.data,
      } as any)
      .mockReturnValueOnce({
        to: mockEmitAccountMetadataTx.to,
        data: mockEmitAccountMetadataTx.data,
      } as any);

    vi.clearAllMocks();
  });

  it('should prepare a continuous donation transaction', async () => {
    const donation = {
      erc20: mockErc20,
      amountPerSec: mockAmountPerSec,
      receiver: {
        type: 'address' as const,
        address: '0xReceiver123' as `0x${string}`,
      },
      name: 'Test Donation',
      startAt: new Date('2023-01-01T00:00:00.000Z'),
      durationSeconds: 86400,
      topUpAmount: 1000n,
    };

    const result = await prepareContinuousDonation(
      mockAdapter,
      mockIpfsMetadataUploaderFn,
      donation,
    );

    expect(requireSupportedChain).toHaveBeenCalledWith(mockChainId);
    expect(requireWriteAccess).toHaveBeenCalledWith(
      mockAdapter,
      'prepareDripListCreation',
    );
    expect(resolveReceiverAccountId).toHaveBeenCalledWith(mockAdapter, {
      type: 'address',
      address: mockSignerAddress as `0x${string}`,
    });
    expect(resolveReceiverAccountId).toHaveBeenCalledWith(
      mockAdapter,
      donation.receiver,
    );
    expect(getCurrentStreamsAndReceivers).toHaveBeenCalledWith(
      mockSignerAccountId,
      mockChainId,
      mockErc20,
      undefined,
    );
    expect(validateAndFormatStreamReceivers).toHaveBeenCalledWith(
      mockCurrentReceivers,
    );
    expect(encodeStreamConfig).toHaveBeenCalledWith({
      amountPerSec: mockAmountPerSec * AMT_PER_SEC_MULTIPLIER,
      streamId: expect.any(BigInt),
      duration: BigInt(donation.durationSeconds),
      start: BigInt(donation.startAt.getTime()) / 1000n,
    });
    expect(validateAndFormatStreamReceivers).toHaveBeenCalledWith(
      mockNewReceivers,
    );
    expect(resolveAddressFromAccountId).toHaveBeenCalledWith(
      mockSignerAccountId,
    );
    expect(buildTx).toHaveBeenCalledWith({
      abi: addressDriverAbi,
      functionName: 'setStreams',
      contract: mockAddressDriverAddress,
      args: [
        mockErc20,
        mockFormattedCurrentReceivers,
        donation.topUpAmount,
        mockFormattedNewReceivers,
        0,
        0,
        mockTransferToAddress,
      ],
    });
    expect(buildStreamsMetadata).toHaveBeenCalledWith(
      mockAdapter,
      mockSignerAccountId,
      mockCurrentStreams,
      {
        ...donation,
        dripId: expect.any(BigInt),
      },
    );
    expect(mockIpfsMetadataUploaderFn).toHaveBeenCalledWith(mockMetadata);
    expect(encodeMetadataKeyValue).toHaveBeenCalledWith({
      key: USER_METADATA_KEY,
      value: mockIpfsHash,
    });
    expect(buildTx).toHaveBeenCalledWith({
      abi: addressDriverAbi,
      functionName: 'emitAccountMetadata',
      args: [[mockEncodedMetadataKeyValue]],
      contract: mockAddressDriverAddress,
    });
    // Check that convertToCallerCall was called with the right transactions
    expect(vi.mocked(convertToCallerCall).mock.calls[0][0]).toEqual(
      mockSetStreamsTx,
    );
    expect(vi.mocked(convertToCallerCall).mock.calls[1][0]).toEqual(
      mockEmitAccountMetadataTx,
    );
    expect(buildTx).toHaveBeenCalledWith({
      abi: callerAbi,
      contract: mockCallerAddress,
      functionName: 'callBatched',
      args: [
        [
          {
            to: mockSetStreamsTx.to,
            data: mockSetStreamsTx.data,
          },
          {
            to: mockEmitAccountMetadataTx.to,
            data: mockEmitAccountMetadataTx.data,
          },
        ],
      ],
      batchedTxOverrides: undefined,
    });

    expect(result).toEqual({
      preparedTx: mockCallerBatchedTx,
      ipfsHash: mockIpfsHash,
      metadata: mockMetadata,
    });
  });

  it('should handle optional parameters', async () => {
    const donation = {
      erc20: mockErc20,
      amountPerSec: mockAmountPerSec,
      receiver: {
        type: 'address' as const,
        address: '0xReceiver123' as `0x${string}`,
      },
    };

    const result = await prepareContinuousDonation(
      mockAdapter,
      mockIpfsMetadataUploaderFn,
      donation,
    );

    expect(encodeStreamConfig).toHaveBeenCalledWith({
      amountPerSec: mockAmountPerSec * AMT_PER_SEC_MULTIPLIER,
      streamId: expect.any(BigInt),
      duration: 0n,
      start: 0n,
    });
    expect(buildTx).toHaveBeenCalledWith({
      abi: addressDriverAbi,
      functionName: 'setStreams',
      contract: mockAddressDriverAddress,
      args: [
        mockErc20,
        mockFormattedCurrentReceivers,
        0n,
        mockFormattedNewReceivers,
        0,
        0,
        mockTransferToAddress,
      ],
    });

    expect(result).toEqual({
      preparedTx: mockCallerBatchedTx,
      ipfsHash: mockIpfsHash,
      metadata: mockMetadata,
    });
  });

  it('should handle transaction overrides', async () => {
    const batchedTxOverrides = {
      gasLimit: 1000000n,
      maxFeePerGas: 2000000000n,
    };

    const donation = {
      erc20: mockErc20,
      amountPerSec: mockAmountPerSec,
      receiver: {
        type: 'address' as const,
        address: '0xReceiver123' as `0x${string}`,
      },
      batchedTxOverrides,
    };

    await prepareContinuousDonation(
      mockAdapter,
      mockIpfsMetadataUploaderFn,
      donation,
    );

    expect(buildTx).toHaveBeenCalledWith({
      abi: callerAbi,
      contract: mockCallerAddress,
      functionName: 'callBatched',
      args: [expect.any(Array)],
      batchedTxOverrides,
    });
  });

  it('should use provided GraphQL client if passed', async () => {
    const mockGraphQLClient = {} as any;
    const donation = {
      erc20: mockErc20,
      amountPerSec: mockAmountPerSec,
      receiver: {
        type: 'address' as const,
        address: '0xReceiver123' as `0x${string}`,
      },
    };

    await prepareContinuousDonation(
      mockAdapter,
      mockIpfsMetadataUploaderFn,
      donation,
      mockGraphQLClient,
    );

    expect(getCurrentStreamsAndReceivers).toHaveBeenCalledWith(
      mockSignerAccountId,
      mockChainId,
      mockErc20,
      mockGraphQLClient,
    );
  });

  describe('error handling', () => {
    it('should propagate errors from requireSupportedChain', async () => {
      const mockError = new Error('Unsupported chain');
      vi.mocked(requireSupportedChain).mockImplementation(() => {
        throw mockError;
      });

      const donation = {
        erc20: mockErc20,
        amountPerSec: mockAmountPerSec,
        receiver: {
          type: 'address' as const,
          address: '0xReceiver123' as `0x${string}`,
        },
      };

      await expect(
        prepareContinuousDonation(
          mockAdapter,
          mockIpfsMetadataUploaderFn,
          donation,
        ),
      ).rejects.toThrow('Unsupported chain');
    });

    it('should propagate errors from requireWriteAccess', async () => {
      const mockError = new Error('Write access required');
      vi.mocked(requireWriteAccess).mockImplementation(() => {
        throw mockError;
      });

      const donation = {
        erc20: mockErc20,
        amountPerSec: mockAmountPerSec,
        receiver: {
          type: 'address' as const,
          address: '0xReceiver123' as `0x${string}`,
        },
      };

      await expect(
        prepareContinuousDonation(
          mockAdapter,
          mockIpfsMetadataUploaderFn,
          donation,
        ),
      ).rejects.toThrow('Write access required');
    });

    it('should propagate errors from resolveReceiverAccountId', async () => {
      const mockError = new Error('Failed to resolve account ID');

      // Clear previous mocks and set up new ones for this test
      vi.mocked(resolveReceiverAccountId).mockReset();
      vi.mocked(resolveReceiverAccountId).mockRejectedValueOnce(mockError);

      const donation = {
        erc20: mockErc20,
        amountPerSec: mockAmountPerSec,
        receiver: {
          type: 'address' as const,
          address: '0xReceiver123' as `0x${string}`,
        },
      };

      await expect(
        prepareContinuousDonation(
          mockAdapter,
          mockIpfsMetadataUploaderFn,
          donation,
        ),
      ).rejects.toThrow('Failed to resolve account ID');
    });

    it('should propagate errors from getCurrentStreamsAndReceivers', async () => {
      const mockError = new Error('Failed to get current streams');
      vi.mocked(getCurrentStreamsAndReceivers).mockRejectedValue(mockError);

      const donation = {
        erc20: mockErc20,
        amountPerSec: mockAmountPerSec,
        receiver: {
          type: 'address' as const,
          address: '0xReceiver123' as `0x${string}`,
        },
      };

      await expect(
        prepareContinuousDonation(
          mockAdapter,
          mockIpfsMetadataUploaderFn,
          donation,
        ),
      ).rejects.toThrow('Failed to get current streams');
    });

    it('should propagate errors from buildStreamsMetadata', async () => {
      const mockError = new Error('Failed to build metadata');
      vi.mocked(buildStreamsMetadata).mockRejectedValue(mockError);

      const donation = {
        erc20: mockErc20,
        amountPerSec: mockAmountPerSec,
        receiver: {
          type: 'address' as const,
          address: '0xReceiver123' as `0x${string}`,
        },
      };

      await expect(
        prepareContinuousDonation(
          mockAdapter,
          mockIpfsMetadataUploaderFn,
          donation,
        ),
      ).rejects.toThrow('Failed to build metadata');
    });

    it('should propagate errors from ipfsMetadataUploaderFn', async () => {
      const mockError = new Error('Failed to upload to IPFS');
      const failingIpfsMetadataUploaderFn = vi
        .fn()
        .mockRejectedValue(mockError);

      // Reset all mocks to ensure we don't get errors from other functions
      vi.mocked(resolveReceiverAccountId).mockReset();
      vi.mocked(resolveReceiverAccountId).mockResolvedValue(
        mockReceiverAccountId,
      );

      const donation = {
        erc20: mockErc20,
        amountPerSec: mockAmountPerSec,
        receiver: {
          type: 'address' as const,
          address: '0xReceiver123' as `0x${string}`,
        },
      };

      await expect(
        prepareContinuousDonation(
          mockAdapter,
          failingIpfsMetadataUploaderFn,
          donation,
        ),
      ).rejects.toThrow('Failed to upload to IPFS');
    });
  });
});
