import {
  TxResponse,
  WriteBlockchainAdapter,
} from '../blockchain/BlockchainAdapter';
import {CollectConfig, prepareCollection} from './prepareCollection';

/**
 * Collects funds for an account.
 *
 * @param adapter - A write-enabled blockchain adapter for transaction execution.
 * @param config - Configuration for the collection operation.
 *
 * @returns The transaction response from the blockchain.
 *
 * @throws {DripsError} If the chain is not supported, no tokens are provided, configuration is invalid, or transaction execution fails.
 */
export async function collect(
  adapter: WriteBlockchainAdapter,
  config: CollectConfig,
): Promise<TxResponse> {
  const preparedTx = await prepareCollection(adapter, config);

  return adapter.sendTx(preparedTx);
}
