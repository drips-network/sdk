import {describe, it, expect, vi, beforeEach} from 'vitest';
import {toHex} from 'viem';
import {prepareClaimOrcid} from '../../../src/internal/linked-identities/prepareClaimOrcid';
import type {
  WriteBlockchainAdapter,
  PreparedTx,
} from '../../../src/internal/blockchain/BlockchainAdapter';

vi.mock('../../../src/internal/shared/assertions', () => ({
  requireSupportedChain: vi.fn(),
}));

vi.mock('../../../src/internal/shared/buildTx', () => ({
  buildTx: vi.fn(),
}));

vi.mock('../../../src/internal/shared/convertToCallerCall', () => ({
  convertToCallerCall: vi.fn(),
}));

vi.mock('../../../src/internal/linked-identities/orcidUtils', () => ({
  assertValidOrcidId: vi.fn(),
  normalizeOrcidForContract: vi.fn(),
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
      caller: {address: '0xCaller1'},
    },
  },
}));

import {requireSupportedChain} from '../../../src/internal/shared/assertions';
import {buildTx} from '../../../src/internal/shared/buildTx';
import {convertToCallerCall} from '../../../src/internal/shared/convertToCallerCall';
import {
  assertValidOrcidId,
  normalizeOrcidForContract,
} from '../../../src/internal/linked-identities/orcidUtils';
import {calcOrcidAccountId} from '../../../src/internal/projects/calcProjectId';
import {calcAddressId} from '../../../src/internal/shared/calcAddressId';
import {repoDriverAbi} from '../../../src/internal/abis/repoDriverAbi';
import {callerAbi} from '../../../src/internal/abis/callerAbi';

describe('prepareClaimOrcid', () => {
  let adapter: WriteBlockchainAdapter;

  const chainId = 1;
  const signerAddress =
    '0xSigner000000000000000000000000000000000001' as `0x${string}`;
  const orcidId = '0000-0002-1825-0097';
  const normalizedOrcid = '0000-0002-1825-0097';
  const orcidAccountId = 12345n;
  const addressAccountId = 67890n;

  const requestUpdateOwnerTx: PreparedTx = {
    to: '0xRepoDriver1',
    data: '0xreq',
    value: 0n,
    abiFunctionName: 'requestUpdateOwner',
  } as PreparedTx;

  const batchedTx: PreparedTx = {
    to: '0xCaller1',
    data: '0xbatched',
    value: 0n,
    abiFunctionName: 'callBatched',
  } as PreparedTx;

  const callerCall = {to: '0xX', data: '0xY'};

  beforeEach(() => {
    vi.clearAllMocks();

    adapter = {
      getChainId: vi.fn().mockResolvedValue(chainId),
      getAddress: vi.fn().mockResolvedValue(signerAddress),
    } as unknown as WriteBlockchainAdapter;

    // Reset all mocks to their default successful behavior
    vi.mocked(requireSupportedChain).mockImplementation(() => {});
    vi.mocked(assertValidOrcidId).mockImplementation(() => {});
    vi.mocked(normalizeOrcidForContract).mockReturnValue(normalizedOrcid);
    vi.mocked(calcOrcidAccountId).mockResolvedValue(orcidAccountId);
    vi.mocked(calcAddressId).mockResolvedValue(addressAccountId);

    vi.mocked(buildTx)
      .mockReturnValueOnce(requestUpdateOwnerTx)
      .mockReturnValueOnce(batchedTx);

    vi.mocked(convertToCallerCall).mockReturnValue(callerCall as any);
  });

  describe('successful execution', () => {
    it('should prepare ORCID claim successfully', async () => {
      // Act
      const result = await prepareClaimOrcid(adapter, {orcidId});

      // Assert
      expect(adapter.getChainId).toHaveBeenCalled();
      expect(requireSupportedChain).toHaveBeenCalledWith(
        chainId,
        'prepareClaimOrcid',
      );
      expect(assertValidOrcidId).toHaveBeenCalledWith(orcidId);
      expect(normalizeOrcidForContract).toHaveBeenCalledWith(orcidId);

      // convertToCallerCall called for each inner tx
      expect(convertToCallerCall).toHaveBeenCalledTimes(1);

      expect(result).toEqual(batchedTx);
    });
  });

  describe('error handling', () => {
    it('should propagate getChainId errors', async () => {
      // Arrange
      const chainIdError = new Error('Failed to get chain ID');
      vi.mocked(adapter.getChainId).mockRejectedValue(chainIdError as any);

      // Act & Assert
      await expect(prepareClaimOrcid(adapter, {orcidId})).rejects.toThrow(
        chainIdError,
      );
      expect(requireSupportedChain).not.toHaveBeenCalled();
    });

    it('should propagate ORCID validation errors', async () => {
      // Arrange
      const validationError = new Error('Invalid ORCID');
      vi.mocked(assertValidOrcidId).mockImplementation(() => {
        throw validationError;
      });

      // Act & Assert
      await expect(prepareClaimOrcid(adapter, {orcidId})).rejects.toThrow(
        validationError,
      );
    });

    it('should propagate transaction building errors', async () => {
      // Arrange
      const txError = new Error('Failed to build transaction');
      vi.mocked(buildTx).mockReset();
      vi.mocked(buildTx).mockImplementationOnce(() => {
        throw txError;
      });

      // Act & Assert
      await expect(prepareClaimOrcid(adapter, {orcidId})).rejects.toThrow(
        txError,
      );
    });
  });

  describe('transaction structure validation', () => {
    it('should build requestUpdateOwner transaction with correct parameters', async () => {
      // Act
      await prepareClaimOrcid(adapter, {orcidId});

      // Assert
      expect(buildTx).toHaveBeenNthCalledWith(1, {
        abi: repoDriverAbi,
        contract: '0xRepoDriver1',
        functionName: 'requestUpdateOwner',
        args: [2, toHex(normalizedOrcid)],
      });
    });

    it('should build batched transaction with correct parameters', async () => {
      // Act
      await prepareClaimOrcid(adapter, {orcidId});

      // Assert
      expect(buildTx).toHaveBeenNthCalledWith(2, {
        abi: callerAbi,
        contract: '0xCaller1',
        functionName: 'callBatched',
        args: [[callerCall]],
        batchedTxOverrides: undefined,
      });
    });
  });
});
