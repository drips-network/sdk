import {isAddress} from 'ethers';
import {DripsError} from './DripsError';

const numericTest = /^\d+$/;

export default function encodeStreamId(
  senderAccountId: string,
  tokenAddress: string,
  dripId: string,
) {
  if (
    !(
      numericTest.test(senderAccountId) &&
      numericTest.test(dripId) &&
      isAddress(tokenAddress)
    )
  ) {
    throw new Error('Invalid values');
  }

  return `${senderAccountId}-${tokenAddress.toLowerCase()}-${dripId}`;
}

export function decodeStreamId(streamId: string) {
  const parts = streamId.split('-');

  if (parts.length !== 3) {
    throw new DripsError('Invalid stream ID format', {
      meta: {
        operation: 'decodeStreamId',
        streamId,
        parts,
      },
    });
  }

  const values = {
    senderAccountId: parts[0],
    tokenAddress: parts[1].toLowerCase(),
    dripId: parts[2],
  };

  if (
    !(
      numericTest.test(values.senderAccountId) &&
      numericTest.test(values.dripId) &&
      isAddress(values.tokenAddress)
    )
  ) {
    throw new Error('Invalid stream ID');
  }

  return values;
}
