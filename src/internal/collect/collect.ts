import {Hash} from 'viem';
import {
  TxResponse,
  WriteBlockchainAdapter,
} from '../blockchain/BlockchainAdapter';
import {DripListMetadata} from '../shared/createPinataIpfsMetadataUploader';
import {CollectConfig, prepareCollection} from './prepareCollection';

export type CreateDripListResult = {
  salt: bigint;
  ipfsHash: Hash;
  dripListId: bigint;
  txResponse: TxResponse;
  metadata: DripListMetadata;
};

export async function collect(
  adapter: WriteBlockchainAdapter,
  config: CollectConfig,
): Promise<TxResponse> {
  const preparedTx = await prepareCollection(adapter, config);

  return adapter.sendTx(preparedTx);
}
