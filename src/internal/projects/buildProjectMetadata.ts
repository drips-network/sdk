import z from 'zod';
import {emojiAvatarSchema} from '../metadata/schemas/repo-driver/v4';
import {ProjectMetadata} from '../shared/createPinataIpfsMetadataUploader';
import {Forge} from './calcProjectId';

export type ProjectEmojiAvatar = z.output<typeof emojiAvatarSchema>;

export type ProjectImageAvatar = {
  readonly type: 'image';
  readonly cid: string;
};

export type ProjectAvatar = ProjectEmojiAvatar | ProjectImageAvatar;

export type ProjectSource = {
  readonly forge: Extract<Forge, 'github'>;
  readonly repoName: string;
  readonly ownerName: string;
  readonly url: string;
};

export type ProjectMetadataConfig = {
  /** Hex or CSS color string for the project profile. */
  readonly color: string;
  /** Avatar configuration (emoji or IPFS image CID). */
  readonly avatar: ProjectAvatar;
  /** Optional project description. */
  readonly description?: string;
  /** Whether the project is visible in the Drips UI. Defaults to `true`. */
  readonly isVisible?: boolean;
};

export function buildProjectMetadata(params: {
  readonly projectId: bigint;
  readonly source: ProjectSource;
  readonly metadata: ProjectMetadataConfig;
  readonly splits: ProjectMetadata['splits'];
}): ProjectMetadata {
  const {projectId, source, metadata, splits} = params;
  const {color, avatar, description, isVisible = true} = metadata;

  return {
    driver: 'repo',
    describes: {
      driver: 'repo',
      accountId: projectId.toString(),
    },
    source: {
      forge: source.forge,
      repoName: source.repoName,
      ownerName: source.ownerName,
      url: source.url,
    },
    color,
    description: description ?? undefined,
    avatar:
      avatar.type === 'emoji'
        ? {type: 'emoji', emoji: avatar.emoji}
        : {type: 'image', cid: avatar.cid},
    isVisible,
    splits: {
      maintainers: [...splits.maintainers],
      dependencies: [...splits.dependencies],
    },
  };
}
