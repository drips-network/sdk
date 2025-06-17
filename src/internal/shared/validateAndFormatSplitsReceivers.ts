import {DripsError} from './DripsError';

export type OnChainSplitsReceiver = {
  accountId: bigint;
  weight: number;
};

export const MAX_SPLITS_RECEIVERS = 200;
export const TOTAL_SPLITS_WEIGHT = 100;

export async function validateAndFormatSplitsReceivers(
  onChainReceivers: OnChainSplitsReceiver[],
): Promise<OnChainSplitsReceiver[]> {
  validateSplitsNotEmpty(onChainReceivers);
  validateMaxSplitsCount(onChainReceivers);
  validateMaxSplitsWeightSum(onChainReceivers);
  const validSplits = validatePositiveWeights(onChainReceivers);
  const uniqueSplits = validateNoDuplicates(validSplits);
  const sortedSplits = sortSplitsByAccountId(uniqueSplits);

  return sortedSplits;
}

function validateSplitsNotEmpty(receivers: OnChainSplitsReceiver[]): void {
  if (receivers.length === 0) {
    throw new DripsError('Splits receivers cannot be empty');
  }
}

function validateMaxSplitsCount(
  receivers: OnChainSplitsReceiver[],
): OnChainSplitsReceiver[] {
  if (receivers.length > MAX_SPLITS_RECEIVERS) {
    throw new DripsError(
      `Too many splits receivers: ${receivers.length}. Maximum is ${MAX_SPLITS_RECEIVERS}`,
    );
  }
  return receivers;
}

function validateMaxSplitsWeightSum(
  receivers: OnChainSplitsReceiver[],
): OnChainSplitsReceiver[] {
  const totalWeight = receivers.reduce((sum, r) => sum + r.weight, 0);
  if (totalWeight > TOTAL_SPLITS_WEIGHT) {
    throw new DripsError(
      `Total weight of splits receivers exceeds ${TOTAL_SPLITS_WEIGHT}: ${totalWeight}`,
    );
  }
  return receivers;
}

function validatePositiveWeights(
  receivers: OnChainSplitsReceiver[],
): OnChainSplitsReceiver[] {
  const invalidReceivers = receivers.filter(r => r.weight <= 0);
  if (invalidReceivers.length > 0) {
    throw new DripsError(
      `Invalid split receiver weights: ${invalidReceivers.map(r => r.accountId).join(', ')} have weight <= 0`,
    );
  }
  return receivers;
}

function validateNoDuplicates(
  receivers: OnChainSplitsReceiver[],
): OnChainSplitsReceiver[] {
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

function sortSplitsByAccountId(
  receivers: OnChainSplitsReceiver[],
): OnChainSplitsReceiver[] {
  return [...receivers].sort((a, b) => (a.accountId > b.accountId ? 1 : -1));
}
