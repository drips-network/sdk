import {parseUnits, formatUnits} from 'viem';
import {DripsError} from './DripsError';

/** Multiplier used to add precision when storing amounts per second. */
export const AMT_PER_SEC_MULTIPLIER = 1_000_000_000;

/** Number of extra decimal places applied to amounts per second for precision. */
export const AMT_PER_SEC_EXTRA_DECIMALS = 9;

/** Number of seconds in a streaming cycle (1 week). */
export const CYCLE_SECS = 604800;

/** Stream rate time units. */
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

/** Represents the configuration of a single stream. */
export type StreamConfig = {
  /** The unique identifier for the stream. */
  dripId: bigint;
  /**
   * The amount per second being streamed. Must never be zero.
   *
   * It must have additional `AMT_PER_SEC_EXTRA_DECIMALS` decimals and can have fractions.
   *
   * To achieve that the passed value must be multiplied by `AMT_PER_SEC_MULTIPLIER`.
   */
  amountPerSec: bigint;
  /**
   * The timestamp when streaming should start.
   *
   * If zero, the timestamp when the stream is configured is used.
   */
  start: bigint;
  /**
   * The duration of the stream in seconds.
   *
   * If zero, the stream runs until funds run out.
   */
  duration: bigint;
};

/**
 * Parses a stream rate from a human-readable amount and time unit to the internal representation.
 *
 * @param amount - The amount to stream in the specified time unit.
 * @param timeUnit - The time unit for the amount.
 * @param tokenDecimals - The number of decimal places for the token.
 *
 * @returns The amount per second with additional precision decimals.
 */
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

/**
 * Validates that a stream rate meets the minimum requirements.
 *
 * @param amountPerSecond - The amount per second to validate.
 *
 * @throws {DripsError} If the stream rate is too low (less than 1 wei per week).
 */
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

/**
 * Formats a stream rate from the internal representation to a human-readable string.
 *
 * @param amountPerSecond - The amount per second with additional precision decimals.
 * @param displayTimeUnit - The time unit to display the rate in.
 * @param tokenDecimals - The number of decimal places for the token.
 *
 * @returns A formatted string representing the stream rate in the specified time unit.
 */
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

/**
 * Encodes a `StreamConfig` into a `bigint` representation.
 *
 * @param config - The stream config to encode.
 * @returns A bigint representing the packed stream config.
 */
export function encodeStreamConfig(config: StreamConfig): bigint {
  validateStreamConfig(config);

  let packed = BigInt(config.dripId);
  packed = (packed << 160n) | BigInt(config.amountPerSec);
  packed = (packed << 32n) | BigInt(config.start);
  packed = (packed << 32n) | BigInt(config.duration);

  return packed;
}

/**
 * Decodes a `bigint` representation of a stream config into a `StreamConfig` object.
 *
 * @param packed - The encoded stream config.
 * @returns A validated `StreamConfig` object.
 */
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
