import {vi, describe, it, expect, beforeEach} from 'vitest';
import {PublicClient, WalletClient} from 'viem';
import {Provider, Signer} from 'ethers';
import {
  IpfsUploaderFn,
  Metadata,
} from '../../../src/internal/metadata/createPinataIpfsUploader';
import {createDripsSdk} from '../../../src/sdk/createDripsSdk';
import {
  ReadBlockchainAdapter,
  WriteBlockchainAdapter,
} from '../../../src/internal/blockchain/BlockchainAdapter';
import {resolveBlockchainAdapter} from '../../../src/internal/blockchain/resolveBlockchainAdapter';
import {createDripListsModule} from '../../../src/sdk/createDripListsModule';
import {dripsConstants, utils} from '../../../src';
import {
  createGraphQLClient,
  DEFAULT_GRAPHQL_URL,
} from '../../../src/internal/graphql/createGraphQLClient';

vi.mock('../../../src/internal/blockchain/resolveBlockchainAdapter');
vi.mock('../../../src/sdk/createDripListsModule');
vi.mock('../../../src/internal/graphql/createGraphQLClient');

describe('createDripsSdk', () => {
  const ipfsUploaderFn = vi.fn<IpfsUploaderFn<Metadata>>();
  const dripListsModule = {} as any;
  const mockAdapter = {} as ReadBlockchainAdapter;
  const mockGraphqlClient = {
    query: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(resolveBlockchainAdapter).mockReturnValue(mockAdapter);
    vi.mocked(createDripListsModule).mockReturnValue(dripListsModule);
    vi.mocked(createGraphQLClient).mockReturnValue(mockGraphqlClient);
  });

  it('should create a DripsSdk instance', () => {
    // Arrange
    const client = {} as PublicClient;

    // Act
    const sdk = createDripsSdk(client, ipfsUploaderFn);

    // Assert
    expect(sdk).toBeDefined();
    expect(sdk.dripLists).toBe(dripListsModule);
    expect(sdk.constants).toBe(dripsConstants);
    expect(sdk.utils).toBe(utils);
    expect(createDripListsModule).toHaveBeenCalledWith({
      adapter: mockAdapter,
      graphqlClient: mockGraphqlClient,
      ipfsUploaderFn,
    });
  });

  it('should use the default GraphQL URL when no URL is provided', () => {
    // Arrange
    const client = {} as PublicClient;

    // Act
    createDripsSdk(client, ipfsUploaderFn);

    // Assert
    expect(createGraphQLClient).toHaveBeenCalledWith(DEFAULT_GRAPHQL_URL);
  });

  it('should use the provided GraphQL URL', () => {
    // Arrange
    const client = {} as PublicClient;
    const graphqlUrl = 'https://my-custom-graphql.url';

    // Act
    createDripsSdk(client, ipfsUploaderFn, {graphqlUrl});

    // Assert
    expect(createGraphQLClient).toHaveBeenCalledWith(graphqlUrl);
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
    createDripsSdk(client, ipfsUploaderFn);

    // Assert
    expect(resolveBlockchainAdapter).toHaveBeenCalledWith(client);
  });
});
