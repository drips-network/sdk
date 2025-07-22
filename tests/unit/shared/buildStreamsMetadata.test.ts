import {describe, it, expect, vi, beforeEach} from 'vitest';
import {Address} from 'viem';
import {
  encodeStreamConfig,
  parseStreamRate,
} from '../../../src/internal/shared/streamRateUtils';
import encodeStreamId from '../../../src/internal/shared/streamIdUtils';
import {addressDriverAccountMetadataParser} from '../../../src/internal/metadata/schemas';
import {resolveAddressFromAddressDriverId} from '../../../src/internal/shared/resolveAddressFromAddressDriverId';
import {resolveDriverName} from '../../../src/internal/shared/resolveDriverName';
import {ReadBlockchainAdapter} from '../../../src/internal/blockchain/BlockchainAdapter';
import {ContinuousDonation} from '../../../src/internal/donations/prepareContinuousDonation';
import {buildStreamsMetadata} from '../../../src/internal/streams/buildStreamsMetadata';
import {resolveReceiverAccountId} from '../../../src/internal/shared/receiverUtils';

// Mock dependencies
vi.mock('../../../src/internal/shared/streamRateUtils', () => ({
  encodeStreamConfig: vi.fn(),
  parseStreamRate: vi.fn(),
}));

vi.mock('../../../src/internal/shared/streamIdUtils', () => ({
  default: vi.fn(),
}));

vi.mock('../../../src/internal/metadata/schemas', () => ({
  addressDriverAccountMetadataParser: {
    parseLatest: vi.fn(),
  },
}));

vi.mock(
  '../../../src/internal/shared/resolveAddressFromAddressDriverId',
  () => ({
    resolveAddressFromAddressDriverId: vi.fn(),
  }),
);

vi.mock('../../../src/internal/shared/receiverUtils', () => ({
  resolveReceiverAccountId: vi.fn(),
}));

vi.mock('../../../src/internal/shared/resolveDriverName', () => ({
  resolveDriverName: vi.fn(),
}));

describe('buildStreamsMetadata', () => {
  let mockAdapter: ReadBlockchainAdapter;
  let mockStreams: any[];
  let mockAccountId: bigint;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup mock adapter
    mockAdapter = {
      getChainId: vi.fn().mockResolvedValue(11155111), // Sepolia testnet
      call: vi.fn().mockResolvedValue({}),
    } as any;

    // Setup mock account ID
    mockAccountId = 123n;

    // Setup mock streams
    mockStreams = [
      {
        id: 'existing-stream-id',
        name: 'Existing Stream',
        config: {
          raw: 'existing-raw-config',
          dripId: '789',
          amountPerSecond: {
            amount: '1000000000000000000', // 1 ETH per second
            tokenAddress: '0x1234567890123456789012345678901234567890',
          },
          durationSeconds: 86400, // 1 day
          startDate: '2023-01-01T00:00:00.000Z',
        },
        receiver: {
          account: {
            accountId: '456',
          },
        },
      },
    ];

    // Setup mock return values
    vi.mocked(encodeStreamConfig).mockReturnValue(123456789n);
    vi.mocked(parseStreamRate).mockReturnValue(1000000000000000000n); // 1 ETH per second
    vi.mocked(encodeStreamId).mockReturnValue('mock-stream-id');
    vi.mocked(resolveAddressFromAddressDriverId).mockReturnValue(
      '0xmockaddress',
    );
    vi.mocked(resolveReceiverAccountId).mockResolvedValue(456n);
    vi.mocked(resolveDriverName).mockReturnValue('address');
    vi.mocked(addressDriverAccountMetadataParser.parseLatest).mockReturnValue({
      describes: {
        driver: 'address',
        accountId: '123',
      },
      assetConfigs: [
        {
          tokenAddress: '0x1234567890123456789012345678901234567890',
          streams: [
            {
              id: 'mock-stream-id',
              initialDripsConfig: {
                raw: '123456789',
                dripId: '999',
                amountPerSecond: 1000000000000000000n,
                durationSeconds: 86400,
                startTimestamp: 1672531200,
              },
              receiver: {
                driver: 'address',
                accountId: '456',
              },
              archived: false,
              name: 'New Stream',
            },
          ],
        },
      ],
      timestamp: 1672531200,
      writtenByAddress: '0xmockaddress',
    });
  });

  it('should build metadata for existing streams', async () => {
    // Act
    const result = await buildStreamsMetadata(
      mockAdapter,
      mockAccountId,
      mockStreams,
    );

    // Assert
    expect(resolveDriverName).toHaveBeenCalledWith(456n);
    expect(resolveAddressFromAddressDriverId).toHaveBeenCalledWith(
      mockAccountId,
    );
    expect(addressDriverAccountMetadataParser.parseLatest).toHaveBeenCalled();

    // Verify the structure of the input to parseLatest
    const parseLatestInput = vi.mocked(
      addressDriverAccountMetadataParser.parseLatest,
    ).mock.calls[0][0] as {
      describes: {
        driver: string;
        accountId: string;
      };
      assetConfigs: Array<{
        tokenAddress: string;
        streams: Array<{
          name?: string;
          initialDripsConfig: {
            durationSeconds: number;
          };
        }>;
      }>;
      writtenByAddress: string;
    };
    expect(parseLatestInput.describes).toEqual({
      driver: 'address',
      accountId: '123',
    });
    expect(parseLatestInput.assetConfigs).toHaveLength(1);
    expect(parseLatestInput.assetConfigs[0].tokenAddress).toBe(
      '0x1234567890123456789012345678901234567890',
    );
    expect(parseLatestInput.assetConfigs[0].streams).toHaveLength(1);
    expect(parseLatestInput.writtenByAddress).toBe('0xmockaddress');

    // Verify the result
    expect(result).toEqual(
      expect.objectContaining({
        describes: {
          driver: 'address',
          accountId: '123',
        },
        assetConfigs: expect.any(Array),
        timestamp: expect.any(Number),
        writtenByAddress: '0xmockaddress',
      }),
    );
  });

  it('should add a new stream to metadata when provided', async () => {
    // Arrange
    const newStream: ContinuousDonation & {dripId: bigint} = {
      dripId: 999n,
      erc20: '0x1234567890123456789012345678901234567890' as Address,
      receiver: {
        type: 'address',
        address: '0x9876543210987654321098765432109876543210' as Address,
      },
      amount: '1',
      timeUnit: 1,
      tokenDecimals: 18,
      startAt: new Date('2023-01-01T00:00:00.000Z'),
      durationSeconds: 86400n,
      name: 'New Stream',
    };

    // Act
    const result = await buildStreamsMetadata(
      mockAdapter,
      mockAccountId,
      mockStreams,
      newStream,
    );

    // Assert
    expect(encodeStreamId).toHaveBeenCalledWith(
      '123',
      '0x1234567890123456789012345678901234567890',
      '999',
    );
    const expectedAmountPerSec = parseStreamRate(
      newStream.amount,
      newStream.timeUnit,
      newStream.tokenDecimals,
    );
    expect(encodeStreamConfig).toHaveBeenCalledWith({
      dripId: 999n,
      start: 1672531200n, // Jan 1, 2023 timestamp in seconds
      duration: 86400n,
      amountPerSec: expectedAmountPerSec,
    });
    expect(resolveReceiverAccountId).toHaveBeenCalledWith(mockAdapter, {
      type: 'address',
      address: '0x9876543210987654321098765432109876543210' as Address,
    });

    // Verify the structure of the input to parseLatest
    const parseLatestInput = vi.mocked(
      addressDriverAccountMetadataParser.parseLatest,
    ).mock.calls[0][0] as {
      describes: {
        driver: string;
        accountId: string;
      };
      assetConfigs: Array<{
        tokenAddress: string;
        streams: Array<{
          name?: string;
          initialDripsConfig: {
            durationSeconds: number;
          };
        }>;
      }>;
      writtenByAddress: string;
    };
    expect(parseLatestInput.assetConfigs).toHaveLength(1);
    expect(parseLatestInput.assetConfigs[0].streams).toHaveLength(2); // Should include both streams

    // Verify the result
    expect(result).toEqual(
      expect.objectContaining({
        describes: {
          driver: 'address',
          accountId: '123',
        },
        assetConfigs: expect.any(Array),
        timestamp: expect.any(Number),
        writtenByAddress: '0xmockaddress',
      }),
    );
  });

  it('should handle streams with different token addresses', async () => {
    // Arrange
    const additionalStream = {
      id: 'another-stream-id',
      name: 'Another Stream',
      config: {
        raw: 'another-raw-config',
        dripId: '101',
        amountPerSecond: {
          amount: '500000000000000000', // 0.5 ETH per second
          tokenAddress: '0xabcdef0123456789abcdef0123456789abcdef01', // Different token
        },
        durationSeconds: 43200, // 12 hours
        startDate: '2023-01-02T00:00:00.000Z',
      },
      receiver: {
        account: {
          accountId: '789',
        },
      },
    };

    const extendedMockStreams = [...mockStreams, additionalStream];

    // Mock resolveDriverName to return different values based on input
    vi.mocked(resolveDriverName)
      .mockReturnValueOnce('address') // For the first stream
      .mockReturnValueOnce('nft'); // For the second stream

    // Act
    const result = await buildStreamsMetadata(
      mockAdapter,
      mockAccountId,
      extendedMockStreams,
    );

    // Assert
    expect(resolveDriverName).toHaveBeenCalledTimes(2);
    expect(resolveDriverName).toHaveBeenCalledWith(456n);
    expect(resolveDriverName).toHaveBeenCalledWith(789n);

    // Verify the structure of the input to parseLatest
    const parseLatestInput = vi.mocked(
      addressDriverAccountMetadataParser.parseLatest,
    ).mock.calls[0][0] as {
      describes: {
        driver: string;
        accountId: string;
      };
      assetConfigs: Array<{
        tokenAddress: string;
        streams: Array<{
          name?: string;
          initialDripsConfig: {
            durationSeconds: number;
          };
        }>;
      }>;
      writtenByAddress: string;
    };
    expect(parseLatestInput.assetConfigs).toHaveLength(2); // Should have two asset configs for different tokens

    // Verify the result
    expect(result).toEqual(
      expect.objectContaining({
        describes: {
          driver: 'address',
          accountId: '123',
        },
        assetConfigs: expect.any(Array),
        timestamp: expect.any(Number),
        writtenByAddress: '0xmockaddress',
      }),
    );
  });

  it('should throw error for unsupported recipient driver', async () => {
    // Arrange
    // Mock resolveDriverName to return an unsupported driver
    vi.mocked(resolveDriverName).mockReturnValue('unsupported' as any);

    // Act & Assert
    await expect(
      buildStreamsMetadata(mockAdapter, mockAccountId, mockStreams),
    ).rejects.toThrow('Unsupported recipient driver: unsupported');
  });

  it('should handle streams with no name', async () => {
    // Arrange
    const streamWithoutName = {
      ...mockStreams[0],
      name: null, // No name
    };

    // Act
    const result = await buildStreamsMetadata(mockAdapter, mockAccountId, [
      streamWithoutName,
    ]);

    // Assert
    // Verify the structure of the input to parseLatest
    const parseLatestInput = vi.mocked(
      addressDriverAccountMetadataParser.parseLatest,
    ).mock.calls[0][0] as {
      describes: {
        driver: string;
        accountId: string;
      };
      assetConfigs: Array<{
        tokenAddress: string;
        streams: Array<{
          name?: string;
          initialDripsConfig: {
            durationSeconds: number;
          };
        }>;
      }>;
      writtenByAddress: string;
    };
    expect(parseLatestInput.assetConfigs[0].streams[0].name).toBeUndefined();

    // Verify the result
    expect(result).toEqual(
      expect.objectContaining({
        describes: {
          driver: 'address',
          accountId: '123',
        },
        assetConfigs: expect.any(Array),
        timestamp: expect.any(Number),
        writtenByAddress: '0xmockaddress',
      }),
    );
  });

  it('should handle streams with no duration', async () => {
    // Arrange
    const streamWithoutDuration = {
      ...mockStreams[0],
      config: {
        ...mockStreams[0].config,
        durationSeconds: null, // No duration
      },
    };

    // Act
    const result = await buildStreamsMetadata(mockAdapter, mockAccountId, [
      streamWithoutDuration,
    ]);

    // Assert
    // Verify the structure of the input to parseLatest
    const parseLatestInput = vi.mocked(
      addressDriverAccountMetadataParser.parseLatest,
    ).mock.calls[0][0] as {
      describes: {
        driver: string;
        accountId: string;
      };
      assetConfigs: Array<{
        tokenAddress: string;
        streams: Array<{
          name?: string;
          initialDripsConfig: {
            durationSeconds: number;
          };
        }>;
      }>;
      writtenByAddress: string;
    };
    expect(
      parseLatestInput.assetConfigs[0].streams[0].initialDripsConfig
        .durationSeconds,
    ).toBe(0);

    // Verify the result
    expect(result).toEqual(
      expect.objectContaining({
        describes: {
          driver: 'address',
          accountId: '123',
        },
        assetConfigs: expect.any(Array),
        timestamp: expect.any(Number),
        writtenByAddress: '0xmockaddress',
      }),
    );
  });

  it('should handle new stream with no startAt', async () => {
    // Arrange
    const newStreamWithoutStartAt: ContinuousDonation & {dripId: bigint} = {
      dripId: 999n,
      erc20: '0x1234567890123456789012345678901234567890' as Address,
      receiver: {
        type: 'address',
        address: '0x9876543210987654321098765432109876543210' as Address,
      },
      amount: '1',
      timeUnit: 1,
      tokenDecimals: 18,
      startAt: undefined, // No start time
      durationSeconds: 86400n,
      name: 'New Stream',
    };

    // Mock Date.now to return a fixed timestamp
    const originalDateNow = Date.now;
    Date.now = vi.fn(() => 1672531200000); // Jan 1, 2023 timestamp in milliseconds

    // Act
    const result = await buildStreamsMetadata(
      mockAdapter,
      mockAccountId,
      mockStreams,
      newStreamWithoutStartAt,
    );

    // Restore Date.now
    Date.now = originalDateNow;

    // Assert
    const expectedAmountPerSec = parseStreamRate(
      newStreamWithoutStartAt.amount,
      newStreamWithoutStartAt.timeUnit,
      newStreamWithoutStartAt.tokenDecimals,
    );
    expect(encodeStreamConfig).toHaveBeenCalledWith({
      dripId: 999n,
      start: 0n, // Should use 0 when startAt is null
      duration: 86400n,
      amountPerSec: expectedAmountPerSec,
    });

    // Verify the result
    expect(result).toEqual(
      expect.objectContaining({
        describes: {
          driver: 'address',
          accountId: '123',
        },
        assetConfigs: expect.any(Array),
        timestamp: expect.any(Number),
        writtenByAddress: '0xmockaddress',
      }),
    );
  });

  it('should handle new stream with no durationSeconds', async () => {
    // Arrange
    const newStreamWithoutDuration: ContinuousDonation & {dripId: bigint} = {
      dripId: 999n,
      erc20: '0x1234567890123456789012345678901234567890' as Address,
      receiver: {
        type: 'address',
        address: '0x9876543210987654321098765432109876543210' as Address,
      },
      amount: '1',
      timeUnit: 1,
      tokenDecimals: 18,
      startAt: new Date('2023-01-01T00:00:00.000Z'),
      durationSeconds: undefined, // No duration
      name: 'New Stream',
    };

    // Act
    const result = await buildStreamsMetadata(
      mockAdapter,
      mockAccountId,
      mockStreams,
      newStreamWithoutDuration,
    );

    // Assert
    const expectedAmountPerSec = parseStreamRate(
      newStreamWithoutDuration.amount,
      newStreamWithoutDuration.timeUnit,
      newStreamWithoutDuration.tokenDecimals,
    );
    expect(encodeStreamConfig).toHaveBeenCalledWith({
      dripId: 999n,
      start: 1672531200n,
      duration: 0n, // Should use 0 when durationSeconds is null
      amountPerSec: expectedAmountPerSec,
    });

    // Verify the result
    expect(result).toEqual(
      expect.objectContaining({
        describes: {
          driver: 'address',
          accountId: '123',
        },
        assetConfigs: expect.any(Array),
        timestamp: expect.any(Number),
        writtenByAddress: '0xmockaddress',
      }),
    );
  });
});
