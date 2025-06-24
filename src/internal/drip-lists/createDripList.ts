import {Hash} from 'viem';
import {
  TxResponse,
  WriteBlockchainAdapter,
} from '../blockchain/BlockchainAdapter';
import {
  DripListMetadata,
  IpfsMetadataUploaderFn,
} from '../shared/createPinataIpfsMetadataUploader';
import {prepareDripListCreation, NewDripList} from './prepareDripListCreation';
import {requireWriteAccess} from '../shared/assertions';

export type CreateDripListResult = {
  salt: bigint;
  ipfsHash: Hash;
  dripListId: bigint;
  txResponse: TxResponse;
  metadata: DripListMetadata;
};
export async function createDripList(
  adapter: WriteBlockchainAdapter,
  ipfsMetadataUploaderFn: IpfsMetadataUploaderFn<DripListMetadata>,
  params: NewDripList,
): Promise<CreateDripListResult> {
  requireWriteAccess(adapter, createDripList.name);

  const {salt, ipfsHash, dripListId, preparedTx, metadata} =
    await prepareDripListCreation(adapter, ipfsMetadataUploaderFn, params);

  const txResponse = await adapter.sendTx(preparedTx);

  return {
    salt,
    metadata,
    ipfsHash,
    dripListId,
    txResponse,
  };
}
