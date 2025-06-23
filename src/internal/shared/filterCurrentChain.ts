import type {SupportedChain as ChainName} from '../graphql/__generated__/base-types';
import {DripsError} from './DripsError';

export function filterCurrentChain<T extends {chain: string}>(
  items: T[] | null | undefined,
  chain: ChainName,
): T {
  if (!Array.isArray(items)) {
    throw new DripsError(
      `Expected an array of items for chain "${chain}", but got invalid input.`,
      {
        meta: {
          operation: 'filterCurrentChain',
        },
      },
    );
  }

  const matches = items.filter(item => item.chain === chain);

  if (matches.length === 1) return matches[0];

  if (matches.length === 0) {
    throw new DripsError(`No item found for chain "${chain}".`, {
      meta: {
        operation: 'filterCurrentChain',
      },
    });
  }

  throw new DripsError(
    `Expected exactly one item for chain "${chain}", but found ${matches.length}.`,
    {
      meta: {
        operation: 'filterCurrentChain',
      },
    },
  );
}
