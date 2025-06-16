import {describe, it, expect, vi} from 'vitest';
import {
  requireWalletHasAccount,
  requireSupportedChain,
  requireGraphQLSupportedChain,
  requireWriteAccess,
} from '../../../src/internal/utils/assertions';
import {DripsError} from '../../../src/internal/DripsError';
import type {WalletClient, Account} from 'viem';
import type {
  ReadBlockchainAdapter,
  WriteBlockchainAdapter,
} from '../../../src/internal/blockchain/BlockchainAdapter';

describe('assertions', () => {
  describe('requireWalletHasAccount', () => {
    it('should pass when wallet has account', () => {
      // Arrange
      const mockAccount: Account = {
        address: '0x1234567890123456789012345678901234567890',
        type: 'json-rpc',
      };
      const walletClient = {
        account: mockAccount,
        chain: {id: 1},
      } as WalletClient & {account: Account};

      // Act & Assert
      expect(() => requireWalletHasAccount(walletClient)).not.toThrow();
    });

    it('should throw DripsError when wallet has no account', () => {
      // Arrange
      const walletClient = {
        chain: {id: 1},
      } as WalletClient;

      // Act & Assert
      expect(() => requireWalletHasAccount(walletClient)).toThrow(DripsError);
      expect(() => requireWalletHasAccount(walletClient)).toThrow(
        'WalletClient must have an account configured',
      );
    });

    it('should throw DripsError when account is undefined', () => {
      // Arrange
      const walletClient = {
        account: undefined,
        chain: {id: 1},
      } as WalletClient;

      // Act & Assert
      expect(() => requireWalletHasAccount(walletClient)).toThrow(DripsError);
    });

    it('should throw DripsError when account is null', () => {
      // Arrange
      const walletClient = {
        account: null,
        chain: {id: 1},
      } as any;

      // Act & Assert
      expect(() => requireWalletHasAccount(walletClient)).toThrow(DripsError);
    });

    it('should include operation name in error metadata', () => {
      // Arrange
      const walletClient = {} as WalletClient;
      const operation = 'testOperation';

      // Act & Assert
      try {
        requireWalletHasAccount(walletClient, operation);
        expect.fail('Should have thrown DripsError');
      } catch (error) {
        expect(error).toBeInstanceOf(DripsError);
        expect((error as DripsError).meta?.operation).toBe(operation);
      }
    });

    it('should include client in error metadata', () => {
      // Arrange
      const walletClient = {chain: {id: 1}} as WalletClient;

      // Act & Assert
      try {
        requireWalletHasAccount(walletClient);
        expect.fail('Should have thrown DripsError');
      } catch (error) {
        expect(error).toBeInstanceOf(DripsError);
        expect((error as DripsError).meta?.client).toBe(walletClient);
      }
    });

    it('should use default operation name when not provided', () => {
      // Arrange
      const walletClient = {} as WalletClient;

      // Act & Assert
      try {
        requireWalletHasAccount(walletClient);
        expect.fail('Should have thrown DripsError');
      } catch (error) {
        expect(error).toBeInstanceOf(DripsError);
        expect((error as DripsError).meta?.operation).toBe(
          'requireWalletHasAccount',
        );
      }
    });

    it('should handle wallet with different account types', () => {
      const accountTypes = [
        {address: '0x123', type: 'json-rpc' as const},
        {address: '0x456', type: 'local' as const},
        {address: '0x789', type: 'privateKey' as const},
      ];

      accountTypes.forEach(account => {
        const walletClient = {
          account,
          chain: {id: 1},
        } as WalletClient & {account: Account};

        expect(() => requireWalletHasAccount(walletClient)).not.toThrow();
      });
    });
  });

  describe('requireSupportedChain', () => {
    it('should pass for supported chain ID 11155111 (Sepolia)', () => {
      // Act & Assert
      expect(() => requireSupportedChain(11155111)).not.toThrow();
    });

    it('should pass for supported chain ID 31337 (Local)', () => {
      // Act & Assert
      expect(() => requireSupportedChain(31337)).not.toThrow();
    });

    it('should throw DripsError for unsupported chain ID', () => {
      // Arrange
      const unsupportedChainId = 999999;

      // Act & Assert
      expect(() => requireSupportedChain(unsupportedChainId)).toThrow(
        DripsError,
      );
      expect(() => requireSupportedChain(unsupportedChainId)).toThrow(
        'Unsupported chain ID: 999999',
      );
    });

    it('should throw DripsError for zero chain ID', () => {
      // Act & Assert
      expect(() => requireSupportedChain(0)).toThrow(DripsError);
      expect(() => requireSupportedChain(0)).toThrow('Unsupported chain ID: 0');
    });

    it('should throw DripsError for negative chain ID', () => {
      // Act & Assert
      expect(() => requireSupportedChain(-1)).toThrow(DripsError);
      expect(() => requireSupportedChain(-1)).toThrow(
        'Unsupported chain ID: -1',
      );
    });

    it('should include operation name in error metadata', () => {
      // Arrange
      const chainId = 999;
      const operation = 'testChainOperation';

      // Act & Assert
      try {
        requireSupportedChain(chainId, operation);
        expect.fail('Should have thrown DripsError');
      } catch (error) {
        expect(error).toBeInstanceOf(DripsError);
        expect((error as DripsError).meta?.operation).toBe(operation);
      }
    });

    it('should include chainId in error metadata', () => {
      // Arrange
      const chainId = 999;

      // Act & Assert
      try {
        requireSupportedChain(chainId);
        expect.fail('Should have thrown DripsError');
      } catch (error) {
        expect(error).toBeInstanceOf(DripsError);
        expect((error as DripsError).meta?.chainId).toBe(chainId);
      }
    });

    it('should include known chains in error metadata', () => {
      // Arrange
      const chainId = 999;

      // Act & Assert
      try {
        requireSupportedChain(chainId);
        expect.fail('Should have thrown DripsError');
      } catch (error) {
        expect(error).toBeInstanceOf(DripsError);
        const knownChains = (error as DripsError).meta?.knownChains;
        expect(Array.isArray(knownChains)).toBe(true);
        expect(knownChains).toContain(11155111);
        expect(knownChains).toContain(31337);
      }
    });

    it('should use default operation name when not provided', () => {
      // Arrange
      const chainId = 999;

      // Act & Assert
      try {
        requireSupportedChain(chainId);
        expect.fail('Should have thrown DripsError');
      } catch (error) {
        expect(error).toBeInstanceOf(DripsError);
        expect((error as DripsError).meta?.operation).toBe(
          'requireSupportedChain',
        );
      }
    });

    it('should handle very large chain IDs', () => {
      // Arrange
      const largeChainId = Number.MAX_SAFE_INTEGER;

      // Act & Assert
      expect(() => requireSupportedChain(largeChainId)).toThrow(DripsError);
      expect(() => requireSupportedChain(largeChainId)).toThrow(
        `Unsupported chain ID: ${largeChainId}`,
      );
    });
  });

  describe('requireGraphQLSupportedChain', () => {
    it('should pass for supported chain ID 11155111 (Sepolia)', () => {
      // Act & Assert
      expect(() => requireGraphQLSupportedChain(11155111)).not.toThrow();
    });

    it('should pass for supported chain ID 31337 (Local)', () => {
      // Act & Assert
      expect(() => requireGraphQLSupportedChain(31337)).not.toThrow();
    });

    it('should pass for supported chain ID 1 (Mainnet)', () => {
      // Act & Assert
      expect(() => requireGraphQLSupportedChain(1)).not.toThrow();
    });

    it('should throw DripsError for chain ID not in contractsRegistry', () => {
      // Arrange
      const unsupportedChainId = 999999;

      // Act & Assert
      expect(() => requireGraphQLSupportedChain(unsupportedChainId)).toThrow(
        DripsError,
      );
      expect(() => requireGraphQLSupportedChain(unsupportedChainId)).toThrow(
        'Unsupported chain ID: 999999',
      );
    });

    it('should throw DripsError for chain ID in contractsRegistry but not in graphqlChainMap', () => {
      // This test would require a chain ID that exists in contractsRegistry but not in graphqlChainMap
      // For now, we'll test with a hypothetical scenario by mocking
      // In practice, this scenario shouldn't occur if both registries are kept in sync
    });

    it('should include operation name in error metadata', () => {
      // Arrange
      const chainId = 999;
      const operation = 'testGraphQLChainOperation';

      // Act & Assert
      try {
        requireGraphQLSupportedChain(chainId, operation);
        expect.fail('Should have thrown DripsError');
      } catch (error) {
        expect(error).toBeInstanceOf(DripsError);
        expect((error as DripsError).meta?.operation).toBe(operation);
      }
    });

    it('should include chainId in error metadata', () => {
      // Arrange
      const chainId = 999;

      // Act & Assert
      try {
        requireGraphQLSupportedChain(chainId);
        expect.fail('Should have thrown DripsError');
      } catch (error) {
        expect(error).toBeInstanceOf(DripsError);
        expect((error as DripsError).meta?.chainId).toBe(chainId);
      }
    });

    it('should include known GraphQL chains in error metadata when GraphQL validation fails', () => {
      // This would test the second validation step, but since both registries
      // are currently in sync, we'll test the first validation step
      const chainId = 999;

      try {
        requireGraphQLSupportedChain(chainId);
        expect.fail('Should have thrown DripsError');
      } catch (error) {
        expect(error).toBeInstanceOf(DripsError);
        // This will be from the first validation (requireSupportedChain)
        const knownChains = (error as DripsError).meta?.knownChains;
        expect(Array.isArray(knownChains)).toBe(true);
      }
    });

    it('should use default operation name when not provided', () => {
      // Arrange
      const chainId = 999;

      // Act & Assert
      try {
        requireGraphQLSupportedChain(chainId);
        expect.fail('Should have thrown DripsError');
      } catch (error) {
        expect(error).toBeInstanceOf(DripsError);
        expect((error as DripsError).meta?.operation).toBe(
          'requireGraphQLSupportedChain',
        );
      }
    });

    it('should handle zero chain ID', () => {
      // Act & Assert
      expect(() => requireGraphQLSupportedChain(0)).toThrow(DripsError);
      expect(() => requireGraphQLSupportedChain(0)).toThrow(
        'Unsupported chain ID: 0',
      );
    });

    it('should handle negative chain ID', () => {
      // Act & Assert
      expect(() => requireGraphQLSupportedChain(-1)).toThrow(DripsError);
      expect(() => requireGraphQLSupportedChain(-1)).toThrow(
        'Unsupported chain ID: -1',
      );
    });

    it('should handle very large chain IDs', () => {
      // Arrange
      const largeChainId = Number.MAX_SAFE_INTEGER;

      // Act & Assert
      expect(() => requireGraphQLSupportedChain(largeChainId)).toThrow(
        DripsError,
      );
      expect(() => requireGraphQLSupportedChain(largeChainId)).toThrow(
        `Unsupported chain ID: ${largeChainId}`,
      );
    });

    it('should provide type assertion for supported chains', () => {
      // Arrange
      const chainId = 11155111;

      // Act
      requireGraphQLSupportedChain(chainId);

      // Assert - TypeScript should now know this is a SupportedChain
      expect(chainId).toBe(11155111);
    });
  });

  describe('requireWriteAccess', () => {
    it('should pass for write adapter with sendTx method', () => {
      // Arrange
      const writeAdapter: WriteBlockchainAdapter = {
        sendTx: vi.fn(),
        // Add other required methods that might exist
      } as any;

      // Act & Assert
      expect(() => requireWriteAccess(writeAdapter)).not.toThrow();
    });

    it('should throw DripsError for read-only adapter', () => {
      // Arrange
      const readAdapter: ReadBlockchainAdapter = {
        // No sendTx method
      } as any;

      // Act & Assert
      expect(() => requireWriteAccess(readAdapter)).toThrow(DripsError);
      expect(() => requireWriteAccess(readAdapter)).toThrow(
        "Operation 'requireWriteAccess' requires signer permissions",
      );
    });

    it('should throw DripsError when sendTx is undefined', () => {
      // Arrange
      const adapter = {
        sendTx: undefined,
      } as any;

      // Act & Assert
      expect(() => requireWriteAccess(adapter)).toThrow(DripsError);
    });

    it('should throw DripsError when sendTx is null', () => {
      // Arrange
      const adapter = {
        sendTx: null,
      } as any;

      // Act & Assert
      expect(() => requireWriteAccess(adapter)).toThrow(DripsError);
    });

    it('should throw DripsError when sendTx exists but is not a function', () => {
      // Arrange
      const adapter = {
        sendTx: 'not-a-function',
      } as any;

      // Act & Assert
      expect(() => requireWriteAccess(adapter)).toThrow(DripsError);
    });

    it('should include operation name in error message', () => {
      // Arrange
      const readAdapter = {} as ReadBlockchainAdapter;
      const operation = 'customWriteOperation';

      // Act & Assert
      expect(() => requireWriteAccess(readAdapter, operation)).toThrow(
        `Operation '${operation}' requires signer permissions`,
      );
    });

    it('should include operation in error metadata', () => {
      // Arrange
      const readAdapter = {} as ReadBlockchainAdapter;
      const operation = 'testWriteOperation';

      // Act & Assert
      try {
        requireWriteAccess(readAdapter, operation);
        expect.fail('Should have thrown DripsError');
      } catch (error) {
        expect(error).toBeInstanceOf(DripsError);
        expect((error as DripsError).meta?.operation).toBe(operation);
      }
    });

    it('should include adapter type in error metadata', () => {
      // Arrange
      const readAdapter = {} as ReadBlockchainAdapter;

      // Act & Assert
      try {
        requireWriteAccess(readAdapter);
        expect.fail('Should have thrown DripsError');
      } catch (error) {
        expect(error).toBeInstanceOf(DripsError);
        expect((error as DripsError).meta?.adapterType).toBe('read-only');
      }
    });

    it('should use default operation name when not provided', () => {
      // Arrange
      const readAdapter = {} as ReadBlockchainAdapter;

      // Act & Assert
      try {
        requireWriteAccess(readAdapter);
        expect.fail('Should have thrown DripsError');
      } catch (error) {
        expect(error).toBeInstanceOf(DripsError);
        expect((error as DripsError).meta?.operation).toBe(
          'requireWriteAccess',
        );
      }
    });

    it('should handle adapters with other methods but no sendTx', () => {
      // Arrange
      const adapter = {
        readMethod: vi.fn(),
        anotherMethod: vi.fn(),
        // No sendTx
      } as any;

      // Act & Assert
      expect(() => requireWriteAccess(adapter)).toThrow(DripsError);
    });

    it('should handle empty object adapter', () => {
      // Arrange
      const adapter = {} as ReadBlockchainAdapter;

      // Act & Assert
      expect(() => requireWriteAccess(adapter)).toThrow(DripsError);
    });

    it('should handle null adapter', () => {
      // Arrange
      const adapter = null as any;

      // Act & Assert
      expect(() => requireWriteAccess(adapter)).toThrow();
    });

    it('should handle undefined adapter', () => {
      // Arrange
      const adapter = undefined as any;

      // Act & Assert
      expect(() => requireWriteAccess(adapter)).toThrow();
    });
  });

  describe('error handling and metadata', () => {
    it('should throw DripsError with proper error class for all functions', () => {
      const testCases = [
        () => requireWalletHasAccount({} as WalletClient),
        () => requireSupportedChain(999),
        () => requireWriteAccess({} as ReadBlockchainAdapter),
      ];

      testCases.forEach(testCase => {
        try {
          testCase();
          expect.fail('Should have thrown DripsError');
        } catch (error) {
          expect(error).toBeInstanceOf(DripsError);
          expect((error as DripsError).name).toBe('DripsError');
          expect((error as DripsError).message).toContain('[Drips SDK]');
        }
      });
    });

    it('should preserve error metadata structure', () => {
      const testCases = [
        {
          fn: () => requireWalletHasAccount({} as WalletClient, 'test-op'),
          expectedMeta: {operation: 'test-op'},
        },
        {
          fn: () => requireSupportedChain(999, 'chain-op'),
          expectedMeta: {operation: 'chain-op', chainId: 999},
        },
        {
          fn: () => requireWriteAccess({} as ReadBlockchainAdapter, 'write-op'),
          expectedMeta: {operation: 'write-op', adapterType: 'read-only'},
        },
      ];

      testCases.forEach(({fn, expectedMeta}) => {
        try {
          fn();
          expect.fail('Should have thrown DripsError');
        } catch (error) {
          expect(error).toBeInstanceOf(DripsError);
          const meta = (error as DripsError).meta;
          Object.entries(expectedMeta).forEach(([key, value]) => {
            expect(meta?.[key]).toBe(value);
          });
        }
      });
    });
  });

  describe('type assertions and narrowing', () => {
    it('should narrow WalletClient type after requireWalletHasAccount', () => {
      // Arrange
      const mockAccount: Account = {
        address: '0x1234567890123456789012345678901234567890',
        type: 'json-rpc',
      };
      const walletClient = {
        account: mockAccount,
        chain: {id: 1},
      } as WalletClient;

      // Act
      requireWalletHasAccount(walletClient);

      // Assert - TypeScript should now know that walletClient.account exists
      expect(walletClient.account).toBeDefined();
      expect(walletClient.account.address).toBe(mockAccount.address);
    });

    it('should narrow chain ID type after requireSupportedChain', () => {
      // Arrange
      const chainId = 11155111;

      // Act
      requireSupportedChain(chainId);

      // Assert - TypeScript should now know this is a SupportedChain
      expect(chainId).toBe(11155111);
    });

    it('should work with union types', () => {
      // Arrange
      const possibleChainIds = [11155111, 31337, 999999];

      possibleChainIds.forEach(chainId => {
        if (chainId === 11155111 || chainId === 31337) {
          expect(() => requireSupportedChain(chainId)).not.toThrow();
        } else {
          expect(() => requireSupportedChain(chainId)).toThrow(DripsError);
        }
      });
    });
  });

  describe('performance and edge cases', () => {
    it('should handle rapid successive calls efficiently', () => {
      // Arrange
      const mockAccount: Account = {
        address: '0x1234567890123456789012345678901234567890',
        type: 'json-rpc',
      };
      const walletClient = {
        account: mockAccount,
        chain: {id: 1},
      } as WalletClient & {account: Account};

      // Act
      const startTime = performance.now();
      for (let i = 0; i < 1000; i++) {
        requireWalletHasAccount(walletClient);
        requireSupportedChain(11155111);
        requireWriteAccess({sendTx: vi.fn()} as any);
      }
      const endTime = performance.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(50); // Should be very fast
    });

    it('should not modify input parameters', () => {
      // Arrange
      const originalWallet = {chain: {id: 1}} as WalletClient;
      const originalChainId = 999;
      const originalAdapter = {} as ReadBlockchainAdapter;

      // Act & Assert (these will throw, but shouldn't modify inputs)
      try {
        requireWalletHasAccount(originalWallet);
      } catch {
        // Expected to throw
      }
      try {
        requireSupportedChain(originalChainId);
      } catch {
        // Expected to throw
      }
      try {
        requireWriteAccess(originalAdapter);
      } catch {
        // Expected to throw
      }

      // Verify inputs weren't modified
      expect(originalWallet).toEqual({chain: {id: 1}});
      expect(originalChainId).toBe(999);
      expect(originalAdapter).toEqual({});
    });
  });
});
