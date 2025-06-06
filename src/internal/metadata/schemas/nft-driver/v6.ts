import {z} from 'zod';
import {nftDriverAccountMetadataSchemaV5} from './v5';
import {
  addressDriverSplitReceiverSchema,
  repoDriverSplitReceiverSchema,
} from '../repo-driver/v2';
import {subListSplitReceiverSchema} from '../immutable-splits-driver/v1';
import {dripListSplitReceiverSchema} from './v2';
import {repoSubAccountDriverSplitReceiverSchema} from '../common/repoSubAccountDriverSplitReceiverSchema';
import {emojiAvatarSchema} from '../repo-driver/v4';

const base = nftDriverAccountMetadataSchemaV5
  .omit({
    isDripList: true,
    projects: true,
  })
  .extend({
    isDripList: z.undefined().optional(),
    projects: z.undefined().optional(),
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
    ]),
  ),
});

export const nftDriverAccountMetadataSchemaV6 = z.discriminatedUnion('type', [
  ecosystemVariant,
  dripListVariant,
]);
