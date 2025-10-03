import {vi, describe, it, expect, beforeEach} from 'vitest';
import {
  LinkedIdentitiesModule,
  createLinkedIdentitiesModule,
} from '../../../src/sdk/createLinkedIdentitiesModule';
import {
  ReadBlockchainAdapter,
  WriteBlockchainAdapter,
} from '../../../src/internal/blockchain/BlockchainAdapter';
import {claimOrcid as _claimOrcid} from '../../../src/internal/linked-identities/claimOrcid';
import {waitForOrcidOwnership as _waitForOrcidOwnership} from '../../../src/internal/linked-identities/waitForOrcidOwnership';
import {requireWriteAccess} from '../../../src/internal/shared/assertions';

vi.mock('../../../src/internal/linked-identities/claimOrcid');
vi.mock('../../../src/internal/linked-identities/waitForOrcidOwnership');
vi.mock('../../../src/internal/shared/assertions');

describe('createLinkedIdentitiesModule', () => {
  let adapter: WriteBlockchainAdapter;
  let linkedIdentitiesModule: LinkedIdentitiesModule;

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up default mock implementations that don't throw
    vi.mocked(requireWriteAccess).mockImplementation(() => {
      // Default implementation does nothing (successful case).
    });

    adapter = {
      sendTx: vi.fn(),
      getAddress: vi.fn(),
      signMsg: vi.fn(),
      call: vi.fn(),
      getChainId: vi.fn(),
    } as WriteBlockchainAdapter;

    linkedIdentitiesModule = createLinkedIdentitiesModule({
      adapter,
    });
  });

  it('should claim ORCID', async () => {
    // Arrange
    const params = {orcidId: '0000-0001-2345-6789'} as any;
    const expectedResult = {
      orcidAccountId: 123n,
      txHashes: ['0xhash1', '0xhash2'],
    } as any;
    vi.mocked(_claimOrcid).mockResolvedValue(expectedResult);

    // Act
    const result = await linkedIdentitiesModule.claimOrcid(params);

    // Assert
    expect(result).toBe(expectedResult);
    expect(_claimOrcid).toHaveBeenCalledWith(adapter, params);
  });

  it('should wait for ownership', async () => {
    // Arrange
    const params = {orcidId: '0000-0001-2345-6789'} as any;
    vi.mocked(_waitForOrcidOwnership).mockResolvedValue(undefined);

    // Act
    await linkedIdentitiesModule.waitForOrcidOwnership(params);

    // Assert
    expect(_waitForOrcidOwnership).toHaveBeenCalledWith(adapter, params);
  });

  describe('claimOrcid method validation', () => {
    it('should call requireWriteAccess with correct parameters', async () => {
      // Arrange
      const params = {orcidId: '0000-0001-2345-6789'} as any;
      vi.mocked(_claimOrcid).mockResolvedValue({} as any);

      // Act
      await linkedIdentitiesModule.claimOrcid(params);

      // Assert
      expect(requireWriteAccess).toHaveBeenCalledWith(adapter, 'claimOrcid');
    });

    it('should work with ReadBlockchainAdapter when requireWriteAccess is mocked to pass', async () => {
      // Arrange
      const readAdapter = {
        call: vi.fn(),
        getChainId: vi.fn(),
      } as ReadBlockchainAdapter;
      const moduleWithReadAdapter = createLinkedIdentitiesModule({
        adapter: readAdapter,
      });
      const params = {orcidId: '0000-0001-2345-6789'} as any;
      const expectedResult = {
        orcidAccountId: 123n,
        txHashes: ['0xhash1'],
      } as any;
      vi.mocked(_claimOrcid).mockResolvedValue(expectedResult);
      vi.mocked(requireWriteAccess).mockImplementation(() => {
        // Mock passes validation.
      });

      // Act
      const result = await moduleWithReadAdapter.claimOrcid(params);

      // Assert
      expect(result).toBe(expectedResult);
      expect(requireWriteAccess).toHaveBeenCalledWith(
        readAdapter,
        'claimOrcid',
      );
    });
  });

  describe('module creation validation', () => {
    it('should work with WriteBlockchainAdapter', () => {
      // Arrange
      const writeAdapter = {
        sendTx: vi.fn(),
        getAddress: vi.fn(),
        signMsg: vi.fn(),
        call: vi.fn(),
        getChainId: vi.fn(),
      } as WriteBlockchainAdapter;

      // Act
      const module = createLinkedIdentitiesModule({
        adapter: writeAdapter,
      });

      // Assert
      expect(module).toHaveProperty('claimOrcid');
      expect(module).toHaveProperty('waitForOrcidOwnership');
    });
  });
});
