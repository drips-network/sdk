import {describe, it, expect, vi, beforeEach} from 'vitest';
import {createProjectsModule} from '../../../src/sdk/createProjectsModule';
import type {WriteBlockchainAdapter} from '../../../src/internal/blockchain/BlockchainAdapter';

vi.mock('../../../src/internal/shared/assertions', () => ({
  requireWriteAccess: vi.fn(),
  requireMetadataUploader: vi.fn(),
}));

vi.mock('../../../src/internal/projects/calcProjectId', () => ({
  calcProjectId: vi.fn(),
}));

vi.mock('../../../src/internal/projects/claimProject', () => ({
  claimProject: vi.fn(),
}));

vi.mock('../../../src/internal/projects/prepareClaimProject', () => ({
  prepareClaimProject: vi.fn(),
}));

vi.mock('../../../src/internal/projects/waitForProjectOwnership', () => ({
  waitForProjectOwnership: vi.fn(),
}));

import {calcProjectId} from '../../../src/internal/projects/calcProjectId';

describe('createProjectsModule', () => {
  let mockAdapter: WriteBlockchainAdapter;
  const mockUploader = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAdapter = {
      sendTx: vi.fn(),
    } as unknown as WriteBlockchainAdapter;
  });

  it('exposes calculateId, claim, prepareClaim, and waitForOwnership methods', async () => {
    const module = createProjectsModule({
      adapter: mockAdapter,
      ipfsMetadataUploaderFn: mockUploader,
    });

    expect(typeof module.calculateId).toBe('function');
    expect(typeof module.claim).toBe('function');
    expect(typeof module.prepareClaim).toBe('function');
    expect(typeof module.waitForOwnership).toBe('function');

    vi.mocked(calcProjectId).mockResolvedValue(99999n);
    const id = await module.calculateId('github', 'drips-network/sdk');
    expect(id).toBe(99999n);
    expect(calcProjectId).toHaveBeenCalledWith(mockAdapter, {
      forge: 'github',
      name: 'drips-network/sdk',
    });
  });
});
