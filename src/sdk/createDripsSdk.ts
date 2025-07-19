import {
  IpfsMetadataUploaderFn,
  Metadata,
} from '../internal/shared/createPinataIpfsMetadataUploader';
import {PublicClient, WalletClient} from 'viem';
import type {Provider, Signer} from 'ethers';
import {
  ReadBlockchainAdapter,
  WriteBlockchainAdapter,
} from '../internal/blockchain/BlockchainAdapter';
import {resolveBlockchainAdapter} from '../internal/blockchain/resolveBlockchainAdapter';
import {createDripListsModule, DripListsModule} from './createDripListsModule';
import {dripsConstants} from '..';
import {
  createGraphQLClient,
  DEFAULT_GRAPHQL_URL,
} from '../internal/graphql/createGraphQLClient';
import {createDonationsModule, DonationsModule} from './createDonationsModule';
import {createUsersModule, UsersModule} from './createUsersModule';
import {createUtilsModule, UtilsModule} from './createUtilsModule';
import {collect} from '../internal/collect/collect';
import {CollectConfig} from '../internal/collect/prepareCollection';
import {TxResponse} from '../internal/blockchain/BlockchainAdapter';
import {requireWriteAccess} from '../internal/shared/assertions';

export interface DripsSdk {
  readonly dripLists: DripListsModule;
  readonly donations: DonationsModule;
  readonly users: UsersModule;
  readonly utils: UtilsModule;
  readonly constants: typeof dripsConstants;
  collect: (config: CollectConfig) => Promise<TxResponse>;
}

type DripsSdkOptions = {
  readonly graphql?: {
    readonly url?: string;
    readonly apiKey?: string;
  };
};

export type SupportedBlockchainClient =
  | PublicClient
  | WalletClient
  | Provider
  | Signer
  | (ReadBlockchainAdapter & {type: 'custom'})
  | (WriteBlockchainAdapter & {type: 'custom'});

/**
 * Creates an instance of the Drips SDK.
 *
 * ## Blockchain Client Support
 *
 * The SDK supports multiple blockchain client libraries:
 *
 * ### Viem
 * - **`PublicClient`**: For read-only operations (querying data, no transactions)
 * - **`WalletClient`**: For full functionality including write operations (creating drip lists, donations, etc.)
 *   - **Important**: Must have an account connected via the `account` property
 *
 * ### Ethers v6
 * - **`Provider`**: For read-only operations (querying data, no transactions)
 * - **`Signer`**: For full functionality including write operations
 *
 * ### Custom Adapters
 * - **`ReadBlockchainAdapter`**: Custom read-only adapter
 * - **`WriteBlockchainAdapter`**: Custom adapter with transaction capabilities
 *
 * ## Operation Types
 *
 * All **write operations** require:
 * - A **signer/wallet client** with a connected signer/account
 * - Connection to the target **blockchain network**
 * - Sufficient **gas fees** for transaction execution
 *
 * **Read operations** work with any client type.
 *
 * @param blockchainClient - A blockchain client for network interaction. Supports:
 *   - **Viem**: `PublicClient` (read-only) or `WalletClient` (read/write, requires connected account)
 *   - **Ethers v6**: `Provider` (read-only) or `Signer` (read/write)
 *   - **Custom**: `ReadBlockchainAdapter` or `WriteBlockchainAdapter` with `{type: 'custom'}`
 *
 * @param ipfsMetadataUploaderFn - Optional function for uploading metadata to IPFS. Required only for
 *   write operations. The SDK provides
 *   `createPinataIpfsMetadataUploader()` for Pinata integration. Read-only operations work without this parameter.
 *
 * @param options - Optional configuration object
 * @param options.graphql - GraphQL endpoint configuration
 * @param options.graphql.url - Custom GraphQL endpoint URL (defaults to Drips network endpoint)
 * @param options.graphql.apiKey - API key for authenticated GraphQL requests
 *
 * @returns A `DripsSdk` instance
 */
export function createDripsSdk(
  blockchainClient: SupportedBlockchainClient,
  ipfsMetadataUploaderFn?: IpfsMetadataUploaderFn<Metadata>,
  options?: DripsSdkOptions,
): DripsSdk {
  const adapter = resolveBlockchainAdapter(blockchainClient);
  const graphqlClient = createGraphQLClient(
    options?.graphql?.url || DEFAULT_GRAPHQL_URL,
    options?.graphql?.apiKey,
  );

  const deps = {
    adapter,
    graphqlClient,
    ipfsMetadataUploaderFn,
  };

  return {
    constants: dripsConstants,
    users: createUsersModule(deps),
    utils: createUtilsModule({adapter}),
    dripLists: createDripListsModule(deps),
    donations: createDonationsModule(deps),
    collect: (config: CollectConfig) => {
      requireWriteAccess(adapter, collect.name);
      return collect(adapter, config);
    },
  };
}
