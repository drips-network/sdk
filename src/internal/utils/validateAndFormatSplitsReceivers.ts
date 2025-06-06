import {DripsError} from '../../sdk/DripsError';
import {SdkSplitsReceiver} from '../metadata/createPinataIpfsUploader';

export type SplitsReceiver = {
  accountId: bigint;
  weight: number;
};

export const MAX_SPLITS_RECEIVERS = 200;

export function validateAndFormatSplitsReceivers(
  receivers: ReadonlyArray<SdkSplitsReceiver>,
): SplitsReceiver[] {
  const contractReceivers: SplitsReceiver[] = receivers.map(r => ({
    accountId: BigInt(r.accountId),
    weight: r.weight,
  }));

  validateSplitsNotEmpty(contractReceivers);
  validateMaxSplitsCount(contractReceivers);
  const validSplits = validatePositiveWeights(contractReceivers);
  const uniqueSplits = validateNoDuplicates(validSplits);
  const sortedSplits = sortSplitsByAccountId(uniqueSplits);

  return sortedSplits;
}

function validateSplitsNotEmpty(receivers: SplitsReceiver[]): void {
  if (receivers.length === 0) {
    throw new DripsError('Splits receivers cannot be empty');
  }
}

function validateMaxSplitsCount(receivers: SplitsReceiver[]): SplitsReceiver[] {
  if (receivers.length > MAX_SPLITS_RECEIVERS) {
    throw new DripsError(
      `Too many splits receivers: ${receivers.length}. Maximum is ${MAX_SPLITS_RECEIVERS}`,
    );
  }
  return receivers;
}

function validatePositiveWeights(
  receivers: SplitsReceiver[],
): SplitsReceiver[] {
  const invalidReceivers = receivers.filter(r => r.weight <= 0);
  if (invalidReceivers.length > 0) {
    throw new DripsError(
      `Invalid split receiver weights: ${invalidReceivers.map(r => r.accountId).join(', ')} have weight <= 0`,
    );
  }
  return receivers;
}

function validateNoDuplicates(receivers: SplitsReceiver[]): SplitsReceiver[] {
  const seen = new Set<bigint>();
  const duplicates: bigint[] = [];

  for (const r of receivers) {
    if (seen.has(r.accountId)) duplicates.push(r.accountId);
    else seen.add(r.accountId);
  }

  if (duplicates.length > 0) {
    throw new DripsError(
      `Duplicate splits receivers found: ${[...new Set(duplicates)].join(', ')}`,
    );
  }

  return receivers;
}

function sortSplitsByAccountId(receivers: SplitsReceiver[]): SplitsReceiver[] {
  return [...receivers].sort((a, b) => (a.accountId > b.accountId ? 1 : -1));
}
