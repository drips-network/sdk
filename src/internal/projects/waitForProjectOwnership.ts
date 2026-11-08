import {decodeFunctionResult, Address} from 'viem';
import {ReadBlockchainAdapter} from '../blockchain/BlockchainAdapter';
import {buildTx} from '../shared/buildTx';
import {repoDriverAbi} from '../abis/repoDriverAbi';
import {contractsRegistry} from '../config/contractsRegistry';
import {requireSupportedChain} from '../shared/assertions';
import {DripsError} from '../shared/DripsError';
import {calcProjectId} from './calcProjectId';
import {destructProjectUrl} from './destructProjectUrl';

export type WaitForProjectOwnershipParams = {
  /** The project repository URL to wait for ownership confirmation (e.g., 'https://github.com/owner/repo'). */
  readonly projectUrl: string;
  /** Expected owner address. If not provided, uses adapter's address. */
  readonly expectedOwner?: Address;
  /** Polling interval in milliseconds. Default: 3000ms. */
  readonly pollIntervalMs?: number;
  /** Timeout in milliseconds. Default: 120000ms (2 minutes). */
  readonly timeoutMs?: number;
  /** Progress callback invoked after each poll with elapsed time. */
  readonly onProgress?: (elapsedMs: number) => void | Promise<void>;
};

export async function waitForProjectOwnership(
  adapter: ReadBlockchainAdapter,
  params: WaitForProjectOwnershipParams,
): Promise<void> {
  const {
    projectUrl,
    expectedOwner,
    pollIntervalMs = 3000,
    timeoutMs = 120000,
    onProgress,
  } = params;

  const {forge, ownerName, repoName} = destructProjectUrl(projectUrl);

  const chainId = await adapter.getChainId();
  requireSupportedChain(chainId, waitForProjectOwnership.name);

  const accountId = await calcProjectId(adapter, {
    forge,
    name: `${ownerName}/${repoName}`,
  });
  const repoDriverAddress = contractsRegistry[chainId].repoDriver.address;

  let targetOwner: Address;
  if (expectedOwner) {
    targetOwner = expectedOwner;
  } else {
    if ('getAddress' in adapter && typeof adapter.getAddress === 'function') {
      targetOwner = await adapter.getAddress();
    } else {
      throw new DripsError(
        'Expected owner address must be provided for read-only adapter.',
        {
          meta: {operation: waitForProjectOwnership.name, projectUrl},
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
      return;
    }

    const elapsedMs = Date.now() - startTime;
    await onProgress?.(elapsedMs);

    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }

  throw new DripsError(`Ownership confirmation timeout after ${timeoutMs}ms.`, {
    meta: {
      operation: waitForProjectOwnership.name,
      projectUrl,
      accountId: accountId.toString(),
      expectedOwner: targetOwner,
      timeoutMs,
    },
  });
}
