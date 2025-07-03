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
  const nonZeroReceivers = validateNonZeroAmtPerSec(onChainReceivers);
  const sortedReceivers = sortStreamReceivers(nonZeroReceivers);
  validateSortedAndDeduplicated(sortedReceivers);
  return sortedReceivers;
}

function validateMaxReceiversCount(receivers: OnChainStreamReceiver[]): void {
  if (receivers.length > MAX_STREAMS_RECEIVERS) {
    throw new DripsError(
      `Too many stream receivers: ${receivers.length}. Maximum is ${MAX_STREAMS_RECEIVERS}`,
    );
  }
}

function validateNonZeroAmtPerSec(
  receivers: OnChainStreamReceiver[],
): OnChainStreamReceiver[] {
  const invalid = receivers.filter(
    r => decodeStreamConfig(r.config).amountPerSec === 0n,
  );

  if (invalid.length > 0) {
    throw new DripsError(
      `Stream receivers with 0 amtPerSec: ${invalid
        .map(r => r.accountId.toString())
        .join(', ')}`,
    );
  }

  return receivers;
}

function sortStreamReceivers(
  receivers: OnChainStreamReceiver[],
): OnChainStreamReceiver[] {
  return [...receivers].sort((a, b) => {
    if (a.accountId !== b.accountId) {
      return a.accountId > b.accountId ? 1 : -1;
    }
    return a.config > b.config ? 1 : -1; // Mirrors StreamConfig.lt
  });
}

function validateSortedAndDeduplicated(
  receivers: OnChainStreamReceiver[],
): void {
  for (let i = 1; i < receivers.length; i++) {
    const prev = receivers[i - 1];
    const curr = receivers[i];

    const sameAccount = prev.accountId === curr.accountId;
    const sameConfig = prev.config === curr.config;

    if (sameAccount && sameConfig) {
      throw new DripsError(
        `Duplicate stream receiver: accountId=${curr.accountId.toString()}, config=${curr.config.toString()}`,
      );
    }

    const ordered =
      prev.accountId < curr.accountId ||
      (prev.accountId === curr.accountId && prev.config < curr.config);

    if (!ordered) {
      throw new DripsError(
        `Stream receivers not sorted: receiver at index ${i - 1} (${prev.accountId}, ${prev.config}) should come before receiver at index ${i} (${curr.accountId}, ${curr.config})`,
      );
    }
  }
}
