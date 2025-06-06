import {z} from 'zod';
import {nftDriverAccountMetadataSchemaV4} from './v4';

export const nftDriverAccountMetadataSchemaV5 =
  nftDriverAccountMetadataSchemaV4.extend({
    isVisible: z.boolean(),
  });
