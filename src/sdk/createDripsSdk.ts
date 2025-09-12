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
import {createUtilsModule, UtilsModule} from './createUtilsModule';
import {
  createLinkedIdentitiesModule,
  LinkedIdentitiesModule,
} from './createLinkedIdentitiesModule';
import {createFundsModule, FundsModule} from './createFundsModule';

export interface DripsSdk {
  readonly dripLists: DripListsModule;
  readonly donations: DonationsModule;
  readonly utils: UtilsModule;
  readonly funds: FundsModule;
  readonly linkedIdentities: LinkedIdentitiesModule;
  readonly constants: typeof dripsConstants;
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
 * - A blockchain client with signing capability:
 *   - **Viem**: `WalletClient` with a connected `account`
 *   - **Ethers**: `Signer` with a connected `provider`
 * - Connection to the target **blockchain network**
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
    utils: createUtilsModule({adapter}),
    dripLists: createDripListsModule(deps),
    donations: createDonationsModule(deps),
    funds: createFundsModule({adapter, graphqlClient}),
    linkedIdentities: createLinkedIdentitiesModule({adapter}),
  };
}
