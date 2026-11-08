import {describe, it, expect, vi, beforeEach} from 'vitest';
import {claimProject} from '../../../src/internal/projects/claimProject';
import type {WriteBlockchainAdapter} from '../../../src/internal/blockchain/BlockchainAdapter';

vi.mock('../../../src/internal/shared/assertions', () => ({
  requireSupportedChain: vi.fn(),
  requireSupportedForge: vi.fn(),
}));

vi.mock('../../../src/internal/projects/calcProjectId', () => ({
  calcProjectId: vi.fn(),
}));

vi.mock('../../../src/internal/shared/calcAddressId', () => ({
  calcAddressId: vi.fn(),
}));

vi.mock('../../../src/internal/projects/waitForProjectOwnership', () => ({
  waitForProjectOwnership: vi.fn(),
}));

vi.mock('../../../src/internal/config/contractsRegistry', () => ({
  contractsRegistry: {
    1: {
      repoDriver: {address: '0x1111111111111111111111111111111111111111'},
      caller: {address: '0x2222222222222222222222222222222222222222'},
    },
  },
}));

import {calcProjectId} from '../../../src/internal/projects/calcProjectId';
import {calcAddressId} from '../../../src/internal/shared/calcAddressId';
import {waitForProjectOwnership} from '../../../src/internal/projects/waitForProjectOwnership';

describe('claimProject', () => {
  let mockAdapter: WriteBlockchainAdapter;
  const mockUploader = vi.fn();

  const chainId = 1;
  const claimerAddress =
    '0xClaimer0000000000000000000000000000000001' as `0x${string}`;
  const projectUrl = 'https://github.com/drips-network/sdk';
  const projectId = 54321n;
  const maintainerAddress = '0x1111111111111111111111111111111111111111';

  beforeEach(() => {
    vi.clearAllMocks();

    mockAdapter = {
      getChainId: vi.fn().mockResolvedValue(chainId),
      getAddress: vi.fn().mockResolvedValue(claimerAddress),
      sendTx: vi.fn().mockResolvedValue({
        hash: '0xTxHash123456',
        wait: vi.fn().mockResolvedValue({status: 1}),
      }),
      call: vi.fn(),
      signMsg: vi.fn(),
    } as unknown as WriteBlockchainAdapter;

    vi.mocked(calcProjectId).mockResolvedValue(projectId);
    vi.mocked(calcAddressId).mockResolvedValue(1001n);
    vi.mocked(waitForProjectOwnership).mockResolvedValue(undefined);
    mockUploader.mockResolvedValue('QmProjectIpfsHash123456');
  });

  it('orchestrates complete project claim flow', async () => {
    const onProgress = vi.fn();

    const result = await claimProject(mockAdapter, mockUploader, {
      projectUrl,
      metadata: {
        color: '#336699',
        avatar: {type: 'emoji', emoji: '📦'},
        description: 'Test project description',
      },
      splits: {
        maintainers: [
          {
            type: 'address',
            address: maintainerAddress,
            weight: 1000000,
          },
        ],
        dependencies: [],
      },
      onProgress,
    });

    expect(result.status).toBe('complete');
    expect(result.projectId).toBe(projectId);
    expect(result.claim.success).toBe(true);
    expect(result.ownership.success).toBe(true);
    expect(result.configure.success).toBe(true);
    expect(mockAdapter.sendTx).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenCalled();
  });
});
