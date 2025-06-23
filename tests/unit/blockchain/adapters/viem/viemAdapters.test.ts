import {describe, it, expect, vi, beforeEach} from 'vitest';
import {
  createViemReadAdapter,
  createViemWriteAdapter,
} from '../../../../../src/internal/blockchain/adapters/viem/viemAdapters';
import {PreparedTx} from '../../../../../src/internal/blockchain/BlockchainAdapter';
import {PublicClient, WalletClient, Account, Hash, Hex} from 'viem';
import {DripsError} from '../../../../../src/internal/shared/DripsError';

vi.mock(
  '../../../../../src/internal/blockchain/adapters/viem/viemMappers',
  () => ({
    mapToViemCallParameters: vi.fn(),
    mapFromViemResponse: vi.fn(),
  }),
);

vi.mock(
  '../../../../../src/internal/blockchain/adapters/viem/createViemMeta',
  () => ({
    createViemMeta: vi.fn(),
  }),
);

vi.mock('../../../../../src/internal/shared/assertions', () => ({
  requireWalletHasAccount: vi.fn(),
}));

import {
  mapToViemCallParameters,
  mapFromViemResponse,
} from '../../../../../src/internal/blockchain/adapters/viem/viemMappers';
import {createViemMeta} from '../../../../../src/internal/blockchain/adapters/viem/createViemMeta';
import {requireWalletHasAccount} from '../../../../../src/internal/shared/assertions';

describe('viemAdapters', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as const;
  const mockHash =
    '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as Hash;
  const mockData = '0x123456' as Hex;

  const createBasePreparedTx = (): PreparedTx => ({
    to: mockAddress,
    data: mockData,
  });

  const createMockPublicClient = (): PublicClient =>
    ({
      call: vi.fn(),
      getChainId: vi.fn().mockResolvedValue(1),
      chain: {id: 1},
    }) as unknown as PublicClient;

  const createMockAccount = (): Account => ({
    address: mockAddress,
    type: 'json-rpc',
  });

  const createMockWalletClient = (): WalletClient & {account: Account} =>
    ({
      account: createMockAccount(),
      chain: {id: 1},
      sendTransaction: vi.fn(),
      signMessage: vi.fn(),
      extend: vi.fn(),
    }) as unknown as WalletClient & {account: Account};

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset requireWalletHasAccount to not throw by default
    vi.mocked(requireWalletHasAccount).mockImplementation(() => {});
  });

  describe('createViemReadAdapter', () => {
    it('should create read adapter with call and getChainId methods', () => {
      // Arrange
      const publicClient = createMockPublicClient();

      // Act
      const adapter = createViemReadAdapter(publicClient);

      // Assert
      expect(adapter).toHaveProperty('call');
      expect(adapter).toHaveProperty('getChainId');
      expect(typeof adapter.call).toBe('function');
      expect(typeof adapter.getChainId).toBe('function');
    });

    it('should getChainId returns client chain ID from chain property', async () => {
      // Arrange
      const expectedChainId = 11155111;
      const publicClient = {
        call: vi.fn(),
        getChainId: vi.fn(),
        chain: {id: expectedChainId},
      } as unknown as PublicClient;

      const adapter = createViemReadAdapter(publicClient);

      // Act
      const result = await adapter.getChainId();

      // Assert
      expect(publicClient.getChainId).not.toHaveBeenCalled();
      expect(result).toBe(expectedChainId);
    });

    it('should getChainId calls getChainId method when chain property is undefined', async () => {
      // Arrange
      const expectedChainId = 11155111;
      const publicClient = {
        call: vi.fn(),
        getChainId: vi.fn().mockResolvedValue(expectedChainId),
        chain: undefined,
      } as unknown as PublicClient;

      const adapter = createViemReadAdapter(publicClient);

      // Act
      const result = await adapter.getChainId();

      // Assert
      expect(publicClient.getChainId).toHaveBeenCalledTimes(1);
      expect(result).toBe(expectedChainId);
    });

    it('should getChainId wraps viem errors in DripsError', async () => {
      // Arrange
      const originalError = new Error('Failed to get chain ID');
      const publicClient = {
        call: vi.fn(),
        getChainId: vi.fn().mockRejectedValue(originalError),
        chain: undefined,
      } as unknown as PublicClient;

      const adapter = createViemReadAdapter(publicClient);

      // Act & Assert
      await expect(adapter.getChainId()).rejects.toThrow(DripsError);
      await expect(adapter.getChainId()).rejects.toThrow(
        'Failed to get chain ID',
      );
    });

    it('should getChainId handles different chain IDs', async () => {
      // Arrange
      const testChainIds = [1, 11155111, 31337, 42];

      for (const chainId of testChainIds) {
        const publicClient = {
          call: vi.fn(),
          getChainId: vi.fn().mockResolvedValue(chainId),
          chain: {id: chainId},
        } as unknown as PublicClient;

        const adapter = createViemReadAdapter(publicClient);

        // Act
        const result = await adapter.getChainId();

        // Assert
        expect(result).toBe(chainId);
      }
    });

    it('should call method executes publicClient.call with mapped parameters', async () => {
      // Arrange
      const publicClient = createMockPublicClient();
      const tx = createBasePreparedTx();
      const mappedParams = {to: mockAddress, data: mockData};
      const callResult = {data: mockData};

      vi.mocked(mapToViemCallParameters).mockReturnValue(mappedParams);
      vi.mocked(publicClient.call).mockResolvedValue(callResult);
      vi.mocked(createViemMeta).mockReturnValue({
        to: mockAddress,
        operation: 'call',
      });

      const adapter = createViemReadAdapter(publicClient);

      // Act
      const result = await adapter.call(tx);

      // Assert
      expect(mapToViemCallParameters).toHaveBeenCalledWith(tx);
      expect(publicClient.call).toHaveBeenCalledWith(mappedParams);
      expect(result).toBe(mockData);
    });

    it('should call method returns data from successful call', async () => {
      // Arrange
      const publicClient = createMockPublicClient();
      const tx = createBasePreparedTx();
      const expectedData = '0xresult' as Hex;

      vi.mocked(mapToViemCallParameters).mockReturnValue({});
      vi.mocked(publicClient.call).mockResolvedValue({data: expectedData});
      vi.mocked(createViemMeta).mockReturnValue({
        to: mockAddress,
        operation: 'call',
      });

      const adapter = createViemReadAdapter(publicClient);

      // Act
      const result = await adapter.call(tx);

      // Assert
      expect(result).toBe(expectedData);
    });

    it('should call method throws DripsError when no data returned', async () => {
      // Arrange
      const publicClient = createMockPublicClient();
      const tx = createBasePreparedTx();

      vi.mocked(mapToViemCallParameters).mockReturnValue({});
      vi.mocked(publicClient.call).mockResolvedValue({data: undefined});
      vi.mocked(createViemMeta).mockReturnValue({
        to: mockAddress,
        operation: 'call',
      });

      const adapter = createViemReadAdapter(publicClient);

      // Act & Assert
      await expect(adapter.call(tx)).rejects.toThrow(DripsError);
      await expect(adapter.call(tx)).rejects.toThrow('Contract read failed');
    });

    it('should call method wraps viem errors in DripsError', async () => {
      // Arrange
      const publicClient = createMockPublicClient();
      const tx = createBasePreparedTx();
      const originalError = new Error('Viem error');

      vi.mocked(mapToViemCallParameters).mockReturnValue({});
      vi.mocked(publicClient.call).mockRejectedValue(originalError);
      vi.mocked(createViemMeta).mockReturnValue({
        to: mockAddress,
        operation: 'call',
      });

      const adapter = createViemReadAdapter(publicClient);

      // Act & Assert
      await expect(adapter.call(tx)).rejects.toThrow(DripsError);
      await expect(adapter.call(tx)).rejects.toThrow('Contract read failed');
    });
  });

  describe('createViemWriteAdapter', () => {
    it('should throw error if wallet client has no account', () => {
      // Arrange
      const walletClientWithoutAccount = {} as WalletClient;
      const mockError = new Error(
        'WalletClient must have an account configured',
      );

      vi.mocked(requireWalletHasAccount).mockImplementation(() => {
        throw mockError;
      });

      // Act & Assert
      expect(() =>
        createViemWriteAdapter(walletClientWithoutAccount as any),
      ).toThrow(mockError);
      expect(requireWalletHasAccount).toHaveBeenCalledWith(
        walletClientWithoutAccount,
      );
    });

    it('should create write adapter with all methods', () => {
      // Arrange
      const walletClient = createMockWalletClient();
      const mockPublicClient = createMockPublicClient();

      vi.mocked(walletClient.extend).mockReturnValue(mockPublicClient as any);

      // Act
      const adapter = createViemWriteAdapter(walletClient);

      // Assert
      expect(adapter).toHaveProperty('call');
      expect(adapter).toHaveProperty('getAddress');
      expect(adapter).toHaveProperty('sendTx');
      expect(adapter).toHaveProperty('signMsg');
      expect(adapter).toHaveProperty('getChainId');
      expect(typeof adapter.call).toBe('function');
      expect(typeof adapter.getAddress).toBe('function');
      expect(typeof adapter.sendTx).toBe('function');
      expect(typeof adapter.signMsg).toBe('function');
      expect(typeof adapter.getChainId).toBe('function');
    });

    it('should getChainId returns client chain ID for write adapter', async () => {
      // Arrange
      const walletClient = createMockWalletClient();
      const expectedChainId = 31337;
      const mockPublicClient = {
        call: vi.fn(),
        getChainId: vi.fn().mockResolvedValue(expectedChainId),
        chain: {id: expectedChainId},
      } as unknown as PublicClient;

      vi.mocked(walletClient.extend).mockReturnValue(mockPublicClient as any);

      const adapter = createViemWriteAdapter(walletClient);

      // Act
      const result = await adapter.getChainId();

      // Assert
      expect(mockPublicClient.getChainId).not.toHaveBeenCalled();
      expect(result).toBe(expectedChainId);
    });

    it('should getAddress returns wallet account address', async () => {
      // Arrange
      const walletClient = createMockWalletClient();
      const mockPublicClient = createMockPublicClient();

      vi.mocked(walletClient.extend).mockReturnValue(mockPublicClient as any);

      const adapter = createViemWriteAdapter(walletClient);

      // Act
      const result = await adapter.getAddress();

      // Assert
      expect(result).toBe(mockAddress);
    });

    it('should sendTx calls walletClient.sendTransaction with correct parameters', async () => {
      // Arrange
      const walletClient = createMockWalletClient();
      const mockPublicClient = createMockPublicClient();
      const tx = createBasePreparedTx();
      const mappedParams = {to: mockAddress, data: mockData};
      const mockTxResponse = {hash: mockHash, wait: vi.fn()};

      vi.mocked(walletClient.extend).mockReturnValue(mockPublicClient as any);
      vi.mocked(mapToViemCallParameters).mockReturnValue(mappedParams);
      vi.mocked(walletClient.sendTransaction).mockResolvedValue(mockHash);
      vi.mocked(mapFromViemResponse).mockReturnValue(mockTxResponse);
      vi.mocked(createViemMeta).mockReturnValue({
        to: mockAddress,
        operation: 'sendTx',
      });

      const adapter = createViemWriteAdapter(walletClient);

      // Act
      await adapter.sendTx(tx);

      // Assert
      expect(mapToViemCallParameters).toHaveBeenCalledWith(tx);
      expect(walletClient.sendTransaction).toHaveBeenCalledWith({
        ...mappedParams,
        chain: walletClient.chain,
        account: walletClient.account,
      });
    });

    it('should sendTx returns TxResponse with meta', async () => {
      // Arrange
      const walletClient = createMockWalletClient();
      const mockPublicClient = createMockPublicClient();
      const tx = createBasePreparedTx();
      const mockTxResponse = {hash: mockHash, wait: vi.fn()};
      const mockMeta = {to: mockAddress, operation: 'sendTx'};

      vi.mocked(walletClient.extend).mockReturnValue(mockPublicClient as any);
      vi.mocked(mapToViemCallParameters).mockReturnValue({});
      vi.mocked(walletClient.sendTransaction).mockResolvedValue(mockHash);
      vi.mocked(mapFromViemResponse).mockReturnValue(mockTxResponse);
      vi.mocked(createViemMeta).mockReturnValue(mockMeta);

      const adapter = createViemWriteAdapter(walletClient);

      // Act
      const result = await adapter.sendTx(tx);

      // Assert
      expect(result).toEqual({
        ...mockTxResponse,
        meta: mockMeta,
      });
      expect(mapFromViemResponse).toHaveBeenCalledWith(
        mockHash,
        mockPublicClient,
      );
    });

    it('should sendTx wraps viem errors in DripsError', async () => {
      // Arrange
      const walletClient = createMockWalletClient();
      const mockPublicClient = createMockPublicClient();
      const tx = createBasePreparedTx();
      const originalError = new Error('Viem error');

      vi.mocked(walletClient.extend).mockReturnValue(mockPublicClient as any);
      vi.mocked(mapToViemCallParameters).mockReturnValue({});
      vi.mocked(walletClient.sendTransaction).mockRejectedValue(originalError);
      vi.mocked(createViemMeta).mockReturnValue({
        to: mockAddress,
        operation: 'sendTx',
      });

      const adapter = createViemWriteAdapter(walletClient);

      // Act & Assert
      await expect(adapter.sendTx(tx)).rejects.toThrow(DripsError);
      await expect(adapter.sendTx(tx)).rejects.toThrow('Contract write failed');
    });

    it('should signMsg with string message', async () => {
      // Arrange
      const walletClient = createMockWalletClient();
      const mockPublicClient = createMockPublicClient();
      const message = 'Hello, world!';
      const expectedSignature = '0xsignature' as Hex;

      vi.mocked(walletClient.extend).mockReturnValue(mockPublicClient as any);
      vi.mocked(walletClient.signMessage).mockResolvedValue(expectedSignature);

      const adapter = createViemWriteAdapter(walletClient);

      // Act
      const result = await adapter.signMsg(message);

      // Assert
      expect(walletClient.signMessage).toHaveBeenCalledWith({
        account: walletClient.account,
        message,
      });
      expect(result).toBe(expectedSignature);
    });

    it('should signMsg with Uint8Array message', async () => {
      // Arrange
      const walletClient = createMockWalletClient();
      const mockPublicClient = createMockPublicClient();
      const message = new Uint8Array([1, 2, 3, 4]);
      const expectedSignature = '0xsignature' as Hex;

      vi.mocked(walletClient.extend).mockReturnValue(mockPublicClient as any);
      vi.mocked(walletClient.signMessage).mockResolvedValue(expectedSignature);

      const adapter = createViemWriteAdapter(walletClient);

      // Act
      const result = await adapter.signMsg(message);

      // Assert
      expect(walletClient.signMessage).toHaveBeenCalledWith({
        account: walletClient.account,
        message: {raw: message},
      });
      expect(result).toBe(expectedSignature);
    });

    it('should signMsg wraps viem errors in DripsError', async () => {
      // Arrange
      const walletClient = createMockWalletClient();
      const mockPublicClient = createMockPublicClient();
      const message = 'Hello, world!';
      const originalError = new Error('Viem error');

      vi.mocked(walletClient.extend).mockReturnValue(mockPublicClient as any);
      vi.mocked(walletClient.signMessage).mockRejectedValue(originalError);

      const adapter = createViemWriteAdapter(walletClient);

      // Act & Assert
      await expect(adapter.signMsg(message)).rejects.toThrow(DripsError);
      await expect(adapter.signMsg(message)).rejects.toThrow(
        'Message signing failed',
      );
    });

    it('should inherit call method from read adapter', async () => {
      // Arrange
      const walletClient = createMockWalletClient();
      const mockPublicClient = createMockPublicClient();
      const tx = createBasePreparedTx();
      const expectedData = '0xresult' as Hex;

      vi.mocked(walletClient.extend).mockReturnValue(mockPublicClient as any);
      vi.mocked(mapToViemCallParameters).mockReturnValue({});
      vi.mocked(mockPublicClient.call).mockResolvedValue({data: expectedData});
      vi.mocked(createViemMeta).mockReturnValue({
        to: mockAddress,
        operation: 'call',
      });

      const adapter = createViemWriteAdapter(walletClient);

      // Act
      const result = await adapter.call(tx);

      // Assert
      expect(result).toBe(expectedData);
      expect(mockPublicClient.call).toHaveBeenCalled();
    });
  });
});
