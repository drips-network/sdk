import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {waitForOrcidOwnership} from '../../../src/internal/linked-identities/waitForOrcidOwnership';
import type {ReadBlockchainAdapter} from '../../../src/internal/blockchain/BlockchainAdapter';
import {encodeFunctionResult, getAddress} from 'viem';
import {repoDriverAbi} from '../../../src/internal/abis/repoDriverAbi';
import {calcOrcidAccountId} from '../../../src/internal/linked-identities/orcidUtils';

vi.mock('../../../src/internal/shared/assertions', () => ({
  requireSupportedChain: vi.fn(),
}));

vi.mock('../../../src/internal/linked-identities/orcidUtils', () => ({
  assertValidOrcidId: vi.fn(),
  calcOrcidAccountId: vi.fn(),
}));

vi.mock('../../../src/internal/config/contractsRegistry', () => ({
  contractsRegistry: {
    1: {
      repoDriver: {address: '0xRepoDriver1'},
    },
  },
}));

describe('waitForOrcidOwnership', () => {
  let mockAdapter: ReadBlockchainAdapter;

  const chainId = 1;
  const orcidId = '0000-0002-1825-0097';
  const orcidAccountId = 12345n;
  const expectedOwner =
    '0x1234567890123456789012345678901234567890' as `0x${string}`;

  beforeEach((): void => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockAdapter = {
      getChainId: vi.fn().mockResolvedValue(chainId),
      call: vi.fn(),
    } as unknown as ReadBlockchainAdapter;

    vi.mocked(calcOrcidAccountId).mockResolvedValue(orcidAccountId);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves immediately when ownership matches', async () => {
    // Arrange
    const encodedOwner = encodeFunctionResult({
      abi: repoDriverAbi,
      functionName: 'ownerOf',
      result: expectedOwner,
    });
    mockAdapter.call = vi.fn().mockResolvedValue(encodedOwner);

    // Act
    const promise = waitForOrcidOwnership(mockAdapter, {
      orcidId,
      expectedOwner,
    });

    await vi.runAllTimersAsync();
    await promise;

    // Assert
    expect(mockAdapter.call).toHaveBeenCalledTimes(1);
  });

  it('polls until ownership matches', async () => {
    // Arrange
    const wrongOwner =
      '0x9876543210987654321098765432109876543210' as `0x${string}`;
    const encodedWrongOwner = encodeFunctionResult({
      abi: repoDriverAbi,
      functionName: 'ownerOf',
      result: wrongOwner,
    });
    const encodedCorrectOwner = encodeFunctionResult({
      abi: repoDriverAbi,
      functionName: 'ownerOf',
      result: expectedOwner,
    });

    mockAdapter.call = vi
      .fn()
      .mockResolvedValueOnce(encodedWrongOwner)
      .mockResolvedValueOnce(encodedWrongOwner)
      .mockResolvedValueOnce(encodedCorrectOwner);

    // Act
    const promise = waitForOrcidOwnership(mockAdapter, {
      orcidId,
      expectedOwner,
      pollIntervalMs: 1000,
    });

    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.runAllTimersAsync();
    await promise;

    // Assert
    expect(mockAdapter.call).toHaveBeenCalledTimes(3);
  });

  it('throws timeout error when ownership not confirmed within timeout', async () => {
    // Arrange
    const wrongOwner =
      '0x9876543210987654321098765432109876543210' as `0x${string}`;
    const encodedWrongOwner = encodeFunctionResult({
      abi: repoDriverAbi,
      functionName: 'ownerOf',
      result: wrongOwner,
    });
    mockAdapter.call = vi.fn().mockResolvedValue(encodedWrongOwner);

    // Act
    const promise = waitForOrcidOwnership(mockAdapter, {
      orcidId,
      expectedOwner,
      pollIntervalMs: 1000,
      timeoutMs: 3000,
    });

    // Assert - expect rejection first, then advance timers
    const expectPromise = expect(promise).rejects.toThrow(
      'Ownership confirmation timeout after 3000ms',
    );

    await vi.advanceTimersByTimeAsync(3000);
    await vi.runAllTimersAsync();

    await expectPromise;
  });

  it('invokes onProgress callback after each poll', async () => {
    // Arrange
    const wrongOwner =
      '0x9876543210987654321098765432109876543210' as `0x${string}`;
    const encodedWrongOwner = encodeFunctionResult({
      abi: repoDriverAbi,
      functionName: 'ownerOf',
      result: wrongOwner,
    });
    const encodedCorrectOwner = encodeFunctionResult({
      abi: repoDriverAbi,
      functionName: 'ownerOf',
      result: expectedOwner,
    });

    mockAdapter.call = vi
      .fn()
      .mockResolvedValueOnce(encodedWrongOwner)
      .mockResolvedValueOnce(encodedCorrectOwner);

    const onProgress = vi.fn();

    // Act
    const promise = waitForOrcidOwnership(mockAdapter, {
      orcidId,
      expectedOwner,
      pollIntervalMs: 1000,
      onProgress,
    });

    await vi.advanceTimersByTimeAsync(1000);
    await vi.runAllTimersAsync();
    await promise;

    // Assert
    expect(onProgress).toHaveBeenCalledWith(expect.any(Number));
    expect(onProgress.mock.calls[0][0]).toBeGreaterThanOrEqual(0);
  });

  it('uses adapter address when expectedOwner not provided', async () => {
    // Arrange
    const adapterAddress =
      '0xaabbccddaabbccddaabbccddaabbccddaabbccdd' as `0x${string}`;
    const adapterWithGetAddress = {
      ...mockAdapter,
      getAddress: vi.fn().mockResolvedValue(adapterAddress),
    };

    const encodedOwner = encodeFunctionResult({
      abi: repoDriverAbi,
      functionName: 'ownerOf',
      result: adapterAddress,
    });
    adapterWithGetAddress.call = vi.fn().mockResolvedValue(encodedOwner);

    // Act
    const promise = waitForOrcidOwnership(adapterWithGetAddress, {orcidId});

    await vi.runAllTimersAsync();
    await promise;

    // Assert
    expect(adapterWithGetAddress.getAddress).toHaveBeenCalled();
  });

  it('throws error when expectedOwner not provided and adapter has no getAddress', async () => {
    // Act & Assert
    await expect(waitForOrcidOwnership(mockAdapter, {orcidId})).rejects.toThrow(
      'Expected owner address must be provided',
    );
  });

  it('performs case-insensitive address comparison', async () => {
    // Arrange
    const mixedCaseOwner = getAddress(
      '0xabcdef1234567890abcdef1234567890abcdef12',
    );
    const lowerCaseOwner = mixedCaseOwner.toLowerCase() as `0x${string}`;

    const encodedOwner = encodeFunctionResult({
      abi: repoDriverAbi,
      functionName: 'ownerOf',
      result: mixedCaseOwner,
    });
    mockAdapter.call = vi.fn().mockResolvedValue(encodedOwner);

    // Act
    const promise = waitForOrcidOwnership(mockAdapter, {
      orcidId,
      expectedOwner: lowerCaseOwner,
    });

    await vi.runAllTimersAsync();
    await promise;

    // Assert - should resolve without error
    expect(mockAdapter.call).toHaveBeenCalledTimes(1);
  });
});
