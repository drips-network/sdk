import {z} from 'zod';
import {dripListVariant as dripListVariantV6, nftDriverAccountMetadataSchemaV6} from './v6';
import { orcidSplitReceiverSchema } from '../repo-driver/v6';

export const dripListVariantV7 = dripListVariantV6.extend({
  recipients: z.array(
    z.union([
      ...dripListVariantV6.shape.recipients._def.type.options,
      orcidSplitReceiverSchema,
    ])
  ),
});

export const nftDriverAccountMetadataSchemaV7 = z.discriminatedUnion('type', [
  nftDriverAccountMetadataSchemaV6._def.options[0],
  dripListVariantV7,
]);
