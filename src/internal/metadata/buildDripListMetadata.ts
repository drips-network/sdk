import {ReadBlockchainAdapter} from '../blockchain/BlockchainAdapter';
import {NewDripList} from '../drip-lists/prepareDripListCreation';
import {mapToMetadataSplitsReceiver} from '../shared/receiverUtils';
import {DripListMetadata} from './createPinataIpfsMetadataUploader';

export async function buildDripListMetadata(
  adapter: ReadBlockchainAdapter,
  params: Omit<NewDripList & {dripListId: bigint}, 'minter' | 'chainId'>,
): Promise<DripListMetadata> {
  const {dripListId, receivers, name, description, isVisible} = params;
  const recipients = await Promise.all(
    receivers.map(r => mapToMetadataSplitsReceiver(adapter, r)),
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
