import {describe, it, expect, vi, beforeEach} from 'vitest';
import {prepareCollection} from '../../../src/internal/collect/prepareCollection';
import {WriteBlockchainAdapter} from '../../../src/internal/blockchain/BlockchainAdapter';
import {requireSupportedChain} from '../../../src/internal/shared/assertions';
import {buildTx} from '../../../src/internal/shared/buildTx';
import {convertToCallerCall} from '../../../src/internal/shared/convertToCallerCall';
import {parseSplitsReceivers} from '../../../src/internal/shared/receiverUtils';
import {DripsError} from '../../../src/internal/shared/DripsError';

vi.mock('../../../src/internal/shared/assertions');
vi.mock('../../../src/internal/shared/buildTx');
vi.mock('../../../src/internal/shared/convertToCallerCall');
vi.mock('../../../src/internal/shared/receiverUtils');
vi.mock('../../../src/internal/config/contractsRegistry', () => ({
  contractsRegistry: {
    1: {
      drips: {
        address: '0xDrips123',
      },
      caller: {
        address: '0xCaller123',
      },
      addressDriver: {
        address: '0xAddressDriver123',
      },
      nativeTokenUnwrapper: {
        address: '0xNativeTokenUnwrapper123',
      },
    },
    80002: {
      drips: {
        address: '0xDrips80002',
      },
      caller: {
        address: '0xCaller80002',
      },
      addressDriver: {
        address: '0xAddressDriver80002',
      },
      nativeTokenUnwrapper: {
        address: undefined,
      },
    },
    314: {
      drips: {
        address: '0xDrips314',
      },
      caller: {
        address: '0xCaller314',
      },
      addressDriver: {
        address: '0xAddressDriver314',
      },
      nativeTokenUnwrapper: {
        address: '0xNativeTokenUnwrapper314',
      },
    },
  },
}));

describe('prepareCollection', () => {
  let mockAdapter: WriteBlockchainAdapter;
  const mockChainId = 1;
  const mockSignerAddress = '0xSigner123';
  const mockAccountId = 123n;
  const mockTokenAddress1 = '0xToken123' as `0x${string}`;
  const mockTokenAddress2 = '0xToken456' as `0x${string}`;
  const mockTransferToAddress = '0xTransferTo123' as `0x${string}`;

  const mockCurrentReceivers = [
    {
      type: 'address' as const,
      address: '0xReceiver1' as `0x${string}`,
      weight: 500000,
    },
    {
      type: 'address' as const,
      address: '0xReceiver2' as `0x${string}`,
      weight: 500000,
    },
  ];

  const mockOnChainReceivers = [
    {accountId: 111n, weight: 500000},
    {accountId: 222n, weight: 500000},
  ];

  const mockSqueezeArgs = [
    {
      accountId: '123',
      tokenAddress: mockTokenAddress1,
      senderId: 456n,
      historyHash: '0xHistoryHash1' as `0x${string}`,
      streamsHistory: [
        {
          streamsHash: '0xStreamsHash1' as `0x${string}`,
          receivers: [],
          updateTime: 1234567890,
          maxEnd: 1234567900,
        },
      ],
    },
  ];

  const mockSqueezeTx = {
    to: '0xDrips123',
    data: '0xSqueezeData',
    abiFunctionName: 'squeezeStreams',
  };

  const mockReceiveTx = {
    to: '0xDrips123',
    data: '0xReceiveData',
    abiFunctionName: 'receiveStreams',
  };

  const mockSplitTx = {
    to: '0xDrips123',
    data: '0xSplitData',
    abiFunctionName: 'split',
  };

  const mockCollectTx = {
    to: '0xAddressDriver123',
    data: '0xCollectData',
    abiFunctionName: 'collect',
  };

  const mockUnwrapTx = {
    to: '0xNativeTokenUnwrapper123',
    data: '0xUnwrapData',
    abiFunctionName: 'unwrap',
  };

  const mockBatchedTx = {
    to: '0xCaller123',
    data: '0xBatchedData',
    abiFunctionName: 'callBatched',
  };

  const mockCallerCall = {
    to: '0xMockTo',
    data: '0xMockData',
  };

  beforeEach(() => {
    mockAdapter = {
      getChainId: vi.fn().mockResolvedValue(mockChainId),
      getAddress: vi.fn().mockResolvedValue(mockSignerAddress),
    } as any;

    vi.mocked(requireSupportedChain).mockImplementation(() => {});
    vi.mocked(parseSplitsReceivers).mockResolvedValue({
      onChain: mockOnChainReceivers,
      metadata: [],
    });
    vi.mocked(buildTx).mockReturnValue(mockBatchedTx as any);
    vi.mocked(convertToCallerCall).mockReturnValue(mockCallerCall as any);

    vi.clearAllMocks();
  });

  describe('successful execution', () => {
    it('should prepare collection with all operations', async () => {
      const config = {
        accountId: mockAccountId,
        currentReceivers: mockCurrentReceivers,
        tokenAddresses: [mockTokenAddress1],
        squeezeArgs: mockSqueezeArgs,
        shouldSkipSplit: false,
        shouldSkipReceive: false,
        shouldAutoUnwrap: false,
      };

      vi.mocked(buildTx)
        .mockReturnValueOnce(mockSqueezeTx as any)
        .mockReturnValueOnce(mockReceiveTx as any)
        .mockReturnValueOnce(mockSplitTx as any)
        .mockReturnValueOnce(mockCollectTx as any)
        .mockReturnValueOnce(mockBatchedTx as any);

      const result = await prepareCollection(mockAdapter, config);

      expect(requireSupportedChain).toHaveBeenCalledWith(mockChainId);
      expect(parseSplitsReceivers).toHaveBeenCalledWith(
        mockAdapter,
        mockCurrentReceivers,
      );

      // Verify squeeze transaction
      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        functionName: 'squeezeStreams',
        args: [
          mockAccountId,
          mockTokenAddress1,
          mockSqueezeArgs[0].senderId,
          mockSqueezeArgs[0].historyHash,
          mockSqueezeArgs[0].streamsHistory,
        ],
        contract: '0xDrips123',
      });

      // Verify receive transaction
      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        functionName: 'receiveStreams',
        args: [mockAccountId, mockTokenAddress1, 1000],
        contract: '0xDrips123',
      });

      // Verify split transaction
      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        functionName: 'split',
        args: [mockAccountId, mockTokenAddress1, mockOnChainReceivers],
        contract: '0xDrips123',
      });

      // Verify collect transaction
      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        functionName: 'collect',
        args: [mockTokenAddress1, mockSignerAddress],
        contract: '0xAddressDriver123',
      });

      // Verify batched transaction
      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        contract: '0xCaller123',
        functionName: 'callBatched',
        args: [expect.any(Array)],
        batchedTxOverrides: undefined,
      });

      expect(result).toEqual(mockBatchedTx);
    });

    it('should handle multiple tokens', async () => {
      const config = {
        accountId: mockAccountId,
        currentReceivers: mockCurrentReceivers,
        tokenAddresses: [mockTokenAddress1, mockTokenAddress2],
        shouldSkipSplit: true,
        shouldSkipReceive: true,
        shouldAutoUnwrap: false,
      };

      vi.mocked(buildTx)
        .mockReturnValueOnce(mockCollectTx as any)
        .mockReturnValueOnce(mockCollectTx as any)
        .mockReturnValueOnce(mockBatchedTx as any);

      await prepareCollection(mockAdapter, config);

      // Should build collect transactions for both tokens
      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        functionName: 'collect',
        args: [mockTokenAddress1, mockSignerAddress],
        contract: '0xAddressDriver123',
      });

      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        functionName: 'collect',
        args: [mockTokenAddress2, mockSignerAddress],
        contract: '0xAddressDriver123',
      });
    });

    it('should skip receive when shouldSkipReceive is true', async () => {
      const config = {
        accountId: mockAccountId,
        currentReceivers: mockCurrentReceivers,
        tokenAddresses: [mockTokenAddress1],
        shouldSkipReceive: true,
        shouldSkipSplit: true,
        shouldAutoUnwrap: false,
      };

      vi.mocked(buildTx)
        .mockReturnValueOnce(mockCollectTx as any)
        .mockReturnValueOnce(mockBatchedTx as any);

      await prepareCollection(mockAdapter, config);

      // Should not call buildTx for receiveStreams
      expect(buildTx).not.toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'receiveStreams',
        }),
      );
    });

    it('should skip split when shouldSkipSplit is true', async () => {
      const config = {
        accountId: mockAccountId,
        currentReceivers: mockCurrentReceivers,
        tokenAddresses: [mockTokenAddress1],
        shouldSkipSplit: true,
        shouldSkipReceive: true,
        shouldAutoUnwrap: false,
      };

      vi.mocked(buildTx)
        .mockReturnValueOnce(mockCollectTx as any)
        .mockReturnValueOnce(mockBatchedTx as any);

      await prepareCollection(mockAdapter, config);

      // Should not call parseSplitsReceivers or buildTx for split
      expect(parseSplitsReceivers).not.toHaveBeenCalled();
      expect(buildTx).not.toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'split',
        }),
      );
    });

    it('should use transferToAddress when provided', async () => {
      const config = {
        accountId: mockAccountId,
        currentReceivers: mockCurrentReceivers,
        tokenAddresses: [mockTokenAddress1],
        transferToAddress: mockTransferToAddress,
        shouldSkipSplit: true,
        shouldSkipReceive: true,
        shouldAutoUnwrap: false,
      };

      vi.mocked(buildTx)
        .mockReturnValueOnce(mockCollectTx as any)
        .mockReturnValueOnce(mockBatchedTx as any);

      await prepareCollection(mockAdapter, config);

      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        functionName: 'collect',
        args: [mockTokenAddress1, mockTransferToAddress],
        contract: '0xAddressDriver123',
      });
    });

    it('should handle auto unwrap with native token unwrapper', async () => {
      const config = {
        accountId: mockAccountId,
        currentReceivers: mockCurrentReceivers,
        tokenAddresses: [mockTokenAddress1],
        shouldSkipSplit: true,
        shouldSkipReceive: true,
        shouldAutoUnwrap: true,
      };

      vi.mocked(buildTx)
        .mockReturnValueOnce(mockCollectTx as any)
        .mockReturnValueOnce(mockUnwrapTx as any)
        .mockReturnValueOnce(mockBatchedTx as any);

      await prepareCollection(mockAdapter, config);

      // Should collect to native token unwrapper
      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        functionName: 'collect',
        args: [mockTokenAddress1, '0xNativeTokenUnwrapper123'],
        contract: '0xAddressDriver123',
      });

      // Should unwrap to signer address
      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        functionName: 'unwrap',
        args: [mockSignerAddress],
        contract: '0xNativeTokenUnwrapper123',
      });
    });

    it('should handle batchedTxOverrides', async () => {
      const batchedTxOverrides = {
        gasLimit: 1000000n,
        maxFeePerGas: 2000000000n,
      };

      const config = {
        accountId: mockAccountId,
        currentReceivers: mockCurrentReceivers,
        tokenAddresses: [mockTokenAddress1],
        batchedTxOverrides,
        shouldSkipSplit: true,
        shouldSkipReceive: true,
        shouldAutoUnwrap: false,
      };

      vi.mocked(buildTx)
        .mockReturnValueOnce(mockCollectTx as any)
        .mockReturnValueOnce(mockBatchedTx as any);

      await prepareCollection(mockAdapter, config);

      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        contract: '0xCaller123',
        functionName: 'callBatched',
        args: [expect.any(Array)],
        batchedTxOverrides,
      });
    });

    it('should filter squeeze args by token address', async () => {
      const squeezeArgsMultipleTokens = [
        {
          accountId: '123',
          tokenAddress: mockTokenAddress1,
          senderId: 456n,
          historyHash: '0xHistoryHash1' as `0x${string}`,
          streamsHistory: [],
        },
        {
          accountId: '123',
          tokenAddress: mockTokenAddress2,
          senderId: 789n,
          historyHash: '0xHistoryHash2' as `0x${string}`,
          streamsHistory: [],
        },
      ];

      const config = {
        accountId: mockAccountId,
        currentReceivers: mockCurrentReceivers,
        tokenAddresses: [mockTokenAddress1],
        squeezeArgs: squeezeArgsMultipleTokens,
        shouldSkipSplit: true,
        shouldSkipReceive: true,
        shouldAutoUnwrap: false,
      };

      vi.mocked(buildTx)
        .mockReturnValueOnce(mockSqueezeTx as any)
        .mockReturnValueOnce(mockCollectTx as any)
        .mockReturnValueOnce(mockBatchedTx as any);

      await prepareCollection(mockAdapter, config);

      // Should only squeeze for mockTokenAddress1
      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        functionName: 'squeezeStreams',
        args: [mockAccountId, mockTokenAddress1, 456n, '0xHistoryHash1', []],
        contract: '0xDrips123',
      });

      // Should not squeeze for mockTokenAddress2
      expect(buildTx).not.toHaveBeenCalledWith({
        abi: expect.any(Array),
        functionName: 'squeezeStreams',
        args: [mockAccountId, mockTokenAddress2, 789n, '0xHistoryHash2', []],
        contract: '0xDrips123',
      });
    });
  });

  describe('error handling', () => {
    it('should throw error when no tokens provided', async () => {
      const config = {
        accountId: mockAccountId,
        currentReceivers: mockCurrentReceivers,
        tokenAddresses: [],
        shouldSkipSplit: true,
        shouldSkipReceive: true,
        shouldAutoUnwrap: false,
      };

      await expect(prepareCollection(mockAdapter, config)).rejects.toThrow(
        DripsError,
      );
      await expect(prepareCollection(mockAdapter, config)).rejects.toThrow(
        'No tokens provided for collection.',
      );
    });

    it('should throw error when native token unwrapper not configured but auto unwrap enabled', async () => {
      // Mock chain without native token unwrapper
      mockAdapter.getChainId = vi.fn().mockResolvedValue(80002);

      const config = {
        accountId: mockAccountId,
        currentReceivers: mockCurrentReceivers,
        tokenAddresses: [mockTokenAddress1],
        shouldSkipSplit: true,
        shouldSkipReceive: true,
        shouldAutoUnwrap: true,
      };

      await expect(prepareCollection(mockAdapter, config)).rejects.toThrow(
        DripsError,
      );
      await expect(prepareCollection(mockAdapter, config)).rejects.toThrow(
        'Native token unwrapper is not configured for this chain but auto unwrap is enabled.',
      );
    });

    it('should throw error when transferToAddress differs from signer with auto unwrap', async () => {
      const config = {
        accountId: mockAccountId,
        currentReceivers: mockCurrentReceivers,
        tokenAddresses: [mockTokenAddress1],
        transferToAddress: mockTransferToAddress,
        shouldSkipSplit: true,
        shouldSkipReceive: true,
        shouldAutoUnwrap: true,
      };

      await expect(prepareCollection(mockAdapter, config)).rejects.toThrow(
        DripsError,
      );
      await expect(prepareCollection(mockAdapter, config)).rejects.toThrow(
        'Signer address and transfer to address must match when auto unwrapping.',
      );
    });

    it('should propagate errors from requireSupportedChain', async () => {
      const mockError = new Error('Unsupported chain');
      vi.mocked(requireSupportedChain).mockImplementation(() => {
        throw mockError;
      });

      const config = {
        accountId: mockAccountId,
        currentReceivers: mockCurrentReceivers,
        tokenAddresses: [mockTokenAddress1],
        shouldSkipSplit: true,
        shouldSkipReceive: true,
        shouldAutoUnwrap: false,
      };

      await expect(prepareCollection(mockAdapter, config)).rejects.toThrow(
        'Unsupported chain',
      );
    });

    it('should propagate errors from parseSplitsReceivers', async () => {
      const mockError = new Error('Failed to parse splits receivers');
      vi.mocked(parseSplitsReceivers).mockRejectedValue(mockError);

      const config = {
        accountId: mockAccountId,
        currentReceivers: mockCurrentReceivers,
        tokenAddresses: [mockTokenAddress1],
        shouldSkipSplit: false,
        shouldSkipReceive: true,
        shouldAutoUnwrap: false,
      };

      await expect(prepareCollection(mockAdapter, config)).rejects.toThrow(
        'Failed to parse splits receivers',
      );
    });

    it('should propagate errors from buildTx', async () => {
      const mockError = new Error('Failed to build transaction');
      vi.mocked(buildTx).mockImplementation(() => {
        throw mockError;
      });

      const config = {
        accountId: mockAccountId,
        currentReceivers: mockCurrentReceivers,
        tokenAddresses: [mockTokenAddress1],
        shouldSkipSplit: true,
        shouldSkipReceive: true,
        shouldAutoUnwrap: false,
      };

      await expect(prepareCollection(mockAdapter, config)).rejects.toThrow(
        'Failed to build transaction',
      );
    });

    it('should propagate errors from getChainId', async () => {
      const mockError = new Error('Failed to get chain ID');
      mockAdapter.getChainId = vi.fn().mockRejectedValue(mockError);

      const config = {
        accountId: mockAccountId,
        currentReceivers: mockCurrentReceivers,
        tokenAddresses: [mockTokenAddress1],
        shouldSkipSplit: true,
        shouldSkipReceive: true,
        shouldAutoUnwrap: false,
      };

      await expect(prepareCollection(mockAdapter, config)).rejects.toThrow(
        'Failed to get chain ID',
      );
    });

    it('should propagate errors from getAddress', async () => {
      const mockError = new Error('Failed to get address');
      mockAdapter.getAddress = vi.fn().mockRejectedValue(mockError);

      const config = {
        accountId: mockAccountId,
        currentReceivers: mockCurrentReceivers,
        tokenAddresses: [mockTokenAddress1],
        shouldSkipSplit: true,
        shouldSkipReceive: true,
        shouldAutoUnwrap: false,
      };

      await expect(prepareCollection(mockAdapter, config)).rejects.toThrow(
        'Failed to get address',
      );
    });
  });

  describe('transaction structure validation', () => {
    it('should build transactions in correct order', async () => {
      const config = {
        accountId: mockAccountId,
        currentReceivers: mockCurrentReceivers,
        tokenAddresses: [mockTokenAddress1],
        squeezeArgs: mockSqueezeArgs,
        shouldSkipSplit: false,
        shouldSkipReceive: false,
        shouldAutoUnwrap: false,
      };

      const buildTxCalls: any[] = [];
      vi.mocked(buildTx).mockImplementation(args => {
        buildTxCalls.push(args);
        return mockBatchedTx as any;
      });

      await prepareCollection(mockAdapter, config);

      // Verify order: squeeze, receive, split, collect, batched
      expect(buildTxCalls[0].functionName).toBe('squeezeStreams');
      expect(buildTxCalls[1].functionName).toBe('receiveStreams');
      expect(buildTxCalls[2].functionName).toBe('split');
      expect(buildTxCalls[3].functionName).toBe('collect');
      expect(buildTxCalls[4].functionName).toBe('callBatched');
    });

    it('should convert transactions to caller calls correctly', async () => {
      const config = {
        accountId: mockAccountId,
        currentReceivers: mockCurrentReceivers,
        tokenAddresses: [mockTokenAddress1],
        shouldSkipSplit: true,
        shouldSkipReceive: true,
        shouldAutoUnwrap: false,
      };

      vi.mocked(buildTx)
        .mockReturnValueOnce(mockCollectTx as any)
        .mockReturnValueOnce(mockBatchedTx as any);

      await prepareCollection(mockAdapter, config);

      expect(convertToCallerCall).toHaveBeenCalledWith(mockCollectTx, 0, [
        mockCollectTx,
      ]);
      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        contract: '0xCaller123',
        functionName: 'callBatched',
        args: [[mockCallerCall]],
        batchedTxOverrides: undefined,
      });
    });
  });
});
