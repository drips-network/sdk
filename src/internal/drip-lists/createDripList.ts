import {Hash} from 'viem';
import {
  TxResponse,
  WriteBlockchainAdapter,
} from '../blockchain/BlockchainAdapter';
import {IpfsUploaderFn, Metadata} from '../metadata/createPinataIpfsUploader';
import {
  prepareDripListCreationCtx,
  CreateDripListParams,
} from './prepareDripListCreationCtx';
import {requireWriteAccess} from '../utils/assertions';

export type DripListCreationResult = {
  salt: bigint;
  ipfsHash: Hash;
  dripListId: bigint;
  txResponse: TxResponse;
};
export async function createDripList(
  adapter: WriteBlockchainAdapter,
  ipfsUploaderFn: IpfsUploaderFn<Metadata>,
  params: CreateDripListParams,
): Promise<DripListCreationResult> {
  requireWriteAccess(adapter, createDripList.name);

  const {salt, ipfsHash, dripListId, preparedTx} =
    await prepareDripListCreationCtx(adapter, ipfsUploaderFn, params);

  const txResponse = await adapter.sendTx(preparedTx);

  return {
    salt,
    ipfsHash,
    dripListId,
    txResponse,
  };
}
