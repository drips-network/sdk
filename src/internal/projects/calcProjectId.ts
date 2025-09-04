import {decodeFunctionResult, toHex} from 'viem';
import {buildTx} from '../shared/buildTx';
import {ReadBlockchainAdapter} from '../blockchain/BlockchainAdapter';
import {contractsRegistry} from '../config/contractsRegistry';
import {requireSupportedChain} from '../shared/assertions';
import {repoDriverAbi} from '../abis/repoDriverAbi';

export const supportedForges = ['github', 'orcid'] as const;

/**
 * Supported forges.
 */
export type Forge = (typeof supportedForges)[number];

/**
 * Project name in the format 'owner/repository'.
 */
export type ProjectName = `${string}/${string}`;

/**
 * ORCID iD in the format ^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$
 * TODO: upgrade to branded type?
 */
export type OrcidId = string;

const forgeMap: Record<Forge, number> = {
  github: 0,
  orcid: 2,
};

export async function calcOrcidAccountId(
  adapter: ReadBlockchainAdapter,
  orcidId: OrcidId,
): Promise<bigint> {
  return calcRepoDriverAccountId(adapter, {forge: 'orcid', name: orcidId});
}

export async function calcProjectId(
  adapter: ReadBlockchainAdapter,
  params: {
    forge: Forge;
    name: ProjectName | OrcidId;
  },
): Promise<bigint> {
  return calcRepoDriverAccountId(adapter, params);
}

async function calcRepoDriverAccountId(
  adapter: ReadBlockchainAdapter,
  params: {
    forge: Forge;
    name: ProjectName | OrcidId;
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
