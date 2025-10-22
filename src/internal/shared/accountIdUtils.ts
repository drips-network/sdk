const ORCID_FORMAT_REGEX = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/

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
  if (ORCID_FORMAT_REGEX.test(nameStr)) {
    return nameStr
  }

  return null;
}