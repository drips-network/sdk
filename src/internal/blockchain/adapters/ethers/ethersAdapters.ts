import {Address, Hex} from 'viem';
import type {Provider, Signer} from 'ethers';
import {
  PreparedTx,
  ReadBlockchainAdapter,
  TxResponse,
  WriteBlockchainAdapter,
} from '../../BlockchainAdapter';
import {DripsError} from '../../../shared/DripsError';
import {
  mapToEthersTransactionRequest,
  mapFromEthersResponse,
} from './ethersMappers';
import {createEthersMeta} from './createEthersMeta';

/**
 * Creates a read-only blockchain adapter using an Ethers `Provider`.
 *
 * This adapter supports the following read operations:
 * - `call`: Executes a static contract call and returns raw return data.
 * - `getChainId`: Resolves the current chain ID from the Ethers.js provider.
 *
 * @param provider - The Ethers provider used for read-only operations.
 * @returns A `ReadBlockchainAdapter` that implements read-only operations.
 */
export function createEthersReadAdapter(
  provider: Provider,
): ReadBlockchainAdapter {
  return {
    async call(tx: PreparedTx): Promise<Hex> {
      const meta = createEthersMeta(tx, {
        provider,
        operationFallback: 'call',
      });

      try {
        const txReq = mapToEthersTransactionRequest(tx);
        const result = await provider.call(txReq);

        if (!result) {
          throw new DripsError('Contract call returned no data', {meta});
        }

        return result as Hex;
      } catch (error) {
        throw new DripsError('Contract read failed', {cause: error, meta});
      }
    },

    async getChainId(): Promise<number> {
      try {
        const network = await provider.getNetwork();
        return Number(network.chainId);
      } catch (error) {
        throw new DripsError('Failed to get chain ID', {cause: error});
      }
    },
  };
}

/**
 * Creates a blockchain adapter using an Ethers `Signer`.
 *
 * This adapter supports the following read and write operations:
 * - `call`: Executes static contract calls.
 * - `sendTx`: Sends transactions to the network using the provided account.
 * - `getAddress`: Returns the address of the connected account.
 * - `signMsg`: Signs arbitrary messages with the account.
 * - `getChainId`: Resolves the current chain ID from the wallet's chain context.
 *
 * @param signer - An Ethers signer with a connected provider.
 * @returns A `WriteBlockchainAdapter` that implements both read and write capabilities.
 */
export function createEthersWriteAdapter(
  signer: Signer,
): WriteBlockchainAdapter {
  const provider = signer.provider;
  if (!provider) {
    throw new DripsError('Signer must have a provider');
  }

  const readOnlyAdapter = createEthersReadAdapter(provider);

  return {
    ...readOnlyAdapter,

    async getAddress(): Promise<Address> {
      const meta = {
        operation: 'getAddress',
      };

      try {
        const address = await signer.getAddress();
        return address as Address;
      } catch (error) {
        throw new DripsError('Failed to get signer address', {
          cause: error,
          meta,
        });
      }
    },

    async sendTx(tx: PreparedTx): Promise<TxResponse> {
      const signerAddress = await signer.getAddress();
      const meta = createEthersMeta(tx, {
        provider: signer,
        account: signerAddress,
        operationFallback: 'sendTx',
      });

      try {
        const ethersRequest = mapToEthersTransactionRequest(tx);
        const ethersResponse = await signer.sendTransaction(ethersRequest);

        return {
          ...mapFromEthersResponse(ethersResponse),
          meta,
        };
      } catch (error) {
        throw new DripsError(
          `Contract write failed (func: ${tx.abiFunctionName})`,
          {cause: error, meta},
        );
      }
    },

    async signMsg(message: string | Uint8Array): Promise<Hex> {
      const meta = {
        message,
        operation: 'signMsg',
      };

      try {
        const signature = await signer.signMessage(message);
        return signature as Hex;
      } catch (error) {
        throw new DripsError('Message signing failed', {cause: error, meta});
      }
    },
  };
}
