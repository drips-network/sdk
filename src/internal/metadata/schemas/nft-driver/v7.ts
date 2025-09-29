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
import {
  deadlineSplitReceiverSchema,
  orcidSplitReceiverSchema,
} from '../repo-driver/v6';

const base = nftDriverAccountMetadataSchemaV5.omit({
  isDripList: true,
  projects: true,
});

const ecosystemVariant = base.extend({
  type: z.literal('ecosystem'),
  recipients: z.array(
    z.union([
      repoSubAccountDriverSplitReceiverSchema,
      subListSplitReceiverSchema,
      deadlineSplitReceiverSchema, // New in v7
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
      deadlineSplitReceiverSchema, // New in v7
      orcidSplitReceiverSchema, // New in v7
    ]),
  ),
});

export const nftDriverAccountMetadataSchemaV7 = z.discriminatedUnion('type', [
  ecosystemVariant,
  dripListVariant,
]);
