import {Hash} from 'viem';
import {
  immutableSplitsDriverMetadataParser,
  nftDriverAccountMetadataParser,
  repoDriverAccountMetadataParser,
} from './schemas';
import {DripsError} from '../DripsError';
import {PinataSDK} from 'pinata';

export type DripListMetadata = Extract<
  ReturnType<typeof nftDriverAccountMetadataParser.parseLatest>,
  {type: 'dripList'}
>;

export type ProjectMetadata = ReturnType<
  typeof repoDriverAccountMetadataParser.parseLatest
>;

export type SubListMetadata = ReturnType<
  typeof immutableSplitsDriverMetadataParser.parseLatest
>;

export type Metadata = DripListMetadata | ProjectMetadata | SubListMetadata;

export type SdkSplitsReceiver = DripListMetadata['recipients'][number];

export type IpfsUploaderFn<T extends Metadata> = (metadata: T) => Promise<Hash>;

type IpfsClientLike = {
  uploadJson: (metadata: Metadata) => Promise<{cid: string}>;
};

const parsers = {
  nft: nftDriverAccountMetadataParser,
  repo: repoDriverAccountMetadataParser,
  'immutable-splits': immutableSplitsDriverMetadataParser,
} as const satisfies Record<Metadata['driver'], unknown>;

function getMetadataParser(metadata: Metadata) {
  const parser = parsers[metadata.driver];
  if (!parser) {
    throw new DripsError('Unsupported metadata driver', {
      meta: {
        operation: 'getMetadataParser',
        metadata,
      },
    });
  }
  return parser;
}

function createIpfsUploader(client: IpfsClientLike): IpfsUploaderFn<Metadata> {
  return async (metadata: Metadata) => {
    try {
      getMetadataParser(metadata);
      const {cid} = await client.uploadJson(metadata);
      return cid as Hash;
    } catch (err: unknown) {
      throw new DripsError('IPFS upload failed', {
        cause: err,
        meta: {
          operation: 'createIpfsUploader',
          metadata,
        },
      });
    }
  };
}

export function createPinataIpfsUploader({
  pinataJwt,
  pinataGateway,
}: {
  pinataJwt: string;
  pinataGateway: string;
}): IpfsUploaderFn<Metadata> {
  const pinata = new PinataSDK({
    pinataJwt,
    pinataGateway,
  });

  const client: IpfsClientLike = {
    uploadJson: async data => {
      const {cid} = await pinata.upload.public.json(data);
      return {cid};
    },
  };

  return createIpfsUploader(client);
}
