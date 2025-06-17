import {ReadBlockchainAdapter} from '../blockchain/BlockchainAdapter';
import {CreateDripListParams} from '../drip-lists/prepareDripListCreationCtx';
import {DripListMetadata} from './createPinataIpfsUploader';
import {mapToMetadataReceiver} from './mapToMetadataReceiver';

export async function buildDripListMetadata(
  adapter: ReadBlockchainAdapter,
  params: Omit<
    CreateDripListParams & {dripListId: bigint},
    'minter' | 'chainId'
  >,
): Promise<DripListMetadata> {
  const {dripListId, receivers, name, description, isVisible} = params;
  const recipients = await Promise.all(
    receivers.map(r => mapToMetadataReceiver(adapter, r)),
  );

  return {
    driver: 'nft',
    type: 'dripList',
    describes: {
      accountId: dripListId.toString(),
      driver: 'nft',
    },
    name,
    description,
    isVisible,
    recipients,
  };
}
