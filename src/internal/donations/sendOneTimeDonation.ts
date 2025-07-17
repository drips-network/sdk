import {
  TxResponse,
  WriteBlockchainAdapter,
} from '../blockchain/BlockchainAdapter';
import {
  prepareOneTimeDonation,
  OneTimeDonation,
} from './prepareOneTimeDonation';

export async function sendOneTimeDonation(
  adapter: WriteBlockchainAdapter,
  params: OneTimeDonation,
): Promise<TxResponse> {
  const preparedTx = await prepareOneTimeDonation(adapter, params);

  return adapter.sendTx(preparedTx);
}
