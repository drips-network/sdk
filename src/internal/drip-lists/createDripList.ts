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

export type CreateDripListResult = {
  salt: bigint;
  ipfsHash: Hash;
  dripListId: bigint;
  txResponse: TxResponse;
  metadata: DripListMetadata;
};

/**
 * Creates a new Drip List.
 *
 * @param adapter - A write-enabled blockchain adapter for transaction execution.
 * @param ipfsMetadataUploaderFn - Function to upload metadata to IPFS.
 * @param dripList - Configuration for the new Drip List.
 *
 * @returns An object containing the transaction response, metadata, IPFS hash, salt, and Drip List ID.
 *
 * @throws {DripsError} If the chain is not supported, validation fails, or transaction execution fails.
 */
export async function createDripList(
  adapter: WriteBlockchainAdapter,
  ipfsMetadataUploaderFn: IpfsMetadataUploaderFn<DripListMetadata>,
  dripList: NewDripList,
): Promise<CreateDripListResult> {
  const {salt, ipfsHash, dripListId, preparedTx, metadata} =
    await prepareDripListCreation(adapter, ipfsMetadataUploaderFn, dripList);

  const txResponse = await adapter.sendTx(preparedTx);

  return {
    salt,
    metadata,
    ipfsHash,
    dripListId,
    txResponse,
  };
}
