import {NewDripList} from './prepareDripListCreation';
import {MetadataSplitsReceiver} from '../shared/receiverUtils';
import {DripListMetadata} from '../shared/createPinataIpfsMetadataUploader';

export function buildDripListMetadata(
  params: Omit<
    Omit<NewDripList, 'receivers'> & {
      dripListId: bigint;
      receivers: ReadonlyArray<MetadataSplitsReceiver>;
    },
    'minter' | 'chainId'
  >,
): DripListMetadata {
  const {dripListId, receivers, name, description, isVisible} = params;

  return {
    driver: 'nft',
    type: 'dripList',
    describes: {
      accountId: dripListId.toString(),
      driver: 'nft',
    },
    name,
    description: description ?? undefined,
    isVisible,
    recipients: [...receivers],
  };
}
