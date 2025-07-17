import {DripsError} from './DripsError';

/**
 * Resolves the driver name from an`accountId`.
 *
 * Known driver IDs:
 * - `0`: "address"
 * - `1`: "nft"
 * - `2`: "immutableSplits"
 * - `3`: "repo"
 * - `4`: "repoSubAccount"
 *
 * @param accountId - The account ID.
 * @returns The driver name.
 * @throws {DripsError} If the account ID is out of range or the driver is unknown.
 */
export function resolveDriverName(accountId: bigint) {
  if (accountId < 0n || accountId > 2n ** 256n - 1n) {
    throw new DripsError(
      `Could not get bits: ${accountId} is not a valid positive number within the range of a uint256.`,
      {
        meta: {
          operation: resolveDriverName.name,
        },
      },
    );
  }

  const mask = 2n ** 32n - 1n; // 32 bits mask

  const bits = (accountId >> 224n) & mask; // eslint-disable-line no-bitwise

  switch (bits) {
    case 0n:
      return 'address';
    case 1n:
      return 'nft';
    case 2n:
      return 'immutableSplits';
    case 3n:
      return 'repo';
    case 4n:
      return 'repoSubAccount';
    default:
      throw new Error(`Unknown  for ID ${accountId}.`);
  }
}
