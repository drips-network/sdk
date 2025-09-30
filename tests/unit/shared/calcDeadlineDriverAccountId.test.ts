import {describe, it, expect, vi, beforeEach} from 'vitest';
import {calcDeadlineDriverAccountId} from '../../../src/internal/shared/calcDeadlineDriverAccountId';
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
  };
});

vi.mock('../../../src/internal/shared/buildTx', () => ({
  buildTx: vi.fn(),
}));

import {requireSupportedChain} from '../../../src/internal/shared/assertions';
import {decodeFunctionResult} from 'viem';
import {buildTx} from '../../../src/internal/shared/buildTx';

describe('calcDeadlineDriverAccountId', () => {
  const mockAdapter: ReadBlockchainAdapter = {
    call: vi.fn(),
    getChainId: vi.fn(),
  };

  const validParams = {
    repoAccountId: 123456789n,
    recipientAccountId: 987654321n,
    refundAccountId: 111222333n,
    deadlineSeconds: 1735689600,
  };

  const mockTxData = {
    to: '0x4e576318213e3c9b436d0758a021a485c5d8b929' as const,
    data: '0xcalcaccountdata' as const,
    abiFunctionName: 'calcAccountId' as const,
  };

  const mockEncodedResult = '0xencodedresult' as const;
  const mockAccountId = 444555666n;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mockAdapter.getChainId).mockResolvedValue(11155111);
    vi.mocked(requireSupportedChain).mockImplementation(() => {});
    vi.mocked(buildTx).mockReturnValue(mockTxData);
    vi.mocked(mockAdapter.call).mockResolvedValue(mockEncodedResult);
    vi.mocked(decodeFunctionResult).mockReturnValue(mockAccountId);
  });

  describe('successful execution', () => {
    it('should calculate deadline driver account ID successfully', async () => {
      const result = await calcDeadlineDriverAccountId(
        mockAdapter,
        validParams,
      );

      expect(mockAdapter.getChainId).toHaveBeenCalled();
      expect(requireSupportedChain).toHaveBeenCalledWith(11155111);
      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        contract: '0x4e576318213e3c9b436d0758a021a485c5d8b929',
        functionName: 'calcAccountId',
        args: [
          validParams.repoAccountId,
          validParams.recipientAccountId,
          validParams.refundAccountId,
          validParams.deadlineSeconds,
        ],
      });
      expect(mockAdapter.call).toHaveBeenCalledWith(mockTxData);
      expect(decodeFunctionResult).toHaveBeenCalledWith({
        abi: expect.any(Array),
        functionName: 'calcAccountId',
        data: mockEncodedResult,
      });
      expect(result).toBe(mockAccountId);
    });

    it('should work with different adapters', async () => {
      const customAdapter: ReadBlockchainAdapter = {
        call: vi.fn().mockResolvedValue(mockEncodedResult),
        getChainId: vi.fn().mockResolvedValue(11155111),
      };

      const result = await calcDeadlineDriverAccountId(
        customAdapter,
        validParams,
      );

      expect(customAdapter.getChainId).toHaveBeenCalled();
      expect(customAdapter.call).toHaveBeenCalledWith(mockTxData);
      expect(mockAdapter.call).not.toHaveBeenCalled();
      expect(result).toBe(mockAccountId);
    });

    it('should work with different supported chains', async () => {
      vi.mocked(mockAdapter.getChainId).mockResolvedValue(11155420);
      const mainnetTxData = {
        to: '0xE57A3111414E0FaB39cc6e8fDe957b1f6471cd49' as const,
        data: '0xcalcaccountdata' as const,
        abiFunctionName: 'calcAccountId' as const,
      };
      vi.mocked(buildTx).mockReturnValue(mainnetTxData);

      await calcDeadlineDriverAccountId(mockAdapter, validParams);

      expect(mockAdapter.getChainId).toHaveBeenCalled();
      expect(requireSupportedChain).toHaveBeenCalledWith(11155420);
      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        contract: '0xE57A3111414E0FaB39cc6e8fDe957b1f6471cd49',
        functionName: 'calcAccountId',
        args: [
          validParams.repoAccountId,
          validParams.recipientAccountId,
          validParams.refundAccountId,
          validParams.deadlineSeconds,
        ],
      });
    });

    it('should work with localhost chain', async () => {
      vi.mocked(mockAdapter.getChainId).mockResolvedValue(31337);
      const localhostTxData = {
        to: '0xFD9Aa049A4f3dC1a2CD3355Ce52A943418Fa54e3' as const,
        data: '0xcalcaccountdata' as const,
        abiFunctionName: 'calcAccountId' as const,
      };
      vi.mocked(buildTx).mockReturnValue(localhostTxData);

      await calcDeadlineDriverAccountId(mockAdapter, validParams);

      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        contract: '0xFD9Aa049A4f3dC1a2CD3355Ce52A943418Fa54e3',
        functionName: 'calcAccountId',
        args: [
          validParams.repoAccountId,
          validParams.recipientAccountId,
          validParams.refundAccountId,
          validParams.deadlineSeconds,
        ],
      });
    });

    it('should handle different account IDs', async () => {
      const customParams = {
        repoAccountId: 111n,
        recipientAccountId: 222n,
        refundAccountId: 333n,
        deadlineSeconds: 1735689600,
      };

      await calcDeadlineDriverAccountId(mockAdapter, customParams);

      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        contract: '0x4e576318213e3c9b436d0758a021a485c5d8b929',
        functionName: 'calcAccountId',
        args: [
          customParams.repoAccountId,
          customParams.recipientAccountId,
          customParams.refundAccountId,
          customParams.deadlineSeconds,
        ],
      });
    });

    it('should handle different deadline values', async () => {
      const customParams = {
        ...validParams,
        deadlineSeconds: 1893456000,
      };

      await calcDeadlineDriverAccountId(mockAdapter, customParams);

      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        contract: expect.any(String),
        functionName: 'calcAccountId',
        args: [
          customParams.repoAccountId,
          customParams.recipientAccountId,
          customParams.refundAccountId,
          1893456000,
        ],
      });
    });

    it('should return different account IDs', async () => {
      const customAccountId = 999888777n;
      vi.mocked(decodeFunctionResult).mockReturnValue(customAccountId);

      const result = await calcDeadlineDriverAccountId(
        mockAdapter,
        validParams,
      );

      expect(result).toBe(customAccountId);
    });
  });

  describe('error handling', () => {
    it('should propagate getChainId errors', async () => {
      const chainIdError = new Error('Failed to get chain ID');
      vi.mocked(mockAdapter.getChainId).mockRejectedValue(chainIdError);

      await expect(
        calcDeadlineDriverAccountId(mockAdapter, validParams),
      ).rejects.toThrow(chainIdError);
      expect(requireSupportedChain).not.toHaveBeenCalled();
      expect(buildTx).not.toHaveBeenCalled();
      expect(mockAdapter.call).not.toHaveBeenCalled();
    });

    it('should propagate chain validation errors', async () => {
      const chainError = new DripsError('Unsupported chain ID: 999');
      vi.mocked(requireSupportedChain).mockImplementation(() => {
        throw chainError;
      });

      await expect(
        calcDeadlineDriverAccountId(mockAdapter, validParams),
      ).rejects.toThrow(chainError);
      expect(mockAdapter.getChainId).toHaveBeenCalled();
      expect(buildTx).not.toHaveBeenCalled();
      expect(mockAdapter.call).not.toHaveBeenCalled();
    });

    it('should propagate transaction building errors', async () => {
      const buildError = new Error('Failed to build transaction');
      vi.mocked(buildTx).mockImplementation(() => {
        throw buildError;
      });

      await expect(
        calcDeadlineDriverAccountId(mockAdapter, validParams),
      ).rejects.toThrow(buildError);
      expect(requireSupportedChain).toHaveBeenCalled();
      expect(mockAdapter.call).not.toHaveBeenCalled();
    });

    it('should propagate adapter call errors', async () => {
      const callError = new Error('Blockchain call failed');
      vi.mocked(mockAdapter.call).mockRejectedValue(callError);

      await expect(
        calcDeadlineDriverAccountId(mockAdapter, validParams),
      ).rejects.toThrow(callError);
      expect(requireSupportedChain).toHaveBeenCalled();
      expect(buildTx).toHaveBeenCalled();
      expect(decodeFunctionResult).not.toHaveBeenCalled();
    });

    it('should propagate decoding errors', async () => {
      const decodeError = new Error('Failed to decode function result');
      vi.mocked(decodeFunctionResult).mockImplementation(() => {
        throw decodeError;
      });

      await expect(
        calcDeadlineDriverAccountId(mockAdapter, validParams),
      ).rejects.toThrow(decodeError);
      expect(requireSupportedChain).toHaveBeenCalled();
      expect(buildTx).toHaveBeenCalled();
      expect(mockAdapter.call).toHaveBeenCalled();
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network connection failed');
      vi.mocked(mockAdapter.call).mockRejectedValue(networkError);

      await expect(
        calcDeadlineDriverAccountId(mockAdapter, validParams),
      ).rejects.toThrow(networkError);
    });
  });

  describe('edge cases', () => {
    it('should handle zero account ID result', async () => {
      vi.mocked(decodeFunctionResult).mockReturnValue(0n);

      const result = await calcDeadlineDriverAccountId(
        mockAdapter,
        validParams,
      );

      expect(result).toBe(0n);
    });

    it('should handle very large account ID result', async () => {
      const largeAccountId = BigInt(
        '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      );
      vi.mocked(decodeFunctionResult).mockReturnValue(largeAccountId);

      const result = await calcDeadlineDriverAccountId(
        mockAdapter,
        validParams,
      );

      expect(result).toBe(largeAccountId);
    });

    it('should handle zero deadline seconds', async () => {
      const zeroDeadlineParams = {
        ...validParams,
        deadlineSeconds: 0,
      };

      await calcDeadlineDriverAccountId(mockAdapter, zeroDeadlineParams);

      expect(buildTx).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [
            validParams.repoAccountId,
            validParams.recipientAccountId,
            validParams.refundAccountId,
            0,
          ],
        }),
      );
    });

    it('should handle maximum safe deadline seconds', async () => {
      const maxDeadlineParams = {
        ...validParams,
        deadlineSeconds: 2147483647,
      };

      await calcDeadlineDriverAccountId(mockAdapter, maxDeadlineParams);

      expect(buildTx).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [
            validParams.repoAccountId,
            validParams.recipientAccountId,
            validParams.refundAccountId,
            2147483647,
          ],
        }),
      );
    });

    it('should handle same account IDs for all parameters', async () => {
      const sameIdParams = {
        repoAccountId: 123456n,
        recipientAccountId: 123456n,
        refundAccountId: 123456n,
        deadlineSeconds: 1735689600,
      };

      await calcDeadlineDriverAccountId(mockAdapter, sameIdParams);

      expect(buildTx).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [123456n, 123456n, 123456n, 1735689600],
        }),
      );
    });

    it('should handle zero account IDs', async () => {
      const zeroIdParams = {
        repoAccountId: 0n,
        recipientAccountId: 0n,
        refundAccountId: 0n,
        deadlineSeconds: 1735689600,
      };

      await calcDeadlineDriverAccountId(mockAdapter, zeroIdParams);

      expect(buildTx).toHaveBeenCalledWith(
        expect.objectContaining({
          args: [0n, 0n, 0n, 1735689600],
        }),
      );
    });
  });

  describe('function call order', () => {
    it('should call functions in correct order', async () => {
      const callOrder: string[] = [];
      vi.mocked(mockAdapter.getChainId).mockImplementation(async () => {
        callOrder.push('adapter.getChainId');
        return 11155111;
      });
      vi.mocked(requireSupportedChain).mockImplementation(() => {
        callOrder.push('requireSupportedChain');
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
        return mockAccountId;
      });

      await calcDeadlineDriverAccountId(mockAdapter, validParams);

      expect(callOrder).toEqual([
        'adapter.getChainId',
        'requireSupportedChain',
        'buildTx',
        'adapter.call',
        'decodeFunctionResult',
      ]);
    });

    it('should not call subsequent functions if chain validation fails', async () => {
      vi.mocked(requireSupportedChain).mockImplementation(() => {
        throw new Error('Chain validation failed');
      });

      await expect(
        calcDeadlineDriverAccountId(mockAdapter, validParams),
      ).rejects.toThrow('Chain validation failed');
      expect(buildTx).not.toHaveBeenCalled();
      expect(mockAdapter.call).not.toHaveBeenCalled();
      expect(decodeFunctionResult).not.toHaveBeenCalled();
    });
  });

  describe('parameter validation', () => {
    it('should use correct contract address for each chain', async () => {
      vi.mocked(mockAdapter.getChainId).mockResolvedValue(11155111);
      await calcDeadlineDriverAccountId(mockAdapter, {...validParams});
      expect(buildTx).toHaveBeenLastCalledWith(
        expect.objectContaining({
          contract: '0x4e576318213e3c9b436d0758a021a485c5d8b929',
        }),
      );

      vi.mocked(mockAdapter.getChainId).mockResolvedValue(11155420);
      const opSepoliaTxData = {
        to: '0xE57A3111414E0FaB39cc6e8fDe957b1f6471cd49' as const,
        data: '0xcalcaccountdata' as const,
        abiFunctionName: 'calcAccountId' as const,
      };
      vi.mocked(buildTx).mockReturnValue(opSepoliaTxData);
      await calcDeadlineDriverAccountId(mockAdapter, {...validParams});
      expect(buildTx).toHaveBeenLastCalledWith(
        expect.objectContaining({
          contract: '0xE57A3111414E0FaB39cc6e8fDe957b1f6471cd49',
        }),
      );

      vi.mocked(mockAdapter.getChainId).mockResolvedValue(31337);
      const localhostTxData = {
        to: '0xFD9Aa049A4f3dC1a2CD3355Ce52A943418Fa54e3' as const,
        data: '0xcalcaccountdata' as const,
        abiFunctionName: 'calcAccountId' as const,
      };
      vi.mocked(buildTx).mockReturnValue(localhostTxData);
      await calcDeadlineDriverAccountId(mockAdapter, {...validParams});
      expect(buildTx).toHaveBeenLastCalledWith(
        expect.objectContaining({
          contract: '0xFD9Aa049A4f3dC1a2CD3355Ce52A943418Fa54e3',
        }),
      );
    });

    it('should pass correct function name and arguments', async () => {
      await calcDeadlineDriverAccountId(mockAdapter, validParams);

      expect(buildTx).toHaveBeenCalledWith({
        abi: expect.any(Array),
        contract: expect.any(String),
        functionName: 'calcAccountId',
        args: [
          validParams.repoAccountId,
          validParams.recipientAccountId,
          validParams.refundAccountId,
          validParams.deadlineSeconds,
        ],
      });

      expect(decodeFunctionResult).toHaveBeenCalledWith({
        abi: expect.any(Array),
        functionName: 'calcAccountId',
        data: mockEncodedResult,
      });
    });
  });

  describe('integration scenarios', () => {
    it('should work across different supported chains', async () => {
      const supportedChains = [11155420, 11155111, 31337, 314, 1088, 10];
      const expectedContracts = [
        '0xE57A3111414E0FaB39cc6e8fDe957b1f6471cd49',
        '0x4e576318213e3c9b436d0758a021a485c5d8b929',
        '0xFD9Aa049A4f3dC1a2CD3355Ce52A943418Fa54e3',
        '0x0386b66e2b0106ff27ef26e84102ca78a5c0edef',
        '0x0386b66e2b0106ff27ef26e84102ca78a5c0edef',
        '0x0386b66e2b0106ff27ef26e84102ca78a5c0edef',
      ];

      for (let i = 0; i < supportedChains.length; i++) {
        const chainId = supportedChains[i];
        const expectedContract = expectedContracts[i];

        vi.mocked(mockAdapter.getChainId).mockResolvedValue(chainId);
        const chainTxData = {
          to: expectedContract as `0x${string}`,
          data: '0xcalcaccountdata' as `0x${string}`,
          abiFunctionName: 'calcAccountId' as const,
        };
        vi.mocked(buildTx).mockReturnValue(chainTxData);

        await calcDeadlineDriverAccountId(mockAdapter, validParams);

        expect(buildTx).toHaveBeenCalledWith(
          expect.objectContaining({
            contract: expectedContract,
          }),
        );
      }
    });

    it('should handle realistic parameter combinations', async () => {
      const realisticScenarios = [
        {
          repoAccountId: 123456789012345n,
          recipientAccountId: 987654321098765n,
          refundAccountId: 111222333444555n,
          deadlineSeconds: 1735689600,
        },
        {
          repoAccountId: 1n,
          recipientAccountId: 2n,
          refundAccountId: 3n,
          deadlineSeconds: 1893456000,
        },
        {
          repoAccountId: BigInt('0xffffffffffffffff'),
          recipientAccountId: BigInt('0xeeeeeeeeeeeeeeee'),
          refundAccountId: BigInt('0xdddddddddddddddd'),
          deadlineSeconds: 2147483647,
        },
      ];

      for (const scenario of realisticScenarios) {
        await calcDeadlineDriverAccountId(mockAdapter, scenario);

        expect(buildTx).toHaveBeenCalledWith(
          expect.objectContaining({
            args: [
              scenario.repoAccountId,
              scenario.recipientAccountId,
              scenario.refundAccountId,
              scenario.deadlineSeconds,
            ],
          }),
        );
      }
    });
  });
});
