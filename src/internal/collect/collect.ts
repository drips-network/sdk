import {
  TxResponse,
  WriteBlockchainAdapter,
} from '../blockchain/BlockchainAdapter';
import {CollectConfig, prepareCollection} from './prepareCollection';

export async function collect(
  adapter: WriteBlockchainAdapter,
  config: CollectConfig,
): Promise<TxResponse> {
  const preparedTx = await prepareCollection(adapter, config);

  return adapter.sendTx(preparedTx);
}
