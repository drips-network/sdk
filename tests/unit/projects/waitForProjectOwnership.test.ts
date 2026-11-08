import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {waitForProjectOwnership} from '../../../src/internal/projects/waitForProjectOwnership';
import type {ReadBlockchainAdapter} from '../../../src/internal/blockchain/BlockchainAdapter';
import {encodeFunctionResult} from 'viem';
import {repoDriverAbi} from '../../../src/internal/abis/repoDriverAbi';
import {calcProjectId} from '../../../src/internal/projects/calcProjectId';

vi.mock('../../../src/internal/shared/assertions', () => ({
  requireSupportedChain: vi.fn(),
  requireSupportedForge: vi.fn(),
}));

vi.mock('../../../src/internal/projects/calcProjectId', () => ({
  calcProjectId: vi.fn(),
}));

vi.mock('../../../src/internal/config/contractsRegistry', () => ({
  contractsRegistry: {
    1: {
      repoDriver: {address: '0xRepoDriver1'},
    },
  },
}));

describe('waitForProjectOwnership', () => {
  let mockAdapter: ReadBlockchainAdapter;

  const chainId = 1;
  const projectUrl = 'https://github.com/drips-network/sdk';
  const projectId = 54321n;
  const expectedOwner =
    '0x1234567890123456789012345678901234567890' as `0x${string}`;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockAdapter = {
      getChainId: vi.fn().mockResolvedValue(chainId),
      call: vi.fn(),
    } as unknown as ReadBlockchainAdapter;

    vi.mocked(calcProjectId).mockResolvedValue(projectId);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves immediately when ownership matches expectedOwner', async () => {
    const encodedOwner = encodeFunctionResult({
      abi: repoDriverAbi,
      functionName: 'ownerOf',
      result: expectedOwner,
    });
    mockAdapter.call = vi.fn().mockResolvedValue(encodedOwner);

    const promise = waitForProjectOwnership(mockAdapter, {
      projectUrl,
      expectedOwner,
    });

    await vi.runAllTimersAsync();
    await promise;

    expect(mockAdapter.call).toHaveBeenCalledTimes(1);
  });

  it('polls until owner matches target owner and invokes onProgress', async () => {
    const otherOwner =
      '0x0000000000000000000000000000000000000000' as `0x${string}`;
    const encodedNotYetOwner = encodeFunctionResult({
      abi: repoDriverAbi,
      functionName: 'ownerOf',
      result: otherOwner,
    });
    const encodedTargetOwner = encodeFunctionResult({
      abi: repoDriverAbi,
      functionName: 'ownerOf',
      result: expectedOwner,
    });

    mockAdapter.call = vi
      .fn()
      .mockResolvedValueOnce(encodedNotYetOwner)
      .mockResolvedValueOnce(encodedTargetOwner);

    const onProgress = vi.fn();
    const promise = waitForProjectOwnership(mockAdapter, {
      projectUrl,
      expectedOwner,
      pollIntervalMs: 1000,
      onProgress,
    });

    await vi.advanceTimersByTimeAsync(1000);
    await promise;

    expect(mockAdapter.call).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenCalledWith(expect.any(Number));
  });

  it('throws DripsError when timed out', async () => {
    const zeroOwner =
      '0x0000000000000000000000000000000000000000' as `0x${string}`;
    const encodedOwner = encodeFunctionResult({
      abi: repoDriverAbi,
      functionName: 'ownerOf',
      result: zeroOwner,
    });
    mockAdapter.call = vi.fn().mockResolvedValue(encodedOwner);

    const promise = waitForProjectOwnership(mockAdapter, {
      projectUrl,
      expectedOwner,
      pollIntervalMs: 500,
      timeoutMs: 1500,
    });

    const rejectAssertion = expect(promise).rejects.toThrow(
      'Ownership confirmation timeout',
    );

    await vi.advanceTimersByTimeAsync(2000);
    await rejectAssertion;
  });
});
