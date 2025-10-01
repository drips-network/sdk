import {describe, vi, beforeEach, it, expect} from 'vitest';
import {parseUnits} from 'viem';
import {
  PreparedTx,
  WriteBlockchainAdapter,
} from '../../../src/internal/blockchain/BlockchainAdapter';
import {
  resolveDeadlineAccount,
  resolveReceiverAccountId,
} from '../../../src/internal/shared/receiverUtils';
import {
  OneTimeDonation,
  prepareOneTimeDonation,
} from '../../../src/internal/donations/prepareOneTimeDonation';
import {contractsRegistry} from '../../../src';
import {buildTx} from '../../../src/internal/shared/buildTx';
import {addressDriverAbi} from '../../../src/internal/abis/addressDriverAbi';
import {generateRandomAddress, generateRandomBigInt} from '../../testUtils';
import {DripsError} from '../../../src/internal/shared/DripsError';

vi.mock('../../../src/internal/shared/receiverUtils');
vi.mock('../../../src/internal/shared/buildTx');

describe('prepareOneTimeDonation', () => {
  let mockWriteAdapter: WriteBlockchainAdapter;

  const mockChainId = 1;
  const mockErc20 = generateRandomAddress();
  const mockSignerAddress = generateRandomAddress();
  const mockReceiverAccountId = generateRandomBigInt();

  beforeEach(() => {
    vi.resetAllMocks();

    mockWriteAdapter = {
      getChainId: vi.fn().mockResolvedValue(mockChainId),
      getAddress: vi.fn().mockResolvedValue(mockSignerAddress),
    } as unknown as WriteBlockchainAdapter;

    vi.mocked(buildTx).mockReturnValue({
      to: mockSignerAddress,
      data: '0x',
      value: 0n,
      abiFunctionName: 'give',
    } as PreparedTx);

    vi.mocked(resolveReceiverAccountId).mockResolvedValue(
      mockReceiverAccountId,
    );
    vi.mocked(resolveDeadlineAccount).mockResolvedValue({
      deadlineAccountId: mockReceiverAccountId,
      repoAccountId: generateRandomBigInt(),
      refundAccountId: generateRandomBigInt(),
      deadlineSeconds: 0,
      source: {
        forge: 'github',
        ownerName: 'owner',
        repoName: 'repo',
        url: 'https://github.com/owner/repo',
      },
    } as any);
  });

  it('should build the expected give transaction', async () => {
    // Arrange
    const donation: OneTimeDonation = {
      erc20: mockErc20,
      amount: '10',
      tokenDecimals: 18,
      receiver: {
        type: 'address',
        address: generateRandomAddress(),
      },
      batchedTxOverrides: {gasLimit: 100000n},
    };

    // Act
    await prepareOneTimeDonation(mockWriteAdapter, donation);

    // Assert
    expect(buildTx).toHaveBeenCalledWith({
      abi: addressDriverAbi,
      functionName: 'give',
      contract: contractsRegistry[mockChainId].addressDriver.address,
      args: [
        mockReceiverAccountId,
        mockErc20,
        parseUnits(donation.amount, donation.tokenDecimals),
      ],
      batchedTxOverrides: donation.batchedTxOverrides,
    });

    expect(resolveReceiverAccountId).toHaveBeenCalledWith(
      mockWriteAdapter,
      donation.receiver,
    );
  });

  it('should throw error for unsupported chain', async () => {
    // Arrange
    const unsupportedChainId = 999999;
    const mockWriteAdapterUnsupported = {
      getChainId: vi.fn().mockResolvedValue(unsupportedChainId),
      getAddress: vi.fn().mockResolvedValue(mockSignerAddress),
    } as unknown as WriteBlockchainAdapter;

    const donation: OneTimeDonation = {
      erc20: mockErc20,
      amount: '1',
      tokenDecimals: 18,
      receiver: {
        type: 'address',
        address: generateRandomAddress(),
      },
    };

    // Act & Assert
    await expect(
      prepareOneTimeDonation(mockWriteAdapterUnsupported, donation),
    ).rejects.toThrow();
  });

  it('should return correct PreparedTx structure', async () => {
    // Arrange
    const donation: OneTimeDonation = {
      erc20: mockErc20,
      amount: '25',
      tokenDecimals: 18,
      receiver: {
        type: 'address',
        address: generateRandomAddress(),
      },
    };

    const mockPreparedTx = {
      to: mockSignerAddress,
      data: '0x123abc',
      value: 100n,
      abiFunctionName: 'give',
    } as PreparedTx;
    vi.mocked(buildTx).mockReturnValue(mockPreparedTx);

    // Act
    const result = await prepareOneTimeDonation(mockWriteAdapter, donation);

    // Assert
    expect(result).toBe(mockPreparedTx);
  });

  it('should handle project receiver with deadline config', async () => {
    // Arrange
    const mockDeadlineAccountId = generateRandomBigInt();
    const mockRefundAddress = generateRandomAddress();
    const mockDeadline = new Date(Date.now() + 86400000);

    vi.mocked(resolveDeadlineAccount).mockResolvedValue({
      deadlineAccountId: mockDeadlineAccountId,
      repoAccountId: generateRandomBigInt(),
      refundAccountId: generateRandomBigInt(),
      deadlineSeconds: 123,
      source: {
        forge: 'github',
        ownerName: 'owner',
        repoName: 'repo',
        url: 'https://github.com/owner/repo',
      },
    } as any);

    const donation: OneTimeDonation = {
      erc20: mockErc20,
      amount: '10',
      tokenDecimals: 18,
      receiver: {
        type: 'project',
        url: 'https://github.com/owner/repo',
      },
      deadlineConfig: {
        deadline: mockDeadline,
        refundAddress: mockRefundAddress,
      },
    };

    // Act
    await prepareOneTimeDonation(mockWriteAdapter, donation);

    // Assert
    expect(resolveDeadlineAccount).toHaveBeenCalledWith(
      mockWriteAdapter,
      donation.receiver,
      donation.deadlineConfig,
    );
    expect(buildTx).toHaveBeenCalledWith({
      abi: addressDriverAbi,
      functionName: 'give',
      contract: contractsRegistry[mockChainId].addressDriver.address,
      args: [
        mockDeadlineAccountId,
        mockErc20,
        parseUnits(donation.amount, donation.tokenDecimals),
      ],
      batchedTxOverrides: undefined,
    });
    expect(resolveReceiverAccountId).not.toHaveBeenCalled();
  });

  it('should throw error for non-project receiver with deadline config', async () => {
    // Arrange
    const mockRefundAddress = generateRandomAddress();
    const mockDeadline = new Date(Date.now() + 86400000);

    const donation: OneTimeDonation = {
      erc20: mockErc20,
      amount: '10',
      tokenDecimals: 18,
      receiver: {
        type: 'address',
        address: generateRandomAddress(),
      },
      deadlineConfig: {
        deadline: mockDeadline,
        refundAddress: mockRefundAddress,
      },
    };

    // Act & Assert
    await expect(
      prepareOneTimeDonation(mockWriteAdapter, donation),
    ).rejects.toThrow(DripsError);
    await expect(
      prepareOneTimeDonation(mockWriteAdapter, donation),
    ).rejects.toThrow('Deadline donations only support project receivers');
    expect(resolveDeadlineAccount).not.toHaveBeenCalled();
  });

  it('should throw error when deadline is in the past', async () => {
    // Arrange
    const mockRefundAddress = generateRandomAddress();
    const pastDeadline = new Date(Date.now() - 10000);

    const donation: OneTimeDonation = {
      erc20: mockErc20,
      amount: '10',
      tokenDecimals: 18,
      receiver: {
        type: 'project',
        url: 'https://github.com/owner/repo',
      },
      deadlineConfig: {
        deadline: pastDeadline,
        refundAddress: mockRefundAddress,
      },
    };

    // Act & Assert
    await expect(
      prepareOneTimeDonation(mockWriteAdapter, donation),
    ).rejects.toThrow(DripsError);
    await expect(
      prepareOneTimeDonation(mockWriteAdapter, donation),
    ).rejects.toThrow('Deadline must be in the future');
    expect(resolveDeadlineAccount).not.toHaveBeenCalled();
  });
});
