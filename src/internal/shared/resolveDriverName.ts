import {DripsError} from './DripsError';

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
    case 5n:
      return 'repoDeadline';
    default:
      throw new Error(`Unknown  for ID ${accountId}.`);
  }
}
