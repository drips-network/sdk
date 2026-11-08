import {describe, it, expect} from 'vitest';
import {buildProjectMetadata} from '../../../src/internal/projects/buildProjectMetadata';

describe('buildProjectMetadata', () => {
  it('builds metadata correctly with emoji avatar and default visibility', () => {
    const metadata = buildProjectMetadata({
      projectId: 123456n,
      source: {
        forge: 'github',
        ownerName: 'drips-network',
        repoName: 'sdk',
        url: 'https://github.com/drips-network/sdk',
      },
      metadata: {
        color: '#ff5500',
        avatar: {
          type: 'emoji',
          emoji: '💧',
        },
        description: 'Drips JavaScript SDK',
      },
      splits: {
        maintainers: [
          {
            type: 'address',
            accountId: '1001',
            weight: 600000,
          },
        ],
        dependencies: [
          {
            type: 'repoDriver',
            accountId: '2001',
            weight: 400000,
            source: {
              forge: 'github',
              url: 'https://github.com/drips-network/contracts',
              ownerName: 'drips-network',
              repoName: 'contracts',
            },
          },
        ],
      },
    });

    expect(metadata.driver).toBe('repo');
    expect(metadata.describes.accountId).toBe('123456');
    expect(metadata.source.forge).toBe('github');
    expect(metadata.color).toBe('#ff5500');
    expect(metadata.avatar).toEqual({type: 'emoji', emoji: '💧'});
    expect(metadata.description).toBe('Drips JavaScript SDK');
    expect(metadata.isVisible).toBe(true);
    expect(metadata.splits.maintainers).toHaveLength(1);
    expect(metadata.splits.dependencies).toHaveLength(1);
  });

  it('builds metadata with image avatar and explicit isVisible false', () => {
    const metadata = buildProjectMetadata({
      projectId: 999n,
      source: {
        forge: 'github',
        ownerName: 'acme',
        repoName: 'secret',
        url: 'https://github.com/acme/secret',
      },
      metadata: {
        color: '#000000',
        avatar: {
          type: 'image',
          cid: 'QmTestCid1234567890',
        },
        isVisible: false,
      },
      splits: {
        maintainers: [],
        dependencies: [],
      },
    });

    expect(metadata.avatar).toEqual({
      type: 'image',
      cid: 'QmTestCid1234567890',
    });
    expect(metadata.isVisible).toBe(false);
    expect(metadata.description).toBeUndefined();
  });
});
