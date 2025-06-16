import {
  Account,
  Address,
  Hex,
  publicActions,
  PublicClient,
  WalletClient,
} from 'viem';
import {
  PreparedTx,
  TxResponse,
  ReadBlockchainAdapter,
  WriteBlockchainAdapter,
} from '../../BlockchainAdapter';
import {mapToViemCallParameters, mapFromViemResponse} from './viemMappers';
import {DripsError} from '../../../shared/DripsError';
import {requireWalletHasAccount} from '../../../shared/assertions';
import {createViemMeta} from './createViemMeta';

export function createViemReadAdapter(
  publicClient: PublicClient,
): ReadBlockchainAdapter {
  return {
    async call(tx: PreparedTx): Promise<Hex> {
      const meta = createViemMeta(tx, {
        client: publicClient,
        operationFallback: 'call',
      });

      try {
        const callParams = mapToViemCallParameters(tx);
        const result = await publicClient.call(callParams);

        if (!result.data) {
          throw new DripsError('Contract call returned no data', {meta});
        }

        return result.data;
      } catch (error) {
        throw new DripsError('Contract read failed', {cause: error, meta});
      }
    },

    async getChainId(): Promise<number> {
      try {
        return publicClient.chain?.id ?? (await publicClient.getChainId());
      } catch (error) {
        throw new DripsError('Failed to get chain ID', {cause: error});
      }
    },
  };
}

export function createViemWriteAdapter(
  walletClient: WalletClient & {account: Account},
): WriteBlockchainAdapter {
  requireWalletHasAccount(walletClient);

  const publicClient = walletClient.extend(publicActions) as PublicClient;

  return {
    ...createViemReadAdapter(publicClient),

    async getAddress(): Promise<Address> {
      return walletClient.account.address;
    },

    async sendTx(tx: PreparedTx): Promise<TxResponse> {
      const meta = createViemMeta(tx, {
        client: walletClient,
        account: walletClient.account,
        operationFallback: 'sendTx',
      });

      try {
        const callParams = mapToViemCallParameters(tx);

        const txHash = await walletClient.sendTransaction({
          ...callParams,
          chain: walletClient.chain,
          account: walletClient.account,
        });

        return {
          ...mapFromViemResponse(txHash, publicClient),
          meta,
        };
      } catch (error) {
        throw new DripsError('Contract write failed', {cause: error, meta});
      }
    },

    async signMsg(message: string | Uint8Array): Promise<Hex> {
      const meta = {
        message,
        chainId: walletClient.chain?.id,
        operation: 'signMsg',
      };

      try {
        return await walletClient.signMessage({
          account: walletClient.account,
          message: typeof message === 'string' ? message : {raw: message},
        });
      } catch (error) {
        throw new DripsError('Message signing failed', {cause: error, meta});
      }
    },
  };
}
