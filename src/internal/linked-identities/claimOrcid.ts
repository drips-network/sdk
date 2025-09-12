import {
  TxResponse,
  WriteBlockchainAdapter,
} from '../blockchain/BlockchainAdapter';
import {ClaimOrcidParams, prepareClaimOrcid} from './prepareClaimOrcid';

export async function claimOrcid(
  adapter: WriteBlockchainAdapter,
  params: ClaimOrcidParams,
): Promise<TxResponse> {
  const preparedTx = await prepareClaimOrcid(adapter, params);
  return adapter.sendTx(preparedTx);
}
