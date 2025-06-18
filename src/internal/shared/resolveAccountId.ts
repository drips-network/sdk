import {Address} from 'viem';
import {ReadBlockchainAdapter} from '../blockchain/BlockchainAdapter';
import {DripsError} from './DripsError';
import {calcProjectId} from '../projects/calcProjectId';
import {destructProjectUrl} from '../projects/destructProjectUrl';
import {calcAddressId} from './calcAddressId';

export type AccountDetails = {
  type:
    | 'project'
    | 'drip-list'
    | 'sub-list'
    | 'address'
    | 'ecosystem-main-account';
  url?: string;
  address?: Address;
  accountId?: bigint;
};

export async function resolveAccountId(
  adapter: ReadBlockchainAdapter,
  account: AccountDetails,
): Promise<bigint> {
  if (account.type === 'project') {
    if (!account.url) {
      throw new DripsError('Project receiver must have a url', {
        meta: {
          operation: 'resolveAccountId',
          receiver: account,
        },
      });
    }
    const {forge, ownerName, repoName} = destructProjectUrl(account.url);
    return await calcProjectId(adapter, {
      forge,
      name: `${ownerName}/${repoName}`,
    });
  } else if (account.type === 'address') {
    if (!account.address) {
      throw new DripsError('Address receiver must have an address', {
        meta: {
          operation: 'resolveAccountId',
          receiver: account,
        },
      });
    }
    return await calcAddressId(adapter, account.address);
  } else if (
    account.type === 'drip-list' ||
    account.type === 'sub-list' ||
    account.type === 'ecosystem-main-account'
  ) {
    if (!account.accountId) {
      throw new DripsError(`${account.type} receiver must have an accountId`, {
        meta: {
          operation: 'resolveAccountId',
          receiver: account,
        },
      });
    }
    return account.accountId;
  }

  throw new DripsError(`Unsupported receiver type: ${(account as any).type}`, {
    meta: {
      operation: 'resolveAccountId',
      receiver: account,
    },
  });
}
