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
  prepareOneTimeDonationTx,
  SendOneTimeDonationParams,
} from '../../../src/internal/donations/prepareOneTimeDonationTx';
import {sendOneTimeDonation} from '../../../src/internal/donations/sendOneTimeDonation';
import {Address, Hex} from 'viem';

vi.mock('../../../src/internal/donations/prepareOneTimeDonationTx');
vi.mock('../../../src/internal/donations/sendOneTimeDonation');

describe('createDonationsModule', () => {
  let adapter: ReadBlockchainAdapter | WriteBlockchainAdapter;
  let donationsModule: DonationsModule;

  beforeEach(() => {
    vi.clearAllMocks();

    adapter = {} as WriteBlockchainAdapter;

    donationsModule = createDonationsModule({
      adapter,
    });
  });

  describe('prepareOneTimeDonationTx', () => {
    it('should prepare a one-time donation transaction', async () => {
      // Arrange
      const params: SendOneTimeDonationParams = {
        receiver: {
          type: 'address',
          address: '0x1234567890123456789012345678901234567890' as Address,
          amount: 100n,
        },
        amount: 100n,
        erc20: '0xabcdef1234567890abcdef1234567890abcdef12' as Hex,
      };
      const expectedPreparedTx: PreparedTx = {
        to: '0x1234567890123456789012345678901234567890' as Address,
        data: '0x123' as Hex,
        value: 0n,
      };
      vi.mocked(prepareOneTimeDonationTx).mockResolvedValue(expectedPreparedTx);

      // Act
      const result = await donationsModule.prepareOneTimeDonationTx(params);

      // Assert
      expect(result).toBe(expectedPreparedTx);
      expect(prepareOneTimeDonationTx).toHaveBeenCalledWith(adapter, params);
    });

    it('should handle project receiver type', async () => {
      // Arrange
      const params: SendOneTimeDonationParams = {
        receiver: {
          type: 'project',
          url: 'https://github.com/user/repo',
          amount: 200n,
        },
        amount: 200n,
        erc20: '0xabcdef1234567890abcdef1234567890abcdef12' as Hex,
      };
      const expectedPreparedTx: PreparedTx = {
        to: '0x1234567890123456789012345678901234567890' as Address,
        data: '0x456' as Hex,
        value: 0n,
      };
      vi.mocked(prepareOneTimeDonationTx).mockResolvedValue(expectedPreparedTx);

      // Act
      const result = await donationsModule.prepareOneTimeDonationTx(params);

      // Assert
      expect(result).toBe(expectedPreparedTx);
      expect(prepareOneTimeDonationTx).toHaveBeenCalledWith(adapter, params);
    });

    it('should handle drip-list receiver type', async () => {
      // Arrange
      const params: SendOneTimeDonationParams = {
        receiver: {
          type: 'drip-list',
          accountId: 123n,
          amount: 300n,
        },
        amount: 300n,
        erc20: '0xabcdef1234567890abcdef1234567890abcdef12' as Hex,
      };
      const expectedPreparedTx: PreparedTx = {
        to: '0x1234567890123456789012345678901234567890' as Address,
        data: '0x789' as Hex,
        value: 0n,
      };
      vi.mocked(prepareOneTimeDonationTx).mockResolvedValue(expectedPreparedTx);

      // Act
      const result = await donationsModule.prepareOneTimeDonationTx(params);

      // Assert
      expect(result).toBe(expectedPreparedTx);
      expect(prepareOneTimeDonationTx).toHaveBeenCalledWith(adapter, params);
    });

    it('should handle ecosystem-main-account receiver type', async () => {
      // Arrange
      const params: SendOneTimeDonationParams = {
        receiver: {
          type: 'ecosystem-main-account',
          accountId: 456n,
          amount: 400n,
        },
        amount: 400n,
        erc20: '0xabcdef1234567890abcdef1234567890abcdef12' as Hex,
      };
      const expectedPreparedTx: PreparedTx = {
        to: '0x1234567890123456789012345678901234567890' as Address,
        data: '0xabc' as Hex,
        value: 0n,
      };
      vi.mocked(prepareOneTimeDonationTx).mockResolvedValue(expectedPreparedTx);

      // Act
      const result = await donationsModule.prepareOneTimeDonationTx(params);

      // Assert
      expect(result).toBe(expectedPreparedTx);
      expect(prepareOneTimeDonationTx).toHaveBeenCalledWith(adapter, params);
    });

    it('should handle sub-list receiver type', async () => {
      // Arrange
      const params: SendOneTimeDonationParams = {
        receiver: {
          type: 'sub-list',
          accountId: 789n,
          amount: 500n,
        },
        amount: 500n,
        erc20: '0xabcdef1234567890abcdef1234567890abcdef12' as Hex,
      };
      const expectedPreparedTx: PreparedTx = {
        to: '0x1234567890123456789012345678901234567890' as Address,
        data: '0xdef' as Hex,
        value: 0n,
      };
      vi.mocked(prepareOneTimeDonationTx).mockResolvedValue(expectedPreparedTx);

      // Act
      const result = await donationsModule.prepareOneTimeDonationTx(params);

      // Assert
      expect(result).toBe(expectedPreparedTx);
      expect(prepareOneTimeDonationTx).toHaveBeenCalledWith(adapter, params);
    });
  });

  describe('sendOneTime', () => {
    it('should send a one-time donation', async () => {
      // Arrange
      const params: SendOneTimeDonationParams = {
        receiver: {
          type: 'address',
          address: '0x1234567890123456789012345678901234567890' as Address,
          amount: 100n,
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
      const params: SendOneTimeDonationParams = {
        receiver: {
          type: 'project',
          url: 'https://github.com/user/repo',
          amount: 200n,
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
      const params: SendOneTimeDonationParams = {
        receiver: {
          type: 'drip-list',
          accountId: 123n,
          amount: 300n,
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

  describe('module creation', () => {
    it('should create a donations module with the correct interface', () => {
      // Act
      const module = createDonationsModule({adapter});

      // Assert
      expect(module).toHaveProperty('prepareOneTimeDonationTx');
      expect(module).toHaveProperty('sendOneTime');
      expect(typeof module.prepareOneTimeDonationTx).toBe('function');
      expect(typeof module.sendOneTime).toBe('function');
    });

    it('should work with ReadBlockchainAdapter', () => {
      // Arrange
      const readAdapter = {} as ReadBlockchainAdapter;

      // Act
      const module = createDonationsModule({adapter: readAdapter});

      // Assert
      expect(module).toHaveProperty('prepareOneTimeDonationTx');
      expect(module).toHaveProperty('sendOneTime');
    });

    it('should work with WriteBlockchainAdapter', () => {
      // Arrange
      const writeAdapter = {} as WriteBlockchainAdapter;

      // Act
      const module = createDonationsModule({adapter: writeAdapter});

      // Assert
      expect(module).toHaveProperty('prepareOneTimeDonationTx');
      expect(module).toHaveProperty('sendOneTime');
    });
  });
});
