import {ReadBlockchainAdapter} from '../blockchain/BlockchainAdapter';
import {calcRepoDriverAccountId, OrcidId} from '../projects/calcProjectId';
import {DripsError} from '../shared/DripsError';

/**
 * ORCID iDs in the sandbox environment should start with this prefix.
 */
export const SANDBOX_PREFIX = 'sandbox-'

/**
 * Regex to match the sandbox prefix at the start of an ORCID iD.
 */
const SANDBOX_PREFIX_REGEX = new RegExp(`^${SANDBOX_PREFIX}`);

export function unprefixOrcidId(orcidId: string): string {
  return orcidId.replace(SANDBOX_PREFIX_REGEX, '');
}

/**
 * Validates ORCID base format (no dashes): 0009000142722989X
 */
const ORCID_BASE_FORMAT_REGEX = /^\d{15}[\dX]$/i;

/**
 * Validates ORCID display format (with dashes): 0009-0001-4272-298X
 */
const ORCID_DISPLAY_FORMAT_REGEX = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

export function assertValidOrcidId(orcidId: string): void {
  if (typeof orcidId !== 'string') {
    throw new DripsError('Invalid ORCID: expected string.', {
      meta: {operation: assertValidOrcidId.name, orcidId},
    });
  }

  const unprefixedOrcidId = unprefixOrcidId(orcidId);
  const baseStr: string = unprefixedOrcidId.replace(/[-\s]/g, '');

  if (!ORCID_BASE_FORMAT_REGEX.test(baseStr.toUpperCase())) {
    throw new DripsError('Invalid ORCID format.', {
      meta: {operation: assertValidOrcidId.name, unprefixedOrcidId},
    });
  }

  let total = 0;
  for (let i = 0; i < 15; i++) {
    const digit = parseInt(baseStr[i], 10);
    if (Number.isNaN(digit)) {
      throw new DripsError('Invalid ORCID digits.', {
        meta: {operation: assertValidOrcidId.name, unprefixedOrcidId},
      });
    }
    total = (total + digit) * 2;
  }

  const remainder = total % 11;
  const result = (12 - remainder) % 11;
  const calculatedCheckDigit = result === 10 ? 'X' : String(result);
  const actualCheckDigit = baseStr.charAt(15).toUpperCase();

  if (calculatedCheckDigit !== actualCheckDigit) {
    throw new DripsError('Invalid ORCID checksum.', {
      meta: {operation: assertValidOrcidId.name, unprefixedOrcidId},
    });
  }
}

export function normalizeOrcidForContract(orcidId: string): string {
  const trimmed = (orcidId ?? '').trim();
  if (trimmed.length === 0) {
    throw new DripsError('ORCID is empty.', {
      meta: {operation: normalizeOrcidForContract.name, orcidId},
    });
  }

  return trimmed;
}

/**
 * Extracts the ORCID identifier from a RepoDriver account ID.
 * @param accountId The RepoDriver account ID representing an ORCID account
 * @returns The ORCID identifier (e.g., "0009-0001-4272-298X") or null if the
 *  extracted string does not resemble an ORCID iD.
 */
export function extractOrcidIdFromAccountId(accountId: string): string | null {
  const accountIdAsBigInt = BigInt(accountId);
  // Extract nameEncoded from bits 0-215 (216 bits) using bit mask
  // (1n << 216n) - 1n creates mask of 216 ones: 0x0...0FFFFFFFFFF...FF
  const nameEncoded = accountIdAsBigInt & ((1n << 216n) - 1n);

  // Convert BigInt to hex string, then to bytes and remove null padding
  const nameBytes = nameEncoded.toString(16).padStart(54, '0'); // 216 bits = 27 bytes = 54 hex chars
  const nameStr = Buffer.from(nameBytes, 'hex')
    .toString('utf8')
    .replace(/\0+$/, '');

  // Perform a light check that this is something that resembles
  // an ORCID iD.
  if (ORCID_DISPLAY_FORMAT_REGEX.test(nameStr)) {
    return nameStr;
  }

  return null;
}

/**
 * Calculates the account ID for an ORCID identifier on the RepoDriver.
 *
 * @param adapter The blockchain adapter for reading blockchain data.
 * @param orcidId The ORCID identifier (e.g., "0009-0001-4272-298X").
 * @returns A promise that resolves to the account ID as a bigint.
 */
export async function calcOrcidAccountId(
  adapter: ReadBlockchainAdapter,
  orcidId: OrcidId,
): Promise<bigint> {
  return calcRepoDriverAccountId(adapter, {forge: 'orcid', name: orcidId});
}
