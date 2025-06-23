import {decodeStreamConfig} from './streamConfigUtils';
import {DripsError} from './DripsError';

export const MAX_STREAMS_RECEIVERS = 100;

export type OnChainStreamReceiver = {
  accountId: bigint;
  config: bigint;
};

export function validateAndFormatStreamReceivers(
  onChainReceivers: OnChainStreamReceiver[],
): OnChainStreamReceiver[] {
  validateMaxReceiversCount(onChainReceivers);
  const validReceivers = validateNonZeroAmtPerSec(onChainReceivers);
  const uniqueReceivers = validateNoDuplicateStreamReceivers(validReceivers);
  const sortedReceivers = sortStreamReceiversByAccountId(uniqueReceivers);

  return sortedReceivers;
}

function validateMaxReceiversCount(
  receivers: OnChainStreamReceiver[],
): OnChainStreamReceiver[] {
  if (receivers.length > MAX_STREAMS_RECEIVERS) {
    throw new DripsError(
      `Too many stream receivers: ${receivers.length}. Maximum is ${MAX_STREAMS_RECEIVERS}`,
    );
  }
  return receivers;
}

function validateNonZeroAmtPerSec(
  receivers: OnChainStreamReceiver[],
): OnChainStreamReceiver[] {
  const invalidReceivers = receivers.filter(r => {
    const decodedConfig = decodeStreamConfig(r.config);

    return (
      decodedConfig.amountPerSec === 0n || decodedConfig.amountPerSec === 0n
    );
  });
  if (invalidReceivers.length > 0) {
    throw new DripsError(
      `Stream receivers with 0 amtPerSec: ${invalidReceivers
        .map(r => r.accountId)
        .join(', ')}`,
    );
  }
  return receivers;
}

function validateNoDuplicateStreamReceivers(
  receivers: OnChainStreamReceiver[],
): OnChainStreamReceiver[] {
  const seen = new Set<bigint>();
  const duplicates: bigint[] = [];

  for (const r of receivers) {
    if (seen.has(r.accountId)) duplicates.push(r.accountId);
    else seen.add(r.accountId);
  }

  if (duplicates.length > 0) {
    throw new DripsError(
      `Duplicate stream receivers found: ${[...new Set(duplicates)].join(', ')}`,
    );
  }

  return receivers;
}

function sortStreamReceiversByAccountId(
  receivers: OnChainStreamReceiver[],
): OnChainStreamReceiver[] {
  return [...receivers].sort((a, b) => (a.accountId > b.accountId ? 1 : -1));
}
