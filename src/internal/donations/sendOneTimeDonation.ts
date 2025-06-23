import {
  TxResponse,
  WriteBlockchainAdapter,
} from '../blockchain/BlockchainAdapter';
import {requireWriteAccess} from '../shared/assertions';
import {
  prepareOneTimeDonation,
  OneTimeDonation,
} from './prepareOneTimeDonation';

export async function sendOneTimeDonation(
  adapter: WriteBlockchainAdapter,
  params: OneTimeDonation,
): Promise<TxResponse> {
  requireWriteAccess(adapter, sendOneTimeDonation.name);

  const preparedTx = await prepareOneTimeDonation(adapter, params);

  return adapter.sendTx(preparedTx);
}
