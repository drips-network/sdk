// Constants for bit widths
const STREAM_ID_BITS = 32n;
const AMT_PER_SEC_BITS = 160n;
const START_BITS = 32n;
const DURATION_BITS = 32n;

const MAX_STREAM_ID = (1n << STREAM_ID_BITS) - 1n;
const MAX_AMT_PER_SEC = (1n << AMT_PER_SEC_BITS) - 1n;
const MAX_START = (1n << START_BITS) - 1n;
const MAX_DURATION = (1n << DURATION_BITS) - 1n;

const MASK_32 = (1n << 32n) - 1n;
const MASK_160 = (1n << 160n) - 1n;

export type StreamConfig = {
  readonly streamId: bigint;
  readonly amountPerSec: bigint;
  readonly start: bigint;
  readonly duration: bigint;
};

function validateStreamConfig(config: StreamConfig): void {
  const {streamId, amountPerSec, start, duration} = config;

  if (streamId < 0n || streamId > MAX_STREAM_ID)
    throw new Error(`'streamId' must be in [0, ${MAX_STREAM_ID}]`);

  if (amountPerSec <= 0n || amountPerSec > MAX_AMT_PER_SEC)
    throw new Error(`'amtPerSec' must be in (0, ${MAX_AMT_PER_SEC}]`);

  if (start < 0n || start > MAX_START)
    throw new Error(`'start' must be in [0, ${MAX_START}]`);

  if (duration < 0n || duration > MAX_DURATION)
    throw new Error(`'duration' must be in [0, ${MAX_DURATION}]`);
}

export function encodeStreamConfig(config: StreamConfig): bigint {
  validateStreamConfig(config);

  const {streamId, amountPerSec, start, duration} = config;

  return (
    (((((streamId << AMT_PER_SEC_BITS) | amountPerSec) << START_BITS) |
      start) <<
      DURATION_BITS) |
    duration
  );
}

export function decodeStreamConfig(packed: bigint): StreamConfig {
  const duration = packed & MASK_32;
  const start = (packed >> 32n) & MASK_32;
  const amountPerSec = (packed >> 64n) & MASK_160;
  const streamId = packed >> (160n + 64n);

  const config: StreamConfig = {
    streamId,
    amountPerSec,
    start,
    duration,
  };

  validateStreamConfig(config);
  return config;
}
