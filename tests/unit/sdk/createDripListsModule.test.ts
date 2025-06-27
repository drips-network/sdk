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
import {prepareDripListCreation} from '../../../src/internal/drip-lists/prepareDripListCreation';
import {createDripList} from '../../../src/internal/drip-lists/createDripList';
import {Address} from 'viem';
import {calcDripListId} from '../../../src/internal/shared/calcDripListId';
import {prepareDripListUpdate} from '../../../src/internal/drip-lists/prepareDripListUpdate';
import {updateDripList} from '../../../src/internal/drip-lists/updateDripList';

vi.mock('../../../src/internal/shared/calcDripListId');
vi.mock('../../../src/internal/drip-lists/getDripListById');
vi.mock('../../../src/internal/drip-lists/prepareDripListCreation');
vi.mock('../../../src/internal/drip-lists/createDripList');
vi.mock('../../../src/internal/drip-lists/prepareDripListUpdate');
vi.mock('../../../src/internal/drip-lists/updateDripList');

describe('createDripListsModule', () => {
  let adapter: ReadBlockchainAdapter | WriteBlockchainAdapter;
  let graphqlClient: DripsGraphQLClient;
  let ipfsMetadataUploaderFn: IpfsMetadataUploaderFn<Metadata>;
  let dripListsModule: DripListsModule;

  beforeEach(() => {
    vi.clearAllMocks();

    adapter = {} as WriteBlockchainAdapter;
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
    const chainId = 1;
    const expectedId = 456n;

    vi.mocked(calcDripListId).mockResolvedValue(expectedId);

    // Act
    const result = await dripListsModule.calculateId(salt, minter, chainId);

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

  it('should prepare drip list creation context', async () => {
    // Arrange
    const params = {name: 'test'} as any;
    const expectedContext = {context: 'test'} as any;
    vi.mocked(prepareDripListCreation).mockResolvedValue(expectedContext);

    // Act
    const result = await dripListsModule.prepareCreation(params);

    // Assert
    expect(result).toBe(expectedContext);
    expect(prepareDripListCreation).toHaveBeenCalledWith(
      adapter,
      ipfsMetadataUploaderFn,
      params,
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

  it('should prepare drip list update', async () => {
    // Arrange
    const config = {accountId: 1n, name: 'updated'} as any;
    const expectedResult = {context: 'update'} as any;
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
});
