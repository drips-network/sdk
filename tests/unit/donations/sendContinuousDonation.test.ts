import {describe, it, expect, vi, beforeEach} from 'vitest';
import {sendContinuousDonation} from '../../../src/internal/donations/sendContinuousDonation';
import {prepareContinuousDonation} from '../../../src/internal/donations/prepareContinuousDonation';
import {TimeUnit} from '../../../src/internal/shared/streamRateUtils';
import {
  WriteBlockchainAdapter,
  TxResponse,
} from '../../../src/internal/blockchain/BlockchainAdapter';

vi.mock('../../../src/internal/donations/prepareContinuousDonation');
vi.mock('../../../src/internal/shared/assertions');

describe('sendContinuousDonation', () => {
  let mockAdapter: WriteBlockchainAdapter;
  const mockTxResponse: TxResponse = {
    hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    wait: vi.fn().mockResolvedValue({
      hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      to: '0xRecipient123',
      from: '0xSender456',
      blockNumber: 12345n,
      gasUsed: 21000n,
      status: 'success' as const,
      logs: [],
    }),
    meta: {},
  };

  const mockPreparedTx = {
    to: '0xAddressDriver123' as const,
    data: '0xmockdata' as const,
  };

  const mockIpfsHash = 'QmHash123';
  const mockMetadata = {
    describes: {
      driver: 'address' as const,
      accountId: '123',
    },
    assetConfigs: [],
    timestamp: 123456789,
    writtenByAddress: '0xSender456',
  };

  const mockIpfsMetadataUploaderFn = vi.fn();

  beforeEach(() => {
    mockAdapter = {
      getChainId: vi.fn().mockResolvedValue(1),
      getAddress: vi.fn().mockResolvedValue('0xSender456'),
      sendTx: vi.fn().mockResolvedValue(mockTxResponse),
      call: vi.fn(),
      signMsg: vi.fn(),
    } as any;

    vi.mocked(prepareContinuousDonation).mockResolvedValue({
      preparedTx: mockPreparedTx as any,
      ipfsHash: mockIpfsHash,
      metadata: mockMetadata,
    });

    vi.clearAllMocks();
  });

  describe('successful donation', () => {
    it('should send continuous donation for address receiver', async () => {
      const donation = {
        erc20: '0xToken123' as `0x${string}`,
        amount: '100',
        timeUnit: TimeUnit.DAY,
        tokenDecimals: 18,
        receiver: {
          type: 'address' as const,
          address: '0xReceiver123' as `0x${string}`,
        },
      };

      const result = await sendContinuousDonation(
        mockAdapter,
        mockIpfsMetadataUploaderFn,
        donation,
      );

      expect(prepareContinuousDonation).toHaveBeenCalledWith(
        mockAdapter,
        mockIpfsMetadataUploaderFn,
        donation,
        undefined,
      );
      expect(mockAdapter.sendTx).toHaveBeenCalledWith(mockPreparedTx);
      expect(result).toEqual({
        txResponse: mockTxResponse,
        ipfsHash: mockIpfsHash,
        metadata: mockMetadata,
      });
    });

    it('should pass GraphQL client to prepareContinuousDonation if provided', async () => {
      const mockGraphQLClient = {} as any;
      const donation = {
        erc20: '0xToken123' as `0x${string}`,
        amount: '100',
        timeUnit: TimeUnit.DAY,
        tokenDecimals: 18,
        receiver: {
          type: 'address' as const,
          address: '0xReceiver123' as `0x${string}`,
        },
      };

      await sendContinuousDonation(
        mockAdapter,
        mockIpfsMetadataUploaderFn,
        donation,
        mockGraphQLClient,
      );

      expect(prepareContinuousDonation).toHaveBeenCalledWith(
        mockAdapter,
        mockIpfsMetadataUploaderFn,
        donation,
        mockGraphQLClient,
      );
    });
  });

  describe('error handling', () => {
    it('should propagate errors from prepareContinuousDonation', async () => {
      const mockError = new Error('Failed to prepare transaction');
      vi.mocked(prepareContinuousDonation).mockRejectedValue(mockError);

      const donation = {
        erc20: '0xToken123' as `0x${string}`,
        amount: '100',
        timeUnit: TimeUnit.DAY,
        tokenDecimals: 18,
        receiver: {
          type: 'address' as const,
          address: '0xReceiver123' as `0x${string}`,
        },
      };

      await expect(
        sendContinuousDonation(
          mockAdapter,
          mockIpfsMetadataUploaderFn,
          donation,
        ),
      ).rejects.toThrow('Failed to prepare transaction');
      expect(prepareContinuousDonation).toHaveBeenCalledWith(
        mockAdapter,
        mockIpfsMetadataUploaderFn,
        donation,
        undefined,
      );
      expect(mockAdapter.sendTx).not.toHaveBeenCalled();
    });

    it('should propagate errors from adapter.sendTx', async () => {
      const mockError = new Error('Transaction failed');
      mockAdapter.sendTx = vi.fn().mockRejectedValue(mockError);

      const donation = {
        erc20: '0xToken123' as `0x${string}`,
        amount: '100',
        timeUnit: TimeUnit.DAY,
        tokenDecimals: 18,
        receiver: {
          type: 'address' as const,
          address: '0xReceiver123' as `0x${string}`,
        },
      };

      await expect(
        sendContinuousDonation(
          mockAdapter,
          mockIpfsMetadataUploaderFn,
          donation,
        ),
      ).rejects.toThrow('Transaction failed');
      expect(prepareContinuousDonation).toHaveBeenCalledWith(
        mockAdapter,
        mockIpfsMetadataUploaderFn,
        donation,
        undefined,
      );
      expect(mockAdapter.sendTx).toHaveBeenCalledWith(mockPreparedTx);
    });
  });

  describe('function call order', () => {
    it('should call functions in correct order', async () => {
      const callOrder: string[] = [];

      vi.mocked(prepareContinuousDonation).mockImplementation(async () => {
        callOrder.push('prepareContinuousDonation');
        return {
          preparedTx: mockPreparedTx as any,
          ipfsHash: mockIpfsHash,
          metadata: mockMetadata,
        };
      });

      mockAdapter.sendTx = vi.fn().mockImplementation(async () => {
        callOrder.push('sendTx');
        return mockTxResponse;
      });

      const donation = {
        erc20: '0xToken123' as `0x${string}`,
        amount: '100',
        timeUnit: TimeUnit.DAY,
        tokenDecimals: 18,
        receiver: {
          type: 'address' as const,
          address: '0xReceiver123' as `0x${string}`,
        },
      };

      await sendContinuousDonation(
        mockAdapter,
        mockIpfsMetadataUploaderFn,
        donation,
      );

      expect(callOrder).toEqual(['prepareContinuousDonation', 'sendTx']);
    });
  });

  describe('return value', () => {
    it('should return the exact response objects', async () => {
      const customTxResponse: TxResponse = {
        hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        wait: vi.fn().mockResolvedValue({
          hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          to: '0xCustomRecipient',
          from: '0xCustomSender',
          blockNumber: 54321n,
          gasUsed: 42000n,
          status: 'success' as const,
          logs: [{custom: 'log'}],
        }),
        meta: {custom: 'metadata'},
      };

      const customIpfsHash = 'QmCustomHash';
      const customMetadata = {
        describes: {
          driver: 'address' as const,
          accountId: '456',
        },
        assetConfigs: [
          {
            tokenAddress: '0xToken456' as `0x${string}`,
            streams: [],
          },
        ],
        timestamp: 987654321,
        writtenByAddress: '0xCustomSender',
      };

      mockAdapter.sendTx = vi.fn().mockResolvedValue(customTxResponse);
      vi.mocked(prepareContinuousDonation).mockResolvedValue({
        preparedTx: mockPreparedTx as any,
        ipfsHash: customIpfsHash,
        metadata: customMetadata,
      });

      const donation = {
        erc20: '0xToken123' as `0x${string}`,
        amount: '100',
        timeUnit: TimeUnit.DAY,
        tokenDecimals: 18,
        receiver: {
          type: 'address' as const,
          address: '0xReceiver123' as `0x${string}`,
        },
      };

      const result = await sendContinuousDonation(
        mockAdapter,
        mockIpfsMetadataUploaderFn,
        donation,
      );

      expect(result).toEqual({
        txResponse: customTxResponse,
        ipfsHash: customIpfsHash,
        metadata: customMetadata,
      });
      expect(result.txResponse.hash).toBe(
        '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      );
      expect(result.txResponse.meta).toEqual({custom: 'metadata'});
      expect(result.ipfsHash).toBe(customIpfsHash);
      expect(result.metadata).toBe(customMetadata);
    });
  });
});
