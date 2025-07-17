import {Address, checksumAddress} from 'viem';
import {DripsError} from './DripsError';

/**
 * Resolves the address from an `AddressDriver` account ID.
 *
 * @param accountId - The `AddressDriver` account ID, which is a bigint.
 * @returns The resolved address (checksummed).
 * @throws {DripsError} If the ID is out of range or not zero-padded correctly.
 */
export function resolveAddressFromAddressDriverId(accountId: bigint): Address {
  const MAX_UINT256 = (1n << 256n) - 1n;

  if (accountId < 0n || accountId > MAX_UINT256) {
    throw new DripsError(
      `Invalid accountId: ${accountId} is outside the uint256 range.`,
      {
        meta: {
          operation: resolveAddressFromAddressDriverId.name,
        },
      },
    );
  }

  // AddressDriver layout: [32 bits driverId | 64 bits zero | 160 bits address]
  const mid64BitsMask = ((1n << 224n) - 1n) ^ ((1n << 160n) - 1n);
  const middleBits = accountId & mid64BitsMask;

  if (middleBits !== 0n) {
    throw new Error('Invalid AddressDriver ID: bits 160–223 must be zero.');
  }

  const addressBigInt = accountId & ((1n << 160n) - 1n);
  const addressHex =
    `0x${addressBigInt.toString(16).padStart(40, '0')}` as Address;

  return checksumAddress(addressHex);
}
