import {
  ReadBlockchainAdapter,
  WriteBlockchainAdapter,
} from '../internal/blockchain/BlockchainAdapter';
import {requireWriteAccess} from '../internal/shared/assertions';
import {
  claimOrcid,
  ClaimOrcidParams,
  ClaimOrcidResult,
} from '../internal/linked-identities/claimOrcid';
import {
  prepareClaimOrcid,
  PrepareClaimOrcidParams,
  PrepareClaimOrcidResult,
} from '../internal/linked-identities/prepareClaimOrcid';
import {
  waitForOrcidOwnership,
  WaitForOrcidOwnershipParams,
} from '../internal/linked-identities/waitForOrcidOwnership';

export interface LinkedIdentitiesModule {
  /**
   * Claims an ORCID identity.
   *
   * This method orchestrates the full ORCID claiming flow:
   * 1. Submits claim transaction via `requestUpdateOwner`
   * 2. Polls for ownership confirmation via oracle verification
   * 3. Configures splits to 100% to claimer's address account
   *
   * Each step's result is captured independently, allowing partial recovery
   * if later steps fail. Check `result.status` for overall outcome.
   *
   * @param params - Claim and configuration parameters.
   *
   * @returns Detailed result object with step-by-step status and data.
   * - `status: 'complete'` - All steps succeeded
   * - `status: 'partial'` - Claim succeeded but ownership/splits failed
   * - `status: 'failed'` - Claim transaction failed
   *
   * @example
   * ```typescript
   * const result = await sdk.linkedIdentities.claimOrcid({ orcidId: '0000-0002-1825-0097' });
   *
   * if (result.status === 'complete') {
   *   console.log('✓ Fully claimed:', result.splits.data.hash);
   * } else if (result.ownership.success && !result.splits.success) {
   *   console.log('Owned but splits failed:', result.splits.error);
   *   // Manual recovery: call setSplits separately
   * }
   * ```
   */
  claimOrcid(params: ClaimOrcidParams): Promise<ClaimOrcidResult>;

  /**
   * Prepares transactions for claiming an ORCID identity.
   *
   * Returns prepared transactions without executing them:
   * 1. Claim transaction (requestUpdateOwner)
   * 2. Splits configuration transaction (setSplits to 100% to caller's address)
   *
   * Use this for transaction batching, gas estimation, or custom execution flows.
   *
   * @param params - ORCID ID to claim.
   *
   * @returns Prepared transactions and associated account IDs.
   */
  prepareClaimOrcid(
    params: PrepareClaimOrcidParams,
  ): Promise<PrepareClaimOrcidResult>;

  /**
   * Polls for ownership confirmation of an ORCID identity.
   *
   * @param params - Polling parameters including ORCID ID and timeout.
   *
   * @returns Promise that resolves when ownership is confirmed.
   *
   * @throws {DripsError} If ownership is not confirmed within timeout or validation fails.
   */
  waitForOrcidOwnership(params: WaitForOrcidOwnershipParams): Promise<void>;
}

type Deps = {
  readonly adapter: ReadBlockchainAdapter | WriteBlockchainAdapter;
};

export function createLinkedIdentitiesModule(
  deps: Deps,
): LinkedIdentitiesModule {
  const {adapter} = deps;

  return {
    claimOrcid: (params: ClaimOrcidParams): Promise<ClaimOrcidResult> => {
      requireWriteAccess(adapter, claimOrcid.name);
      return claimOrcid(adapter, params);
    },

    prepareClaimOrcid: (
      params: PrepareClaimOrcidParams,
    ): Promise<PrepareClaimOrcidResult> => {
      requireWriteAccess(adapter, prepareClaimOrcid.name);
      return prepareClaimOrcid(adapter, params);
    },

    waitForOrcidOwnership: (
      params: WaitForOrcidOwnershipParams,
    ): Promise<void> => {
      return waitForOrcidOwnership(adapter, params);
    },
  };
}
