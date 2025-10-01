import z from 'zod';
import {gitHubSourceSchema} from '../common/sources';
import {
  addressDriverSplitReceiverSchema,
  repoDriverSplitReceiverSchema,
} from './v2';
import {dripListSplitReceiverSchema} from '../nft-driver/v2';
import {repoDriverAccountMetadataSchemaV5} from './v5';

export const orcidSplitReceiverSchema = z.object({
  type: z.literal('orcid'),
  weight: z.number(),
  accountId: z.string(),
  orcidId: z.string(),
});

export const deadlineSplitReceiverSchema = z.object({
  type: z.literal('deadline'),
  weight: z.number(),
  accountId: z.string(),
  claimableProject: z.object({
    accountId: z.string(),
    source: gitHubSourceSchema,
  }),
  recipientAccountId: z.string(),
  refundAccountId: z.string(),
  deadline: z.coerce.date(),
});

const repoDriverAccountSplitsSchemaV6 = z.object({
  maintainers: z.array(addressDriverSplitReceiverSchema),
  dependencies: z.array(
    z.union([
      dripListSplitReceiverSchema,
      repoDriverSplitReceiverSchema,
      addressDriverSplitReceiverSchema,
      deadlineSplitReceiverSchema, // New in v6
      orcidSplitReceiverSchema, // New in v6
    ]),
  ),
});

export const repoDriverAccountMetadataSchemaV6 =
  repoDriverAccountMetadataSchemaV5.extend({
    splits: repoDriverAccountSplitsSchemaV6,
  });
