import {parseUnits, formatUnits} from 'viem';
import {DripsError} from './DripsError';

export const AMT_PER_SEC_MULTIPLIER = 1_000_000_000; // 10^9
export const AMT_PER_SEC_EXTRA_DECIMALS = 9;
export const CYCLE_SECS = 604800; // 1 week in seconds

export enum TimeUnit {
  SECOND = 1,
  MINUTE = 60,
  HOUR = 3600,
  DAY = 86400,
  WEEK = 604800,
  /** 30 Days */
  MONTH = 2592000,
  /** 365 Days */
  YEAR = 31536000,
}

export type StreamConfig = {
  dripId: bigint;
  amountPerSec: bigint;
  start: bigint;
  duration: bigint;
};

export function parseStreamRate(
  amount: string,
  timeUnit: TimeUnit,
  tokenDecimals: number,
): bigint {
  const totalDecimals = tokenDecimals + AMT_PER_SEC_EXTRA_DECIMALS;
  const amountWithPrecision = parseUnits(amount, totalDecimals);

  const amountPerSecond = amountWithPrecision / BigInt(timeUnit);

  return amountPerSecond;
}

export function validateStreamRate(amountPerSecond: bigint): void {
  const amountPerCycle = amountPerSecond * BigInt(CYCLE_SECS);
  const weiPerCycle = amountPerCycle / BigInt(AMT_PER_SEC_MULTIPLIER);

  if (weiPerCycle < 1n) {
    throw new DripsError('Stream rate must be higher than 1 wei per week', {
      meta: {
        operation: validateStreamRate.name,
        amountPerSecond: amountPerSecond.toString(),
        weiPerCycle: weiPerCycle.toString(),
      },
    });
  }
}

export function formatStreamRate(
  amountPerSecond: bigint,
  displayTimeUnit: TimeUnit,
  tokenDecimals: number,
): string {
  const scaledAmount = amountPerSecond * BigInt(displayTimeUnit);

  const displayAmount = scaledAmount / BigInt(AMT_PER_SEC_MULTIPLIER);

  return formatUnits(displayAmount, tokenDecimals);
}

const STREAM_ID_BITS = 32n;
const AMT_PER_SEC_BITS = 160n;
const START_BITS = 32n;
const DURATION_BITS = 32n;

const MAX_STREAM_ID = (1n << STREAM_ID_BITS) - 1n;
const MAX_AMT_PER_SEC = (1n << AMT_PER_SEC_BITS) - 1n;
const MAX_START = (1n << START_BITS) - 1n;
const MAX_DURATION = (1n << DURATION_BITS) - 1n;

function validateStreamConfig(config: StreamConfig): void {
  const {dripId, amountPerSec, start, duration} = config;

  if (dripId < 0n || dripId > MAX_STREAM_ID)
    throw new Error(`'dripId' must be in [0, ${MAX_STREAM_ID}]`);

  if (amountPerSec <= 0n || amountPerSec > MAX_AMT_PER_SEC)
    throw new Error(`'amtPerSec' must be in (0, ${MAX_AMT_PER_SEC}]`);

  if (start < 0n || start > MAX_START)
    throw new Error(`'start' must be in [0, ${MAX_START}]`);

  if (duration < 0n || duration > MAX_DURATION)
    throw new Error(`'duration' must be in [0, ${MAX_DURATION}]`);
}

export function encodeStreamConfig(config: StreamConfig): bigint {
  validateStreamConfig(config);

  let packed = BigInt(config.dripId);
  packed = (packed << 160n) | BigInt(config.amountPerSec);
  packed = (packed << 32n) | BigInt(config.start);
  packed = (packed << 32n) | BigInt(config.duration);

  return packed;
}

export function decodeStreamConfig(packed: bigint): StreamConfig {
  const mask32 = (1n << 32n) - 1n;
  const mask160 = (1n << 160n) - 1n;

  const config: StreamConfig = {
    dripId: packed >> (160n + 32n + 32n),
    amountPerSec: (packed >> (32n + 32n)) & mask160,
    start: (packed >> 32n) & mask32,
    duration: packed & mask32,
  };

  validateStreamConfig(config);
  return config;
}
