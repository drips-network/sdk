import {describe, it, expect, vi, beforeEach} from 'vitest';
import {getCurrentStreamsAndReceivers} from '../../../src/internal/streams/getCurrentStreamReceivers';
import {
  createGraphQLClient,
  DripsGraphQLClient,
} from '../../../src/internal/graphql/createGraphQLClient';
import {requireGraphQLSupportedChain} from '../../../src/internal/shared/assertions';
import {filterCurrentChain} from '../../../src/internal/shared/filterCurrentChain';
import {Address} from 'viem';
import {GetCurrentStreamsQuery} from '../../../src/internal/donations/__generated__/gql.generated';
import * as Types from '../../../src/internal/graphql/__generated__/base-types';

vi.mock('../../../src/internal/graphql/createGraphQLClient');
vi.mock('../../../src/internal/shared/assertions');
vi.mock('../../../src/internal/shared/filterCurrentChain');

describe('getCurrentStreamsAndReceivers', () => {
  let mockGraphQLClient: DripsGraphQLClient;
  const mockAccountId = 123n;
  const mockChainId = 1;
  const mockErc20 = '0xToken123' as Address;
  const mockChain = 'MAINNET' as Types.SupportedChain;

  const mockQueryResponse: GetCurrentStreamsQuery = {
    __typename: 'Query',
    userById: {
      __typename: 'User',
      chainData: [
        {
          __typename: 'UserData',
          chain: mockChain,
          streams: {
            __typename: 'UserStreams',
            outgoing: [
              {
                __typename: 'Stream',
                id: 'stream1',
                name: 'Stream 1',
                isPaused: false,
                config: {
                  __typename: 'StreamConfig',
                  raw: '222',
                  amountPerSecond: {
                    __typename: 'Amount',
                    tokenAddress: mockErc20,
                    amount: '50',
                  },
                  dripId: '123',
                  durationSeconds: 0,
                  startDate: '2023-01-01T00:00:00.000Z',
                },
                receiver: {
                  __typename: 'User',
                  account: {
                    __typename: 'AddressDriverAccount',
                    accountId: '111',
                  },
                },
              },
              {
                __typename: 'Stream',
                id: 'stream2',
                name: 'Stream 2',
                isPaused: true, // Paused stream
                config: {
                  __typename: 'StreamConfig',
                  raw: '333',
                  amountPerSecond: {
                    __typename: 'Amount',
                    tokenAddress: mockErc20,
                    amount: '75',
                  },
                  dripId: '456',
                  durationSeconds: 0,
                  startDate: '2023-01-01T00:00:00.000Z',
                },
                receiver: {
                  __typename: 'User',
                  account: {
                    __typename: 'AddressDriverAccount',
                    accountId: '222',
                  },
                },
              },
              {
                __typename: 'Stream',
                id: 'stream3',
                name: 'Stream 3',
                isPaused: false,
                config: {
                  __typename: 'StreamConfig',
                  raw: '444',
                  amountPerSecond: {
                    __typename: 'Amount',
                    tokenAddress: '0xDifferentToken' as Address,
                    amount: '100',
                  },
                  dripId: '789',
                  durationSeconds: 0,
                  startDate: '2023-01-01T00:00:00.000Z',
                },
                receiver: {
                  __typename: 'User',
                  account: {
                    __typename: 'AddressDriverAccount',
                    accountId: '333',
                  },
                },
              },
            ],
          },
        },
      ],
    },
  };

  const mockFilteredChainData = {
    chain: mockChain,
    streams: {
      __typename: 'UserStreams',
      outgoing: mockQueryResponse.userById.chainData[0].streams.outgoing,
    },
  } as any;

  beforeEach(() => {
    mockGraphQLClient = {
      query: vi.fn().mockResolvedValue(mockQueryResponse),
    };

    vi.mocked(createGraphQLClient).mockReturnValue(mockGraphQLClient);
    vi.mocked(requireGraphQLSupportedChain).mockImplementation(() => {});
    vi.mocked(filterCurrentChain).mockReturnValue(mockFilteredChainData);

    vi.clearAllMocks();
  });

  it('should fetch and filter streams correctly', async () => {
    const result = await getCurrentStreamsAndReceivers(
      mockAccountId,
      mockChainId,
      mockErc20,
    );

    // Verify the GraphQL query was called with correct parameters
    expect(requireGraphQLSupportedChain).toHaveBeenCalledWith(
      mockChainId,
      'getCurrentStreamsAndReceivers',
    );
    expect(createGraphQLClient).toHaveBeenCalled();
    expect(mockGraphQLClient.query).toHaveBeenCalledWith(expect.any(String), {
      userAccountId: mockAccountId.toString(),
      chains: [mockChain],
    });
    expect(filterCurrentChain).toHaveBeenCalledWith(
      mockQueryResponse.userById.chainData,
      mockChain,
    );

    // Verify the result contains only active streams with matching token
    expect(result.currentStreams).toHaveLength(1);
    expect(result.currentStreams[0].id).toBe('stream1');
    expect(result.currentReceivers).toHaveLength(1);
    expect(result.currentReceivers[0]).toEqual({
      accountId: 111n,
      config: 222n,
    });
  });

  it('should use provided GraphQL client if passed', async () => {
    const customGraphQLClient: DripsGraphQLClient = {
      query: vi.fn().mockResolvedValue(mockQueryResponse),
    };

    await getCurrentStreamsAndReceivers(
      mockAccountId,
      mockChainId,
      mockErc20,
      customGraphQLClient,
    );

    expect(createGraphQLClient).not.toHaveBeenCalled();
    expect(customGraphQLClient.query).toHaveBeenCalledWith(expect.any(String), {
      userAccountId: mockAccountId.toString(),
      chains: [mockChain],
    });
  });

  it('should handle case with no matching streams', async () => {
    // Mock a response with no matching streams
    const noMatchesResponse = {
      ...mockQueryResponse,
      userById: {
        ...mockQueryResponse.userById,
        chainData: [
          {
            ...mockQueryResponse.userById.chainData[0],
            streams: {
              ...mockQueryResponse.userById.chainData[0].streams,
              outgoing: [
                // Only include streams with different token or paused streams
                mockQueryResponse.userById.chainData[0].streams.outgoing[1], // Paused stream
                mockQueryResponse.userById.chainData[0].streams.outgoing[2], // Different token
              ],
            },
          },
        ],
      },
    };

    mockGraphQLClient.query = vi.fn().mockResolvedValue(noMatchesResponse);
    vi.mocked(filterCurrentChain).mockReturnValue({
      chain: mockChain,
      streams: {
        __typename: 'UserStreams',
        outgoing: noMatchesResponse.userById.chainData[0].streams.outgoing,
      },
    } as any);

    const result = await getCurrentStreamsAndReceivers(
      mockAccountId,
      mockChainId,
      mockErc20,
    );

    expect(result.currentStreams).toHaveLength(0);
    expect(result.currentReceivers).toHaveLength(0);
  });

  it('should filter out paused streams', async () => {
    // Add a paused stream with matching token
    const withPausedResponse = {
      ...mockQueryResponse,
      userById: {
        ...mockQueryResponse.userById,
        chainData: [
          {
            ...mockQueryResponse.userById.chainData[0],
            streams: {
              ...mockQueryResponse.userById.chainData[0].streams,
              outgoing: [
                ...mockQueryResponse.userById.chainData[0].streams.outgoing,
                {
                  __typename: 'Stream',
                  id: 'stream4',
                  name: 'Stream 4',
                  isPaused: true, // Paused stream with matching token
                  config: {
                    __typename: 'StreamConfig',
                    raw: '555',
                    amountPerSecond: {
                      __typename: 'Amount',
                      tokenAddress: mockErc20,
                      amount: '200',
                    },
                    dripId: '999',
                    durationSeconds: 0,
                    startDate: '2023-01-01T00:00:00.000Z',
                  },
                  receiver: {
                    __typename: 'User',
                    account: {
                      __typename: 'AddressDriverAccount',
                      accountId: '444',
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    };

    mockGraphQLClient.query = vi.fn().mockResolvedValue(withPausedResponse);
    vi.mocked(filterCurrentChain).mockReturnValue({
      chain: mockChain,
      streams: {
        __typename: 'UserStreams',
        outgoing: withPausedResponse.userById.chainData[0].streams.outgoing,
      },
    } as any);

    const result = await getCurrentStreamsAndReceivers(
      mockAccountId,
      mockChainId,
      mockErc20,
    );

    // Should only include the active stream with matching token
    expect(result.currentStreams).toHaveLength(1);
    expect(result.currentStreams[0].id).toBe('stream1');
    expect(result.currentReceivers).toHaveLength(1);
  });

  it('should filter streams by token address case-insensitively', async () => {
    // Create a response with mixed case token addresses
    const mixedCaseResponse = {
      ...mockQueryResponse,
      userById: {
        ...mockQueryResponse.userById,
        chainData: [
          {
            ...mockQueryResponse.userById.chainData[0],
            streams: {
              ...mockQueryResponse.userById.chainData[0].streams,
              outgoing: [
                {
                  __typename: 'Stream',
                  id: 'stream5',
                  name: 'Stream 5',
                  isPaused: false,
                  config: {
                    __typename: 'StreamConfig',
                    raw: '666',
                    amountPerSecond: {
                      __typename: 'Amount',
                      tokenAddress: mockErc20.toLowerCase() as Address, // Lowercase token
                      amount: '300',
                    },
                    dripId: '1010',
                    durationSeconds: 0,
                    startDate: '2023-01-01T00:00:00.000Z',
                  },
                  receiver: {
                    __typename: 'User',
                    account: {
                      __typename: 'AddressDriverAccount',
                      accountId: '555',
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    };

    mockGraphQLClient.query = vi.fn().mockResolvedValue(mixedCaseResponse);
    vi.mocked(filterCurrentChain).mockReturnValue({
      chain: mockChain,
      streams: {
        __typename: 'UserStreams',
        outgoing: mixedCaseResponse.userById.chainData[0].streams.outgoing,
      },
    } as any);

    // Use uppercase token address in the function call
    const result = await getCurrentStreamsAndReceivers(
      mockAccountId,
      mockChainId,
      mockErc20.toUpperCase() as Address,
    );

    // Should match the lowercase token address
    expect(result.currentStreams).toHaveLength(1);
    expect(result.currentStreams[0].id).toBe('stream5');
    expect(result.currentReceivers).toHaveLength(1);
    expect(result.currentReceivers[0]).toEqual({
      accountId: 555n,
      config: 666n,
    });
  });

  it('should handle different receiver types', async () => {
    // Create a response with different receiver types
    const differentReceiversResponse = {
      ...mockQueryResponse,
      userById: {
        ...mockQueryResponse.userById,
        chainData: [
          {
            ...mockQueryResponse.userById.chainData[0],
            streams: {
              ...mockQueryResponse.userById.chainData[0].streams,
              outgoing: [
                {
                  __typename: 'Stream',
                  id: 'stream6',
                  name: 'Stream 6',
                  isPaused: false,
                  config: {
                    __typename: 'StreamConfig',
                    raw: '777',
                    amountPerSecond: {
                      __typename: 'Amount',
                      tokenAddress: mockErc20,
                      amount: '400',
                    },
                    dripId: '1111',
                    durationSeconds: 0,
                    startDate: '2023-01-01T00:00:00.000Z',
                  },
                  receiver: {
                    __typename: 'DripList',
                    account: {
                      __typename: 'AddressDriverAccount',
                      accountId: '666',
                    },
                  },
                },
                {
                  __typename: 'Stream',
                  id: 'stream7',
                  name: 'Stream 7',
                  isPaused: false,
                  config: {
                    __typename: 'StreamConfig',
                    raw: '888',
                    amountPerSecond: {
                      __typename: 'Amount',
                      tokenAddress: mockErc20,
                      amount: '500',
                    },
                    dripId: '1212',
                    durationSeconds: 0,
                    startDate: '2023-01-01T00:00:00.000Z',
                  },
                  receiver: {
                    __typename: 'EcosystemMainAccount',
                    account: {
                      __typename: 'AddressDriverAccount',
                      accountId: '777',
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    };

    mockGraphQLClient.query = vi
      .fn()
      .mockResolvedValue(differentReceiversResponse);
    vi.mocked(filterCurrentChain).mockReturnValue({
      chain: mockChain,
      streams: {
        __typename: 'UserStreams',
        outgoing:
          differentReceiversResponse.userById.chainData[0].streams.outgoing,
      },
    } as any);

    const result = await getCurrentStreamsAndReceivers(
      mockAccountId,
      mockChainId,
      mockErc20,
    );

    // Should include both streams with different receiver types
    expect(result.currentStreams).toHaveLength(2);
    expect(result.currentReceivers).toHaveLength(2);
    expect(result.currentReceivers).toEqual([
      {
        accountId: 666n,
        config: 777n,
      },
      {
        accountId: 777n,
        config: 888n,
      },
    ]);
  });

  describe('error handling', () => {
    it('should propagate errors from requireGraphQLSupportedChain', async () => {
      const mockError = new Error('Unsupported chain');
      vi.mocked(requireGraphQLSupportedChain).mockImplementation(() => {
        throw mockError;
      });

      await expect(
        getCurrentStreamsAndReceivers(mockAccountId, mockChainId, mockErc20),
      ).rejects.toThrow('Unsupported chain');
    });

    it('should propagate errors from GraphQL query', async () => {
      const mockError = new Error('GraphQL query failed');
      mockGraphQLClient.query = vi.fn().mockRejectedValue(mockError);

      await expect(
        getCurrentStreamsAndReceivers(mockAccountId, mockChainId, mockErc20),
      ).rejects.toThrow('GraphQL query failed');
    });

    it('should propagate errors from filterCurrentChain', async () => {
      const mockError = new Error('No item found for chain');
      vi.mocked(filterCurrentChain).mockImplementation(() => {
        throw mockError;
      });

      await expect(
        getCurrentStreamsAndReceivers(mockAccountId, mockChainId, mockErc20),
      ).rejects.toThrow('No item found for chain');
    });
  });
});
