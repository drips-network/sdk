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
  donation: OneTimeDonation,
): Promise<TxResponse> {
  const preparedTx = await prepareOneTimeDonation(adapter, donation);

  return adapter.sendTx(preparedTx);
}
