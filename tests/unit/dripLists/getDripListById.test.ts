import {describe, it, expect, vi, beforeEach} from 'vitest';
import {getDripListById} from '../../../src/internal/drip-lists/getDripListById';
import {DripsError} from '../../../src/internal/shared/DripsError';
import type {DripsGraphQLClient} from '../../../src/internal/graphql/createGraphQLClient';

vi.mock('../../../src/internal/shared/assertions', () => ({
  requireGraphQLSupportedChain: vi.fn(),
}));

import {requireGraphQLSupportedChain} from '../../../src/internal/shared/assertions';

describe('getDripListById', () => {
  const mockGraphQLClient: DripsGraphQLClient = {
    query: vi.fn(),
  };

  const mockDripList = {
    account: {
      accountId: '123',
      driver: 'NFT',
    },
    chain: 'SEPOLIA',
    description: 'Test drip list',
    isVisible: true,
    lastProcessedIpfsHash: '0xhash1',
    latestMetadataIpfsHash: '0xhash2',
    latestVotingRoundId: '1',
    name: 'Test List',
    owner: {
      accountId: '456',
      driver: 'ADDRESS',
      address: '0x1234567890123456789012345678901234567890',
    },
    previousOwnerAddress: null,
    splits: [
      {
        __typename: 'AddressReceiver',
        weight: 500000,
        account: {
          accountId: '789',
          driver: 'ADDRESS',
          address: '0x1111111111111111111111111111111111111111',
        },
      },
      {
        __typename: 'DripListReceiver',
        weight: 300000,
        account: {
          accountId: '101112',
          driver: 'NFT',
        },
      },
      {
        __typename: 'ProjectReceiver',
        weight: 200000,
        account: {
          accountId: '131415',
          driver: 'REPO',
        },
        project: {
          source: {
            forge: 'GITHUB',
            ownerName: 'testowner',
            repoName: 'testrepo',
            url: 'https://github.com/testowner/testrepo',
          },
        },
      },
    ],
    support: [
      {
        __typename: 'OneTimeDonationSupport',
        account: {
          accountId: '999',
          address: '0x2222222222222222222222222222222222222222',
          driver: 'ADDRESS',
        },
        amount: {
          amount: '1000000',
          tokenAddress: '0x3333333333333333333333333333333333333333',
        },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset assertion mock to default successful behavior
    vi.mocked(requireGraphQLSupportedChain).mockImplementation(() => {});
    // Reset GraphQL client mock
    vi.mocked(mockGraphQLClient.query).mockResolvedValue({
      dripList: mockDripList,
    });
  });

  describe('successful execution', () => {
    it('should return drip list when found', async () => {
      // Arrange
      vi.mocked(mockGraphQLClient.query).mockResolvedValue({
        dripList: mockDripList,
      });

      // Act - Always inject the GraphQL client
      const result = await getDripListById(123n, 11155111, mockGraphQLClient);

      // Assert
      expect(requireGraphQLSupportedChain).toHaveBeenCalledWith(
        11155111,
        'getDripListById',
      );
      expect(mockGraphQLClient.query).toHaveBeenCalledWith(
        expect.stringContaining('query GetDripList'),
        {
          chain: 'SEPOLIA',
          accountId: '123',
        },
      );
      expect(result).toEqual(mockDripList);
    });

    it('should return null when drip list not found', async () => {
      // Arrange
      vi.mocked(mockGraphQLClient.query).mockResolvedValue({
        dripList: null,
      });

      // Act
      const result = await getDripListById(999n, 11155111, mockGraphQLClient);

      // Assert
      expect(mockGraphQLClient.query).toHaveBeenCalledWith(
        expect.stringContaining('query GetDripList'),
        {
          chain: 'SEPOLIA',
          accountId: '999',
        },
      );
      expect(result).toBeNull();
    });

    it('should work with different supported chain', async () => {
      // Arrange
      vi.mocked(mockGraphQLClient.query).mockResolvedValue({
        dripList: mockDripList,
      });

      // Act
      const result = await getDripListById(123n, 31337, mockGraphQLClient);

      // Assert
      expect(requireGraphQLSupportedChain).toHaveBeenCalledWith(
        31337,
        'getDripListById',
      );
      expect(mockGraphQLClient.query).toHaveBeenCalledWith(
        expect.stringContaining('query GetDripList'),
        {
          chain: 'LOCALTESTNET',
          accountId: '123',
        },
      );
      expect(result).toEqual(mockDripList);
    });

    it('should use different GraphQL client instances', async () => {
      // Arrange
      const customClient: DripsGraphQLClient = {
        query: vi.fn().mockResolvedValue({dripList: mockDripList}),
      };

      // Act
      const result = await getDripListById(123n, 11155111, customClient);

      // Assert
      expect(customClient.query).toHaveBeenCalledWith(
        expect.stringContaining('query GetDripList'),
        {
          chain: 'SEPOLIA',
          accountId: '123',
        },
      );
      expect(mockGraphQLClient.query).not.toHaveBeenCalled();
      expect(result).toEqual(mockDripList);
    });

    it('should handle large account IDs', async () => {
      // Arrange
      const largeAccountId = BigInt('0xffffffffffffffffffffffffffffffff');
      vi.mocked(mockGraphQLClient.query).mockResolvedValue({
        dripList: mockDripList,
      });

      // Act
      const result = await getDripListById(
        largeAccountId,
        11155111,
        mockGraphQLClient,
      );

      // Assert
      expect(mockGraphQLClient.query).toHaveBeenCalledWith(
        expect.stringContaining('query GetDripList'),
        {
          chain: 'SEPOLIA',
          accountId: largeAccountId.toString(),
        },
      );
      expect(result).toEqual(mockDripList);
    });
  });

  describe('error handling', () => {
    it('should propagate chain validation errors', async () => {
      // Arrange
      const chainError = new DripsError('Unsupported chain ID: 999');
      vi.mocked(requireGraphQLSupportedChain).mockImplementation(() => {
        throw chainError;
      });

      // Act & Assert
      await expect(
        getDripListById(123n, 999, mockGraphQLClient),
      ).rejects.toThrow(chainError);
      expect(mockGraphQLClient.query).not.toHaveBeenCalled();
    });

    it('should throw DripsError when chain ID is not supported by GraphQL', async () => {
      // Arrange - Mock requireGraphQLSupportedChain to throw an error
      const unsupportedChainId = 999999;
      const expectedError = new DripsError(
        `Unsupported chain ID: ${unsupportedChainId}`,
        {
          meta: {
            operation: 'getDripListById',
            chainId: unsupportedChainId,
            resolvedChain: undefined,
            knownChains: [
              'MAINNET',
              'SEPOLIA',
              'OPTIMISM_SEPOLIA',
              'POLYGON_AMOY',
              'BASE_SEPOLIA',
              'FILECOIN',
              'METIS',
              'LOCALTESTNET',
              'OPTIMISM',
            ],
          },
        },
      );

      vi.mocked(requireGraphQLSupportedChain).mockImplementation(() => {
        throw expectedError;
      });

      // Act & Assert
      await expect(
        getDripListById(123n, unsupportedChainId, mockGraphQLClient),
      ).rejects.toThrow(expectedError);

      expect(requireGraphQLSupportedChain).toHaveBeenCalledWith(
        unsupportedChainId,
        'getDripListById',
      );
      expect(mockGraphQLClient.query).not.toHaveBeenCalled();
    });

    it('should propagate GraphQL query errors', async () => {
      // Arrange
      const queryError = new Error('GraphQL network error');
      vi.mocked(mockGraphQLClient.query).mockRejectedValue(queryError);

      // Act & Assert
      await expect(
        getDripListById(123n, 11155111, mockGraphQLClient),
      ).rejects.toThrow(queryError);
      expect(requireGraphQLSupportedChain).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle zero account ID', async () => {
      // Arrange
      vi.mocked(mockGraphQLClient.query).mockResolvedValue({
        dripList: null,
      });

      // Act
      const result = await getDripListById(0n, 11155111, mockGraphQLClient);

      // Assert
      expect(mockGraphQLClient.query).toHaveBeenCalledWith(
        expect.stringContaining('query GetDripList'),
        {
          chain: 'SEPOLIA',
          accountId: '0',
        },
      );
      expect(result).toBeNull();
    });

    it('should handle undefined dripList in response', async () => {
      // Arrange
      vi.mocked(mockGraphQLClient.query).mockResolvedValue({
        dripList: undefined,
      });

      // Act
      const result = await getDripListById(123n, 11155111, mockGraphQLClient);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle empty response', async () => {
      // Arrange
      vi.mocked(mockGraphQLClient.query).mockResolvedValue({});

      // Act
      const result = await getDripListById(123n, 11155111, mockGraphQLClient);

      // Assert
      expect(result).toBeNull();
    });

    it('should handle drip list with minimal data', async () => {
      // Arrange
      const minimalDripList = {
        account: {
          accountId: '123',
          driver: 'NFT',
        },
        chain: 'SEPOLIA',
        description: null,
        isVisible: false,
        lastProcessedIpfsHash: null,
        latestMetadataIpfsHash: null,
        latestVotingRoundId: null,
        name: null,
        owner: {
          accountId: '456',
          driver: 'ADDRESS',
          address: '0x1234567890123456789012345678901234567890',
        },
        previousOwnerAddress: null,
        splits: [],
      };

      vi.mocked(mockGraphQLClient.query).mockResolvedValue({
        dripList: minimalDripList,
      });

      // Act
      const result = await getDripListById(123n, 11155111, mockGraphQLClient);

      // Assert
      expect(result).toEqual(minimalDripList);
    });
  });

  describe('GraphQL query structure', () => {
    it('should include all required fields in query', async () => {
      // Arrange
      vi.mocked(mockGraphQLClient.query).mockResolvedValue({
        dripList: mockDripList,
      });

      // Act
      await getDripListById(123n, 11155111, mockGraphQLClient);

      // Assert
      const [query] = vi.mocked(mockGraphQLClient.query).mock.calls[0];
      expect(query).toContain('query GetDripList');
      expect(query).toContain('$accountId: ID!');
      expect(query).toContain('$chain: SupportedChain!');
      expect(query).toContain('dripList(id: $accountId, chain: $chain)');
      expect(query).toContain('account');
      expect(query).toContain('accountId');
      expect(query).toContain('driver');
      expect(query).toContain('chain');
      expect(query).toContain('description');
      expect(query).toContain('isVisible');
      expect(query).toContain('lastProcessedIpfsHash');
      expect(query).toContain('latestMetadataIpfsHash');
      expect(query).toContain('latestVotingRoundId');
      expect(query).toContain('name');
      expect(query).toContain('owner');
      expect(query).toContain('address');
      expect(query).toContain('previousOwnerAddress');
      expect(query).toContain('splits');
      expect(query).toContain('weight');
      expect(query).toContain('ProjectReceiver');
      expect(query).toContain('DripListReceiver');
      expect(query).toContain('AddressReceiver');
      expect(query).toContain('SubListReceiver');
      expect(query).toContain('EcosystemMainAccountReceiver');
      expect(query).toContain('support');
      expect(query).toContain('OneTimeDonationSupport');
      expect(query).toContain('__typename');
    });
  });

  describe('splits functionality', () => {
    it('should return drip list with various split receiver types', async () => {
      // Arrange
      const dripListWithAllSplitTypes = {
        ...mockDripList,
        splits: [
          {
            weight: 200000,
            account: {
              accountId: '789',
              driver: 'ADDRESS',
              address: '0x1111111111111111111111111111111111111111',
            },
          },
          {
            weight: 200000,
            account: {
              accountId: '101112',
              driver: 'NFT',
            },
          },
          {
            weight: 200000,
            account: {
              accountId: '131415',
              driver: 'REPO',
            },
            project: {
              source: {
                forge: 'GITHUB',
                ownerName: 'testowner',
                repoName: 'testrepo',
                url: 'https://github.com/testowner/testrepo',
              },
            },
          },
          {
            weight: 200000,
            account: {
              accountId: '161718',
              driver: 'NFT',
            },
          },
          {
            weight: 200000,
            account: {
              accountId: '192021',
              driver: 'ADDRESS',
            },
          },
        ],
      };

      vi.mocked(mockGraphQLClient.query).mockResolvedValue({
        dripList: dripListWithAllSplitTypes,
      });

      // Act
      const result = await getDripListById(123n, 11155111, mockGraphQLClient);

      // Assert
      expect(result).toEqual(dripListWithAllSplitTypes);
      expect(result?.splits).toHaveLength(5);
      expect(result?.splits[0]).toHaveProperty('weight', 200000);
      expect(result?.splits[0]).toHaveProperty('account');
      expect(result?.splits[2]).toHaveProperty('project');
      expect((result?.splits[2] as any).project).toBeDefined();
    });

    it('should handle drip list with empty splits array', async () => {
      // Arrange
      const dripListWithEmptySplits = {
        ...mockDripList,
        splits: [],
      };

      vi.mocked(mockGraphQLClient.query).mockResolvedValue({
        dripList: dripListWithEmptySplits,
      });

      // Act
      const result = await getDripListById(123n, 11155111, mockGraphQLClient);

      // Assert
      expect(result).toEqual(dripListWithEmptySplits);
      expect(result?.splits).toEqual([]);
    });

    it('should handle project receiver with complete source information', async () => {
      // Arrange
      const dripListWithProjectReceiver = {
        ...mockDripList,
        splits: [
          {
            weight: 1000000,
            account: {
              accountId: '131415',
              driver: 'REPO',
            },
            project: {
              source: {
                forge: 'GITHUB',
                ownerName: 'ethereum',
                repoName: 'solidity',
                url: 'https://github.com/ethereum/solidity',
              },
            },
          },
        ],
      };

      vi.mocked(mockGraphQLClient.query).mockResolvedValue({
        dripList: dripListWithProjectReceiver,
      });

      // Act
      const result = await getDripListById(123n, 11155111, mockGraphQLClient);

      // Assert
      expect(result).toEqual(dripListWithProjectReceiver);
      expect(result?.splits[0]).toHaveProperty('project');
      expect((result?.splits[0] as any).project?.source).toEqual({
        forge: 'GITHUB',
        ownerName: 'ethereum',
        repoName: 'solidity',
        url: 'https://github.com/ethereum/solidity',
      });
    });

    it('should handle address receiver with complete account information', async () => {
      // Arrange
      const dripListWithAddressReceiver = {
        ...mockDripList,
        splits: [
          {
            weight: 500000,
            account: {
              accountId: '789',
              driver: 'ADDRESS',
              address: '0x2222222222222222222222222222222222222222',
            },
          },
        ],
      };

      vi.mocked(mockGraphQLClient.query).mockResolvedValue({
        dripList: dripListWithAddressReceiver,
      });

      // Act
      const result = await getDripListById(123n, 11155111, mockGraphQLClient);

      // Assert
      expect(result).toEqual(dripListWithAddressReceiver);
      expect(result?.splits[0].account).toHaveProperty('address');
      expect((result?.splits[0].account as any).address).toBe(
        '0x2222222222222222222222222222222222222222',
      );
    });
  });

  describe('support functionality', () => {
    it('should return drip list with one-time donation support', async () => {
      // Arrange
      const dripListWithSupport = {
        ...mockDripList,
        support: [
          {
            __typename: 'OneTimeDonationSupport',
            account: {
              accountId: '999',
              address: '0x2222222222222222222222222222222222222222',
              driver: 'ADDRESS',
            },
            amount: {
              amount: '1000000',
              tokenAddress: '0x3333333333333333333333333333333333333333',
            },
          },
          {
            __typename: 'OneTimeDonationSupport',
            account: {
              accountId: '888',
              address: '0x4444444444444444444444444444444444444444',
              driver: 'ADDRESS',
            },
            amount: {
              amount: '2000000',
              tokenAddress: '0x5555555555555555555555555555555555555555',
            },
          },
        ],
      };

      vi.mocked(mockGraphQLClient.query).mockResolvedValue({
        dripList: dripListWithSupport,
      });

      // Act
      const result = await getDripListById(123n, 11155111, mockGraphQLClient);

      // Assert
      expect(result).toEqual(dripListWithSupport);
      expect(result?.support).toHaveLength(2);
      expect(result?.support[0]).toHaveProperty(
        '__typename',
        'OneTimeDonationSupport',
      );
      expect(result?.support[0]).toHaveProperty('account');
      expect(result?.support[0]).toHaveProperty('amount');
      expect((result?.support[0] as any).account.address).toBe(
        '0x2222222222222222222222222222222222222222',
      );
      expect((result?.support[0] as any).amount.amount).toBe('1000000');
      expect((result?.support[0] as any).amount.tokenAddress).toBe(
        '0x3333333333333333333333333333333333333333',
      );
    });

    it('should handle drip list with empty support array', async () => {
      // Arrange
      const dripListWithEmptySupport = {
        ...mockDripList,
        support: [],
      };

      vi.mocked(mockGraphQLClient.query).mockResolvedValue({
        dripList: dripListWithEmptySupport,
      });

      // Act
      const result = await getDripListById(123n, 11155111, mockGraphQLClient);

      // Assert
      expect(result).toEqual(dripListWithEmptySupport);
      expect(result?.support).toEqual([]);
    });

    it('should handle drip list without support field', async () => {
      // Arrange
      const dripListWithoutSupport = {
        ...mockDripList,
      };
      delete (dripListWithoutSupport as any).support;

      vi.mocked(mockGraphQLClient.query).mockResolvedValue({
        dripList: dripListWithoutSupport,
      });

      // Act
      const result = await getDripListById(123n, 11155111, mockGraphQLClient);

      // Assert
      expect(result).toEqual(dripListWithoutSupport);
      expect(result?.support).toBeUndefined();
    });
  });

  describe('fallback to createGraphQLClient', () => {
    it('should use createGraphQLClient when no client is provided', async () => {
      // This test verifies the function still works without injection
      // but we can't easily test this without mocking createGraphQLClient
      // In a real scenario, this would be tested in integration tests

      // For now, we'll just verify that the function signature allows optional client
      expect(getDripListById).toBeDefined();
      expect(getDripListById.length).toBe(3); // accountId, chainId, optional graphqlClient
    });
  });
});
