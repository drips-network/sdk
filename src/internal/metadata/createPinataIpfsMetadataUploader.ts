import {Hash} from 'viem';
import {
  addressDriverAccountMetadataParser,
  immutableSplitsDriverMetadataParser,
  nftDriverAccountMetadataParser,
  repoDriverAccountMetadataParser,
} from './schemas';
import {DripsError} from '../shared/DripsError';
import {PinataSDK} from 'pinata';
import {buildStreamsMetadata} from './buildStreamsMetatada';

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

export type StreamsMetadata = Awaited<ReturnType<typeof buildStreamsMetadata>>;

export type Metadata =
  | DripListMetadata
  | ProjectMetadata
  | SubListMetadata
  | StreamsMetadata;

export type IpfsMetadataUploaderFn<T extends Metadata> = (
  metadata: T,
) => Promise<Hash>;

type IpfsClientLike = {
  uploadJson: (metadata: Metadata) => Promise<{cid: string}>;
};

function toJsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
  );
}

const parsers = {
  nft: nftDriverAccountMetadataParser,
  repo: repoDriverAccountMetadataParser,
  'immutable-splits': immutableSplitsDriverMetadataParser,
  address: addressDriverAccountMetadataParser,
} as const;

function getMetadataParser(metadata: Metadata) {
  let parser: (typeof parsers)[keyof typeof parsers] | undefined;
  if ('describes' in metadata) {
    parser = parsers[metadata.describes.driver];
  } else if ('driver' in metadata) {
    parser = parsers[metadata.driver as keyof typeof parsers];
  }

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

function createIpfsMetadataUploader(
  client: IpfsClientLike,
): IpfsMetadataUploaderFn<Metadata> {
  return async (metadata: Metadata) => {
    try {
      getMetadataParser(metadata); // Type check
      const {cid} = await client.uploadJson(metadata); // Upload to IPFS
      return cid as Hash;
    } catch (err: unknown) {
      throw new DripsError('IPFS upload failed', {
        cause: err,
        meta: {
          operation: 'createIpfsMetadataUploader',
          metadata,
        },
      });
    }
  };
}

export function createPinataIpfsMetadataUploader({
  pinataJwt,
  pinataGateway,
}: {
  pinataJwt: string;
  pinataGateway: string;
}): IpfsMetadataUploaderFn<Metadata> {
  const pinata = new PinataSDK({
    pinataJwt,
    pinataGateway,
  });

  const client: IpfsClientLike = {
    uploadJson: async data => {
      const jsonSafeData = toJsonSafe(data);
      const {cid} = await pinata.upload.public.json(jsonSafeData);
      return {cid};
    },
  };

  return createIpfsMetadataUploader(client);
}
