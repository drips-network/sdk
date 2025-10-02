import {
  TxResponse,
  WriteBlockchainAdapter,
} from '../blockchain/BlockchainAdapter';
import {ClaimOrcidParams, prepareClaimOrcid} from './prepareClaimOrcid';

/**
 * Submits a transaction to request ownership of an ORCID identity on-chain.
 *
 * **IMPORTANT - Drips App Requirement:**
 * For a claiming operation to be considered valid within the context of the Drips App,
 * the caller must ensure that 100% of the ORCID account's splits configuration is set
 * to the ORCID owner's (claiming address) account ID. This function only handles the
 * ownership request. The caller is responsible for configuring splits separately using
 * the appropriate splits configuration methods.
 *
 * @param adapter - The write blockchain adapter for transaction execution.
 * @param params - Parameters for claiming the ORCID identity.
 *
 * @returns The transaction response.
 *
 * @throws {DripsError} If the chain is not supported, the ORCID ID is invalid, or transaction execution fails.
 */
export async function claimOrcid(
  adapter: WriteBlockchainAdapter,
  params: ClaimOrcidParams,
): Promise<TxResponse> {
  const preparedTx = await prepareClaimOrcid(adapter, params);
  return adapter.sendTx(preparedTx);
}
