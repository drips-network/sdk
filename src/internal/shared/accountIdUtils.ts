/**
 * Extracts ORCID iD from a RepoDriver account ID
 *
 * @param accountId - The account ID as a string (hex) or bigint
 * @returns String containing the ORCID iD, or null if extraction fails
 */
export function extractOrcidIdFromAccountId(
  accountId: string | bigint
): string | null {
  // Convert to bigint for bit operations
  const accountIdBigInt = typeof accountId === 'string'
    ? BigInt(accountId)
    : accountId;

  // Extract the name encoded part directly (bottom 216 bits)
  const nameEncoded = accountIdBigInt & ((1n << 216n) - 1n);

  // Extract ORCID from nameEncoded (stored as right-padded bytes)
  const orcid = extractStringFromPaddedBytes(nameEncoded, 27);

  if (orcid.length === 0) {
    return null
  }

  return orcid
}

/**
 * Extracts a string from right-padded bytes stored as a bigint
 *
 * @param paddedBytes - The bytes as a bigint (right-padded with zeros)
 * @param maxLength - Maximum length in bytes
 * @returns The extracted string
 */
function extractStringFromPaddedBytes(paddedBytes: bigint, maxLength: number): string {
  // Convert bigint to hex string and pad to correct length
  const hexString = paddedBytes.toString(16).padStart(maxLength * 2, '0');

  // Convert hex pairs to bytes and find actual length
  const bytes: number[] = [];
  for (let i = 0; i < hexString.length; i += 2) {
    const byte = parseInt(hexString.substr(i, 2), 16);
    if (byte === 0) break; // Stop at first zero byte (padding)
    bytes.push(byte);
  }

  // Convert bytes to string
  return String.fromCharCode(...bytes);
}
