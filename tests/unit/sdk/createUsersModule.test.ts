import {vi, describe, it, expect, beforeEach} from 'vitest';
import {
  UsersModule,
  createUsersModule,
} from '../../../src/sdk/createUsersModule';
import {
  getUserWithdrawableBalances,
  UserWithdrawableBalances,
} from '../../../src/internal/collect/getUserWithdrawableBalances';
import {DripsGraphQLClient} from '../../../src/internal/graphql/createGraphQLClient';
import {Address} from 'viem';

vi.mock('../../../src/internal/collect/getUserWithdrawableBalances');

describe('createUsersModule', () => {
  let mockGraphqlClient: DripsGraphQLClient;
  let usersModule: UsersModule;

  const mockAddress = '0x1234567890123456789012345678901234567890' as Address;
  const mockChainId = 11155111; // Sepolia

  const mockWithdrawableBalances: UserWithdrawableBalances = [
    {
      __typename: 'UserData',
      withdrawableBalances: [
        {
          __typename: 'WithdrawableBalance',
          tokenAddress: '0xToken123',
          collectableAmount: '1000000000000000000',
          receivableAmount: '2000000000000000000',
          splittableAmount: '3000000000000000000',
        },
        {
          __typename: 'WithdrawableBalance',
          tokenAddress: '0xToken456',
          collectableAmount: '500000000000000000',
          receivableAmount: '1500000000000000000',
          splittableAmount: '2500000000000000000',
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockGraphqlClient = {
      query: vi.fn(),
    } as any;

    usersModule = createUsersModule({
      graphqlClient: mockGraphqlClient,
    });
  });

  describe('getWithdrawableBalances', () => {
    it('should get withdrawable balances for a user', async () => {
      // Arrange
      vi.mocked(getUserWithdrawableBalances).mockResolvedValue(
        mockWithdrawableBalances,
      );

      // Act
      const result = await usersModule.getWithdrawableBalances(
        mockAddress,
        mockChainId,
      );

      // Assert
      expect(result).toBe(mockWithdrawableBalances);
      expect(getUserWithdrawableBalances).toHaveBeenCalledWith(
        mockAddress,
        mockChainId,
        mockGraphqlClient,
      );
    });

    it('should handle different addresses', async () => {
      // Arrange
      const differentAddress =
        '0xabcdef1234567890abcdef1234567890abcdef12' as Address;
      const expectedBalances: UserWithdrawableBalances = [
        {
          __typename: 'UserData',
          withdrawableBalances: [
            {
              __typename: 'WithdrawableBalance',
              tokenAddress: '0xDifferentToken',
              collectableAmount: '999999999999999999',
              receivableAmount: '888888888888888888',
              splittableAmount: '777777777777777777',
            },
          ],
        },
      ];

      vi.mocked(getUserWithdrawableBalances).mockResolvedValue(
        expectedBalances,
      );

      // Act
      const result = await usersModule.getWithdrawableBalances(
        differentAddress,
        mockChainId,
      );

      // Assert
      expect(result).toBe(expectedBalances);
      expect(getUserWithdrawableBalances).toHaveBeenCalledWith(
        differentAddress,
        mockChainId,
        mockGraphqlClient,
      );
    });

    it('should handle different chain IDs', async () => {
      // Arrange
      const mainnetChainId = 1;
      vi.mocked(getUserWithdrawableBalances).mockResolvedValue(
        mockWithdrawableBalances,
      );

      // Act
      const result = await usersModule.getWithdrawableBalances(
        mockAddress,
        mainnetChainId,
      );

      // Assert
      expect(result).toBe(mockWithdrawableBalances);
      expect(getUserWithdrawableBalances).toHaveBeenCalledWith(
        mockAddress,
        mainnetChainId,
        mockGraphqlClient,
      );
    });

    it('should handle local testnet chain', async () => {
      // Arrange
      const localChainId = 31337;
      vi.mocked(getUserWithdrawableBalances).mockResolvedValue(
        mockWithdrawableBalances,
      );

      // Act
      const result = await usersModule.getWithdrawableBalances(
        mockAddress,
        localChainId,
      );

      // Assert
      expect(result).toBe(mockWithdrawableBalances);
      expect(getUserWithdrawableBalances).toHaveBeenCalledWith(
        mockAddress,
        localChainId,
        mockGraphqlClient,
      );
    });

    it('should handle empty withdrawable balances', async () => {
      // Arrange
      const emptyBalances: UserWithdrawableBalances = [
        {
          __typename: 'UserData',
          withdrawableBalances: [],
        },
      ];
      vi.mocked(getUserWithdrawableBalances).mockResolvedValue(emptyBalances);

      // Act
      const result = await usersModule.getWithdrawableBalances(
        mockAddress,
        mockChainId,
      );

      // Assert
      expect(result).toBe(emptyBalances);
      expect(getUserWithdrawableBalances).toHaveBeenCalledWith(
        mockAddress,
        mockChainId,
        mockGraphqlClient,
      );
    });

    it('should handle multiple tokens in withdrawable balances', async () => {
      // Arrange
      const multiTokenBalances: UserWithdrawableBalances = [
        {
          __typename: 'UserData',
          withdrawableBalances: [
            {
              __typename: 'WithdrawableBalance',
              tokenAddress: '0xToken1',
              collectableAmount: '1000000000000000000',
              receivableAmount: '2000000000000000000',
              splittableAmount: '3000000000000000000',
            },
            {
              __typename: 'WithdrawableBalance',
              tokenAddress: '0xToken2',
              collectableAmount: '4000000000000000000',
              receivableAmount: '5000000000000000000',
              splittableAmount: '6000000000000000000',
            },
            {
              __typename: 'WithdrawableBalance',
              tokenAddress: '0xToken3',
              collectableAmount: '7000000000000000000',
              receivableAmount: '8000000000000000000',
              splittableAmount: '9000000000000000000',
            },
          ],
        },
      ];
      vi.mocked(getUserWithdrawableBalances).mockResolvedValue(
        multiTokenBalances,
      );

      // Act
      const result = await usersModule.getWithdrawableBalances(
        mockAddress,
        mockChainId,
      );

      // Assert
      expect(result).toBe(multiTokenBalances);
      expect(getUserWithdrawableBalances).toHaveBeenCalledWith(
        mockAddress,
        mockChainId,
        mockGraphqlClient,
      );
    });

    it('should propagate errors from getUserWithdrawableBalances', async () => {
      // Arrange
      const mockError = new Error('GraphQL query failed');
      vi.mocked(getUserWithdrawableBalances).mockRejectedValue(mockError);

      // Act & Assert
      await expect(
        usersModule.getWithdrawableBalances(mockAddress, mockChainId),
      ).rejects.toThrow('GraphQL query failed');

      expect(getUserWithdrawableBalances).toHaveBeenCalledWith(
        mockAddress,
        mockChainId,
        mockGraphqlClient,
      );
    });

    it('should handle unsupported chain errors', async () => {
      // Arrange
      const unsupportedChainError = new Error('Unsupported chain for GraphQL');
      vi.mocked(getUserWithdrawableBalances).mockRejectedValue(
        unsupportedChainError,
      );

      // Act & Assert
      await expect(
        usersModule.getWithdrawableBalances(mockAddress, 999),
      ).rejects.toThrow('Unsupported chain for GraphQL');

      expect(getUserWithdrawableBalances).toHaveBeenCalledWith(
        mockAddress,
        999,
        mockGraphqlClient,
      );
    });

    it('should handle network errors', async () => {
      // Arrange
      const networkError = new Error('Network request failed');
      vi.mocked(getUserWithdrawableBalances).mockRejectedValue(networkError);

      // Act & Assert
      await expect(
        usersModule.getWithdrawableBalances(mockAddress, mockChainId),
      ).rejects.toThrow('Network request failed');

      expect(getUserWithdrawableBalances).toHaveBeenCalledWith(
        mockAddress,
        mockChainId,
        mockGraphqlClient,
      );
    });
  });

  describe('module creation', () => {
    it('should create a users module with the correct interface', () => {
      // Act
      const module = createUsersModule({
        graphqlClient: mockGraphqlClient,
      });

      // Assert
      expect(module).toHaveProperty('getWithdrawableBalances');
      expect(typeof module.getWithdrawableBalances).toBe('function');
    });

    it('should create module with different GraphQL clients', () => {
      // Arrange
      const differentGraphqlClient = {
        query: vi.fn(),
      } as any;

      // Act
      const module = createUsersModule({
        graphqlClient: differentGraphqlClient,
      });

      // Assert
      expect(module).toHaveProperty('getWithdrawableBalances');
      expect(typeof module.getWithdrawableBalances).toBe('function');
    });

    it('should pass the correct GraphQL client to getUserWithdrawableBalances', async () => {
      // Arrange
      const customGraphqlClient = {
        query: vi.fn(),
      } as any;

      const moduleWithCustomClient = createUsersModule({
        graphqlClient: customGraphqlClient,
      });

      vi.mocked(getUserWithdrawableBalances).mockResolvedValue(
        mockWithdrawableBalances,
      );

      // Act
      await moduleWithCustomClient.getWithdrawableBalances(
        mockAddress,
        mockChainId,
      );

      // Assert
      expect(getUserWithdrawableBalances).toHaveBeenCalledWith(
        mockAddress,
        mockChainId,
        customGraphqlClient,
      );
    });
  });

  describe('function parameters', () => {
    it('should accept valid Ethereum addresses', async () => {
      // Arrange
      const validAddresses = [
        '0x1234567890123456789012345678901234567890',
        '0xabcdef1234567890abcdef1234567890abcdef12',
        '0x0000000000000000000000000000000000000000',
        '0xffffffffffffffffffffffffffffffffffffffff',
      ] as Address[];

      vi.mocked(getUserWithdrawableBalances).mockResolvedValue(
        mockWithdrawableBalances,
      );

      // Act & Assert
      for (const address of validAddresses) {
        await usersModule.getWithdrawableBalances(address, mockChainId);
        expect(getUserWithdrawableBalances).toHaveBeenCalledWith(
          address,
          mockChainId,
          mockGraphqlClient,
        );
      }

      expect(getUserWithdrawableBalances).toHaveBeenCalledTimes(
        validAddresses.length,
      );
    });

    it('should accept valid chain IDs', async () => {
      // Arrange
      const validChainIds = [1, 11155111, 31337, 137, 10];

      vi.mocked(getUserWithdrawableBalances).mockResolvedValue(
        mockWithdrawableBalances,
      );

      // Act & Assert
      for (const chainId of validChainIds) {
        await usersModule.getWithdrawableBalances(mockAddress, chainId);
        expect(getUserWithdrawableBalances).toHaveBeenCalledWith(
          mockAddress,
          chainId,
          mockGraphqlClient,
        );
      }

      expect(getUserWithdrawableBalances).toHaveBeenCalledTimes(
        validChainIds.length,
      );
    });
  });

  describe('return type consistency', () => {
    it('should return the exact value from getUserWithdrawableBalances', async () => {
      // Arrange
      const specificBalances: UserWithdrawableBalances = [
        {
          __typename: 'UserData',
          withdrawableBalances: [
            {
              __typename: 'WithdrawableBalance',
              tokenAddress: '0xSpecificToken',
              collectableAmount: '123456789012345678',
              receivableAmount: '987654321098765432',
              splittableAmount: '555555555555555555',
            },
          ],
        },
      ];

      vi.mocked(getUserWithdrawableBalances).mockResolvedValue(
        specificBalances,
      );

      // Act
      const result = await usersModule.getWithdrawableBalances(
        mockAddress,
        mockChainId,
      );

      // Assert
      expect(result).toBe(specificBalances);
      expect(result).toEqual(specificBalances);
    });

    it('should maintain type safety for UserWithdrawableBalances', async () => {
      // Arrange
      vi.mocked(getUserWithdrawableBalances).mockResolvedValue(
        mockWithdrawableBalances,
      );

      // Act
      const result = await usersModule.getWithdrawableBalances(
        mockAddress,
        mockChainId,
      );

      // Assert
      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('withdrawableBalances');
      expect(Array.isArray(result[0].withdrawableBalances)).toBe(true);

      if (result[0].withdrawableBalances.length > 0) {
        const balance = result[0].withdrawableBalances[0];
        expect(balance).toHaveProperty('tokenAddress');
        expect(balance).toHaveProperty('collectableAmount');
        expect(balance).toHaveProperty('receivableAmount');
        expect(balance).toHaveProperty('splittableAmount');
      }
    });
  });

  describe('dependency injection', () => {
    it('should use the injected GraphQL client', async () => {
      // Arrange
      const injectedClient = {
        query: vi.fn(),
      } as any;

      const moduleWithInjectedClient = createUsersModule({
        graphqlClient: injectedClient,
      });

      vi.mocked(getUserWithdrawableBalances).mockResolvedValue(
        mockWithdrawableBalances,
      );

      // Act
      await moduleWithInjectedClient.getWithdrawableBalances(
        mockAddress,
        mockChainId,
      );

      // Assert
      expect(getUserWithdrawableBalances).toHaveBeenCalledWith(
        mockAddress,
        mockChainId,
        injectedClient,
      );
    });

    it('should work with different GraphQL client implementations', async () => {
      // Arrange
      const mockClient1 = {query: vi.fn()} as any;
      const mockClient2 = {query: vi.fn(), customMethod: vi.fn()} as any;

      const module1 = createUsersModule({graphqlClient: mockClient1});
      const module2 = createUsersModule({graphqlClient: mockClient2});

      vi.mocked(getUserWithdrawableBalances).mockResolvedValue(
        mockWithdrawableBalances,
      );

      // Act
      await module1.getWithdrawableBalances(mockAddress, mockChainId);
      await module2.getWithdrawableBalances(mockAddress, mockChainId);

      // Assert
      expect(getUserWithdrawableBalances).toHaveBeenNthCalledWith(
        1,
        mockAddress,
        mockChainId,
        mockClient1,
      );
      expect(getUserWithdrawableBalances).toHaveBeenNthCalledWith(
        2,
        mockAddress,
        mockChainId,
        mockClient2,
      );
    });
  });
});
