import {
  IpfsUploaderFn,
  Metadata,
} from '../internal/metadata/createPinataIpfsUploader';
import {PublicClient, WalletClient} from 'viem';
import type {Provider, Signer} from 'ethers';
import {
  ReadBlockchainAdapter,
  WriteBlockchainAdapter,
} from '../internal/blockchain/BlockchainAdapter';
import {resolveBlockchainAdapter} from '../internal/blockchain/resolveBlockchainAdapter';
import {createDripListsModule, DripListsModule} from './createDripListsModule';
import {dripsConstants, utils} from '..';
import {
  createGraphQLClient,
  DEFAULT_GRAPHQL_URL,
} from '../internal/graphql/createGraphQLClient';

export interface DripsSdk {
  readonly dripLists: DripListsModule;
  readonly constants: typeof dripsConstants;
  readonly utils: typeof utils;
}

type DripsSdkOptions = {
  readonly graphqlUrl?: string;
};

export type SupportedBlockchainClient =
  | PublicClient
  | WalletClient
  | Provider
  | Signer
  | (ReadBlockchainAdapter & {type: 'custom'})
  | (WriteBlockchainAdapter & {type: 'custom'});

// TODO: document that all write operations are tied to the account and chain of the WalletClient or the Signer.
// TODO: document that WalletClient requires an account to be set up.
export function createDripsSdk(
  blockchainClient: SupportedBlockchainClient,
  ipfsUploaderFn: IpfsUploaderFn<Metadata>,
  options?: DripsSdkOptions,
): DripsSdk {
  const adapter = resolveBlockchainAdapter(blockchainClient);
  const graphqlClient = createGraphQLClient(
    options?.graphqlUrl || DEFAULT_GRAPHQL_URL,
  );

  return {
    utils,
    constants: dripsConstants,
    dripLists: createDripListsModule({
      adapter,
      graphqlClient,
      ipfsUploaderFn,
    }),
  };
}
