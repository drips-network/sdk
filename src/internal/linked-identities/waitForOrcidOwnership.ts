import {decodeFunctionResult, Address} from 'viem';
import {ReadBlockchainAdapter} from '../blockchain/BlockchainAdapter';
import {buildTx} from '../shared/buildTx';
import {repoDriverAbi} from '../abis/repoDriverAbi';
import {contractsRegistry} from '../config/contractsRegistry';
import {requireSupportedChain} from '../shared/assertions';
import {DripsError} from '../shared/DripsError';
import {assertValidOrcidId} from './orcidUtils';
import {calcOrcidAccountId} from '../projects/calcProjectId';

export type WaitForOrcidOwnershipParams = {
  /** The ORCID ID to wait for ownership confirmation. */
  readonly orcidId: string;
  /** Expected owner address. If not provided, uses adapter's address. */
  readonly expectedOwner?: Address;
  /** Polling interval in milliseconds. Default: 3000ms. */
  readonly pollIntervalMs?: number;
  /** Timeout in milliseconds. Default: 120000ms (2 minutes). */
  readonly timeoutMs?: number;
  /** Progress callback invoked after each poll with elapsed time. */
  readonly onProgress?: (elapsedMs: number) => void | Promise<void>;
};

export async function waitForOrcidOwnership(
  adapter: ReadBlockchainAdapter,
  params: WaitForOrcidOwnershipParams,
): Promise<void> {
  const {
    orcidId,
    expectedOwner,
    pollIntervalMs = 3000,
    timeoutMs = 120000,
    onProgress,
  } = params;

  assertValidOrcidId(orcidId);

  const chainId = await adapter.getChainId();
  requireSupportedChain(chainId, waitForOrcidOwnership.name);

  const accountId = await calcOrcidAccountId(adapter, orcidId);
  const repoDriverAddress = contractsRegistry[chainId].repoDriver.address;

  // Determine expected owner address.
  let targetOwner: Address;
  if (expectedOwner) {
    targetOwner = expectedOwner;
  } else {
    // Adapter must support getAddress for default behavior.
    if ('getAddress' in adapter && typeof adapter.getAddress === 'function') {
      targetOwner = await adapter.getAddress();
    } else {
      throw new DripsError(
        'Expected owner address must be provided for read-only adapter.',
        {
          meta: {operation: waitForOrcidOwnership.name, orcidId},
        },
      );
    }
  }

  const startTime = Date.now();
  const endTime = startTime + timeoutMs;

  while (Date.now() < endTime) {
    const ownerOfTx = buildTx({
      abi: repoDriverAbi,
      contract: repoDriverAddress,
      functionName: 'ownerOf',
      args: [accountId],
    });

    const encodedResult = await adapter.call(ownerOfTx);

    const currentOwner = decodeFunctionResult({
      abi: repoDriverAbi,
      functionName: 'ownerOf',
      data: encodedResult,
    }) as Address;

    if (currentOwner.toLowerCase() === targetOwner.toLowerCase()) {
      return; // Ownership confirmed.
    }

    const elapsedMs = Date.now() - startTime;
    await onProgress?.(elapsedMs);

    // Wait before next poll.
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  // Timeout reached.
  throw new DripsError(`Ownership confirmation timeout after ${timeoutMs}ms.`, {
    meta: {
      operation: waitForOrcidOwnership.name,
      orcidId,
      accountId: accountId.toString(),
      expectedOwner: targetOwner,
      timeoutMs,
    },
  });
}
