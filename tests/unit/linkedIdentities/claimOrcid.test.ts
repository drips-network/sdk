import {describe, it, expect, vi, beforeEach} from 'vitest';
import {claimOrcid} from '../../../src/internal/linked-identities/claimOrcid';
import type {
  WriteBlockchainAdapter,
  TxResponse,
} from '../../../src/internal/blockchain/BlockchainAdapter';

vi.mock('../../../src/internal/shared/assertions', () => ({
  requireSupportedChain: vi.fn(),
}));

vi.mock('../../../src/internal/linked-identities/orcidUtils', () => ({
  assertValidOrcidId: vi.fn(),
  normalizeOrcidForContract: vi.fn(id => id),
  calcOrcidAccountId: vi.fn(),
}));

vi.mock('../../../src/internal/shared/calcAddressId', () => ({
  calcAddressId: vi.fn(),
}));

vi.mock(
  '../../../src/internal/linked-identities/waitForOrcidOwnership',
  () => ({
    waitForOrcidOwnership: vi.fn(),
  }),
);

vi.mock('../../../src/internal/config/contractsRegistry', () => ({
  contractsRegistry: {
    1: {
      repoDriver: {address: '0xRepoDriver1'},
    },
  },
}));

import {waitForOrcidOwnership} from '../../../src/internal/linked-identities/waitForOrcidOwnership';
import {calcAddressId} from '../../../src/internal/shared/calcAddressId';
import {calcOrcidAccountId} from '../../../src/internal/linked-identities/orcidUtils';

describe('claimOrcid', () => {
  let mockAdapter: WriteBlockchainAdapter;

  const chainId = 1;
  const signerAddress =
    '0xSigner000000000000000000000000000000000001' as `0x${string}`;
  const orcidId = '0000-0002-1825-0097';
  const orcidAccountId = 12345n;
  const addressAccountId = 67890n;

  const mockTxResponse: TxResponse = {
    hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    wait: vi.fn().mockResolvedValue({
      hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      to: '0xRecipient000000000000000000000000000000000000' as `0x${string}`,
      from: signerAddress,
      blockNumber: 1n,
      gasUsed: 21000n,
      status: 'success' as const,
      logs: [],
    }),
    meta: {module: 'linkedIdentities'},
  };

  beforeEach((): void => {
    vi.clearAllMocks();

    mockAdapter = {
      getChainId: vi.fn().mockResolvedValue(chainId),
      getAddress: vi.fn().mockResolvedValue(signerAddress),
      sendTx: vi.fn().mockResolvedValue(mockTxResponse),
      call: vi.fn(),
      signMsg: vi.fn(),
    } as unknown as WriteBlockchainAdapter;

    vi.mocked(calcOrcidAccountId).mockResolvedValue(orcidAccountId);
    vi.mocked(calcAddressId).mockResolvedValue(addressAccountId);
    vi.mocked(waitForOrcidOwnership).mockResolvedValue(undefined);
  });

  it('claims ORCID and configures splits with 100% to claimer', async () => {
    // Act
    const result = await claimOrcid(mockAdapter, {orcidId});

    // Assert
    expect(mockAdapter.sendTx).toHaveBeenCalledTimes(2); // claim + setSplits
    expect(waitForOrcidOwnership).toHaveBeenCalledWith(
      mockAdapter,
      expect.objectContaining({
        orcidId,
        expectedOwner: signerAddress,
        onProgress: expect.any(Function),
      }),
    );
    expect(result.orcidAccountId).toBe(orcidAccountId);
    expect(result.status).toBe('complete');
    expect(result.claim.success).toBe(true);
    expect(result.ownership.success).toBe(true);
    expect(result.splits.success).toBe(true);
    if (result.claim.success) {
      expect(result.claim.data.mined).toBe(true);
    }
    if (result.splits.success) {
      expect(result.splits.data.mined).toBe(true);
    }
  });

  it('invokes progress callback at each step with typed events', async () => {
    // Arrange
    const onProgress = vi.fn();

    // Mock waitForOrcidOwnership to call its onProgress callback
    vi.mocked(waitForOrcidOwnership).mockImplementation(
      async (_adapter, params) => {
        if (params.onProgress) {
          await params.onProgress(1000); // Simulate 1000ms elapsed
        }
      },
    );

    // Act
    await claimOrcid(mockAdapter, {orcidId, onProgress});

    // Assert
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({step: 'claiming'}),
    );
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({step: 'waiting', elapsedMs: 1000}),
    );
    expect(onProgress).toHaveBeenCalledWith({
      step: 'configuring',
      orcidAccountId,
    });
  });

  it('passes wait options to waitForOrcidOwnership with wrapped callback', async () => {
    // Arrange
    const waitOptions = {
      pollIntervalMs: 5000,
      timeoutMs: 60000,
      onProgress: vi.fn(),
    };

    // Act
    await claimOrcid(mockAdapter, {orcidId, waitOptions});

    // Assert
    expect(waitForOrcidOwnership).toHaveBeenCalledWith(
      mockAdapter,
      expect.objectContaining({
        orcidId,
        expectedOwner: signerAddress,
        pollIntervalMs: 5000,
        timeoutMs: 60000,
        onProgress: expect.any(Function),
      }),
    );
  });

  it('returns failed status when claim transaction fails', async () => {
    // Arrange
    const claimError = new Error('Transaction failed');
    mockAdapter.sendTx = vi.fn().mockRejectedValueOnce(claimError);

    // Act
    const result = await claimOrcid(mockAdapter, {orcidId});

    // Assert
    expect(result.status).toBe('failed');
    expect(result.claim.success).toBe(false);
    expect(result.ownership.success).toBe(false);
    expect(result.splits.success).toBe(false);
    if (!result.claim.success) {
      expect(result.claim.error).toBe(claimError);
    }
  });

  it('returns partial status when ownership verification fails', async () => {
    // Arrange
    const ownershipError = new Error('Ownership timeout');
    vi.mocked(waitForOrcidOwnership).mockRejectedValueOnce(ownershipError);

    // Act
    const result = await claimOrcid(mockAdapter, {orcidId});

    // Assert
    expect(result.status).toBe('partial');
    expect(result.claim.success).toBe(true);
    expect(result.ownership.success).toBe(false);
    expect(result.splits.success).toBe(false);
    if (!result.ownership.success) {
      expect(result.ownership.error).toBe(ownershipError);
    }
  });

  it('returns partial status when splits configuration fails', async () => {
    // Arrange
    const splitsError = new Error('SetSplits failed');
    mockAdapter.sendTx = vi
      .fn()
      .mockResolvedValueOnce(mockTxResponse) // claim succeeds
      .mockRejectedValueOnce(splitsError); // setSplits fails

    // Act
    const result = await claimOrcid(mockAdapter, {orcidId});

    // Assert
    expect(result.status).toBe('partial');
    expect(result.claim.success).toBe(true);
    expect(result.ownership.success).toBe(true);
    expect(result.splits.success).toBe(false);
    if (!result.splits.success) {
      expect(result.splits.error).toBe(splitsError);
    }
  });

  it('captures mined=false when transaction reverts', async () => {
    // Arrange
    const revertedTxResponse = {
      ...mockTxResponse,
      wait: vi.fn().mockResolvedValue({
        hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        to: '0xRecipient000000000000000000000000000000000000' as `0x${string}`,
        from: signerAddress,
        blockNumber: 1n,
        gasUsed: 21000n,
        status: 'reverted' as const,
        logs: [],
      }),
    };
    mockAdapter.sendTx = vi.fn().mockResolvedValue(revertedTxResponse);

    // Act
    const result = await claimOrcid(mockAdapter, {orcidId});

    // Assert
    expect(result.status).toBe('complete');
    expect(result.claim.success).toBe(true);
    if (result.claim.success) {
      expect(result.claim.data.mined).toBe(false);
    }
  });

  it('returns failed result when progress callback throws', async () => {
    // Arrange
    const callbackError = new Error('Progress callback error');
    const onProgress = vi.fn().mockImplementation(() => {
      throw callbackError;
    });

    // Act
    const result = await claimOrcid(mockAdapter, {orcidId, onProgress});

    // Assert
    expect(result.status).toBe('failed');
    expect(result.claim.success).toBe(false);
    if (!result.claim.success) {
      expect(result.claim.error).toBe(callbackError);
    }
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({step: 'claiming'}),
    );
  });

  it('returns failed result when async progress callback rejects', async () => {
    // Arrange
    const callbackError = new Error('Async progress callback error');
    const onProgress = vi.fn().mockRejectedValue(callbackError);

    // Act
    const result = await claimOrcid(mockAdapter, {orcidId, onProgress});

    // Assert
    expect(result.status).toBe('failed');
    expect(result.claim.success).toBe(false);
    if (!result.claim.success) {
      expect(result.claim.error).toBe(callbackError);
    }
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({step: 'claiming'}),
    );
  });

  it('throws error for invalid ORCID format', async () => {
    // Arrange
    const {assertValidOrcidId} = await import(
      '../../../src/internal/linked-identities/orcidUtils'
    );
    vi.mocked(assertValidOrcidId).mockImplementation(() => {
      throw new Error('Invalid ORCID format');
    });

    // Act & Assert
    await expect(
      claimOrcid(mockAdapter, {orcidId: 'invalid-orcid'}),
    ).rejects.toThrow('Invalid ORCID format');
  });
});
