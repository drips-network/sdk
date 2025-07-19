import {vi, describe, it, expect, beforeEach} from 'vitest';
import {
  DonationsModule,
  createDonationsModule,
} from '../../../src/sdk/createDonationsModule';
import {
  ReadBlockchainAdapter,
  WriteBlockchainAdapter,
  TxResponse,
} from '../../../src/internal/blockchain/BlockchainAdapter';
import {
  OneTimeDonation,
  prepareOneTimeDonation,
} from '../../../src/internal/donations/prepareOneTimeDonation';
import {sendOneTimeDonation} from '../../../src/internal/donations/sendOneTimeDonation';
import {
  ContinuousDonation,
  prepareContinuousDonation,
} from '../../../src/internal/donations/prepareContinuousDonation';
import {
  sendContinuousDonation,
  SendContinuousDonationResult,
} from '../../../src/internal/donations/sendContinuousDonation';
import {
  requireWriteAccess,
  requireMetadataUploader,
} from '../../../src/internal/shared/assertions';
import {Address, Hex} from 'viem';

vi.mock('../../../src/internal/donations/prepareOneTimeDonation');
vi.mock('../../../src/internal/donations/sendOneTimeDonation');
vi.mock('../../../src/internal/donations/prepareContinuousDonation');
vi.mock('../../../src/internal/donations/sendContinuousDonation');
vi.mock('../../../src/internal/shared/assertions');

describe('createDonationsModule', () => {
  let adapter: WriteBlockchainAdapter;
  let donationsModule: DonationsModule;
  let mockGraphqlClient: any;
  let mockIpfsMetadataUploader: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up default mock implementations that don't throw
    vi.mocked(requireWriteAccess).mockImplementation(() => {
      // Default implementation does nothing (successful case)
    });
    vi.mocked(requireMetadataUploader).mockImplementation(() => {
      // Default implementation does nothing (successful case)
    });

    adapter = {
      sendTx: vi.fn(),
      getAddress: vi.fn(),
      signMsg: vi.fn(),
      call: vi.fn(),
      getChainId: vi.fn(),
    } as WriteBlockchainAdapter;

    mockGraphqlClient = {} as any;
    mockIpfsMetadataUploader = vi.fn();

    donationsModule = createDonationsModule({
      adapter,
      graphqlClient: mockGraphqlClient,
      ipfsMetadataUploaderFn: mockIpfsMetadataUploader,
    });
  });

  describe('sendOneTime', () => {
    it('should send a one-time donation', async () => {
      // Arrange
      const params: OneTimeDonation = {
        receiver: {
          type: 'address',
          address: '0x1234567890123456789012345678901234567890' as Address,
        },
        amount: 100n,
        erc20: '0xabcdef1234567890abcdef1234567890abcdef12' as Hex,
        tokenDecimals: 18,
      };
      const expectedTxResponse: TxResponse = {
        hash: '0x123456789abcdef' as Hex,
        wait: vi.fn(),
      };
      vi.mocked(sendOneTimeDonation).mockResolvedValue(expectedTxResponse);

      // Act
      const result = await donationsModule.sendOneTime(params);

      // Assert
      expect(result).toBe(expectedTxResponse);
      expect(sendOneTimeDonation).toHaveBeenCalledWith(adapter, params);
    });

    it('should handle project receiver type for sending', async () => {
      // Arrange
      const params: OneTimeDonation = {
        receiver: {
          type: 'project',
          url: 'https://github.com/user/repo',
        },
        amount: 200n,
        erc20: '0xabcdef1234567890abcdef1234567890abcdef12' as Hex,
        tokenDecimals: 18,
      };
      const expectedTxResponse: TxResponse = {
        hash: '0x987654321fedcba' as Hex,
        wait: vi.fn(),
      };
      vi.mocked(sendOneTimeDonation).mockResolvedValue(expectedTxResponse);

      // Act
      const result = await donationsModule.sendOneTime(params);

      // Assert
      expect(result).toBe(expectedTxResponse);
      expect(sendOneTimeDonation).toHaveBeenCalledWith(adapter, params);
    });

    it('should handle drip-list receiver type for sending', async () => {
      // Arrange
      const params: OneTimeDonation = {
        receiver: {
          type: 'drip-list',
          accountId: 123n,
        },
        amount: 300n,
        erc20: '0xabcdef1234567890abcdef1234567890abcdef12' as Hex,
        tokenDecimals: 18,
      };
      const expectedTxResponse: TxResponse = {
        hash: '0xabc123def456' as Hex,
        wait: vi.fn(),
      };
      vi.mocked(sendOneTimeDonation).mockResolvedValue(expectedTxResponse);

      // Act
      const result = await donationsModule.sendOneTime(params);

      // Assert
      expect(result).toBe(expectedTxResponse);
      expect(sendOneTimeDonation).toHaveBeenCalledWith(adapter, params);
    });
  });

  describe('sendOneTime method validation', () => {
    it('should call requireWriteAccess with correct parameters', async () => {
      // Arrange
      const params: OneTimeDonation = {
        receiver: {
          type: 'address',
          address: '0x1234567890123456789012345678901234567890' as Address,
        },
        amount: 100n,
        erc20: '0xabcdef1234567890abcdef1234567890abcdef12' as Hex,
        tokenDecimals: 18,
      };
      vi.mocked(sendOneTimeDonation).mockResolvedValue({} as any);

      // Act
      await donationsModule.sendOneTime(params);

      // Assert
      expect(requireWriteAccess).toHaveBeenCalledWith(
        adapter,
        'sendOneTimeDonation',
      );
    });

    it('should call requireMetadataUploader with correct parameters', async () => {
      // Arrange
      const params: OneTimeDonation = {
        receiver: {
          type: 'address',
          address: '0x1234567890123456789012345678901234567890' as Address,
        },
        amount: 100n,
        erc20: '0xabcdef1234567890abcdef1234567890abcdef12' as Hex,
        tokenDecimals: 18,
      };
      vi.mocked(sendOneTimeDonation).mockResolvedValue({} as any);

      // Act
      await donationsModule.sendOneTime(params);

      // Assert
      expect(requireMetadataUploader).toHaveBeenCalledWith(
        mockIpfsMetadataUploader,
        'sendOneTimeDonation',
      );
    });

    it('should work with ReadBlockchainAdapter when requireWriteAccess is mocked to pass', async () => {
      // Arrange
      const readAdapter = {
        call: vi.fn(),
        getChainId: vi.fn(),
      } as ReadBlockchainAdapter;
      const moduleWithReadAdapter = createDonationsModule({
        adapter: readAdapter,
        graphqlClient: mockGraphqlClient,
        ipfsMetadataUploaderFn: mockIpfsMetadataUploader,
      });
      const params: OneTimeDonation = {
        receiver: {
          type: 'address',
          address: '0x1234567890123456789012345678901234567890' as Address,
        },
        amount: 100n,
        erc20: '0xabcdef1234567890abcdef1234567890abcdef12' as Hex,
        tokenDecimals: 18,
      };
      const expectedResult = {hash: '0x123'} as any;
      vi.mocked(sendOneTimeDonation).mockResolvedValue(expectedResult);
      vi.mocked(requireWriteAccess).mockImplementation(() => {
        // Mock passes validation
      });

      // Act
      const result = await moduleWithReadAdapter.sendOneTime(params);

      // Assert
      expect(result).toBe(expectedResult);
      expect(requireWriteAccess).toHaveBeenCalledWith(
        readAdapter,
        'sendOneTimeDonation',
      );
    });

    it('should work without ipfsMetadataUploaderFn when requireMetadataUploader is mocked to pass', async () => {
      // Arrange
      const moduleWithoutUploader = createDonationsModule({
        adapter,
        graphqlClient: mockGraphqlClient,
        ipfsMetadataUploaderFn: undefined,
      });
      const params: OneTimeDonation = {
        receiver: {
          type: 'address',
          address: '0x1234567890123456789012345678901234567890' as Address,
        },
        amount: 100n,
        erc20: '0xabcdef1234567890abcdef1234567890abcdef12' as Hex,
        tokenDecimals: 18,
      };
      const expectedResult = {hash: '0x123'} as any;
      vi.mocked(sendOneTimeDonation).mockResolvedValue(expectedResult);
      vi.mocked(requireMetadataUploader).mockImplementation(() => {
        // Mock passes validation
      });

      // Act
      const result = await moduleWithoutUploader.sendOneTime(params);

      // Assert
      expect(result).toBe(expectedResult);
      expect(requireMetadataUploader).toHaveBeenCalledWith(
        undefined,
        'sendOneTimeDonation',
      );
    });
  });

  describe('sendContinuous', () => {
    it('should send a continuous donation', async () => {
      // Arrange
      const params: ContinuousDonation = {
        erc20: '0xabcdef1234567890abcdef1234567890abcdef12' as Hex,
        amount: '100',
        timeUnit: 1,
        tokenDecimals: 18,
        receiver: {
          type: 'address',
          address: '0x1234567890123456789012345678901234567890' as Address,
        },
      };
      const mockGraphqlClient = {} as any;
      const mockIpfsMetadataUploader = vi.fn();
      const expectedTxResponse: TxResponse = {
        hash: '0x123456789abcdef' as Hex,
        wait: vi.fn(),
      };
      const expectedResult: SendContinuousDonationResult = {
        txResponse: expectedTxResponse,
        ipfsHash: 'QmHash123',
        metadata: {
          describes: {
            driver: 'address' as const,
            accountId: '123',
          },
          assetConfigs: [],
          timestamp: 123456789,
          writtenByAddress: '0xSender456',
        },
      };
      vi.mocked(sendContinuousDonation).mockResolvedValue(expectedResult);

      // Create a new module with all dependencies
      const moduleWithDeps = createDonationsModule({
        adapter,
        graphqlClient: mockGraphqlClient,
        ipfsMetadataUploaderFn: mockIpfsMetadataUploader,
      });

      // Act
      const result = await moduleWithDeps.sendContinuous(params);

      // Assert
      expect(result).toBe(expectedResult);
      expect(sendContinuousDonation).toHaveBeenCalledWith(
        adapter,
        mockIpfsMetadataUploader,
        params,
        mockGraphqlClient,
      );
    });

    it('should handle different receiver types for sending', async () => {
      // Arrange
      const params: ContinuousDonation = {
        erc20: '0xabcdef1234567890abcdef1234567890abcdef12' as Hex,
        amount: '100',
        timeUnit: 1,
        tokenDecimals: 18,
        receiver: {
          type: 'drip-list',
          accountId: 123n,
        },
      };
      const mockGraphqlClient = {} as any;
      const mockIpfsMetadataUploader = vi.fn();
      const expectedTxResponse: TxResponse = {
        hash: '0x987654321fedcba' as Hex,
        wait: vi.fn(),
      };
      const expectedResult: SendContinuousDonationResult = {
        txResponse: expectedTxResponse,
        ipfsHash: 'QmHash456',
        metadata: {
          describes: {
            driver: 'address' as const,
            accountId: '456',
          },
          assetConfigs: [],
          timestamp: 987654321,
          writtenByAddress: '0xSender789',
        },
      };
      vi.mocked(sendContinuousDonation).mockResolvedValue(expectedResult);

      // Create a new module with all dependencies
      const moduleWithDeps = createDonationsModule({
        adapter,
        graphqlClient: mockGraphqlClient,
        ipfsMetadataUploaderFn: mockIpfsMetadataUploader,
      });

      // Act
      const result = await moduleWithDeps.sendContinuous(params);

      // Assert
      expect(result).toBe(expectedResult);
      expect(sendContinuousDonation).toHaveBeenCalledWith(
        adapter,
        mockIpfsMetadataUploader,
        params,
        mockGraphqlClient,
      );
    });
  });

  describe('prepareOneTime', () => {
    it('should prepare a one-time donation', async () => {
      // Arrange
      const params: OneTimeDonation = {
        receiver: {
          type: 'address',
          address: '0x1234567890123456789012345678901234567890' as Address,
        },
        amount: 100n,
        erc20: '0xabcdef1234567890abcdef1234567890abcdef12' as Hex,
        tokenDecimals: 18,
      };
      const expectedPreparedTx = {
        to: '0xcontract' as Address,
        data: '0xdata' as Hex,
        value: 0n,
      };
      vi.mocked(prepareOneTimeDonation).mockResolvedValue(expectedPreparedTx);

      // Act
      const result = await donationsModule.prepareOneTime(params);

      // Assert
      expect(result).toBe(expectedPreparedTx);
      expect(prepareOneTimeDonation).toHaveBeenCalledWith(adapter, params);
    });

    it('should handle project receiver type for preparation', async () => {
      // Arrange
      const params: OneTimeDonation = {
        receiver: {
          type: 'project',
          url: 'https://github.com/user/repo',
        },
        amount: 200n,
        erc20: '0xabcdef1234567890abcdef1234567890abcdef12' as Hex,
        tokenDecimals: 18,
      };
      const expectedPreparedTx = {
        to: '0xcontract2' as Address,
        data: '0xdata2' as Hex,
        value: 0n,
      };
      vi.mocked(prepareOneTimeDonation).mockResolvedValue(expectedPreparedTx);

      // Act
      const result = await donationsModule.prepareOneTime(params);

      // Assert
      expect(result).toBe(expectedPreparedTx);
      expect(prepareOneTimeDonation).toHaveBeenCalledWith(adapter, params);
    });

    it('should handle drip-list receiver type for preparation', async () => {
      // Arrange
      const params: OneTimeDonation = {
        receiver: {
          type: 'drip-list',
          accountId: 123n,
        },
        amount: 300n,
        erc20: '0xabcdef1234567890abcdef1234567890abcdef12' as Hex,
        tokenDecimals: 18,
      };
      const expectedPreparedTx = {
        to: '0xcontract3' as Address,
        data: '0xdata3' as Hex,
        value: 0n,
      };
      vi.mocked(prepareOneTimeDonation).mockResolvedValue(expectedPreparedTx);

      // Act
      const result = await donationsModule.prepareOneTime(params);

      // Assert
      expect(result).toBe(expectedPreparedTx);
      expect(prepareOneTimeDonation).toHaveBeenCalledWith(adapter, params);
    });
  });

  describe('prepareContinuous', () => {
    it('should prepare a continuous donation', async () => {
      // Arrange
      const params: ContinuousDonation = {
        erc20: '0xabcdef1234567890abcdef1234567890abcdef12' as Hex,
        amount: '100',
        timeUnit: 1,
        tokenDecimals: 18,
        receiver: {
          type: 'address',
          address: '0x1234567890123456789012345678901234567890' as Address,
        },
      };
      const expectedResult = {
        preparedTx: {
          to: '0xcontract' as Address,
          data: '0xdata' as Hex,
          value: 0n,
        },
        ipfsHash: 'QmHash123',
        metadata: {
          describes: {
            driver: 'address' as const,
            accountId: '123',
          },
          assetConfigs: [],
          timestamp: 123456789,
          writtenByAddress: '0xSender456',
        },
      };
      vi.mocked(prepareContinuousDonation).mockResolvedValue(expectedResult);

      // Act
      const result = await donationsModule.prepareContinuous(params);

      // Assert
      expect(result).toBe(expectedResult);
      expect(prepareContinuousDonation).toHaveBeenCalledWith(
        adapter,
        mockIpfsMetadataUploader,
        params,
        mockGraphqlClient,
      );
    });

    it('should handle different receiver types for preparation', async () => {
      // Arrange
      const params: ContinuousDonation = {
        erc20: '0xabcdef1234567890abcdef1234567890abcdef12' as Hex,
        amount: '100',
        timeUnit: 1,
        tokenDecimals: 18,
        receiver: {
          type: 'drip-list',
          accountId: 123n,
        },
      };
      const expectedResult = {
        preparedTx: {
          to: '0xcontract2' as Address,
          data: '0xdata2' as Hex,
          value: 0n,
        },
        ipfsHash: 'QmHash456',
        metadata: {
          describes: {
            driver: 'address' as const,
            accountId: '456',
          },
          assetConfigs: [],
          timestamp: 987654321,
          writtenByAddress: '0xSender789',
        },
      };
      vi.mocked(prepareContinuousDonation).mockResolvedValue(expectedResult);

      // Act
      const result = await donationsModule.prepareContinuous(params);

      // Assert
      expect(result).toBe(expectedResult);
      expect(prepareContinuousDonation).toHaveBeenCalledWith(
        adapter,
        mockIpfsMetadataUploader,
        params,
        mockGraphqlClient,
      );
    });
  });

  describe('prepareOneTime method validation', () => {
    it('should call requireWriteAccess with correct parameters', async () => {
      // Arrange
      const params: OneTimeDonation = {
        receiver: {
          type: 'address',
          address: '0x1234567890123456789012345678901234567890' as Address,
        },
        amount: 100n,
        erc20: '0xabcdef1234567890abcdef1234567890abcdef12' as Hex,
        tokenDecimals: 18,
      };
      vi.mocked(prepareOneTimeDonation).mockResolvedValue({} as any);

      // Act
      await donationsModule.prepareOneTime(params);

      // Assert
      expect(requireWriteAccess).toHaveBeenCalledWith(
        adapter,
        'sendOneTimeDonation',
      );
    });

    it('should call requireMetadataUploader with correct parameters', async () => {
      // Arrange
      const params: OneTimeDonation = {
        receiver: {
          type: 'address',
          address: '0x1234567890123456789012345678901234567890' as Address,
        },
        amount: 100n,
        erc20: '0xabcdef1234567890abcdef1234567890abcdef12' as Hex,
        tokenDecimals: 18,
      };
      vi.mocked(prepareOneTimeDonation).mockResolvedValue({} as any);

      // Act
      await donationsModule.prepareOneTime(params);

      // Assert
      expect(requireMetadataUploader).toHaveBeenCalledWith(
        mockIpfsMetadataUploader,
        'sendOneTimeDonation',
      );
    });

    it('should work with ReadBlockchainAdapter when requireWriteAccess is mocked to pass', async () => {
      // Arrange
      const readAdapter = {
        call: vi.fn(),
        getChainId: vi.fn(),
      } as ReadBlockchainAdapter;
      const moduleWithReadAdapter = createDonationsModule({
        adapter: readAdapter,
        graphqlClient: mockGraphqlClient,
        ipfsMetadataUploaderFn: mockIpfsMetadataUploader,
      });
      const params: OneTimeDonation = {
        receiver: {
          type: 'address',
          address: '0x1234567890123456789012345678901234567890' as Address,
        },
        amount: 100n,
        erc20: '0xabcdef1234567890abcdef1234567890abcdef12' as Hex,
        tokenDecimals: 18,
      };
      const expectedResult = {to: '0x123'} as any;
      vi.mocked(prepareOneTimeDonation).mockResolvedValue(expectedResult);
      vi.mocked(requireWriteAccess).mockImplementation(() => {
        // Mock passes validation
      });

      // Act
      const result = await moduleWithReadAdapter.prepareOneTime(params);

      // Assert
      expect(result).toBe(expectedResult);
      expect(requireWriteAccess).toHaveBeenCalledWith(
        readAdapter,
        'sendOneTimeDonation',
      );
    });

    it('should work without ipfsMetadataUploaderFn when requireMetadataUploader is mocked to pass', async () => {
      // Arrange
      const moduleWithoutUploader = createDonationsModule({
        adapter,
        graphqlClient: mockGraphqlClient,
        ipfsMetadataUploaderFn: undefined,
      });
      const params: OneTimeDonation = {
        receiver: {
          type: 'address',
          address: '0x1234567890123456789012345678901234567890' as Address,
        },
        amount: 100n,
        erc20: '0xabcdef1234567890abcdef1234567890abcdef12' as Hex,
        tokenDecimals: 18,
      };
      const expectedResult = {to: '0x123'} as any;
      vi.mocked(prepareOneTimeDonation).mockResolvedValue(expectedResult);
      vi.mocked(requireMetadataUploader).mockImplementation(() => {
        // Mock passes validation
      });

      // Act
      const result = await moduleWithoutUploader.prepareOneTime(params);

      // Assert
      expect(result).toBe(expectedResult);
      expect(requireMetadataUploader).toHaveBeenCalledWith(
        undefined,
        'sendOneTimeDonation',
      );
    });
  });

  describe('prepareContinuous method validation', () => {
    it('should call requireWriteAccess with correct parameters', async () => {
      // Arrange
      const params: ContinuousDonation = {
        erc20: '0xabcdef1234567890abcdef1234567890abcdef12' as Hex,
        amount: '100',
        timeUnit: 1,
        tokenDecimals: 18,
        receiver: {
          type: 'address',
          address: '0x1234567890123456789012345678901234567890' as Address,
        },
      };
      vi.mocked(prepareContinuousDonation).mockResolvedValue({} as any);

      // Act
      await donationsModule.prepareContinuous(params);

      // Assert
      expect(requireWriteAccess).toHaveBeenCalledWith(
        adapter,
        'sendContinuousDonation',
      );
    });

    it('should call requireMetadataUploader with correct parameters', async () => {
      // Arrange
      const params: ContinuousDonation = {
        erc20: '0xabcdef1234567890abcdef1234567890abcdef12' as Hex,
        amount: '100',
        timeUnit: 1,
        tokenDecimals: 18,
        receiver: {
          type: 'address',
          address: '0x1234567890123456789012345678901234567890' as Address,
        },
      };
      vi.mocked(prepareContinuousDonation).mockResolvedValue({} as any);

      // Act
      await donationsModule.prepareContinuous(params);

      // Assert
      expect(requireMetadataUploader).toHaveBeenCalledWith(
        mockIpfsMetadataUploader,
        'sendContinuousDonation',
      );
    });

    it('should work with ReadBlockchainAdapter when requireWriteAccess is mocked to pass', async () => {
      // Arrange
      const readAdapter = {
        call: vi.fn(),
        getChainId: vi.fn(),
      } as ReadBlockchainAdapter;
      const moduleWithReadAdapter = createDonationsModule({
        adapter: readAdapter,
        graphqlClient: mockGraphqlClient,
        ipfsMetadataUploaderFn: mockIpfsMetadataUploader,
      });
      const params: ContinuousDonation = {
        erc20: '0xabcdef1234567890abcdef1234567890abcdef12' as Hex,
        amount: '100',
        timeUnit: 1,
        tokenDecimals: 18,
        receiver: {
          type: 'address',
          address: '0x1234567890123456789012345678901234567890' as Address,
        },
      };
      const expectedResult = {preparedTx: {to: '0x123'}} as any;
      vi.mocked(prepareContinuousDonation).mockResolvedValue(expectedResult);
      vi.mocked(requireWriteAccess).mockImplementation(() => {
        // Mock passes validation
      });

      // Act
      const result = await moduleWithReadAdapter.prepareContinuous(params);

      // Assert
      expect(result).toBe(expectedResult);
      expect(requireWriteAccess).toHaveBeenCalledWith(
        readAdapter,
        'sendContinuousDonation',
      );
    });

    it('should work without ipfsMetadataUploaderFn when requireMetadataUploader is mocked to pass', async () => {
      // Arrange
      const moduleWithoutUploader = createDonationsModule({
        adapter,
        graphqlClient: mockGraphqlClient,
        ipfsMetadataUploaderFn: undefined,
      });
      const params: ContinuousDonation = {
        erc20: '0xabcdef1234567890abcdef1234567890abcdef12' as Hex,
        amount: '100',
        timeUnit: 1,
        tokenDecimals: 18,
        receiver: {
          type: 'address',
          address: '0x1234567890123456789012345678901234567890' as Address,
        },
      };
      const expectedResult = {preparedTx: {to: '0x123'}} as any;
      vi.mocked(prepareContinuousDonation).mockResolvedValue(expectedResult);
      vi.mocked(requireMetadataUploader).mockImplementation(() => {
        // Mock passes validation
      });

      // Act
      const result = await moduleWithoutUploader.prepareContinuous(params);

      // Assert
      expect(result).toBe(expectedResult);
      expect(requireMetadataUploader).toHaveBeenCalledWith(
        undefined,
        'sendContinuousDonation',
      );
    });
  });

  describe('sendContinuous method validation', () => {
    it('should call requireWriteAccess with correct parameters', async () => {
      // Arrange
      const params: ContinuousDonation = {
        erc20: '0xabcdef1234567890abcdef1234567890abcdef12' as Hex,
        amount: '100',
        timeUnit: 1,
        tokenDecimals: 18,
        receiver: {
          type: 'address',
          address: '0x1234567890123456789012345678901234567890' as Address,
        },
      };
      vi.mocked(sendContinuousDonation).mockResolvedValue({} as any);

      // Act
      await donationsModule.sendContinuous(params);

      // Assert
      expect(requireWriteAccess).toHaveBeenCalledWith(
        adapter,
        'sendContinuousDonation',
      );
    });

    it('should call requireMetadataUploader with correct parameters', async () => {
      // Arrange
      const params: ContinuousDonation = {
        erc20: '0xabcdef1234567890abcdef1234567890abcdef12' as Hex,
        amount: '100',
        timeUnit: 1,
        tokenDecimals: 18,
        receiver: {
          type: 'address',
          address: '0x1234567890123456789012345678901234567890' as Address,
        },
      };
      vi.mocked(sendContinuousDonation).mockResolvedValue({} as any);

      // Act
      await donationsModule.sendContinuous(params);

      // Assert
      expect(requireMetadataUploader).toHaveBeenCalledWith(
        mockIpfsMetadataUploader,
        'sendContinuousDonation',
      );
    });

    it('should work with ReadBlockchainAdapter when requireWriteAccess is mocked to pass', async () => {
      // Arrange
      const readAdapter = {
        call: vi.fn(),
        getChainId: vi.fn(),
      } as ReadBlockchainAdapter;
      const moduleWithReadAdapter = createDonationsModule({
        adapter: readAdapter,
        graphqlClient: mockGraphqlClient,
        ipfsMetadataUploaderFn: mockIpfsMetadataUploader,
      });
      const params: ContinuousDonation = {
        erc20: '0xabcdef1234567890abcdef1234567890abcdef12' as Hex,
        amount: '100',
        timeUnit: 1,
        tokenDecimals: 18,
        receiver: {
          type: 'address',
          address: '0x1234567890123456789012345678901234567890' as Address,
        },
      };
      const expectedResult = {txResponse: {hash: '0x123'}} as any;
      vi.mocked(sendContinuousDonation).mockResolvedValue(expectedResult);
      vi.mocked(requireWriteAccess).mockImplementation(() => {
        // Mock passes validation
      });

      // Act
      const result = await moduleWithReadAdapter.sendContinuous(params);

      // Assert
      expect(result).toBe(expectedResult);
      expect(requireWriteAccess).toHaveBeenCalledWith(
        readAdapter,
        'sendContinuousDonation',
      );
    });

    it('should work without ipfsMetadataUploaderFn when requireMetadataUploader is mocked to pass', async () => {
      // Arrange
      const moduleWithoutUploader = createDonationsModule({
        adapter,
        graphqlClient: mockGraphqlClient,
        ipfsMetadataUploaderFn: undefined,
      });
      const params: ContinuousDonation = {
        erc20: '0xabcdef1234567890abcdef1234567890abcdef12' as Hex,
        amount: '100',
        timeUnit: 1,
        tokenDecimals: 18,
        receiver: {
          type: 'address',
          address: '0x1234567890123456789012345678901234567890' as Address,
        },
      };
      const expectedResult = {txResponse: {hash: '0x123'}} as any;
      vi.mocked(sendContinuousDonation).mockResolvedValue(expectedResult);
      vi.mocked(requireMetadataUploader).mockImplementation(() => {
        // Mock passes validation
      });

      // Act
      const result = await moduleWithoutUploader.sendContinuous(params);

      // Assert
      expect(result).toBe(expectedResult);
      expect(requireMetadataUploader).toHaveBeenCalledWith(
        undefined,
        'sendContinuousDonation',
      );
    });
  });

  describe('module creation', () => {
    it('should create a donations module with the correct interface', () => {
      // Act
      const mockGraphqlClient = {} as any;
      const mockIpfsMetadataUploader = vi.fn();
      const module = createDonationsModule({
        adapter,
        graphqlClient: mockGraphqlClient,
        ipfsMetadataUploaderFn: mockIpfsMetadataUploader,
      });

      // Assert
      expect(module).toHaveProperty('sendOneTime');
      expect(module).toHaveProperty('sendContinuous');
      expect(module).toHaveProperty('prepareOneTime');
      expect(module).toHaveProperty('prepareContinuous');
      expect(typeof module.sendOneTime).toBe('function');
      expect(typeof module.sendContinuous).toBe('function');
      expect(typeof module.prepareOneTime).toBe('function');
      expect(typeof module.prepareContinuous).toBe('function');
    });

    it('should work with WriteBlockchainAdapter and valid uploader', () => {
      // Arrange
      const writeAdapter = {
        sendTx: vi.fn(),
        getAddress: vi.fn(),
        signMsg: vi.fn(),
        call: vi.fn(),
        getChainId: vi.fn(),
      } as WriteBlockchainAdapter;
      const mockGraphqlClient = {} as any;
      const mockIpfsMetadataUploader = vi.fn();

      // Act
      const module = createDonationsModule({
        adapter: writeAdapter,
        graphqlClient: mockGraphqlClient,
        ipfsMetadataUploaderFn: mockIpfsMetadataUploader,
      });

      // Assert
      expect(module).toHaveProperty('sendOneTime');
      expect(module).toHaveProperty('sendContinuous');
    });
  });
});
