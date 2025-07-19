import {vi, describe, it, expect, beforeEach} from 'vitest';
import {Address} from 'viem';
import {
  UtilsModule,
  createUtilsModule,
} from '../../../src/sdk/createUtilsModule';
import {
  ReadBlockchainAdapter,
  WriteBlockchainAdapter,
} from '../../../src/internal/blockchain/BlockchainAdapter';
import {calcAddressId} from '../../../src/internal/shared/calcAddressId';
import {calcProjectId} from '../../../src/internal/projects/calcProjectId';
import {calcDripListId} from '../../../src/internal/shared/calcDripListId';
import {buildTx} from '../../../src/internal/shared/buildTx';
import {
  encodeStreamConfig,
  decodeStreamConfig,
} from '../../../src/internal/shared/streamRateUtils';
import {resolveDriverName} from '../../../src/internal/shared/resolveDriverName';
import {resolveAddressFromAddressDriverId} from '../../../src/internal/shared/resolveAddressFromAddressDriverId';
import {ProjectName} from '../../../src/internal/projects/calcProjectId';

vi.mock('../../../src/internal/shared/calcAddressId');
vi.mock('../../../src/internal/projects/calcProjectId');
vi.mock('../../../src/internal/shared/calcDripListId');
vi.mock('../../../src/internal/shared/buildTx');
vi.mock('../../../src/internal/shared/streamRateUtils');
vi.mock('../../../src/internal/shared/resolveDriverName');
vi.mock('../../../src/internal/shared/resolveAddressFromAddressDriverId');

describe('createUtilsModule', () => {
  let adapter: ReadBlockchainAdapter;
  let utilsModule: UtilsModule;

  beforeEach(() => {
    vi.clearAllMocks();

    adapter = {
      call: vi.fn(),
      getChainId: vi.fn(),
    } as ReadBlockchainAdapter;

    utilsModule = createUtilsModule({adapter});
  });

  describe('module creation', () => {
    it('should create a utils module with ReadBlockchainAdapter', () => {
      // Arrange
      const readAdapter = {
        call: vi.fn(),
        getChainId: vi.fn(),
      } as ReadBlockchainAdapter;

      // Act
      const module = createUtilsModule({adapter: readAdapter});

      // Assert
      expect(module).toHaveProperty('buildTx');
      expect(module).toHaveProperty('calcAddressId');
      expect(module).toHaveProperty('calcProjectId');
      expect(module).toHaveProperty('calcDripListId');
      expect(module).toHaveProperty('encodeStreamConfig');
      expect(module).toHaveProperty('decodeStreamConfig');
      expect(module).toHaveProperty('resolveDriverName');
      expect(module).toHaveProperty('resolveAddressFromAddressDriverId');
    });

    it('should create a utils module with WriteBlockchainAdapter', () => {
      // Arrange
      const writeAdapter = {
        sendTx: vi.fn(),
        getAddress: vi.fn(),
        signMsg: vi.fn(),
        call: vi.fn(),
        getChainId: vi.fn(),
      } as WriteBlockchainAdapter;

      // Act
      const module = createUtilsModule({adapter: writeAdapter});

      // Assert
      expect(module).toHaveProperty('buildTx');
      expect(module).toHaveProperty('calcAddressId');
      expect(module).toHaveProperty('calcProjectId');
      expect(module).toHaveProperty('calcDripListId');
      expect(module).toHaveProperty('encodeStreamConfig');
      expect(module).toHaveProperty('decodeStreamConfig');
      expect(module).toHaveProperty('resolveDriverName');
      expect(module).toHaveProperty('resolveAddressFromAddressDriverId');
    });
  });

  describe('buildTx', () => {
    it('should expose buildTx function directly', () => {
      // Act & Assert
      expect(utilsModule.buildTx).toBe(buildTx);
    });
  });

  describe('calcAddressId', () => {
    it('should call calcAddressId with adapter and address', async () => {
      // Arrange
      const address = '0x1234567890123456789012345678901234567890' as Address;
      const expectedResult = 123n;
      vi.mocked(calcAddressId).mockResolvedValue(expectedResult);

      // Act
      const result = await utilsModule.calcAddressId(address);

      // Assert
      expect(result).toBe(expectedResult);
      expect(calcAddressId).toHaveBeenCalledWith(adapter, address);
    });

    it('should propagate errors from calcAddressId', async () => {
      // Arrange
      const address = '0x1234567890123456789012345678901234567890' as Address;
      const error = new Error('Chain not supported');
      vi.mocked(calcAddressId).mockRejectedValue(error);

      // Act & Assert
      await expect(utilsModule.calcAddressId(address)).rejects.toThrow(
        'Chain not supported',
      );
      expect(calcAddressId).toHaveBeenCalledWith(adapter, address);
    });
  });

  describe('calcProjectId', () => {
    it('should call calcProjectId with adapter, forge, and name', async () => {
      // Arrange
      const forge = 'github';
      const name = 'test-project' as ProjectName;
      const expectedResult = 456n;
      vi.mocked(calcProjectId).mockResolvedValue(expectedResult);

      // Act
      const result = await utilsModule.calcProjectId(forge, name);

      // Assert
      expect(result).toBe(expectedResult);
      expect(calcProjectId).toHaveBeenCalledWith(adapter, {forge, name});
    });

    it('should propagate errors from calcProjectId', async () => {
      // Arrange
      const forge = 'github';
      const name = 'test-project' as ProjectName;
      const error = new Error('Invalid project name');
      vi.mocked(calcProjectId).mockRejectedValue(error);

      // Act & Assert
      await expect(utilsModule.calcProjectId(forge, name)).rejects.toThrow(
        'Invalid project name',
      );
      expect(calcProjectId).toHaveBeenCalledWith(adapter, {forge, name});
    });
  });

  describe('calcDripListId', () => {
    it('should call calcDripListId with adapter and params', async () => {
      // Arrange
      const params = {
        salt: 789n,
        minter: '0x1234567890123456789012345678901234567890' as Address,
      };
      const expectedResult = 101112n;
      vi.mocked(calcDripListId).mockResolvedValue(expectedResult);

      // Act
      const result = await utilsModule.calcDripListId(params);

      // Assert
      expect(result).toBe(expectedResult);
      expect(calcDripListId).toHaveBeenCalledWith(adapter, params);
    });

    it('should propagate errors from calcDripListId', async () => {
      // Arrange
      const params = {
        salt: 789n,
        minter: '0x1234567890123456789012345678901234567890' as Address,
      };
      const error = new Error('Invalid salt');
      vi.mocked(calcDripListId).mockRejectedValue(error);

      // Act & Assert
      await expect(utilsModule.calcDripListId(params)).rejects.toThrow(
        'Invalid salt',
      );
      expect(calcDripListId).toHaveBeenCalledWith(adapter, params);
    });
  });

  describe('encodeStreamConfig', () => {
    it('should expose encodeStreamConfig function directly', () => {
      // Act & Assert
      expect(utilsModule.encodeStreamConfig).toBe(encodeStreamConfig);
    });
  });

  describe('decodeStreamConfig', () => {
    it('should expose decodeStreamConfig function directly', () => {
      // Act & Assert
      expect(utilsModule.decodeStreamConfig).toBe(decodeStreamConfig);
    });
  });

  describe('resolveDriverName', () => {
    it('should expose resolveDriverName function directly', () => {
      // Act & Assert
      expect(utilsModule.resolveDriverName).toBe(resolveDriverName);
    });
  });

  describe('resolveAddressFromAddressDriverId', () => {
    it('should expose resolveAddressFromAddressDriverId function directly', () => {
      // Act & Assert
      expect(utilsModule.resolveAddressFromAddressDriverId).toBe(
        resolveAddressFromAddressDriverId,
      );
    });
  });

  describe('adapter integration', () => {
    it('should use the same adapter instance across all methods that need it', async () => {
      // Arrange
      const address = '0x1234567890123456789012345678901234567890' as Address;
      const forge = 'github';
      const name = 'test-project' as ProjectName;
      const dripListParams = {
        salt: 789n,
        minter: '0x1234567890123456789012345678901234567890' as Address,
      };

      vi.mocked(calcAddressId).mockResolvedValue(123n);
      vi.mocked(calcProjectId).mockResolvedValue(456n);
      vi.mocked(calcDripListId).mockResolvedValue(789n);

      // Act
      await utilsModule.calcAddressId(address);
      await utilsModule.calcProjectId(forge, name);
      await utilsModule.calcDripListId(dripListParams);

      // Assert
      expect(calcAddressId).toHaveBeenCalledWith(adapter, address);
      expect(calcProjectId).toHaveBeenCalledWith(adapter, {forge, name});
      expect(calcDripListId).toHaveBeenCalledWith(adapter, dripListParams);
    });

    it('should work with different adapter types', async () => {
      // Arrange
      const writeAdapter = {
        sendTx: vi.fn(),
        getAddress: vi.fn(),
        signMsg: vi.fn(),
        call: vi.fn(),
        getChainId: vi.fn(),
      } as WriteBlockchainAdapter;

      const moduleWithWriteAdapter = createUtilsModule({
        adapter: writeAdapter,
      });
      const address = '0x1234567890123456789012345678901234567890' as Address;
      vi.mocked(calcAddressId).mockResolvedValue(123n);

      // Act
      await moduleWithWriteAdapter.calcAddressId(address);

      // Assert
      expect(calcAddressId).toHaveBeenCalledWith(writeAdapter, address);
    });
  });

  describe('method signatures', () => {
    it('should have correct method signatures for adapter-dependent functions', () => {
      // Act & Assert
      expect(typeof utilsModule.calcAddressId).toBe('function');
      expect(utilsModule.calcAddressId.length).toBe(1); // Only address parameter

      expect(typeof utilsModule.calcProjectId).toBe('function');
      expect(utilsModule.calcProjectId.length).toBe(2); // forge and name parameters

      expect(typeof utilsModule.calcDripListId).toBe('function');
      expect(utilsModule.calcDripListId.length).toBe(1); // Only params object
    });

    it('should have correct method signatures for direct utility functions', () => {
      // Act & Assert
      expect(typeof utilsModule.buildTx).toBe('function');
      expect(typeof utilsModule.encodeStreamConfig).toBe('function');
      expect(typeof utilsModule.decodeStreamConfig).toBe('function');
      expect(typeof utilsModule.resolveDriverName).toBe('function');
      expect(typeof utilsModule.resolveAddressFromAddressDriverId).toBe(
        'function',
      );
    });
  });
});
