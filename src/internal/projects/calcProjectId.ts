import {decodeFunctionResult, toHex} from 'viem';
import {buildTx} from '../shared/buildTx';
import {ReadBlockchainAdapter} from '../blockchain/BlockchainAdapter';
import {contractsRegistry} from '../config/contractsRegistry';
import {requireSupportedChain} from '../shared/assertions';
import {repoDriverAbi} from '../abis/repoDriverAbi';

export const supportedForges = ['github'] as const;

/**
 * Supported forge providers for project repositories.
 */
export type Forge = (typeof supportedForges)[number];

/**
 * Project name in the format 'owner/repository'.
 */
export type ProjectName = `${string}/${string}`;

const forgeMap: Record<Forge, number> = {
  github: 0,
};

/**
 * Calculates the (`RepoDriver`) account ID for a project.
 *
 * @param adapter - A read-only blockchain adapter used to interact with the chain.
 * @param params - The parameters required to calculate the project account ID.
 * @param params.forge - The forge provider (currently only `'github'` is supported).
 * @param params.name - The project name in the format `'owner/repo'`.
 *
 * @returns The calculated account ID.
 *
 * @throws {DripsError} If the chain is not supported.
 */
export async function calcProjectId(
  adapter: ReadBlockchainAdapter,
  params: {
    forge: Forge;
    name: ProjectName;
  },
): Promise<bigint> {
  const chainId = await adapter.getChainId();
  const {forge, name} = params;
  requireSupportedChain(chainId);
  const contract = contractsRegistry[chainId].repoDriver.address;

  const calcAccountIdTx = buildTx({
    abi: repoDriverAbi,
    contract,
    functionName: 'calcAccountId',
    args: [forgeMap[forge], toHex(name)],
  });

  const encodedResult = await adapter.call(calcAccountIdTx);

  const accountId = decodeFunctionResult({
    abi: repoDriverAbi,
    functionName: 'calcAccountId',
    data: encodedResult,
  });

  return accountId;
}
