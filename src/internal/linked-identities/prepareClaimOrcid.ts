import {toHex} from 'viem';
import {buildTx} from '../shared/buildTx';
import {repoDriverAbi} from '../abis/repoDriverAbi';
import {contractsRegistry} from '../config/contractsRegistry';
import {requireSupportedChain} from '../shared/assertions';
import {
  BatchedTxOverrides,
  PreparedTx,
  WriteBlockchainAdapter,
} from '../blockchain/BlockchainAdapter';
import {assertValidOrcidId, normalizeOrcidForContract} from './orcidUtils';
import {callerAbi} from '../abis/callerAbi';
import {convertToCallerCall} from '../shared/convertToCallerCall';

/**
 * Parameters for claiming an ORCID identity.
 *
 * **IMPORTANT - Drips App Requirement:**
 * For a claiming operation to be considered valid within the context of the Drips App,
 * the caller must ensure that 100% of the ORCID account's splits configuration is set
 * to the ORCID owner's (claiming address) account ID. The claiming transaction only
 * handles the ownership request. The caller is responsible for configuring splits
 * separately using the appropriate splits configuration methods.
 */
export type ClaimOrcidParams = {
  /** The ORCID ID to claim (e.g., '0000-0002-1825-0097'). */
  readonly orcidId: string;
  /** Optional transaction overrides for the returned `PreparedTx`. */
  readonly batchedTxOverrides?: BatchedTxOverrides;
};

const ORCID_FORGE_ID = 2; // Matches `RepoDriver` Forge enum: GitHub=0, GitLab=1, ORCID=2.

/**
 * Prepares a transaction to request ownership of an ORCID identity on-chain.
 *
 * **IMPORTANT - Drips App Requirement:**
 * For a claiming operation to be considered valid within the context of the Drips App,
 * the caller must ensure that 100% of the ORCID account's splits configuration is set
 * to the ORCID owner's (claiming address) account ID. This function only handles the
 * ownership request. The caller is responsible for configuring splits separately using
 * the appropriate splits configuration methods.
 *
 * @param adapter - The write blockchain adapter for transaction preparation.
 * @param params - Parameters for claiming the ORCID identity.
 *
 * @returns A prepared transaction that requests ORCID ownership transfer.
 *
 * @throws {DripsError} If the chain is not supported or the ORCID ID is invalid.
 */
export async function prepareClaimOrcid(
  adapter: WriteBlockchainAdapter,
  params: ClaimOrcidParams,
): Promise<PreparedTx> {
  const chainId = await adapter.getChainId();
  requireSupportedChain(chainId, prepareClaimOrcid.name);

  const {orcidId, batchedTxOverrides} = params;
  assertValidOrcidId(orcidId);

  const txs: PreparedTx[] = [];

  const requestUpdateOwnerTx = buildTx({
    abi: repoDriverAbi,
    contract: contractsRegistry[chainId].repoDriver.address,
    functionName: 'requestUpdateOwner',
    args: [ORCID_FORGE_ID, toHex(normalizeOrcidForContract(orcidId))],
  });
  txs.push(requestUpdateOwnerTx);

  const preparedTx = buildTx({
    abi: callerAbi,
    contract: contractsRegistry[chainId].caller.address,
    functionName: 'callBatched',
    args: [txs.map(convertToCallerCall)],
    batchedTxOverrides,
  });

  return preparedTx;
}
