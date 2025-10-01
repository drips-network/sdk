import {NewDripList} from './prepareDripListCreation';
import {MetadataSplitsReceiver} from '../shared/receiverUtils';
import {DripListMetadata} from '../shared/createPinataIpfsMetadataUploader';

export function buildDripListMetadata(
  params: Omit<
    Omit<NewDripList, 'receivers'> & {
      dripListId: bigint;
      receivers: ReadonlyArray<MetadataSplitsReceiver>;
      allowExternalDonations: boolean;
    },
    'minter' | 'chainId'
  >,
): DripListMetadata {
  const {
    dripListId,
    receivers,
    name,
    description,
    isVisible,
    latestVotingRoundId,
    allowExternalDonations,
  } = params;

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
    allowExternalDonations,
    recipients: [...receivers],
    latestVotingRoundId,
  };
}
