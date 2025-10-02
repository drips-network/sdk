import {
  PreparedTx,
  ReadBlockchainAdapter,
  TxResponse,
  WriteBlockchainAdapter,
} from '../internal/blockchain/BlockchainAdapter';
import {requireWriteAccess} from '../internal/shared/assertions';
import {
  ClaimOrcidParams,
  prepareClaimOrcid,
} from '../internal/linked-identities/prepareClaimOrcid';
import {claimOrcid} from '../internal/linked-identities/claimOrcid';

export interface LinkedIdentitiesModule {
  /**
   * Prepares a transaction to request ownership of an ORCID identity on-chain.
   *
   * **IMPORTANT - Drips App Requirement:**
   * For a claiming operation to be considered valid within the context of the Drips App,
   * the caller must ensure that 100% of the ORCID account's splits configuration is set
   * to the ORCID owner's (claiming address) account ID. This method only handles the
   * ownership request. The caller is responsible for configuring splits separately using
   * the appropriate splits configuration methods.
   *
   * @param params - Parameters for claiming the ORCID identity.
   *
   * @returns A prepared transaction ready for execution.
   *
   * @throws {DripsError} If the chain is not supported or the ORCID ID is invalid.
   */
  prepareClaimOrcid(params: ClaimOrcidParams): Promise<PreparedTx>;

  /**
   * Submits a transaction to request ownership of an ORCID identity on-chain.
   *
   * **IMPORTANT - Drips App Requirement:**
   * For a claiming operation to be considered valid within the context of the Drips App,
   * the caller must ensure that 100% of the ORCID account's splits configuration is set
   * to the ORCID owner's (claiming address) account ID. This method only handles the
   * ownership request. The caller is responsible for configuring splits separately using
   * the appropriate splits configuration methods.
   *
   * @param params - Parameters for claiming the ORCID identity.
   *
   * @returns The transaction response.
   *
   * @throws {DripsError} If the chain is not supported, the ORCID ID is invalid, or transaction execution fails.
   */
  claimOrcid(params: ClaimOrcidParams): Promise<TxResponse>;
}

type Deps = {
  readonly adapter: ReadBlockchainAdapter | WriteBlockchainAdapter;
};

export function createLinkedIdentitiesModule(
  deps: Deps,
): LinkedIdentitiesModule {
  const {adapter} = deps;

  return {
    prepareClaimOrcid: (params: ClaimOrcidParams): Promise<PreparedTx> => {
      requireWriteAccess(adapter, prepareClaimOrcid.name);
      return prepareClaimOrcid(adapter, params);
    },

    claimOrcid: (params: ClaimOrcidParams): Promise<TxResponse> => {
      requireWriteAccess(adapter, claimOrcid.name);
      return claimOrcid(adapter, params);
    },
  };
}
