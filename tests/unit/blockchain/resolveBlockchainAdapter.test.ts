import {describe, it, expect, vi, beforeEach} from 'vitest';
import {resolveBlockchainAdapter} from '../../../src/internal/blockchain/resolveBlockchainAdapter';
import {DripsError} from '../../../src/internal/shared/DripsError';
import type {WalletClient, PublicClient} from 'viem';
import type {Provider, Signer} from 'ethers';
import type {
  ReadBlockchainAdapter,
  WriteBlockchainAdapter,
} from '../../../src/internal/blockchain/BlockchainAdapter';

// Mock the adapter creation functions
vi.mock('../../../src/internal/blockchain/adapters/viem/viemAdapters', () => ({
  createViemReadAdapter: vi.fn(),
  createViemWriteAdapter: vi.fn(),
}));

vi.mock(
  '../../../src/internal/blockchain/adapters/ethers/ethersAdapters',
  () => ({
    createEthersReadAdapter: vi.fn(),
    createEthersWriteAdapter: vi.fn(),
  }),
);

vi.mock('../../../src/internal/shared/assertions', () => ({
  requireWalletHasAccount: vi.fn(),
}));

import {
  createViemReadAdapter,
  createViemWriteAdapter,
} from '../../../src/internal/blockchain/adapters/viem/viemAdapters';
import {
  createEthersReadAdapter,
  createEthersWriteAdapter,
} from '../../../src/internal/blockchain/adapters/ethers/ethersAdapters';
import {requireWalletHasAccount} from '../../../src/internal/shared/assertions';

describe('resolveBlockchainAdapter', () => {
  const mockReadAdapter: ReadBlockchainAdapter = {
    call: vi.fn(),
    getChainId: vi.fn(),
  };

  const mockWriteAdapter: WriteBlockchainAdapter = {
    call: vi.fn(),
    getAddress: vi.fn(),
    sendTx: vi.fn(),
    signMsg: vi.fn(),
    getChainId: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Viem client detection', () => {
    it('should detect and create adapter for Viem read-only client', () => {
      // Arrange
      const viemPublicClient = {
        transport: {},
        call: vi.fn(),
        // No sendTransaction method
      } as unknown as PublicClient;

      vi.mocked(createViemReadAdapter).mockReturnValue(mockReadAdapter);

      // Act
      const result = resolveBlockchainAdapter(viemPublicClient);

      // Assert
      expect(createViemReadAdapter).toHaveBeenCalledWith(viemPublicClient);
      expect(result).toBe(mockReadAdapter);
    });

    it('should detect and create adapter for Viem write client', () => {
      // Arrange - Real Viem wallet clients don't have call method
      const viemWalletClient = {
        transport: {},
        sendTransaction: vi.fn(),
        signMessage: vi.fn(), // Viem wallet clients have signMessage but not getAddress
        account: {address: '0x123'},
      } as unknown as WalletClient;

      vi.mocked(createViemWriteAdapter).mockReturnValue(mockWriteAdapter);

      // Act
      const result = resolveBlockchainAdapter(viemWalletClient);

      // Assert
      expect(requireWalletHasAccount).toHaveBeenCalledWith(viemWalletClient);
      expect(createViemWriteAdapter).toHaveBeenCalledWith(viemWalletClient);
      expect(result).toBe(mockWriteAdapter);
    });

    it('should prioritize write client detection over read client for Viem', () => {
      // Arrange
      const viemWalletClient = {
        transport: {},
        call: vi.fn(),
        sendTransaction: vi.fn(),
        account: {address: '0x123'},
      } as unknown as WalletClient;

      vi.mocked(createViemWriteAdapter).mockReturnValue(mockWriteAdapter);

      // Act
      const result = resolveBlockchainAdapter(viemWalletClient);

      // Assert
      expect(createViemWriteAdapter).toHaveBeenCalledWith(viemWalletClient);
      expect(createViemReadAdapter).not.toHaveBeenCalled();
      expect(result).toBe(mockWriteAdapter);
    });
  });

  describe('Ethers client detection', () => {
    it('should detect and create adapter for Ethers read-only client', () => {
      // Arrange
      const ethersProvider = {
        call: vi.fn(),
        // No transport, no signMessage
      } as unknown as Provider;

      vi.mocked(createEthersReadAdapter).mockReturnValue(mockReadAdapter);

      // Act
      const result = resolveBlockchainAdapter(ethersProvider);

      // Assert
      expect(createEthersReadAdapter).toHaveBeenCalledWith(ethersProvider);
      expect(result).toBe(mockReadAdapter);
    });

    it('should detect and create adapter for Ethers write client', () => {
      // Arrange
      const ethersSigner = {
        signMessage: vi.fn(),
        getAddress: vi.fn(),
        // No transport
      } as unknown as Signer;

      vi.mocked(createEthersWriteAdapter).mockReturnValue(mockWriteAdapter);

      // Act
      const result = resolveBlockchainAdapter(ethersSigner);

      // Assert
      expect(createEthersWriteAdapter).toHaveBeenCalledWith(ethersSigner);
      expect(result).toBe(mockWriteAdapter);
    });

    it('should not confuse Ethers signer with Viem client', () => {
      // Arrange
      const ethersSigner = {
        signMessage: vi.fn(),
        getAddress: vi.fn(),
        call: vi.fn(),
        // No transport - this is key difference
      } as unknown as Signer;

      vi.mocked(createEthersWriteAdapter).mockReturnValue(mockWriteAdapter);

      // Act
      const result = resolveBlockchainAdapter(ethersSigner);

      // Assert
      expect(createEthersWriteAdapter).toHaveBeenCalledWith(ethersSigner);
      expect(createViemWriteAdapter).not.toHaveBeenCalled();
      expect(result).toBe(mockWriteAdapter);
    });
  });

  describe('Custom adapter detection', () => {
    it('should detect and return custom read adapter as-is', () => {
      // Arrange
      const customReadAdapter = {
        type: 'custom',
        call: vi.fn(),
        getChainId: vi.fn(),
      } as ReadBlockchainAdapter & {type: 'custom'};

      // Act
      const result = resolveBlockchainAdapter(customReadAdapter);

      // Assert
      expect(result).toBe(customReadAdapter);
      expect(createViemReadAdapter).not.toHaveBeenCalled();
      expect(createEthersReadAdapter).not.toHaveBeenCalled();
    });

    it('should detect and return custom write adapter as-is', () => {
      // Arrange
      const customWriteAdapter = {
        type: 'custom',
        call: vi.fn(),
        getAddress: vi.fn(),
        sendTx: vi.fn(),
        signMsg: vi.fn(),
        getChainId: vi.fn(),
      } as WriteBlockchainAdapter & {type: 'custom'};

      // Act
      const result = resolveBlockchainAdapter(customWriteAdapter);

      // Assert
      expect(result).toBe(customWriteAdapter);
      expect(createViemWriteAdapter).not.toHaveBeenCalled();
      expect(createEthersWriteAdapter).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('should throw DripsError for unsupported client type', () => {
      // Arrange
      const unsupportedClient = {
        someRandomProperty: 'value',
        anotherProperty: 123,
      } as any;

      // Act & Assert
      expect(() => resolveBlockchainAdapter(unsupportedClient)).toThrow(
        DripsError,
      );
      expect(() => resolveBlockchainAdapter(unsupportedClient)).toThrow(
        'Unsupported client type for blockchain adapter',
      );
    });

    it('should include helpful metadata in error for unsupported client', () => {
      // Arrange
      const unsupportedClient = {
        someProperty: 'value',
        anotherProperty: 123,
      } as any;

      // Act & Assert
      try {
        resolveBlockchainAdapter(unsupportedClient);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(DripsError);
        const dripsError = error as DripsError;
        expect(dripsError.meta).toEqual({
          operation: 'resolveBlockchainAdapter',
          clientKeys: ['someProperty', 'anotherProperty'],
        });
      }
    });

    it('should throw error for client with partial Viem properties', () => {
      // Arrange
      const partialViemClient = {
        transport: {},
        // Missing call method
      } as any;

      // Act & Assert
      expect(() => resolveBlockchainAdapter(partialViemClient)).toThrow(
        DripsError,
      );
    });

    it('should throw error for client with partial Ethers properties', () => {
      // Arrange
      const partialEthersClient = {
        call: vi.fn(),
        signMessage: vi.fn(),
        // Missing getAddress for write client
      } as any;

      // Act & Assert
      expect(() => resolveBlockchainAdapter(partialEthersClient)).toThrow(
        DripsError,
      );
    });
  });

  describe('Edge cases and client differentiation', () => {
    it('should handle client with both transport and signMessage correctly', () => {
      // Arrange - This should be detected as Viem write client
      const mixedClient = {
        transport: {},
        call: vi.fn(),
        sendTransaction: vi.fn(),
        signMessage: vi.fn(), // This exists but shouldn't affect Viem detection
        account: {address: '0x123'},
      } as unknown as WalletClient;

      vi.mocked(createViemWriteAdapter).mockReturnValue(mockWriteAdapter);

      // Act
      const result = resolveBlockchainAdapter(mixedClient);

      // Assert
      expect(createViemWriteAdapter).toHaveBeenCalledWith(mixedClient);
      expect(createEthersWriteAdapter).not.toHaveBeenCalled();
      expect(result).toBe(mockWriteAdapter);
    });

    it('should handle empty object client', () => {
      // Arrange
      const emptyClient = {} as any;

      // Act & Assert
      expect(() => resolveBlockchainAdapter(emptyClient)).toThrow(DripsError);
      expect(() => resolveBlockchainAdapter(emptyClient)).toThrow(
        'Unsupported client type for blockchain adapter',
      );
    });

    it('should handle null client', () => {
      // Arrange
      const nullClient = null as any;

      // Act & Assert
      expect(() => resolveBlockchainAdapter(nullClient)).toThrow();
    });

    it('should prioritize custom adapter detection over other types', () => {
      // Arrange - Client that looks like Viem but has custom type
      // Custom detection now happens first, so this should be detected as custom
      const customClientWithViemProps = {
        type: 'custom',
        transport: {},
        call: vi.fn(),
        sendTransaction: vi.fn(),
      } as any;

      // Act
      const result = resolveBlockchainAdapter(customClientWithViemProps);

      // Assert
      // Custom detection happens first now
      expect(result).toBe(customClientWithViemProps);
      expect(createViemWriteAdapter).not.toHaveBeenCalled();
    });
  });
});
