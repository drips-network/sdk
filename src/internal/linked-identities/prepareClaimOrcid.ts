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
import {
  OnChainSplitsReceiver,
  TOTAL_SPLITS_WEIGHT,
} from '../shared/receiverUtils';
import {calcOrcidAccountId} from '../projects/calcProjectId';
import {calcAddressId} from '../shared/calcAddressId';

export type ClaimOrcidParams = {
  /** The ORCID ID to claim (e.g., '0000-0002-1825-0097'). */
  readonly orcidId: string;
  /** Optional transaction overrides for the returned `PreparedTx`. */
  readonly batchedTxOverrides?: BatchedTxOverrides;
};

const ORCID_FORGE_ID = 2; // Matches `RepoDriver` Forge enum: GitHub=0, GitLab=1, ORCID=2.

export async function prepareClaimOrcid(
  adapter: WriteBlockchainAdapter,
  params: ClaimOrcidParams,
): Promise<PreparedTx> {
  const chainId = await adapter.getChainId();
  requireSupportedChain(chainId, prepareClaimOrcid.name);

  const {orcidId, batchedTxOverrides} = params;
  assertValidOrcidId(orcidId);

  const {repoDriver, caller} = contractsRegistry[chainId];

  const txs: PreparedTx[] = [];

  const requestUpdateOwnerTx = buildTx({
    abi: repoDriverAbi,
    contract: contractsRegistry[chainId].repoDriver.address,
    functionName: 'requestUpdateOwner',
    args: [ORCID_FORGE_ID, toHex(normalizeOrcidForContract(orcidId))],
  });
  txs.push(requestUpdateOwnerTx);

  const orcidAccountId = await calcOrcidAccountId(adapter, orcidId);

  const splitReceiver: OnChainSplitsReceiver = {
    // If the connected wallet is not the owner of the ORCID account, the `setSplits` call will fail (and so the whole batched call).
    accountId: await calcAddressId(adapter, await adapter.getAddress()), // The owner of the ORCID account must be the receiver of the splits.
    weight: TOTAL_SPLITS_WEIGHT,
  };

  const setSplitsTx = buildTx({
    abi: repoDriverAbi,
    contract: repoDriver.address,
    functionName: 'setSplits',
    args: [orcidAccountId, [splitReceiver]],
  });
  txs.push(setSplitsTx);

  const preparedTx = buildTx({
    abi: callerAbi,
    contract: caller.address,
    functionName: 'callBatched',
    args: [txs.map(convertToCallerCall)],
    batchedTxOverrides,
  });

  return preparedTx;
}
