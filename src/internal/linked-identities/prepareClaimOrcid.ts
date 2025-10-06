import {toHex} from 'viem';
import type {
  WriteBlockchainAdapter,
  PreparedTx,
} from '../blockchain/BlockchainAdapter';
import {buildTx} from '../shared/buildTx';
import {repoDriverAbi} from '../abis/repoDriverAbi';
import {contractsRegistry} from '../config/contractsRegistry';
import {requireSupportedChain} from '../shared/assertions';
import {assertValidOrcidId, normalizeOrcidForContract} from './orcidUtils';
import {calcOrcidAccountId} from '../projects/calcProjectId';
import {calcAddressId} from '../shared/calcAddressId';
import type {OnChainSplitsReceiver} from '../shared/receiverUtils';
import {TOTAL_SPLITS_WEIGHT} from '../shared/receiverUtils';
import {ORCID_FORGE_ID} from './claimOrcid';

export type PrepareClaimOrcidParams = {
  /** The ORCID ID to claim (e.g., '0000-0002-1825-0097'). */
  readonly orcidId: string;
};

export type PrepareClaimOrcidResult = {
  /** The ORCID account ID. */
  readonly orcidAccountId: bigint;
  /** Transaction to submit claim via requestUpdateOwner. */
  readonly claimTx: PreparedTx;
  /** Transaction to configure splits to 100% to claimer. */
  readonly setSplitsTx: PreparedTx;
};

export async function prepareClaimOrcid(
  adapter: WriteBlockchainAdapter,
  params: PrepareClaimOrcidParams,
): Promise<PrepareClaimOrcidResult> {
  const {orcidId} = params;

  assertValidOrcidId(orcidId);

  const chainId = await adapter.getChainId();
  requireSupportedChain(chainId, prepareClaimOrcid.name);

  const repoDriverAddress = contractsRegistry[chainId].repoDriver.address;

  const claimTx = buildTx({
    abi: repoDriverAbi,
    contract: repoDriverAddress,
    functionName: 'requestUpdateOwner',
    args: [ORCID_FORGE_ID, toHex(normalizeOrcidForContract(orcidId))],
  });

  const orcidAccountId = await calcOrcidAccountId(adapter, orcidId);
  const claimerAddress = await adapter.getAddress();
  const claimerAccountId = await calcAddressId(adapter, claimerAddress);

  const receivers: OnChainSplitsReceiver[] = [
    {
      accountId: claimerAccountId,
      weight: TOTAL_SPLITS_WEIGHT,
    },
  ];

  const setSplitsTx = buildTx({
    abi: repoDriverAbi,
    contract: repoDriverAddress,
    functionName: 'setSplits',
    args: [orcidAccountId, receivers],
  });

  return {
    orcidAccountId,
    claimTx,
    setSplitsTx,
  };
}
