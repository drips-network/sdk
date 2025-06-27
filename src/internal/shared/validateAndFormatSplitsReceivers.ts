import {DripsError} from './DripsError';
import {
  MAX_SPLITS_RECEIVERS,
  OnChainSplitsReceiver,
  TOTAL_SPLITS_WEIGHT,
} from './receiverUtils';

// 1% = 10_000 units.
// This multiplier converts percentage values (e.g., 25 for 25%) into the Solidity-compatible format
// expected by the Drips contracts, which use a fixed `_TOTAL_SPLITS_WEIGHT = 1_000_000`.
// That is: 100% * 10_000 = 1_000_000 total weight.
const WEIGHT_MULTIPLIER = 10_000;

export function validateAndFormatSplitsReceivers(
  onChainReceivers: OnChainSplitsReceiver[],
): OnChainSplitsReceiver[] {
  validatePercentRange(onChainReceivers);
  const scaled = scaleAndNormalizeWeights(onChainReceivers);
  validateSplitsNotEmpty(scaled);
  validateMaxReceiversCount(scaled);
  validateMaxSplitsWeightSum(scaled);
  const validSplits = validatePositiveWeights(scaled);
  const uniqueSplits = validateNoDuplicates(validSplits);
  const sortedSplits = sortSplitsByAccountId(uniqueSplits);

  return sortedSplits;
}

function validateSplitsNotEmpty(receivers: OnChainSplitsReceiver[]): void {
  if (receivers.length === 0) {
    throw new DripsError('Splits receivers cannot be empty');
  }
}

function validateMaxReceiversCount(receivers: OnChainSplitsReceiver[]): void {
  if (receivers.length > MAX_SPLITS_RECEIVERS) {
    throw new DripsError(
      `Too many splits receivers: ${receivers.length}. Maximum is ${MAX_SPLITS_RECEIVERS}`,
    );
  }
}

function validateMaxSplitsWeightSum(receivers: OnChainSplitsReceiver[]): void {
  const totalWeight = receivers.reduce((sum, r) => sum + r.weight, 0);
  if (totalWeight > TOTAL_SPLITS_WEIGHT) {
    throw new DripsError(
      `Total weight of splits receivers exceeds ${TOTAL_SPLITS_WEIGHT}: ${totalWeight}`,
    );
  }
}

function validatePositiveWeights(
  receivers: OnChainSplitsReceiver[],
): OnChainSplitsReceiver[] {
  const invalidReceivers = receivers.filter(r => r.weight <= 0);
  if (invalidReceivers.length > 0) {
    throw new DripsError(
      `Invalid split receiver weights: ${invalidReceivers
        .map(r => r.accountId)
        .join(', ')} have weight <= 0`,
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

function validatePercentRange(receivers: OnChainSplitsReceiver[]): void {
  const invalid = receivers.filter(r => r.weight < 0 || r.weight > 100);
  if (invalid.length > 0) {
    throw new DripsError(
      `Splits weight percentages must be between 0 and 100. Invalid: ${invalid
        .map(r => r.accountId)
        .join(', ')}`,
    );
  }
}

function scaleAndNormalizeWeights(
  receivers: OnChainSplitsReceiver[],
): OnChainSplitsReceiver[] {
  const scaled = receivers.map(r => ({
    accountId: r.accountId,
    original: r.weight,
    weight: Math.floor(r.weight * WEIGHT_MULTIPLIER),
  }));

  const total = scaled.reduce((sum, r) => sum + r.weight, 0);
  const remainder = TOTAL_SPLITS_WEIGHT - total;

  if (remainder > 0) {
    const max = scaled.reduce((prev, curr) =>
      curr.original > prev.original ? curr : prev,
    );
    max.weight += remainder;
  }

  return scaled.map(({accountId, weight}) => ({accountId, weight}));
}
