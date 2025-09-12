import {describe, it, expect, vi, beforeEach} from 'vitest';
import {claimOrcid} from '../../../src/internal/linked-identities/claimOrcid';
import {prepareClaimOrcid} from '../../../src/internal/linked-identities/prepareClaimOrcid';
import {
  type WriteBlockchainAdapter,
  type TxResponse,
} from '../../../src/internal/blockchain/BlockchainAdapter';

vi.mock('../../../src/internal/linked-identities/prepareClaimOrcid');

describe('claimOrcid', () => {
  let mockAdapter: WriteBlockchainAdapter;

  const mockPreparedTx = {
    to: '0xCaller000000000000000000000000000000000000' as `0x${string}`,
    data: '0xdeadbeef' as `0x${string}`,
  } as const;

  const mockTxResponse: TxResponse = {
    hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    wait: vi.fn().mockResolvedValue({
      hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      to: '0xRecipient000000000000000000000000000000000000' as `0x${string}`,
      from: '0xSender000000000000000000000000000000000000' as `0x${string}`,
      blockNumber: 1n,
      gasUsed: 21000n,
      status: 'success' as const,
      logs: [],
    }),
    meta: {module: 'linkedIdentities'},
  };

  const params = {orcidId: '0000-0002-1825-0097'} as const;

  beforeEach((): void => {
    mockAdapter = {
      getChainId: vi.fn(),
      getAddress: vi.fn(),
      sendTx: vi.fn().mockResolvedValue(mockTxResponse),
      call: vi.fn(),
      signMsg: vi.fn(),
    } as unknown as WriteBlockchainAdapter;

    vi.mocked(prepareClaimOrcid).mockResolvedValue(
      mockPreparedTx as unknown as any,
    );

    vi.clearAllMocks();
  });

  it('calls prepareClaimOrcid and sends prepared tx', async () => {
    // Act
    const result = await claimOrcid(mockAdapter, params);

    // Assert
    expect(prepareClaimOrcid).toHaveBeenCalledWith(mockAdapter, params);
    expect(mockAdapter.sendTx).toHaveBeenCalledWith(mockPreparedTx);
    expect(result).toBe(mockTxResponse);
  });

  it('passes through batchedTxOverrides when present', async () => {
    // Arrange
    const withOverrides = {
      ...params,
      batchedTxOverrides: {gasLimit: 100000n, maxFeePerGas: 1_000_000_000n},
    } as const;

    // Act
    await claimOrcid(mockAdapter, withOverrides);

    // Assert
    expect(prepareClaimOrcid).toHaveBeenCalledWith(mockAdapter, withOverrides);
    expect(mockAdapter.sendTx).toHaveBeenCalledWith(mockPreparedTx);
  });

  it('invokes functions in the correct order', async () => {
    // Arrange
    const order: string[] = [];

    vi.mocked(prepareClaimOrcid).mockImplementationOnce(async () => {
      order.push('prepareClaimOrcid');
      return mockPreparedTx as unknown as any;
    });

    (
      mockAdapter.sendTx as unknown as ReturnType<typeof vi.fn>
    ).mockImplementationOnce(async () => {
      order.push('sendTx');
      return mockTxResponse;
    });

    // Act
    await claimOrcid(mockAdapter, params);

    // Assert
    expect(order).toEqual(['prepareClaimOrcid', 'sendTx']);
  });
});
