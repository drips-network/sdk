import {stringToHex, pad, toBytes, toHex} from 'viem';
import {DripsError} from './DripsError';

export const USER_METADATA_KEY = 'ipfs';

export function encodeMetadataKeyValue({
  key,
  value,
}: {
  key: string;
  value: string;
}) {
  const keyBytes = toBytes(key);

  if (keyBytes.length > 31) {
    throw new DripsError(
      `Metadata key "${key}" is too long: ${keyBytes.length} bytes (max 31)`,
    );
  }

  const encodedKey = pad(toHex(keyBytes), {size: 32, dir: 'right'});

  return {
    key: encodedKey,
    value: stringToHex(value),
  };
}
