import {vi, describe, it, expect, beforeEach} from 'vitest';
import {PublicClient, WalletClient} from 'viem';
import {Provider, Signer} from 'ethers';
import {
  IpfsMetadataUploaderFn,
  Metadata,
} from '../../../src/internal/shared/createPinataIpfsMetadataUploader';
import {createDripsSdk} from '../../../src/sdk/createDripsSdk';
import {
  ReadBlockchainAdapter,
  WriteBlockchainAdapter,
} from '../../../src/internal/blockchain/BlockchainAdapter';
import {resolveBlockchainAdapter} from '../../../src/internal/blockchain/resolveBlockchainAdapter';
import {createDripListsModule} from '../../../src/sdk/createDripListsModule';
import {createDonationsModule} from '../../../src/sdk/createDonationsModule';
import {createUsersModule} from '../../../src/sdk/createUsersModule';
import {dripsConstants, utils} from '../../../src';
import {
  createGraphQLClient,
  DEFAULT_GRAPHQL_URL,
} from '../../../src/internal/graphql/createGraphQLClient';

vi.mock('../../../src/internal/blockchain/resolveBlockchainAdapter');
vi.mock('../../../src/sdk/createDripListsModule');
vi.mock('../../../src/sdk/createDonationsModule');
vi.mock('../../../src/sdk/createUsersModule');
vi.mock('../../../src/internal/graphql/createGraphQLClient');
vi.mock('../../../src/internal/collect/collect');
vi.mock('../../../src/internal/collect/prepareCollection');

describe('createDripsSdk', () => {
  const ipfsMetadataUploaderFn = vi.fn<IpfsMetadataUploaderFn<Metadata>>();
  const dripListsModule = {} as any;
  const donationsModule = {} as any;
  const usersModule = {} as any;
  const mockAdapter = {} as ReadBlockchainAdapter;
  const mockGraphqlClient = {
    query: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(resolveBlockchainAdapter).mockReturnValue(mockAdapter);
    vi.mocked(createDripListsModule).mockReturnValue(dripListsModule);
    vi.mocked(createDonationsModule).mockReturnValue(donationsModule);
    vi.mocked(createUsersModule).mockReturnValue(usersModule);
    vi.mocked(createGraphQLClient).mockReturnValue(mockGraphqlClient);
  });

  it('should create a DripsSdk instance', () => {
    // Arrange
    const client = {} as PublicClient;

    // Act
    const sdk = createDripsSdk(client, ipfsMetadataUploaderFn);

    // Assert
    expect(sdk).toBeDefined();
    expect(sdk.dripLists).toBe(dripListsModule);
    expect(sdk.donations).toBe(donationsModule);
    expect(sdk.users).toBe(usersModule);
    expect(sdk.constants).toBe(dripsConstants);
    expect(sdk.utils).toBe(utils);
    expect(typeof sdk.collect).toBe('function');
    expect(typeof sdk.prepareCollection).toBe('function');
    expect(createDripListsModule).toHaveBeenCalledWith({
      adapter: mockAdapter,
      graphqlClient: mockGraphqlClient,
      ipfsMetadataUploaderFn,
    });
    expect(createDonationsModule).toHaveBeenCalledWith({
      adapter: mockAdapter,
      graphqlClient: mockGraphqlClient,
      ipfsMetadataUploaderFn,
    });
    expect(createUsersModule).toHaveBeenCalledWith({
      adapter: mockAdapter,
      graphqlClient: mockGraphqlClient,
      ipfsMetadataUploaderFn,
    });
  });

  it('should use the default GraphQL URL when no URL is provided', () => {
    // Arrange
    const client = {} as PublicClient;

    // Act
    createDripsSdk(client, ipfsMetadataUploaderFn);

    // Assert
    expect(createGraphQLClient).toHaveBeenCalledWith(
      DEFAULT_GRAPHQL_URL,
      undefined,
    );
  });

  it('should use the provided GraphQL URL', () => {
    // Arrange
    const client = {} as PublicClient;
    const customUrl = 'https://my-custom-graphql.url';

    // Act
    createDripsSdk(client, ipfsMetadataUploaderFn, {
      graphql: {
        url: customUrl,
      },
    });

    // Assert
    expect(createGraphQLClient).toHaveBeenCalledWith(customUrl, undefined);
  });

  it('should pass the API key to the GraphQL client when provided', () => {
    // Arrange
    const client = {} as PublicClient;
    const customUrl = 'https://my-custom-graphql.url';
    const apiKey = 'test-api-key';

    // Act
    createDripsSdk(client, ipfsMetadataUploaderFn, {
      graphql: {
        url: customUrl,
        apiKey,
      },
    });

    // Assert
    expect(createGraphQLClient).toHaveBeenCalledWith(customUrl, apiKey);
  });

  it('should pass the API key to the GraphQL client with default URL', () => {
    // Arrange
    const client = {} as PublicClient;
    const apiKey = 'test-api-key';

    // Act
    createDripsSdk(client, ipfsMetadataUploaderFn, {
      graphql: {
        apiKey,
      },
    });

    // Assert
    expect(createGraphQLClient).toHaveBeenCalledWith(
      DEFAULT_GRAPHQL_URL,
      apiKey,
    );
  });

  it.each([
    ['PublicClient', {} as PublicClient],
    ['WalletClient', {} as WalletClient],
    ['Provider', {} as Provider],
    ['Signer', {} as Signer],
    [
      'Custom Read-only Adapter',
      {type: 'custom'} as ReadBlockchainAdapter & {type: 'custom'},
    ],
    [
      'Custom Writeable Adapter',
      {type: 'custom'} as WriteBlockchainAdapter & {type: 'custom'},
    ],
  ])('should resolve the blockchain adapter for a %s', (_, client: any) => {
    // Act
    createDripsSdk(client, ipfsMetadataUploaderFn);

    // Assert
    expect(resolveBlockchainAdapter).toHaveBeenCalledWith(client);
  });
});
