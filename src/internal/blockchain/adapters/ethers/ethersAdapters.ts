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
        throw new DripsError('Contract write failed', {cause: error, meta});
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
