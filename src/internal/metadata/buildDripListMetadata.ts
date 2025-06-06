import {CreateDripListParams} from '../drip-lists/prepareDripListCreationCtx';
import {DripListMetadata} from './createPinataIpfsUploader';

export function buildDripListMetadata(
  params: Omit<
    CreateDripListParams & {dripListId: bigint},
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
    description,
    isVisible,
    recipients: [...receivers],
  };
}
