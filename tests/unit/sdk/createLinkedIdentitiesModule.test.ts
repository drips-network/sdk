import {vi, describe, it, expect, beforeEach} from 'vitest';
import {
  LinkedIdentitiesModule,
  createLinkedIdentitiesModule,
} from '../../../src/sdk/createLinkedIdentitiesModule';
import {
  ReadBlockchainAdapter,
  WriteBlockchainAdapter,
} from '../../../src/internal/blockchain/BlockchainAdapter';
import {prepareClaimOrcid as _prepareClaimOrcid} from '../../../src/internal/linked-identities/prepareClaimOrcid';
import {claimOrcid as _claimOrcid} from '../../../src/internal/linked-identities/claimOrcid';
import {requireWriteAccess} from '../../../src/internal/shared/assertions';

vi.mock('../../../src/internal/linked-identities/prepareClaimOrcid');
vi.mock('../../../src/internal/linked-identities/claimOrcid');
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

  it('should prepare claim ORCID', async () => {
    // Arrange
    const params = {orcidId: '0000-0001-2345-6789'} as any;
    const expectedPreparedTx = {to: '0xcontract', data: '0xdata'} as any;
    vi.mocked(_prepareClaimOrcid).mockResolvedValue(expectedPreparedTx);

    // Act
    const result = await linkedIdentitiesModule.prepareClaimOrcid(params);

    // Assert
    expect(result).toBe(expectedPreparedTx);
    expect(_prepareClaimOrcid).toHaveBeenCalledWith(adapter, params);
  });

  it('should claim ORCID', async () => {
    // Arrange
    const params = {orcidId: '0000-0001-2345-6789'} as any;
    const expectedTxResponse = {hash: '0xhash'} as any;
    vi.mocked(_claimOrcid).mockResolvedValue(expectedTxResponse);

    // Act
    const result = await linkedIdentitiesModule.claimOrcid(params);

    // Assert
    expect(result).toBe(expectedTxResponse);
    expect(_claimOrcid).toHaveBeenCalledWith(adapter, params);
  });

  describe('prepareClaimOrcid method validation', () => {
    it('should call requireWriteAccess with correct parameters', async () => {
      // Arrange
      const params = {orcidId: '0000-0001-2345-6789'} as any;
      vi.mocked(_prepareClaimOrcid).mockResolvedValue({} as any);

      // Act
      await linkedIdentitiesModule.prepareClaimOrcid(params);

      // Assert
      expect(requireWriteAccess).toHaveBeenCalledWith(
        adapter,
        'prepareClaimOrcid',
      );
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
      const expectedPreparedTx = {to: '0xcontract', data: '0xdata'} as any;
      vi.mocked(_prepareClaimOrcid).mockResolvedValue(expectedPreparedTx);
      vi.mocked(requireWriteAccess).mockImplementation(() => {
        // Mock passes validation.
      });

      // Act
      const result = await moduleWithReadAdapter.prepareClaimOrcid(params);

      // Assert
      expect(result).toBe(expectedPreparedTx);
      expect(requireWriteAccess).toHaveBeenCalledWith(
        readAdapter,
        'prepareClaimOrcid',
      );
    });
  });

  describe('claimOrcid method validation', () => {
    it('should call requireWriteAccess with correct parameters', async () => {
      // Arrange
      const params = {orcidId: '0000-0001-2345-6789'} as any;
      vi.mocked(_claimOrcid).mockResolvedValue({} as any);

      // Act
      await linkedIdentitiesModule.claimOrcid(params);

      // Assert
      expect(requireWriteAccess).toHaveBeenCalledWith(
        adapter,
        'claimOrcid',
      );
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
      const expectedTxResponse = {hash: '0xhash'} as any;
      vi.mocked(_claimOrcid).mockResolvedValue(expectedTxResponse);
      vi.mocked(requireWriteAccess).mockImplementation(() => {
        // Mock passes validation.
      });

      // Act
      const result = await moduleWithReadAdapter.claimOrcid(params);

      // Assert
      expect(result).toBe(expectedTxResponse);
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
      expect(module).toHaveProperty('prepareClaimOrcid');
      expect(module).toHaveProperty('claimOrcid');
    });
  });
});

