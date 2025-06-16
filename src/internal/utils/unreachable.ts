import {DripsError} from '../DripsError';

export function unreachable(message?: string): never {
  let fullMessage = 'Unreachable code reached';

  if (message !== undefined) {
    fullMessage += `: ${message}`;
  }

  throw new DripsError(fullMessage);
}
