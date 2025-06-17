import {describe, it, expect, vi, beforeEach} from 'vitest';
import {
  calcProjectId,
  supportedForges,
  type Forge,
  type ProjectName,
} from '../../../src/internal/projects/calcProjectId';
import {DripsError} from '../../../src/internal/shared/DripsError';
import type {ReadBlockchainAdapter} from '../../../src/internal/blockchain/BlockchainAdapter';

vi.mock('../../../src/internal/shared/assertions', () => ({
  requireSupportedChain: vi.fn(),
}));

vi.mock('viem', async () => {
  const actual = await vi.importActual('viem');
  return {
    ...actual,
    decodeFunctionResult: vi.fn(),
    toHex: vi.fn(),
  };
});

vi.mock('../../../src/internal/shared/buildTx', () => ({
  buildTx: vi.fn(),
}));

import {requireSupportedChain} from '../../../src/internal/shared/assertions';
import {decodeFunctionResult, toHex} from 'viem';
import {buildTx} from '../../../src/internal/shared/buildTx';

describe('calcProjectId', () => {
  const mockAdapter: ReadBlockchainAdapter = {
    call: vi.fn(),
    getChainId: vi.fn(),
  };

  const validParams = {
    forge: 'github' as Forge,
    name: 'owner/repo' as ProjectName,
  };

  const mockTxData = {
    to: '0xa71bdf410D48d4AA9aE1517A69D7E1Ef0c179b2B' as const,
    data: '0xcalcaccountdata' as const,
  };

  const mockEncodedResult = '0xencodedresult' as const;
  const mockProjectId = 123456789n;
  const mockHexName = '0x6f776e65722f7265706f' as const;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to default successful behavior
    vi.mocked(mockAdapter.getChainId).mockResolvedValue(11155111);
    vi.mocked(requireSupportedChain).mockImplementation(() => {});
    vi.mocked(toHex).mockReturnValue(mockHexName);
    vi.mocked(buildTx).mockReturnValue(mockTxData);
    vi.mocked(mockAdapter.call).mockResolvedValue(mockEncodedResult);
    vi.mocked(decodeFunctionResult).mockReturnValue(mockProjectId);
  });

  describe('successful execution', () => {
    it('should calculate project ID successfully', async () => {
      // Act
      const result = await calcProjectId(mockAdapter, validParams);

      // Assert
      expect(mockAdapter.getChainId).toHaveBeenCalled();
      expect(requireSupportedChain).toHaveBeenCalledWith(11155111);
      expect(toHex).toHaveBeenCalledWith(validParams.name);
      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array), // repoDriverAbi
        contract: '0xa71bdf410D48d4AA9aE1517A69D7E1Ef0c179b2B',
        functionName: 'calcAccountId',
        args: [0, mockHexName], // github forge = 0
      });
      expect(mockAdapter.call).toHaveBeenCalledWith(mockTxData);
      expect(decodeFunctionResult).toHaveBeenCalledWith({
        abi: expect.any(Array), // repoDriverAbi
        functionName: 'calcAccountId',
        data: mockEncodedResult,
      });
      expect(result).toBe(mockProjectId);
    });

    it('should work with different adapters', async () => {
      // Arrange
      const customAdapter: ReadBlockchainAdapter = {
        call: vi.fn().mockResolvedValue(mockEncodedResult),
        getChainId: vi.fn().mockResolvedValue(11155111),
      };

      // Act
      const result = await calcProjectId(customAdapter, validParams);

      // Assert
      expect(customAdapter.getChainId).toHaveBeenCalled();
      expect(customAdapter.call).toHaveBeenCalledWith(mockTxData);
      expect(mockAdapter.call).not.toHaveBeenCalled();
      expect(result).toBe(mockProjectId);
    });

    it('should work with different supported chains', async () => {
      // Arrange - Mock adapter to return mainnet chain ID
      vi.mocked(mockAdapter.getChainId).mockResolvedValue(1);
      const mainnetTxData = {
        to: '0x770023d55D09A9C110694827F1a6B32D5c2b373E' as const,
        data: '0xcalcaccountdata' as const,
      };
      vi.mocked(buildTx).mockReturnValue(mainnetTxData);

      // Act
      await calcProjectId(mockAdapter, validParams);

      // Assert
      expect(mockAdapter.getChainId).toHaveBeenCalled();
      expect(requireSupportedChain).toHaveBeenCalledWith(1);
      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        contract: '0x770023d55D09A9C110694827F1a6B32D5c2b373E', // mainnet contract
        functionName: 'calcAccountId',
        args: [0, mockHexName],
      });
    });

    it('should work with localhost chain', async () => {
      // Arrange
      vi.mocked(mockAdapter.getChainId).mockResolvedValue(31337);
      const localhostTxData = {
        to: '0x971e08fc533d2A5f228c7944E511611dA3B56B24' as const,
        data: '0xcalcaccountdata' as const,
      };
      vi.mocked(buildTx).mockReturnValue(localhostTxData);

      // Act
      await calcProjectId(mockAdapter, validParams);

      // Assert
      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        contract: '0x971e08fc533d2A5f228c7944E511611dA3B56B24', // localhost contract
        functionName: 'calcAccountId',
        args: [0, mockHexName],
      });
    });

    it('should handle different project names', async () => {
      // Arrange
      const customParams = {
        ...validParams,
        name: 'different-org/different-repo' as ProjectName,
      };
      const customHexName =
        '0x646966666572656e742d6f72672f646966666572656e742d7265706f';
      vi.mocked(toHex).mockReturnValue(customHexName);

      // Act
      await calcProjectId(mockAdapter, customParams);

      // Assert
      expect(toHex).toHaveBeenCalledWith(customParams.name);
      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        contract: '0xa71bdf410D48d4AA9aE1517A69D7E1Ef0c179b2B',
        functionName: 'calcAccountId',
        args: [0, customHexName],
      });
    });

    it('should return different project IDs', async () => {
      // Arrange
      const customProjectId = 987654321n;
      vi.mocked(decodeFunctionResult).mockReturnValue(customProjectId);

      // Act
      const result = await calcProjectId(mockAdapter, validParams);

      // Assert
      expect(result).toBe(customProjectId);
    });
  });

  describe('forge mapping', () => {
    it('should use correct forge ID for github', async () => {
      // Arrange
      const githubParams = {
        forge: 'github' as Forge,
        name: 'owner/repo' as ProjectName,
      };

      // Act
      await calcProjectId(mockAdapter, githubParams);

      // Assert
      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        contract: expect.any(String),
        functionName: 'calcAccountId',
        args: [0, mockHexName], // github should map to 0
      });
    });
  });

  describe('project name formats', () => {
    it('should handle simple project names', async () => {
      // Arrange
      const simpleParams = {
        forge: 'github' as Forge,
        name: 'user/repo' as ProjectName,
      };
      const simpleHexName = '0x757365722f7265706f';
      vi.mocked(toHex).mockReturnValue(simpleHexName);

      // Act
      await calcProjectId(mockAdapter, simpleParams);

      // Assert
      expect(toHex).toHaveBeenCalledWith('user/repo');
      expect(buildTx).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [0, simpleHexName],
        }),
      );
    });

    it('should handle project names with hyphens', async () => {
      // Arrange
      const hyphenParams = {
        forge: 'github' as Forge,
        name: 'my-org/my-repo' as ProjectName,
      };
      const hyphenHexName = '0x6d792d6f72672f6d792d7265706f';
      vi.mocked(toHex).mockReturnValue(hyphenHexName);

      // Act
      await calcProjectId(mockAdapter, hyphenParams);

      // Assert
      expect(toHex).toHaveBeenCalledWith('my-org/my-repo');
      expect(buildTx).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [0, hyphenHexName],
        }),
      );
    });

    it('should handle project names with underscores', async () => {
      // Arrange
      const underscoreParams = {
        forge: 'github' as Forge,
        name: 'my_org/my_repo' as ProjectName,
      };
      const underscoreHexName = '0x6d795f6f72672f6d795f7265706f';
      vi.mocked(toHex).mockReturnValue(underscoreHexName);

      // Act
      await calcProjectId(mockAdapter, underscoreParams);

      // Assert
      expect(toHex).toHaveBeenCalledWith('my_org/my_repo');
      expect(buildTx).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [0, underscoreHexName],
        }),
      );
    });

    it('should handle project names with dots', async () => {
      // Arrange
      const dotParams = {
        forge: 'github' as Forge,
        name: 'my.org/my.repo' as ProjectName,
      };
      const dotHexName = '0x6d792e6f72672f6d792e7265706f';
      vi.mocked(toHex).mockReturnValue(dotHexName);

      // Act
      await calcProjectId(mockAdapter, dotParams);

      // Assert
      expect(toHex).toHaveBeenCalledWith('my.org/my.repo');
      expect(buildTx).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [0, dotHexName],
        }),
      );
    });

    it('should handle numeric project names', async () => {
      // Arrange
      const numericParams = {
        forge: 'github' as Forge,
        name: '123/456' as ProjectName,
      };
      const numericHexName = '0x3132332f343536';
      vi.mocked(toHex).mockReturnValue(numericHexName);

      // Act
      await calcProjectId(mockAdapter, numericParams);

      // Assert
      expect(toHex).toHaveBeenCalledWith('123/456');
      expect(buildTx).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [0, numericHexName],
        }),
      );
    });

    it('should handle long project names', async () => {
      // Arrange
      const longParams = {
        forge: 'github' as Forge,
        name: 'very-long-organization-name/very-long-repository-name-with-many-words' as ProjectName,
      };
      const longHexName =
        '0x766572792d6c6f6e672d6f7267616e697a6174696f6e2d6e616d652f766572792d6c6f6e672d7265706f7369746f72792d6e616d652d776974682d6d616e792d776f726473';
      vi.mocked(toHex).mockReturnValue(longHexName);

      // Act
      await calcProjectId(mockAdapter, longParams);

      // Assert
      expect(toHex).toHaveBeenCalledWith(
        'very-long-organization-name/very-long-repository-name-with-many-words',
      );
      expect(buildTx).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [0, longHexName],
        }),
      );
    });
  });

  describe('error handling', () => {
    it('should propagate getChainId errors', async () => {
      // Arrange
      const chainIdError = new Error('Failed to get chain ID');
      vi.mocked(mockAdapter.getChainId).mockRejectedValue(chainIdError);

      // Act & Assert
      await expect(calcProjectId(mockAdapter, validParams)).rejects.toThrow(
        chainIdError,
      );
      expect(requireSupportedChain).not.toHaveBeenCalled();
      expect(toHex).not.toHaveBeenCalled();
      expect(buildTx).not.toHaveBeenCalled();
      expect(mockAdapter.call).not.toHaveBeenCalled();
    });

    it('should propagate chain validation errors', async () => {
      // Arrange
      const chainError = new DripsError('Unsupported chain ID: 999');
      vi.mocked(requireSupportedChain).mockImplementation(() => {
        throw chainError;
      });

      // Act & Assert
      await expect(calcProjectId(mockAdapter, validParams)).rejects.toThrow(
        chainError,
      );
      expect(mockAdapter.getChainId).toHaveBeenCalled();
      expect(toHex).not.toHaveBeenCalled();
      expect(buildTx).not.toHaveBeenCalled();
      expect(mockAdapter.call).not.toHaveBeenCalled();
    });

    it('should propagate toHex errors', async () => {
      // Arrange
      const hexError = new Error('Failed to convert to hex');
      vi.mocked(toHex).mockImplementation(() => {
        throw hexError;
      });

      // Act & Assert
      await expect(calcProjectId(mockAdapter, validParams)).rejects.toThrow(
        hexError,
      );
      expect(requireSupportedChain).toHaveBeenCalled();
      expect(buildTx).not.toHaveBeenCalled();
      expect(mockAdapter.call).not.toHaveBeenCalled();
    });

    it('should propagate transaction building errors', async () => {
      // Arrange
      const buildError = new Error('Failed to build transaction');
      vi.mocked(buildTx).mockImplementation(() => {
        throw buildError;
      });

      // Act & Assert
      await expect(calcProjectId(mockAdapter, validParams)).rejects.toThrow(
        buildError,
      );
      expect(requireSupportedChain).toHaveBeenCalled();
      expect(toHex).toHaveBeenCalled();
      expect(mockAdapter.call).not.toHaveBeenCalled();
    });

    it('should propagate adapter call errors', async () => {
      // Arrange
      const callError = new Error('Blockchain call failed');
      vi.mocked(mockAdapter.call).mockRejectedValue(callError);

      // Act & Assert
      await expect(calcProjectId(mockAdapter, validParams)).rejects.toThrow(
        callError,
      );
      expect(requireSupportedChain).toHaveBeenCalled();
      expect(toHex).toHaveBeenCalled();
      expect(buildTx).toHaveBeenCalled();
      expect(decodeFunctionResult).not.toHaveBeenCalled();
    });

    it('should propagate decoding errors', async () => {
      // Arrange
      const decodeError = new Error('Failed to decode function result');
      vi.mocked(decodeFunctionResult).mockImplementation(() => {
        throw decodeError;
      });

      // Act & Assert
      await expect(calcProjectId(mockAdapter, validParams)).rejects.toThrow(
        decodeError,
      );
      expect(requireSupportedChain).toHaveBeenCalled();
      expect(toHex).toHaveBeenCalled();
      expect(buildTx).toHaveBeenCalled();
      expect(mockAdapter.call).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      // Arrange
      const networkError = new Error('Network connection failed');
      vi.mocked(mockAdapter.call).mockRejectedValue(networkError);

      // Act & Assert
      await expect(calcProjectId(mockAdapter, validParams)).rejects.toThrow(
        networkError,
      );
    });
  });

  describe('edge cases', () => {
    it('should handle zero project ID result', async () => {
      // Arrange
      vi.mocked(decodeFunctionResult).mockReturnValue(0n);

      // Act
      const result = await calcProjectId(mockAdapter, validParams);

      // Assert
      expect(result).toBe(0n);
    });

    it('should handle very large project ID result', async () => {
      // Arrange
      const largeProjectId = BigInt(
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      );
      vi.mocked(decodeFunctionResult).mockReturnValue(largeProjectId);

      // Act
      const result = await calcProjectId(mockAdapter, validParams);

      // Assert
      expect(result).toBe(largeProjectId);
    });

    it('should handle empty hex conversion result', async () => {
      // Arrange
      vi.mocked(toHex).mockReturnValue('0x');

      // Act
      await calcProjectId(mockAdapter, validParams);

      // Assert
      expect(buildTx).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [0, '0x'],
        }),
      );
    });
  });

  describe('function call order', () => {
    it('should call functions in correct order', async () => {
      // Arrange
      const callOrder: string[] = [];
      vi.mocked(mockAdapter.getChainId).mockImplementation(async () => {
        callOrder.push('adapter.getChainId');
        return 11155111;
      });
      vi.mocked(requireSupportedChain).mockImplementation(() => {
        callOrder.push('requireSupportedChain');
      });
      vi.mocked(toHex).mockImplementation(() => {
        callOrder.push('toHex');
        return mockHexName;
      });
      vi.mocked(buildTx).mockImplementation(() => {
        callOrder.push('buildTx');
        return mockTxData;
      });
      vi.mocked(mockAdapter.call).mockImplementation(async () => {
        callOrder.push('adapter.call');
        return mockEncodedResult;
      });
      vi.mocked(decodeFunctionResult).mockImplementation(() => {
        callOrder.push('decodeFunctionResult');
        return mockProjectId;
      });

      // Act
      await calcProjectId(mockAdapter, validParams);

      // Assert
      expect(callOrder).toEqual([
        'adapter.getChainId',
        'requireSupportedChain',
        'toHex',
        'buildTx',
        'adapter.call',
        'decodeFunctionResult',
      ]);
    });

    it('should not call subsequent functions if chain validation fails', async () => {
      // Arrange
      vi.mocked(requireSupportedChain).mockImplementation(() => {
        throw new Error('Chain validation failed');
      });

      // Act & Assert
      await expect(calcProjectId(mockAdapter, validParams)).rejects.toThrow(
        'Chain validation failed',
      );
      expect(toHex).not.toHaveBeenCalled();
      expect(buildTx).not.toHaveBeenCalled();
      expect(mockAdapter.call).not.toHaveBeenCalled();
      expect(decodeFunctionResult).not.toHaveBeenCalled();
    });
  });

  describe('parameter validation', () => {
    it('should use correct contract address for each chain', async () => {
      // Test Sepolia
      vi.mocked(mockAdapter.getChainId).mockResolvedValue(11155111);
      await calcProjectId(mockAdapter, {...validParams});
      expect(buildTx).toHaveBeenLastCalledWith(
        expect.objectContaining({
          contract: '0xa71bdf410D48d4AA9aE1517A69D7E1Ef0c179b2B',
        }),
      );

      // Test Mainnet
      vi.mocked(mockAdapter.getChainId).mockResolvedValue(1);
      const mainnetTxData = {
        to: '0x770023d55D09A9C110694827F1a6B32D5c2b373E' as const,
        data: '0xcalcaccountdata' as const,
      };
      vi.mocked(buildTx).mockReturnValue(mainnetTxData);
      await calcProjectId(mockAdapter, {...validParams});
      expect(buildTx).toHaveBeenLastCalledWith(
        expect.objectContaining({
          contract: '0x770023d55D09A9C110694827F1a6B32D5c2b373E',
        }),
      );

      // Test Localhost
      vi.mocked(mockAdapter.getChainId).mockResolvedValue(31337);
      const localhostTxData = {
        to: '0x971e08fc533d2A5f228c7944E511611dA3B56B24' as const,
        data: '0xcalcaccountdata' as const,
      };
      vi.mocked(buildTx).mockReturnValue(localhostTxData);
      await calcProjectId(mockAdapter, {...validParams});
      expect(buildTx).toHaveBeenLastCalledWith(
        expect.objectContaining({
          contract: '0x971e08fc533d2A5f228c7944E511611dA3B56B24',
        }),
      );
    });

    it('should pass correct function name and arguments', async () => {
      // Act
      await calcProjectId(mockAdapter, validParams);

      // Assert
      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        contract: expect.any(String),
        functionName: 'calcAccountId',
        args: [0, mockHexName], // forge=0 (github), hex-encoded name
      });

      expect(decodeFunctionResult).toHaveBeenCalledWith({
        abi: expect.any(Array),
        functionName: 'calcAccountId',
        data: mockEncodedResult,
      });
    });
  });

  describe('constants and types', () => {
    it('should export supportedForges constant', () => {
      expect(supportedForges).toEqual(['github']);
    });

    it('should have github as the only supported forge', () => {
      expect(supportedForges).toHaveLength(1);
      expect(supportedForges[0]).toBe('github');
    });
  });

  describe('integration scenarios', () => {
    it('should handle real-world project names', async () => {
      const realWorldCases = [
        'facebook/react',
        'microsoft/vscode',
        'nodejs/node',
        'torvalds/linux',
        'octocat/Hello-World',
      ];

      for (const projectName of realWorldCases) {
        const params = {
          forge: 'github' as Forge,
          name: projectName as ProjectName,
        };
        const hexName =
          `0x${Buffer.from(projectName).toString('hex')}` as `0x${string}`;
        vi.mocked(toHex).mockReturnValue(hexName);

        await calcProjectId(mockAdapter, params);

        expect(toHex).toHaveBeenCalledWith(projectName);
        expect(buildTx).toHaveBeenCalledWith(
          expect.objectContaining({
            args: [0, hexName],
          }),
        );
      }
    });

    it('should work across different supported chains', async () => {
      const supportedChains = [
        1, 80002, 11155420, 11155111, 31337, 84532, 314, 1088, 10,
      ];
      const expectedContracts = [
        '0x770023d55D09A9C110694827F1a6B32D5c2b373E', // mainnet
        '0x54372850Db72915Fd9C5EC745683EB607b4a8642', // polygon amoy
        '0xa71bdf410D48d4AA9aE1517A69D7E1Ef0c179b2B', // optimism sepolia
        '0xa71bdf410D48d4AA9aE1517A69D7E1Ef0c179b2B', // sepolia
        '0x971e08fc533d2A5f228c7944E511611dA3B56B24', // localhost
        '0x54372850Db72915Fd9C5EC745683EB607b4a8642', // base sepolia
        '0xe75f56B26857cAe06b455Bfc9481593Ae0FB4257', // filecoin
        '0xe75f56B26857cAe06b455Bfc9481593Ae0FB4257', // metis
        '0xe75f56B26857cAe06b455Bfc9481593Ae0FB4257', // optimism
      ];

      for (let i = 0; i < supportedChains.length; i++) {
        const chainId = supportedChains[i];
        const expectedContract = expectedContracts[i];

        vi.mocked(mockAdapter.getChainId).mockResolvedValue(chainId);
        const chainTxData = {
          to: expectedContract as `0x${string}`,
          data: '0xcalcaccountdata' as `0x${string}`,
        };
        vi.mocked(buildTx).mockReturnValue(chainTxData);

        await calcProjectId(mockAdapter, validParams);

        expect(buildTx).toHaveBeenCalledWith(
          expect.objectContaining({
            contract: expectedContract,
          }),
        );
      }
    });
  });
});
