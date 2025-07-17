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

/**
 * Creates a read-only blockchain adapter using a Viem `PublicClient`.
 *
 * This adapter supports the following read operations:
 * - `call`: Executes a static contract call and returns raw return data.
 * - `getChainId`: Resolves the current chain ID from the Viem client.
 *
 * @param {PublicClient} publicClient - The Viem client instance used for public (read-only) chain access.
 *
 * @returns {ReadBlockchainAdapter} A `ReadBlockchainAdapter` that implements read capabilities.
 */
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

/**
 * Creates a blockchain adapter using a Viem `WalletClient` with an attached account.
 *
 * This adapter supports the following read and write operations:
 * - `call`: Executes static contract calls.
 * - `sendTx`: Sends transactions to the network using the provided account.
 * - `getAddress`: Returns the address of the connected account.
 * - `signMsg`: Signs arbitrary messages with the account.
 * - `getChainId`: Resolves the current chain ID from the wallet's chain context.
 *
 * @param walletClient - A Viem wallet client with an attached account.
 * @returns A `WriteBlockchainAdapter` that implements both read and write capabilities.
 */
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
        throw new DripsError(
          `Contract write failed (func: ${tx.abiFunctionName})`,
          {
            cause: error,
            meta,
          },
        );
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
