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
import {createUtilsModule} from '../../../src/sdk/createUtilsModule';
import {dripsConstants} from '../../../src';
import {
  createGraphQLClient,
  DEFAULT_GRAPHQL_URL,
} from '../../../src/internal/graphql/createGraphQLClient';
import {collect} from '../../../src/internal/collect/collect';
import {requireWriteAccess} from '../../../src/internal/shared/assertions';

vi.mock('../../../src/internal/blockchain/resolveBlockchainAdapter');
vi.mock('../../../src/sdk/createDripListsModule');
vi.mock('../../../src/sdk/createDonationsModule');
vi.mock('../../../src/sdk/createUsersModule');
vi.mock('../../../src/sdk/createUtilsModule');
vi.mock('../../../src/internal/graphql/createGraphQLClient');
vi.mock('../../../src/internal/collect/collect');
vi.mock('../../../src/internal/shared/assertions');

describe('createDripsSdk', () => {
  const ipfsMetadataUploaderFn = vi.fn<IpfsMetadataUploaderFn<Metadata>>();
  const dripListsModule = {} as any;
  const donationsModule = {} as any;
  const usersModule = {} as any;
  const utilsModule = {} as any;
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
    vi.mocked(createUtilsModule).mockReturnValue(utilsModule);
    vi.mocked(createGraphQLClient).mockReturnValue(mockGraphqlClient);
    vi.mocked(requireWriteAccess).mockImplementation(() => {
      // Default implementation does nothing (successful case)
    });
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
    expect(sdk.utils).toBe(utilsModule);
    expect(typeof sdk.collect).toBe('function');
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
    expect(createUtilsModule).toHaveBeenCalledWith({
      adapter: mockAdapter,
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

  describe('collect method', () => {
    it('should call requireWriteAccess and collect function with correct parameters', async () => {
      // Arrange
      const client = {} as WalletClient;
      const writeAdapter = {
        call: vi.fn(),
        getChainId: vi.fn(),
        getAddress: vi.fn(),
        sendTx: vi.fn(),
        signMsg: vi.fn(),
      } as WriteBlockchainAdapter;
      const collectConfig = {accountId: '123'} as any;
      const expectedTxResponse = {hash: '0x123'} as any;

      vi.mocked(resolveBlockchainAdapter).mockReturnValue(writeAdapter);
      vi.mocked(collect).mockResolvedValue(expectedTxResponse);

      const sdk = createDripsSdk(client, ipfsMetadataUploaderFn);

      // Act
      const result = await sdk.collect(collectConfig);

      // Assert
      expect(requireWriteAccess).toHaveBeenCalledWith(writeAdapter, 'collect');
      expect(collect).toHaveBeenCalledWith(writeAdapter, collectConfig);
      expect(result).toBe(expectedTxResponse);
    });

    it('should throw an error when collect function throws', async () => {
      // Arrange
      const client = {} as WalletClient;
      const writeAdapter = {
        call: vi.fn(),
        getChainId: vi.fn(),
        getAddress: vi.fn(),
        sendTx: vi.fn(),
        signMsg: vi.fn(),
      } as WriteBlockchainAdapter;
      const collectConfig = {accountId: '123'} as any;
      const error = new Error('Collection failed');

      vi.mocked(resolveBlockchainAdapter).mockReturnValue(writeAdapter);
      vi.mocked(collect).mockRejectedValue(error);

      const sdk = createDripsSdk(client, ipfsMetadataUploaderFn);

      // Act & Assert
      await expect(sdk.collect(collectConfig)).rejects.toThrow(
        'Collection failed',
      );
      expect(requireWriteAccess).toHaveBeenCalledWith(writeAdapter, 'collect');
      expect(collect).toHaveBeenCalledWith(writeAdapter, collectConfig);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle undefined ipfsMetadataUploaderFn', () => {
      // Arrange
      const client = {} as PublicClient;

      // Act
      const sdk = createDripsSdk(client, undefined);

      // Assert
      expect(sdk).toBeDefined();
      expect(createDripListsModule).toHaveBeenCalledWith({
        adapter: mockAdapter,
        graphqlClient: mockGraphqlClient,
        ipfsMetadataUploaderFn: undefined,
      });
      expect(createDonationsModule).toHaveBeenCalledWith({
        adapter: mockAdapter,
        graphqlClient: mockGraphqlClient,
        ipfsMetadataUploaderFn: undefined,
      });
      expect(createUsersModule).toHaveBeenCalledWith({
        adapter: mockAdapter,
        graphqlClient: mockGraphqlClient,
        ipfsMetadataUploaderFn: undefined,
      });
      expect(createUtilsModule).toHaveBeenCalledWith({
        adapter: mockAdapter,
      });
    });

    it('should handle undefined options', () => {
      // Arrange
      const client = {} as PublicClient;

      // Act
      const sdk = createDripsSdk(client, ipfsMetadataUploaderFn, undefined);

      // Assert
      expect(sdk).toBeDefined();
      expect(createGraphQLClient).toHaveBeenCalledWith(
        DEFAULT_GRAPHQL_URL,
        undefined,
      );
    });

    it('should handle empty graphql options object', () => {
      // Arrange
      const client = {} as PublicClient;

      // Act
      const sdk = createDripsSdk(client, ipfsMetadataUploaderFn, {
        graphql: {},
      });

      // Assert
      expect(sdk).toBeDefined();
      expect(createGraphQLClient).toHaveBeenCalledWith(
        DEFAULT_GRAPHQL_URL,
        undefined,
      );
    });

    it('should propagate error when resolveBlockchainAdapter throws', () => {
      // Arrange
      const client = {} as PublicClient;
      const error = new Error('Invalid blockchain client');
      vi.mocked(resolveBlockchainAdapter).mockImplementation(() => {
        throw error;
      });

      // Act & Assert
      expect(() => createDripsSdk(client, ipfsMetadataUploaderFn)).toThrow(
        'Invalid blockchain client',
      );
    });

    it('should propagate error when createGraphQLClient throws', () => {
      // Arrange
      const client = {} as PublicClient;
      const error = new Error('GraphQL client creation failed');
      vi.mocked(createGraphQLClient).mockImplementation(() => {
        throw error;
      });

      // Act & Assert
      expect(() => createDripsSdk(client, ipfsMetadataUploaderFn)).toThrow(
        'GraphQL client creation failed',
      );
    });

    it('should propagate error when module creation throws', () => {
      // Arrange
      const client = {} as PublicClient;
      const error = new Error('Module creation failed');
      vi.mocked(createDripListsModule).mockImplementation(() => {
        throw error;
      });

      // Act & Assert
      expect(() => createDripsSdk(client, ipfsMetadataUploaderFn)).toThrow(
        'Module creation failed',
      );
    });
  });

  describe('constants and utils exposure', () => {
    it('should expose the correct constants object', () => {
      // Arrange
      const client = {} as PublicClient;

      // Act
      const sdk = createDripsSdk(client, ipfsMetadataUploaderFn);

      // Assert
      expect(sdk.constants).toBe(dripsConstants);
      expect(sdk.constants).toHaveProperty('MAX_SPLITS_RECEIVERS');
    });

    it('should expose the correct utils object', () => {
      // Arrange
      const client = {} as PublicClient;

      // Act
      const sdk = createDripsSdk(client, ipfsMetadataUploaderFn);

      // Assert
      expect(sdk.utils).toBe(utilsModule);
      expect(typeof sdk.utils).toBe('object');
    });
  });
});
