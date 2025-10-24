import {z} from 'zod';
import {orcidSplitReceiverSchema} from '../repo-driver/v6';
import {repoSubAccountDriverSplitReceiverSchema} from '../common/repoSubAccountDriverSplitReceiverSchema';
import {subListSplitReceiverSchema} from '../immutable-splits-driver/v1';
import {
  repoDriverSplitReceiverSchema,
  addressDriverSplitReceiverSchema,
} from '../repo-driver/v2';
import {emojiAvatarSchema} from '../repo-driver/v4';
import {dripListSplitReceiverSchema} from './v2';
import {nftDriverAccountMetadataSchemaV5} from './v5';

const base = nftDriverAccountMetadataSchemaV5
  .omit({
    isDripList: true,
    projects: true,
  })
  .extend({
    allowExternalDonations: z.boolean().optional(),
  });

const ecosystemVariant = base.extend({
  type: z.literal('ecosystem'),
  recipients: z.array(
    z.union([
      repoSubAccountDriverSplitReceiverSchema,
      subListSplitReceiverSchema,
    ]),
  ),
  color: z.string(),
  avatar: emojiAvatarSchema,
});

const dripListVariant = base.extend({
  type: z.literal('dripList'),
  recipients: z.array(
    z.union([
      repoDriverSplitReceiverSchema,
      subListSplitReceiverSchema,
      addressDriverSplitReceiverSchema,
      dripListSplitReceiverSchema,
      orcidSplitReceiverSchema,
    ]),
  ),
});

export const nftDriverAccountMetadataSchemaV7 = z.discriminatedUnion('type', [
  ecosystemVariant,
  dripListVariant,
]);
