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
   * Prepares a transaction to claim an ORCID identity for the connected account.
   *
   * @param params - Parameters for claiming the ORCID identity.
   *
   * @returns A prepared transaction ready for execution.
   *
   * @throws {DripsError} If the chain is not supported or the ORCID ID is invalid.
   */
  prepareClaimOrcid(params: ClaimOrcidParams): Promise<PreparedTx>;

  /**
   * Claims an ORCID identity.
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
