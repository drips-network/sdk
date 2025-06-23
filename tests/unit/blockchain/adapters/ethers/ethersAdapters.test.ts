import {describe, it, expect, vi, beforeEach} from 'vitest';
import {
  createEthersReadAdapter,
  createEthersWriteAdapter,
} from '../../../../../src/internal/blockchain/adapters/ethers/ethersAdapters';
import {PreparedTx} from '../../../../../src/internal/blockchain/BlockchainAdapter';
import type {Provider, Signer, TransactionResponse} from 'ethers';
import {DripsError} from '../../../../../src/internal/shared/DripsError';
import {Hex} from 'viem';

vi.mock(
  '../../../../../src/internal/blockchain/adapters/ethers/ethersMappers',
  () => ({
    mapToEthersTransactionRequest: vi.fn(),
    mapFromEthersResponse: vi.fn(),
  }),
);

vi.mock(
  '../../../../../src/internal/blockchain/adapters/ethers/createEthersMeta',
  () => ({
    createEthersMeta: vi.fn(),
  }),
);

import {
  mapToEthersTransactionRequest,
  mapFromEthersResponse,
} from '../../../../../src/internal/blockchain/adapters/ethers/ethersMappers';
import {createEthersMeta} from '../../../../../src/internal/blockchain/adapters/ethers/createEthersMeta';

describe('ethersAdapters', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as const;
  const mockHash =
    '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890' as Hex;
  const mockData = '0x123456' as Hex;
  const mockSignature = '0xsignature' as Hex;

  const createBasePreparedTx = (): PreparedTx => ({
    to: mockAddress,
    data: mockData,
  });

  const createMockProvider = (): Provider =>
    ({
      call: vi.fn(),
      getNetwork: vi.fn().mockResolvedValue({chainId: 1}),
    }) as unknown as Provider;

  const createMockSigner = (): Signer => {
    const provider = createMockProvider();
    return {
      provider,
      getAddress: vi.fn(),
      sendTransaction: vi.fn(),
      signMessage: vi.fn(),
    } as unknown as Signer;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createEthersReadAdapter', () => {
    it('should create read adapter with call and getChainId methods', () => {
      // Arrange
      const provider = createMockProvider();

      // Act
      const adapter = createEthersReadAdapter(provider);

      // Assert
      expect(adapter).toHaveProperty('call');
      expect(adapter).toHaveProperty('getChainId');
      expect(typeof adapter.call).toBe('function');
      expect(typeof adapter.getChainId).toBe('function');
    });

    it('should getChainId returns provider chain ID', async () => {
      // Arrange
      const provider = createMockProvider();
      const expectedChainId = 11155111;
      const mockNetwork = {chainId: expectedChainId} as any;
      vi.mocked(provider).getNetwork = vi.fn().mockResolvedValue(mockNetwork);

      const adapter = createEthersReadAdapter(provider);

      // Act
      const result = await adapter.getChainId();

      // Assert
      expect(provider.getNetwork).toHaveBeenCalledTimes(1);
      expect(result).toBe(expectedChainId);
    });

    it('should getChainId wraps ethers errors in DripsError', async () => {
      // Arrange
      const provider = createMockProvider();
      const originalError = new Error('Failed to get network');
      vi.mocked(provider).getNetwork = vi.fn().mockRejectedValue(originalError);

      const adapter = createEthersReadAdapter(provider);

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
        const provider = createMockProvider();
        const mockNetwork = {chainId};
        vi.mocked(provider).getNetwork = vi.fn().mockResolvedValue(mockNetwork);

        const adapter = createEthersReadAdapter(provider);

        // Act
        const result = await adapter.getChainId();

        // Assert
        expect(result).toBe(chainId);
      }
    });

    it('should call method executes provider.call with mapped parameters', async () => {
      // Arrange
      const provider = createMockProvider();
      const tx = createBasePreparedTx();
      const mappedRequest = {to: mockAddress, data: mockData};
      const callResult = mockData;

      vi.mocked(mapToEthersTransactionRequest).mockReturnValue(mappedRequest);
      vi.mocked(provider.call).mockResolvedValue(callResult);
      vi.mocked(createEthersMeta).mockReturnValue({
        to: mockAddress,
        operation: 'call',
      });

      const adapter = createEthersReadAdapter(provider);

      // Act
      const result = await adapter.call(tx);

      // Assert
      expect(mapToEthersTransactionRequest).toHaveBeenCalledWith(tx);
      expect(provider.call).toHaveBeenCalledWith(mappedRequest);
      expect(result).toBe(callResult);
    });

    it('should call method returns data from successful call', async () => {
      // Arrange
      const provider = createMockProvider();
      const tx = createBasePreparedTx();
      const expectedData = '0xresult' as Hex;

      vi.mocked(mapToEthersTransactionRequest).mockReturnValue({});
      vi.mocked(provider.call).mockResolvedValue(expectedData);
      vi.mocked(createEthersMeta).mockReturnValue({
        to: mockAddress,
        operation: 'call',
      });

      const adapter = createEthersReadAdapter(provider);

      // Act
      const result = await adapter.call(tx);

      // Assert
      expect(result).toBe(expectedData);
    });

    it('should call method throws DripsError when no data returned', async () => {
      // Arrange
      const provider = createMockProvider();
      const tx = createBasePreparedTx();

      vi.mocked(mapToEthersTransactionRequest).mockReturnValue({});
      vi.mocked(provider.call).mockResolvedValue('');
      vi.mocked(createEthersMeta).mockReturnValue({
        to: mockAddress,
        operation: 'call',
      });

      const adapter = createEthersReadAdapter(provider);

      // Act & Assert
      await expect(adapter.call(tx)).rejects.toThrow(DripsError);
      await expect(adapter.call(tx)).rejects.toThrow('Contract read failed');
    });

    it('should call method wraps ethers errors in DripsError', async () => {
      // Arrange
      const provider = createMockProvider();
      const tx = createBasePreparedTx();
      const originalError = new Error('Ethers error');

      vi.mocked(mapToEthersTransactionRequest).mockReturnValue({});
      vi.mocked(provider.call).mockRejectedValue(originalError);
      vi.mocked(createEthersMeta).mockReturnValue({
        to: mockAddress,
        operation: 'call',
      });

      const adapter = createEthersReadAdapter(provider);

      // Act & Assert
      await expect(adapter.call(tx)).rejects.toThrow(DripsError);
      await expect(adapter.call(tx)).rejects.toThrow('Contract read failed');
    });
  });

  describe('createEthersWriteAdapter', () => {
    it('should throw error if signer has no provider', () => {
      // Arrange
      const signerWithoutProvider = {
        provider: null,
      } as unknown as Signer;

      // Act & Assert
      expect(() => createEthersWriteAdapter(signerWithoutProvider)).toThrow(
        DripsError,
      );
      expect(() => createEthersWriteAdapter(signerWithoutProvider)).toThrow(
        'Signer must have a provider',
      );
    });

    it('should create write adapter with all methods', () => {
      // Arrange
      const signer = createMockSigner();

      // Act
      const adapter = createEthersWriteAdapter(signer);

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

    it('should getChainId returns provider chain ID for write adapter', async () => {
      // Arrange
      const signer = createMockSigner();
      const expectedChainId = 31337;
      const mockNetwork = {chainId: expectedChainId} as any;
      vi.mocked(signer.provider!.getNetwork).mockResolvedValue(mockNetwork);

      const adapter = createEthersWriteAdapter(signer);

      // Act
      const result = await adapter.getChainId();

      // Assert
      expect(signer.provider!.getNetwork).toHaveBeenCalledTimes(1);
      expect(result).toBe(expectedChainId);
    });

    it('should getAddress returns signer address', async () => {
      // Arrange
      const signer = createMockSigner();
      vi.mocked(signer.getAddress).mockResolvedValue(mockAddress);

      const adapter = createEthersWriteAdapter(signer);

      // Act
      const result = await adapter.getAddress();

      // Assert
      expect(signer.getAddress).toHaveBeenCalled();
      expect(result).toBe(mockAddress);
    });

    it('should getAddress wraps signer errors in DripsError', async () => {
      // Arrange
      const signer = createMockSigner();
      const originalError = new Error('Signer error');
      vi.mocked(signer.getAddress).mockRejectedValue(originalError);

      const adapter = createEthersWriteAdapter(signer);

      // Act & Assert
      await expect(adapter.getAddress()).rejects.toThrow(DripsError);
      await expect(adapter.getAddress()).rejects.toThrow(
        'Failed to get signer address',
      );
    });

    it('should sendTx calls signer.sendTransaction with correct parameters', async () => {
      // Arrange
      const signer = createMockSigner();
      const tx = createBasePreparedTx();
      const mappedRequest = {to: mockAddress, data: mockData};
      const mockTxResponse = {hash: mockHash, wait: vi.fn()};
      const mockEthersResponse = {hash: mockHash} as TransactionResponse;

      vi.mocked(signer.getAddress).mockResolvedValue(mockAddress);
      vi.mocked(mapToEthersTransactionRequest).mockReturnValue(mappedRequest);
      vi.mocked(signer.sendTransaction).mockResolvedValue(mockEthersResponse);
      vi.mocked(mapFromEthersResponse).mockReturnValue(mockTxResponse);
      vi.mocked(createEthersMeta).mockReturnValue({
        to: mockAddress,
        operation: 'sendTx',
      });

      const adapter = createEthersWriteAdapter(signer);

      // Act
      await adapter.sendTx(tx);

      // Assert
      expect(signer.getAddress).toHaveBeenCalled();
      expect(mapToEthersTransactionRequest).toHaveBeenCalledWith(tx);
      expect(signer.sendTransaction).toHaveBeenCalledWith(mappedRequest);
    });

    it('should sendTx returns TxResponse with meta', async () => {
      // Arrange
      const signer = createMockSigner();
      const tx = createBasePreparedTx();
      const mockTxResponse = {hash: mockHash, wait: vi.fn()};
      const mockEthersResponse = {hash: mockHash} as TransactionResponse;
      const mockMeta = {to: mockAddress, operation: 'sendTx'};

      vi.mocked(signer.getAddress).mockResolvedValue(mockAddress);
      vi.mocked(mapToEthersTransactionRequest).mockReturnValue({});
      vi.mocked(signer.sendTransaction).mockResolvedValue(mockEthersResponse);
      vi.mocked(mapFromEthersResponse).mockReturnValue(mockTxResponse);
      vi.mocked(createEthersMeta).mockReturnValue(mockMeta);

      const adapter = createEthersWriteAdapter(signer);

      // Act
      const result = await adapter.sendTx(tx);

      // Assert
      expect(result).toEqual({
        ...mockTxResponse,
        meta: mockMeta,
      });
      expect(mapFromEthersResponse).toHaveBeenCalledWith(mockEthersResponse);
    });

    it('should sendTx wraps ethers errors in DripsError', async () => {
      // Arrange
      const signer = createMockSigner();
      const tx = createBasePreparedTx();
      const originalError = new Error('Ethers error');

      vi.mocked(signer.getAddress).mockResolvedValue(mockAddress);
      vi.mocked(mapToEthersTransactionRequest).mockReturnValue({});
      vi.mocked(signer.sendTransaction).mockRejectedValue(originalError);
      vi.mocked(createEthersMeta).mockReturnValue({
        to: mockAddress,
        operation: 'sendTx',
      });

      const adapter = createEthersWriteAdapter(signer);

      // Act & Assert
      await expect(adapter.sendTx(tx)).rejects.toThrow(DripsError);
      await expect(adapter.sendTx(tx)).rejects.toThrow('Contract write failed');
    });

    it('should signMsg with string message', async () => {
      // Arrange
      const signer = createMockSigner();
      const message = 'Hello, world!';

      vi.mocked(signer.signMessage).mockResolvedValue(mockSignature);

      const adapter = createEthersWriteAdapter(signer);

      // Act
      const result = await adapter.signMsg(message);

      // Assert
      expect(signer.signMessage).toHaveBeenCalledWith(message);
      expect(result).toBe(mockSignature);
    });

    it('should signMsg with Uint8Array message', async () => {
      // Arrange
      const signer = createMockSigner();
      const message = new Uint8Array([1, 2, 3, 4]);

      vi.mocked(signer.signMessage).mockResolvedValue(mockSignature);

      const adapter = createEthersWriteAdapter(signer);

      // Act
      const result = await adapter.signMsg(message);

      // Assert
      expect(signer.signMessage).toHaveBeenCalledWith(message);
      expect(result).toBe(mockSignature);
    });

    it('should signMsg wraps ethers errors in DripsError', async () => {
      // Arrange
      const signer = createMockSigner();
      const message = 'Hello, world!';
      const originalError = new Error('Ethers error');

      vi.mocked(signer.signMessage).mockRejectedValue(originalError);

      const adapter = createEthersWriteAdapter(signer);

      // Act & Assert
      await expect(adapter.signMsg(message)).rejects.toThrow(DripsError);
      await expect(adapter.signMsg(message)).rejects.toThrow(
        'Message signing failed',
      );
    });

    it('should inherit call method from read adapter', async () => {
      // Arrange
      const signer = createMockSigner();
      const tx = createBasePreparedTx();
      const expectedData = '0xresult' as Hex;

      vi.mocked(mapToEthersTransactionRequest).mockReturnValue({});
      vi.mocked(signer.provider!.call).mockResolvedValue(expectedData);
      vi.mocked(createEthersMeta).mockReturnValue({
        to: mockAddress,
        operation: 'call',
      });

      const adapter = createEthersWriteAdapter(signer);

      // Act
      const result = await adapter.call(tx);

      // Assert
      expect(result).toBe(expectedData);
      expect(signer.provider!.call).toHaveBeenCalled();
    });
  });
});
