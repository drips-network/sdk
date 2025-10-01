import {describe, it, expect} from 'vitest';
import {toDeadlineSeconds} from '../../../src/internal/shared/toDeadlineSeconds';
import {DripsError} from '../../../src/internal/shared/DripsError';

describe('toDeadlineSeconds', () => {
  it('should convert a valid future date to seconds', () => {
    const futureDate = new Date(Date.now() + 86400000); // 1 day in the future
    const result = toDeadlineSeconds(futureDate);
    const expected = Math.floor(futureDate.getTime() / 1000);

    expect(result).toBe(expected);
  });

  it('should throw error when deadline is not a Date instance', () => {
    expect(() => toDeadlineSeconds('invalid' as any)).toThrow(DripsError);
    expect(() => toDeadlineSeconds('invalid' as any)).toThrow(
      'Deadline must be a valid Date.',
    );
  });

  it('should throw error when deadline is an invalid Date', () => {
    const invalidDate = new Date('invalid');

    expect(() => toDeadlineSeconds(invalidDate)).toThrow(DripsError);
    expect(() => toDeadlineSeconds(invalidDate)).toThrow(
      'Deadline must be a valid Date.',
    );
  });

  it('should throw error when deadline is before Unix epoch', () => {
    const beforeEpoch = new Date(-1000);

    expect(() => toDeadlineSeconds(beforeEpoch)).toThrow(DripsError);
    expect(() => toDeadlineSeconds(beforeEpoch)).toThrow(
      'Deadline must not be before Unix epoch.',
    );
  });

  it('should throw error when deadline is in the past', () => {
    const pastDate = new Date(Date.now() - 1000);

    expect(() => toDeadlineSeconds(pastDate)).toThrow(DripsError);
    expect(() => toDeadlineSeconds(pastDate)).toThrow(
      'Deadline must be in the future.',
    );
  });

  it('should throw error when deadline is now', () => {
    const now = new Date(Math.floor(Date.now() / 1000) * 1000);

    expect(() => toDeadlineSeconds(now)).toThrow(DripsError);
    expect(() => toDeadlineSeconds(now)).toThrow(
      'Deadline must be in the future.',
    );
  });

  it('should throw error when deadline exceeds UINT32_MAX', () => {
    const farFuture = new Date((0xffffffff + 1) * 1000);

    expect(() => toDeadlineSeconds(farFuture)).toThrow(DripsError);
    expect(() => toDeadlineSeconds(farFuture)).toThrow(
      'Deadline exceeds supported range.',
    );
  });
});
