/**
 * Extracts ORCID from a RepoDriver account ID
 * @param accountId - The account ID as a string (hex) or bigint
 * @param expectedDriverId - The expected driver ID to validate against
 * @returns ExtractionResult containing the forge type, ORCID (if extractable), and success status
 */
export function extractORCIDFromAccountId(
  accountId: string | bigint,
  expectedDriverId: number
): string | null {
  try {
    // Convert to bigint for bit operations
    const accountIdBigInt = typeof accountId === 'string'
      ? BigInt(accountId)
      : accountId;

    // Extract the driver ID (top 32 bits)
    const extractedDriverId = Number(accountIdBigInt >> 224n);

    // Verify this account belongs to the expected driver
    if (extractedDriverId !== expectedDriverId) {
      return null
    }

    // Extract the forge ID (next 8 bits)
    const forgeId = Number((accountIdBigInt >> 216n) & 0xFFn);

    // Extract the name encoded part (bottom 216 bits)
    const nameEncoded = accountIdBigInt & ((1n << 216n) - 1n);

    // Extract ORCID from nameEncoded (stored as right-padded bytes)
    const orcid = extractStringFromPaddedBytes(nameEncoded, 27);

    if (orcid.length === 0) {
      return null
    }

    return orcid
  } catch (error) {
    return null
  }
}

/**
 * Extracts a string from right-padded bytes stored as a bigint
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

// Example usage:
/*
const accountId = "0x00000002046162636465666768696a6b6c6d2f6e6f707172737475767778797a";
const driverId = 2;

const result = extractORCIDFromAccountId(accountId, driverId);
console.log(result);
// Output: { forge: 'ORCID', orcid: 'abcdefghijklm/nopqrstuvwxyz', success: true }

// Verify the extraction
const isValid = verifyORCIDForAccountId(accountId, result.orcid, driverId);
console.log('Verification:', isValid); // true
*/
