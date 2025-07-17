import {
  TxResponse,
  WriteBlockchainAdapter,
} from '../blockchain/BlockchainAdapter';
import {
  prepareOneTimeDonation,
  OneTimeDonation,
} from './prepareOneTimeDonation';

/**
 * Sends a one-time donation.
 *
 * @param adapter - A write-enabled blockchain adapter for transaction execution.
 * @param donation - The one-time donation configuration to send.
 *
 * @returns The transaction response from the blockchain.
 *
 * @throws {DripsError} If the chain is not supported, receiver resolution fails, or transaction execution fails.
 */
export async function sendOneTimeDonation(
  adapter: WriteBlockchainAdapter,
  donation: OneTimeDonation,
): Promise<TxResponse> {
  const preparedTx = await prepareOneTimeDonation(adapter, donation);

  return adapter.sendTx(preparedTx);
}
