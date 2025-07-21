import {vi, describe, it, expect, beforeEach} from 'vitest';
import {
  DripListsModule,
  createDripListsModule,
} from '../../../src/sdk/createDripListsModule';
import {
  ReadBlockchainAdapter,
  WriteBlockchainAdapter,
} from '../../../src/internal/blockchain/BlockchainAdapter';
import {DripsGraphQLClient} from '../../../src/internal/graphql/createGraphQLClient';
import {
  IpfsMetadataUploaderFn,
  Metadata,
} from '../../../src/internal/shared/createPinataIpfsMetadataUploader';
import {getDripListById} from '../../../src/internal/drip-lists/getDripListById';
import {createDripList} from '../../../src/internal/drip-lists/createDripList';
import {Address} from 'viem';
import {calcDripListId} from '../../../src/internal/shared/calcDripListId';
import {updateDripList} from '../../../src/internal/drip-lists/updateDripList';
import {prepareDripListCreation} from '../../../src/internal/drip-lists/prepareDripListCreation';
import {prepareDripListUpdate} from '../../../src/internal/drip-lists/prepareDripListUpdate';
import {
  requireWriteAccess,
  requireMetadataUploader,
} from '../../../src/internal/shared/assertions';

vi.mock('../../../src/internal/shared/calcDripListId');
vi.mock('../../../src/internal/drip-lists/getDripListById');
vi.mock('../../../src/internal/drip-lists/prepareDripListCreation');
vi.mock('../../../src/internal/drip-lists/createDripList');
vi.mock('../../../src/internal/drip-lists/prepareDripListUpdate');
vi.mock('../../../src/internal/drip-lists/updateDripList');
vi.mock('../../../src/internal/shared/assertions');

describe('createDripListsModule', () => {
  let adapter: WriteBlockchainAdapter;
  let graphqlClient: DripsGraphQLClient;
  let ipfsMetadataUploaderFn: IpfsMetadataUploaderFn<Metadata>;
  let dripListsModule: DripListsModule;

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up default mock implementations that don't throw
    vi.mocked(requireWriteAccess).mockImplementation(() => {
      // Default implementation does nothing (successful case)
    });
    vi.mocked(requireMetadataUploader).mockImplementation(() => {
      // Default implementation does nothing (successful case)
    });

    adapter = {
      sendTx: vi.fn(),
      getAddress: vi.fn(),
      signMsg: vi.fn(),
      call: vi.fn(),
      getChainId: vi.fn(),
    } as WriteBlockchainAdapter;
    graphqlClient = {query: vi.fn()} as any;
    ipfsMetadataUploaderFn = vi.fn();

    dripListsModule = createDripListsModule({
      adapter,
      graphqlClient,
      ipfsMetadataUploaderFn,
    });
  });

  it('should calculate a drip list ID', async () => {
    // Arrange
    const salt = 123n;
    const minter = '0x1234' as Address;
    const expectedId = 456n;

    vi.mocked(calcDripListId).mockResolvedValue(expectedId);

    // Act
    const result = await dripListsModule.calculateId(salt, minter);

    // Assert
    expect(result).toBe(expectedId);
    expect(calcDripListId).toHaveBeenCalledWith(adapter, {
      salt,
      minter,
    });
  });

  it('should get a drip list by ID', async () => {
    // Arrange
    const accountId = 1n;
    const chainId = 1;
    const expectedDripList = {id: '1'} as any;
    vi.mocked(getDripListById).mockResolvedValue(expectedDripList);

    // Act
    const result = await dripListsModule.getById(accountId, chainId);

    // Assert
    expect(result).toBe(expectedDripList);
    expect(getDripListById).toHaveBeenCalledWith(
      accountId,
      chainId,
      graphqlClient,
    );
  });

  it('should create a drip list', async () => {
    // Arrange
    const params = {name: 'test'} as any;
    const expectedResult = {result: 'test'} as any;
    vi.mocked(createDripList).mockResolvedValue(expectedResult);

    // Act
    const result = await dripListsModule.create(params);

    // Assert
    expect(result).toBe(expectedResult);
    expect(createDripList).toHaveBeenCalledWith(
      adapter,
      ipfsMetadataUploaderFn,
      params,
    );
  });

  it('should update a drip list', async () => {
    // Arrange
    const config = {accountId: 1n, name: 'updated'} as any;
    const expectedResult = {result: 'updated'} as any;
    vi.mocked(updateDripList).mockResolvedValue(expectedResult);

    // Act
    const result = await dripListsModule.update(config);

    // Assert
    expect(result).toBe(expectedResult);
    expect(updateDripList).toHaveBeenCalledWith(
      adapter,
      ipfsMetadataUploaderFn,
      config,
      graphqlClient,
    );
  });

  it('should prepare create a drip list', async () => {
    // Arrange
    const params = {name: 'test'} as any;
    const expectedResult = {result: 'prepared'} as any;
    vi.mocked(prepareDripListCreation).mockResolvedValue(expectedResult);

    // Act
    const result = await dripListsModule.prepareCreate(params);

    // Assert
    expect(result).toBe(expectedResult);
    expect(prepareDripListCreation).toHaveBeenCalledWith(
      adapter,
      ipfsMetadataUploaderFn,
      params,
    );
  });

  it('should prepare update a drip list', async () => {
    // Arrange
    const config = {accountId: 1n, name: 'updated'} as any;
    const expectedResult = {result: 'prepared update'} as any;
    vi.mocked(prepareDripListUpdate).mockResolvedValue(expectedResult);

    // Act
    const result = await dripListsModule.prepareUpdate(config);

    // Assert
    expect(result).toBe(expectedResult);
    expect(prepareDripListUpdate).toHaveBeenCalledWith(
      adapter,
      ipfsMetadataUploaderFn,
      config,
      graphqlClient,
    );
  });

  describe('create method validation', () => {
    it('should call requireWriteAccess with correct parameters', async () => {
      // Arrange
      const params = {name: 'test'} as any;
      vi.mocked(createDripList).mockResolvedValue({} as any);

      // Act
      await dripListsModule.create(params);

      // Assert
      expect(requireWriteAccess).toHaveBeenCalledWith(
        adapter,
        'createDripList',
      );
    });

    it('should call requireMetadataUploader with correct parameters', async () => {
      // Arrange
      const params = {name: 'test'} as any;
      vi.mocked(createDripList).mockResolvedValue({} as any);

      // Act
      await dripListsModule.create(params);

      // Assert
      expect(requireMetadataUploader).toHaveBeenCalledWith(
        ipfsMetadataUploaderFn,
        'createDripList',
      );
    });

    it('should work with ReadBlockchainAdapter when requireWriteAccess is mocked to pass', async () => {
      // Arrange
      const readAdapter = {
        call: vi.fn(),
        getChainId: vi.fn(),
      } as ReadBlockchainAdapter;
      const moduleWithReadAdapter = createDripListsModule({
        adapter: readAdapter,
        graphqlClient,
        ipfsMetadataUploaderFn,
      });
      const params = {name: 'test'} as any;
      const expectedResult = {result: 'test'} as any;
      vi.mocked(createDripList).mockResolvedValue(expectedResult);
      vi.mocked(requireWriteAccess).mockImplementation(() => {
        // Mock passes validation
      });

      // Act
      const result = await moduleWithReadAdapter.create(params);

      // Assert
      expect(result).toBe(expectedResult);
      expect(requireWriteAccess).toHaveBeenCalledWith(
        readAdapter,
        'createDripList',
      );
    });

    it('should work without ipfsMetadataUploaderFn when requireMetadataUploader is mocked to pass', async () => {
      // Arrange
      const moduleWithoutUploader = createDripListsModule({
        adapter,
        graphqlClient,
        ipfsMetadataUploaderFn: undefined,
      });
      const params = {name: 'test'} as any;
      const expectedResult = {result: 'test'} as any;
      vi.mocked(createDripList).mockResolvedValue(expectedResult);
      vi.mocked(requireMetadataUploader).mockImplementation(() => {
        // Mock passes validation
      });

      // Act
      const result = await moduleWithoutUploader.create(params);

      // Assert
      expect(result).toBe(expectedResult);
      expect(requireMetadataUploader).toHaveBeenCalledWith(
        undefined,
        'createDripList',
      );
    });
  });

  describe('update method validation', () => {
    it('should call requireWriteAccess with correct parameters', async () => {
      // Arrange
      const config = {accountId: 1n, name: 'updated'} as any;
      vi.mocked(updateDripList).mockResolvedValue({} as any);

      // Act
      await dripListsModule.update(config);

      // Assert
      expect(requireWriteAccess).toHaveBeenCalledWith(
        adapter,
        'updateDripList',
      );
    });

    it('should call requireMetadataUploader with correct parameters', async () => {
      // Arrange
      const config = {accountId: 1n, name: 'updated'} as any;
      vi.mocked(updateDripList).mockResolvedValue({} as any);

      // Act
      await dripListsModule.update(config);

      // Assert
      expect(requireMetadataUploader).toHaveBeenCalledWith(
        ipfsMetadataUploaderFn,
        'updateDripList',
      );
    });

    it('should work with ReadBlockchainAdapter when requireWriteAccess is mocked to pass', async () => {
      // Arrange
      const readAdapter = {
        call: vi.fn(),
        getChainId: vi.fn(),
      } as ReadBlockchainAdapter;
      const moduleWithReadAdapter = createDripListsModule({
        adapter: readAdapter,
        graphqlClient,
        ipfsMetadataUploaderFn,
      });
      const config = {accountId: 1n, name: 'updated'} as any;
      const expectedResult = {result: 'updated'} as any;
      vi.mocked(updateDripList).mockResolvedValue(expectedResult);
      vi.mocked(requireWriteAccess).mockImplementation(() => {
        // Mock passes validation
      });

      // Act
      const result = await moduleWithReadAdapter.update(config);

      // Assert
      expect(result).toBe(expectedResult);
      expect(requireWriteAccess).toHaveBeenCalledWith(
        readAdapter,
        'updateDripList',
      );
    });

    it('should work without ipfsMetadataUploaderFn when requireMetadataUploader is mocked to pass', async () => {
      // Arrange
      const moduleWithoutUploader = createDripListsModule({
        adapter,
        graphqlClient,
        ipfsMetadataUploaderFn: undefined,
      });
      const config = {accountId: 1n, name: 'updated'} as any;
      const expectedResult = {result: 'updated'} as any;
      vi.mocked(updateDripList).mockResolvedValue(expectedResult);
      vi.mocked(requireMetadataUploader).mockImplementation(() => {
        // Mock passes validation
      });

      // Act
      const result = await moduleWithoutUploader.update(config);

      // Assert
      expect(result).toBe(expectedResult);
      expect(requireMetadataUploader).toHaveBeenCalledWith(
        undefined,
        'updateDripList',
      );
    });
  });

  describe('prepareCreate method validation', () => {
    it('should call requireWriteAccess with correct parameters', async () => {
      // Arrange
      const params = {name: 'test'} as any;
      vi.mocked(prepareDripListCreation).mockResolvedValue({} as any);

      // Act
      await dripListsModule.prepareCreate(params);

      // Assert
      expect(requireWriteAccess).toHaveBeenCalledWith(
        adapter,
        'createDripList',
      );
    });

    it('should call requireMetadataUploader with correct parameters', async () => {
      // Arrange
      const params = {name: 'test'} as any;
      vi.mocked(prepareDripListCreation).mockResolvedValue({} as any);

      // Act
      await dripListsModule.prepareCreate(params);

      // Assert
      expect(requireMetadataUploader).toHaveBeenCalledWith(
        ipfsMetadataUploaderFn,
        'createDripList',
      );
    });

    it('should work with ReadBlockchainAdapter when requireWriteAccess is mocked to pass', async () => {
      // Arrange
      const readAdapter = {
        call: vi.fn(),
        getChainId: vi.fn(),
      } as ReadBlockchainAdapter;
      const moduleWithReadAdapter = createDripListsModule({
        adapter: readAdapter,
        graphqlClient,
        ipfsMetadataUploaderFn,
      });
      const params = {name: 'test'} as any;
      const expectedResult = {result: 'prepared'} as any;
      vi.mocked(prepareDripListCreation).mockResolvedValue(expectedResult);
      vi.mocked(requireWriteAccess).mockImplementation(() => {
        // Mock passes validation
      });

      // Act
      const result = await moduleWithReadAdapter.prepareCreate(params);

      // Assert
      expect(result).toBe(expectedResult);
      expect(requireWriteAccess).toHaveBeenCalledWith(
        readAdapter,
        'createDripList',
      );
    });

    it('should work without ipfsMetadataUploaderFn when requireMetadataUploader is mocked to pass', async () => {
      // Arrange
      const moduleWithoutUploader = createDripListsModule({
        adapter,
        graphqlClient,
        ipfsMetadataUploaderFn: undefined,
      });
      const params = {name: 'test'} as any;
      const expectedResult = {result: 'prepared'} as any;
      vi.mocked(prepareDripListCreation).mockResolvedValue(expectedResult);
      vi.mocked(requireMetadataUploader).mockImplementation(() => {
        // Mock passes validation
      });

      // Act
      const result = await moduleWithoutUploader.prepareCreate(params);

      // Assert
      expect(result).toBe(expectedResult);
      expect(requireMetadataUploader).toHaveBeenCalledWith(
        undefined,
        'createDripList',
      );
    });
  });

  describe('prepareUpdate method validation', () => {
    it('should call requireWriteAccess with correct parameters', async () => {
      // Arrange
      const config = {accountId: 1n, name: 'updated'} as any;
      vi.mocked(prepareDripListUpdate).mockResolvedValue({} as any);

      // Act
      await dripListsModule.prepareUpdate(config);

      // Assert
      expect(requireWriteAccess).toHaveBeenCalledWith(
        adapter,
        'updateDripList',
      );
    });

    it('should call requireMetadataUploader with correct parameters', async () => {
      // Arrange
      const config = {accountId: 1n, name: 'updated'} as any;
      vi.mocked(prepareDripListUpdate).mockResolvedValue({} as any);

      // Act
      await dripListsModule.prepareUpdate(config);

      // Assert
      expect(requireMetadataUploader).toHaveBeenCalledWith(
        ipfsMetadataUploaderFn,
        'updateDripList',
      );
    });

    it('should work with ReadBlockchainAdapter when requireWriteAccess is mocked to pass', async () => {
      // Arrange
      const readAdapter = {
        call: vi.fn(),
        getChainId: vi.fn(),
      } as ReadBlockchainAdapter;
      const moduleWithReadAdapter = createDripListsModule({
        adapter: readAdapter,
        graphqlClient,
        ipfsMetadataUploaderFn,
      });
      const config = {accountId: 1n, name: 'updated'} as any;
      const expectedResult = {result: 'prepared update'} as any;
      vi.mocked(prepareDripListUpdate).mockResolvedValue(expectedResult);
      vi.mocked(requireWriteAccess).mockImplementation(() => {
        // Mock passes validation
      });

      // Act
      const result = await moduleWithReadAdapter.prepareUpdate(config);

      // Assert
      expect(result).toBe(expectedResult);
      expect(requireWriteAccess).toHaveBeenCalledWith(
        readAdapter,
        'updateDripList',
      );
    });

    it('should work without ipfsMetadataUploaderFn when requireMetadataUploader is mocked to pass', async () => {
      // Arrange
      const moduleWithoutUploader = createDripListsModule({
        adapter,
        graphqlClient,
        ipfsMetadataUploaderFn: undefined,
      });
      const config = {accountId: 1n, name: 'updated'} as any;
      const expectedResult = {result: 'prepared update'} as any;
      vi.mocked(prepareDripListUpdate).mockResolvedValue(expectedResult);
      vi.mocked(requireMetadataUploader).mockImplementation(() => {
        // Mock passes validation
      });

      // Act
      const result = await moduleWithoutUploader.prepareUpdate(config);

      // Assert
      expect(result).toBe(expectedResult);
      expect(requireMetadataUploader).toHaveBeenCalledWith(
        undefined,
        'updateDripList',
      );
    });
  });

  describe('module creation validation', () => {
    it('should work with WriteBlockchainAdapter and valid uploader', () => {
      // Arrange
      const writeAdapter = {
        sendTx: vi.fn(),
        getAddress: vi.fn(),
        signMsg: vi.fn(),
        call: vi.fn(),
        getChainId: vi.fn(),
      } as WriteBlockchainAdapter;

      // Act
      const module = createDripListsModule({
        adapter: writeAdapter,
        graphqlClient,
        ipfsMetadataUploaderFn,
      });

      // Assert
      expect(module).toHaveProperty('create');
      expect(module).toHaveProperty('update');
      expect(module).toHaveProperty('getById');
      expect(module).toHaveProperty('calculateId');
      expect(module).toHaveProperty('prepareCreate');
      expect(module).toHaveProperty('prepareUpdate');
    });
  });
});
