import {describe, it, expect, vi, beforeEach} from 'vitest';
import {prepareClaimProject} from '../../../src/internal/projects/prepareClaimProject';
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

describe('prepareClaimProject', () => {
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
      sendTx: vi.fn(),
      call: vi.fn(),
      signMsg: vi.fn(),
    } as unknown as WriteBlockchainAdapter;

    vi.mocked(calcProjectId).mockResolvedValue(projectId);
    vi.mocked(calcAddressId).mockResolvedValue(1001n);
    mockUploader.mockResolvedValue('QmProjectIpfsHash123456');
  });

  it('prepares claim and configure transactions with IPFS metadata', async () => {
    const result = await prepareClaimProject(mockAdapter, mockUploader, {
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
    });

    expect(result.projectId).toBe(projectId);
    expect(result.ipfsHash).toBe('QmProjectIpfsHash123456');
    expect(result.metadata.description).toBe('Test project description');
    expect(result.claimTx).toBeDefined();
    expect(result.claimTx.to).toBe(
      '0x1111111111111111111111111111111111111111',
    );
    expect(result.claimTx.abiFunctionName).toBe('requestUpdateOwner');
    expect(result.configureTx).toBeDefined();
    expect(result.configureTx.to).toBe(
      '0x2222222222222222222222222222222222222222',
    );
    expect(result.configureTx.abiFunctionName).toBe('callBatched');
  });

  it('throws DripsError when maintainer weight does not sum to TOTAL_SPLITS_WEIGHT', async () => {
    await expect(
      prepareClaimProject(mockAdapter, mockUploader, {
        projectUrl,
        metadata: {
          color: '#336699',
          avatar: {type: 'emoji', emoji: '📦'},
        },
        splits: {
          maintainers: [
            {
              type: 'address',
              address: maintainerAddress,
              weight: 500000, // Invalid: should be 1000000
            },
          ],
          dependencies: [],
        },
      }),
    ).rejects.toThrow('Total weight must be exactly 1000000');
  });
});
