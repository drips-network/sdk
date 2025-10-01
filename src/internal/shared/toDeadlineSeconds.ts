import {DripsError} from './DripsError';

const UINT32_MAX = 0xffffffff;

export function toDeadlineSeconds(deadline: Date): number {
  if (!(deadline instanceof Date) || Number.isNaN(deadline.getTime())) {
    throw new DripsError('Deadline must be a valid Date.', {
      meta: {operation: toDeadlineSeconds.name, deadline},
    });
  }

  const seconds = Math.floor(deadline.getTime() / 1000);
  const nowSeconds = Math.floor(Date.now() / 1000);

  if (seconds < 0) {
    throw new DripsError('Deadline must not be before Unix epoch.', {
      meta: {operation: toDeadlineSeconds.name, deadline},
    });
  }

  if (seconds <= nowSeconds) {
    throw new DripsError('Deadline must be in the future.', {
      meta: {operation: toDeadlineSeconds.name, deadline},
    });
  }

  if (seconds > UINT32_MAX) {
    throw new DripsError('Deadline exceeds supported range.', {
      meta: {operation: toDeadlineSeconds.name, deadline},
    });
  }

  return seconds;
}
