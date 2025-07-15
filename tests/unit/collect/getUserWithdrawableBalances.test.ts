import {describe, it, expect, vi, beforeEach} from 'vitest';
import {getUserWithdrawableBalances} from '../../../src/internal/collect/getUserWithdrawableBalances';
import {requireGraphQLSupportedChain} from '../../../src/internal/shared/assertions';
import {createGraphQLClient} from '../../../src/internal/graphql/createGraphQLClient';
import {DripsError} from '../../../src/internal/shared/DripsError';

vi.mock('../../../src/internal/shared/assertions');
vi.mock('../../../src/internal/graphql/createGraphQLClient');

describe('getUserWithdrawableBalances', () => {
  const mockAddress =
    '0x1234567890123456789012345678901234567890' as `0x${string}`;
  const mockChainId = 11155111; // Sepolia

  const mockWithdrawableBalances = [
    {
      tokenAddress: '0xToken123',
      collectableAmount: '1000000000000000000',
      receivableAmount: '2000000000000000000',
      splittableAmount: '3000000000000000000',
    },
    {
      tokenAddress: '0xToken456',
      collectableAmount: '500000000000000000',
      receivableAmount: '1500000000000000000',
      splittableAmount: '2500000000000000000',
    },
  ];

  const mockChainData = [
    {
      withdrawableBalances: mockWithdrawableBalances,
    },
  ];

  const mockQueryResponse = {
    userByAddress: {
      chainData: mockChainData,
    },
  };

  const mockGraphQLClient = {
    query: vi.fn().mockResolvedValue(mockQueryResponse),
  };

  beforeEach(() => {
    vi.mocked(requireGraphQLSupportedChain).mockImplementation(() => {});
    vi.mocked(createGraphQLClient).mockReturnValue(mockGraphQLClient as any);

    vi.clearAllMocks();
  });

  describe('successful execution', () => {
    it('should get user withdrawable balances with default client', async () => {
      const result = await getUserWithdrawableBalances(
        mockAddress,
        mockChainId,
      );

      expect(result).toEqual(mockChainData);
      expect(requireGraphQLSupportedChain).toHaveBeenCalledWith(
        mockChainId,
        'getUserWithdrawableBalances',
      );
      expect(createGraphQLClient).toHaveBeenCalledWith();
      expect(mockGraphQLClient.query).toHaveBeenCalledWith(
        expect.stringContaining('query GetUserByAddress'),
        {
          chains: ['SEPOLIA'],
          address: mockAddress,
        },
      );
    });

    it('should get user withdrawable balances with provided client', async () => {
      const customClient = {
        query: vi.fn().mockResolvedValue(mockQueryResponse),
      };

      const result = await getUserWithdrawableBalances(
        mockAddress,
        mockChainId,
        customClient as any,
      );

      expect(result).toEqual(mockChainData);
      expect(requireGraphQLSupportedChain).toHaveBeenCalledWith(
        mockChainId,
        'getUserWithdrawableBalances',
      );
      expect(createGraphQLClient).not.toHaveBeenCalled();
      expect(customClient.query).toHaveBeenCalledWith(
        expect.stringContaining('query GetUserByAddress'),
        {
          chains: ['SEPOLIA'],
          address: mockAddress,
        },
      );
    });

    it('should handle different supported chains', async () => {
      const mainnetChainId = 1;

      const result = await getUserWithdrawableBalances(
        mockAddress,
        mainnetChainId,
      );

      expect(result).toEqual(mockChainData);
      expect(requireGraphQLSupportedChain).toHaveBeenCalledWith(
        mainnetChainId,
        'getUserWithdrawableBalances',
      );
      expect(mockGraphQLClient.query).toHaveBeenCalledWith(
        expect.stringContaining('query GetUserByAddress'),
        {
          chains: ['MAINNET'],
          address: mockAddress,
        },
      );
    });

    it('should handle local chain', async () => {
      const localChainId = 31337;

      const result = await getUserWithdrawableBalances(
        mockAddress,
        localChainId,
      );

      expect(result).toEqual(mockChainData);
      expect(requireGraphQLSupportedChain).toHaveBeenCalledWith(
        localChainId,
        'getUserWithdrawableBalances',
      );
      expect(mockGraphQLClient.query).toHaveBeenCalledWith(
        expect.stringContaining('query GetUserByAddress'),
        {
          chains: ['LOCALTESTNET'],
          address: mockAddress,
        },
      );
    });

    it('should handle empty withdrawable balances', async () => {
      const emptyResponse = {
        userByAddress: {
          chainData: [
            {
              withdrawableBalances: [],
            },
          ],
        },
      };

      mockGraphQLClient.query.mockResolvedValueOnce(emptyResponse);

      const result = await getUserWithdrawableBalances(
        mockAddress,
        mockChainId,
      );

      expect(result).toEqual([{withdrawableBalances: []}]);
      expect(requireGraphQLSupportedChain).toHaveBeenCalledWith(
        mockChainId,
        'getUserWithdrawableBalances',
      );
    });

    it('should handle different address formats', async () => {
      const checksummedAddress =
        '0x1234567890123456789012345678901234567890' as `0x${string}`;
      const lowercaseAddress =
        '0x1234567890123456789012345678901234567890' as `0x${string}`;

      await getUserWithdrawableBalances(checksummedAddress, mockChainId);
      await getUserWithdrawableBalances(lowercaseAddress, mockChainId);

      expect(mockGraphQLClient.query).toHaveBeenCalledTimes(2);
      expect(mockGraphQLClient.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('query GetUserByAddress'),
        {
          chains: ['SEPOLIA'],
          address: checksummedAddress,
        },
      );
      expect(mockGraphQLClient.query).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('query GetUserByAddress'),
        {
          chains: ['SEPOLIA'],
          address: lowercaseAddress,
        },
      );
    });
  });

  describe('error handling', () => {
    it('should propagate error from requireGraphQLSupportedChain', async () => {
      const mockError = new DripsError('Unsupported chain for GraphQL');
      vi.mocked(requireGraphQLSupportedChain).mockImplementation(() => {
        throw mockError;
      });

      await expect(
        getUserWithdrawableBalances(mockAddress, 999),
      ).rejects.toThrow('Unsupported chain for GraphQL');

      expect(requireGraphQLSupportedChain).toHaveBeenCalledWith(
        999,
        'getUserWithdrawableBalances',
      );
      expect(createGraphQLClient).not.toHaveBeenCalled();
      expect(mockGraphQLClient.query).not.toHaveBeenCalled();
    });

    it('should propagate error from GraphQL client query', async () => {
      const mockError = new Error('GraphQL query failed');
      mockGraphQLClient.query.mockRejectedValue(mockError);

      await expect(
        getUserWithdrawableBalances(mockAddress, mockChainId),
      ).rejects.toThrow('GraphQL query failed');

      expect(requireGraphQLSupportedChain).toHaveBeenCalledWith(
        mockChainId,
        'getUserWithdrawableBalances',
      );
      expect(createGraphQLClient).toHaveBeenCalledWith();
      expect(mockGraphQLClient.query).toHaveBeenCalledWith(
        expect.stringContaining('query GetUserByAddress'),
        {
          chains: ['SEPOLIA'],
          address: mockAddress,
        },
      );
    });

    it('should propagate error from createGraphQLClient', async () => {
      const mockError = new DripsError('Failed to create GraphQL client');
      vi.mocked(createGraphQLClient).mockImplementation(() => {
        throw mockError;
      });

      await expect(
        getUserWithdrawableBalances(mockAddress, mockChainId),
      ).rejects.toThrow('Failed to create GraphQL client');

      expect(requireGraphQLSupportedChain).toHaveBeenCalledWith(
        mockChainId,
        'getUserWithdrawableBalances',
      );
      expect(createGraphQLClient).toHaveBeenCalledWith();
      expect(mockGraphQLClient.query).not.toHaveBeenCalled();
    });

    it('should handle malformed GraphQL response', async () => {
      const malformedResponse = {
        userByAddress: null,
      };

      mockGraphQLClient.query.mockResolvedValue(malformedResponse);

      await expect(
        getUserWithdrawableBalances(mockAddress, mockChainId),
      ).rejects.toThrow();

      expect(requireGraphQLSupportedChain).toHaveBeenCalledWith(
        mockChainId,
        'getUserWithdrawableBalances',
      );
    });

    it('should handle missing chainData in response', async () => {
      const responseWithoutChainData = {
        userByAddress: {},
      };

      mockGraphQLClient.query.mockResolvedValue(responseWithoutChainData);

      const result = await getUserWithdrawableBalances(
        mockAddress,
        mockChainId,
      );

      expect(result).toBeUndefined();
      expect(requireGraphQLSupportedChain).toHaveBeenCalledWith(
        mockChainId,
        'getUserWithdrawableBalances',
      );
    });
  });

  describe('GraphQL query structure', () => {
    it('should use correct GraphQL query structure', async () => {
      await getUserWithdrawableBalances(mockAddress, mockChainId);

      const calledQuery = mockGraphQLClient.query.mock.calls[0][0];

      expect(calledQuery).toContain('query GetUserByAddress');
      expect(calledQuery).toContain('$address: String!');
      expect(calledQuery).toContain('$chains: [SupportedChain!]');
      expect(calledQuery).toContain(
        'userByAddress(address: $address, chains: $chains)',
      );
      expect(calledQuery).toContain('chainData');
      expect(calledQuery).toContain('withdrawableBalances');
      expect(calledQuery).toContain('tokenAddress');
      expect(calledQuery).toContain('collectableAmount');
      expect(calledQuery).toContain('receivableAmount');
      expect(calledQuery).toContain('splittableAmount');
    });

    it('should pass correct variables to GraphQL query', async () => {
      const testAddress =
        '0xabcdef1234567890abcdef1234567890abcdef12' as `0x${string}`;
      const testChainId = 11155111;

      await getUserWithdrawableBalances(testAddress, testChainId);

      const calledVariables = mockGraphQLClient.query.mock.calls[0][1];

      expect(calledVariables).toEqual({
        chains: ['SEPOLIA'],
        address: testAddress,
      });
    });
  });

  describe('function call order', () => {
    it('should call functions in correct order', async () => {
      const callOrder: string[] = [];

      vi.mocked(requireGraphQLSupportedChain).mockImplementation(() => {
        callOrder.push('requireGraphQLSupportedChain');
      });

      vi.mocked(createGraphQLClient).mockImplementation(() => {
        callOrder.push('createGraphQLClient');
        return mockGraphQLClient as any;
      });

      mockGraphQLClient.query.mockImplementation(async () => {
        callOrder.push('graphQLClient.query');
        return mockQueryResponse;
      });

      await getUserWithdrawableBalances(mockAddress, mockChainId);

      expect(callOrder).toEqual([
        'requireGraphQLSupportedChain',
        'createGraphQLClient',
        'graphQLClient.query',
      ]);
    });

    it('should not call createGraphQLClient when client is provided', async () => {
      const callOrder: string[] = [];
      const customClient = {
        query: vi.fn().mockImplementation(async () => {
          callOrder.push('customClient.query');
          return mockQueryResponse;
        }),
      };

      vi.mocked(requireGraphQLSupportedChain).mockImplementation(() => {
        callOrder.push('requireGraphQLSupportedChain');
      });

      vi.mocked(createGraphQLClient).mockImplementation(() => {
        callOrder.push('createGraphQLClient');
        return mockGraphQLClient as any;
      });

      await getUserWithdrawableBalances(
        mockAddress,
        mockChainId,
        customClient as any,
      );

      expect(callOrder).toEqual([
        'requireGraphQLSupportedChain',
        'customClient.query',
      ]);
      expect(createGraphQLClient).not.toHaveBeenCalled();
    });
  });

  describe('return value', () => {
    it('should return the exact chainData from GraphQL response', async () => {
      const customChainData = [
        {
          withdrawableBalances: [
            {
              tokenAddress: '0xCustomToken',
              collectableAmount: '999999999999999999',
              receivableAmount: '888888888888888888',
              splittableAmount: '777777777777777777',
            },
          ],
        },
      ];

      const customResponse = {
        userByAddress: {
          chainData: customChainData,
        },
      };

      mockGraphQLClient.query.mockResolvedValue(customResponse);

      const result = await getUserWithdrawableBalances(
        mockAddress,
        mockChainId,
      );

      expect(result).toBe(customChainData);
      expect(result).toEqual(customChainData);
    });
  });
});
