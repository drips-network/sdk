import {requireSupportedForge} from '../shared/assertions';
import {Forge} from './calcProjectId';

export function destructProjectUrl(url: string): {
  forge: Extract<Forge, 'github'>;
  ownerName: string;
  repoName: string;
} {
  const pattern =
    /^(?:https?:\/\/)?(?:www\.)?(github|gitlab)\.com\/([^\/]+)\/([^\/]+)/; // eslint-disable-line no-useless-escape
  const match = url.match(pattern);

  if (!match) {
    throw new Error(`Unsupported repository url: ${url}.`);
  }

  const forge = match[1];
  requireSupportedForge(forge);

  const ownerName = match[2];
  const repoName = match[3];

  return {
    forge: 'github', // TODO: refactor when supporting more forges
    ownerName,
    repoName,
  };
}
