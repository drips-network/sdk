import {describe, it, expect, vi, beforeEach} from 'vitest';
import {prepareClaimOrcid} from '../../../src/internal/linked-identities/prepareClaimOrcid';
import type {WriteBlockchainAdapter} from '../../../src/internal/blockchain/BlockchainAdapter';

vi.mock('../../../src/internal/shared/assertions', () => ({
  requireSupportedChain: vi.fn(),
}));

vi.mock('../../../src/internal/linked-identities/orcidUtils', () => ({
  assertValidOrcidId: vi.fn(),
  normalizeOrcidForContract: vi.fn(id => id),
}));

vi.mock('../../../src/internal/projects/calcProjectId', () => ({
  calcOrcidAccountId: vi.fn(),
}));

vi.mock('../../../src/internal/shared/calcAddressId', () => ({
  calcAddressId: vi.fn(),
}));

vi.mock('../../../src/internal/config/contractsRegistry', () => ({
  contractsRegistry: {
    1: {
      repoDriver: {address: '0xRepoDriver1'},
    },
  },
}));

import {calcOrcidAccountId} from '../../../src/internal/projects/calcProjectId';
import {calcAddressId} from '../../../src/internal/shared/calcAddressId';

describe('prepareClaimOrcid', () => {
  let mockAdapter: WriteBlockchainAdapter;

  const chainId = 1;
  const claimerAddress =
    '0xClaimer0000000000000000000000000000000001' as `0x${string}`;
  const orcidId = '0000-0002-1825-0097';
  const orcidAccountId = 12345n;
  const addressAccountId = 67890n;

  beforeEach(async (): Promise<void> => {
    vi.clearAllMocks();

    mockAdapter = {
      getChainId: vi.fn().mockResolvedValue(chainId),
      getAddress: vi.fn().mockResolvedValue(claimerAddress),
      sendTx: vi.fn(),
      call: vi.fn(),
      signMsg: vi.fn(),
    } as unknown as WriteBlockchainAdapter;

    vi.mocked(calcOrcidAccountId).mockResolvedValue(orcidAccountId);
    vi.mocked(calcAddressId).mockResolvedValue(addressAccountId);

    const {assertValidOrcidId} = await import(
      '../../../src/internal/linked-identities/orcidUtils'
    );
    vi.mocked(assertValidOrcidId).mockImplementation(() => {});
  });

  it('prepares claim and setSplits transactions', async () => {
    // Act
    const result = await prepareClaimOrcid(mockAdapter, {orcidId});

    // Assert
    expect(result.orcidAccountId).toBe(orcidAccountId);
    expect(result.claimTx).toBeDefined();
    expect(result.claimTx.to).toBe('0xRepoDriver1');
    expect(result.claimTx.abiFunctionName).toBe('requestUpdateOwner');
    expect(result.setSplitsTx).toBeDefined();
    expect(result.setSplitsTx.to).toBe('0xRepoDriver1');
    expect(result.setSplitsTx.abiFunctionName).toBe('setSplits');
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
      prepareClaimOrcid(mockAdapter, {orcidId: 'invalid-orcid'}),
    ).rejects.toThrow('Invalid ORCID format');
  });

  it('calls calcOrcidAccountId and calcAddressId with adapter address', async () => {
    // Act
    await prepareClaimOrcid(mockAdapter, {orcidId});

    // Assert
    expect(mockAdapter.getAddress).toHaveBeenCalled();
    expect(calcOrcidAccountId).toHaveBeenCalledWith(mockAdapter, orcidId);
    expect(calcAddressId).toHaveBeenCalledWith(mockAdapter, claimerAddress);
  });
});
