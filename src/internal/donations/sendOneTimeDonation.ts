import {
  TxResponse,
  WriteBlockchainAdapter,
} from '../blockchain/BlockchainAdapter';
import {requireWriteAccess} from '../shared/assertions';
import {
  prepareOneTimeDonationTx,
  SendOneTimeDonationParams,
} from './prepareOneTimeDonationTx';

export async function sendOneTimeDonation(
  adapter: WriteBlockchainAdapter,
  params: SendOneTimeDonationParams,
): Promise<TxResponse> {
  requireWriteAccess(adapter, sendOneTimeDonation.name);

  const preparedTx = await prepareOneTimeDonationTx(adapter, params);

  return adapter.sendTx(preparedTx);
}
