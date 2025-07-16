import {vi, describe, it, expect, beforeEach} from 'vitest';
import {
  DonationsModule,
  createDonationsModule,
} from '../../../src/sdk/createDonationsModule';
import {
  ReadBlockchainAdapter,
  WriteBlockchainAdapter,
  PreparedTx,
  TxResponse,
} from '../../../src/internal/blockchain/BlockchainAdapter';
import {
  prepareOneTimeDonation,
  OneTimeDonation,
} from '../../../src/internal/donations/prepareOneTimeDonation';
import {sendOneTimeDonation} from '../../../src/internal/donations/sendOneTimeDonation';
import {
  prepareContinuousDonation,
  ContinuousDonation,
  PrepareContinuousDonationResult,
} from '../../../src/internal/donations/prepareContinuousDonation';
import {
  sendContinuousDonation,
  SendContinuousDonationResult,
} from '../../../src/internal/donations/sendContinuousDonation';
import {Address, Hex} from 'viem';

vi.mock('../../../src/internal/donations/prepareOneTimeDonation');
vi.mock('../../../src/internal/donations/sendOneTimeDonation');
vi.mock('../../../src/internal/donations/prepareContinuousDonation');
vi.mock('../../../src/internal/donations/sendContinuousDonation');

describe('createDonationsModule', () => {
  let adapter: ReadBlockchainAdapter | WriteBlockchainAdapter;
  let donationsModule: DonationsModule;

  beforeEach(() => {
    vi.clearAllMocks();

    adapter = {} as WriteBlockchainAdapter;

    const mockGraphqlClient = {} as any;
    const mockIpfsMetadataUploader = vi.fn();

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
            driver: 'address',
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
            driver: 'address',
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
      expect(typeof module.sendOneTime).toBe('function');
      expect(typeof module.sendContinuous).toBe('function');
    });

    it('should work with ReadBlockchainAdapter', () => {
      // Arrange
      const readAdapter = {} as ReadBlockchainAdapter;

      // Act
      const mockGraphqlClient = {} as any;
      const mockIpfsMetadataUploader = vi.fn();
      const module = createDonationsModule({
        adapter: readAdapter,
        graphqlClient: mockGraphqlClient,
        ipfsMetadataUploaderFn: mockIpfsMetadataUploader,
      });

      // Assert
      expect(module).toHaveProperty('sendOneTime');
    });

    it('should work with WriteBlockchainAdapter', () => {
      // Arrange
      const writeAdapter = {} as WriteBlockchainAdapter;

      // Act
      const mockGraphqlClient = {} as any;
      const mockIpfsMetadataUploader = vi.fn();
      const module = createDonationsModule({
        adapter: writeAdapter,
        graphqlClient: mockGraphqlClient,
        ipfsMetadataUploaderFn: mockIpfsMetadataUploader,
      });

      // Assert
      expect(module).toHaveProperty('sendOneTime');
    });
  });
});
