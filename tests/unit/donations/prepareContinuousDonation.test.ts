import {describe, vi, beforeEach, it, expect} from 'vitest';
import {Address, parseUnits} from 'viem';
import {
  PreparedTx,
  WriteBlockchainAdapter,
} from '../../../src/internal/blockchain/BlockchainAdapter';
import {DripsGraphQLClient} from '../../../src/internal/graphql/createGraphQLClient';
import {
  IpfsMetadataUploaderFn,
  Metadata,
  StreamsMetadata,
} from '../../../src/internal/shared/createPinataIpfsMetadataUploader';
import {getCurrentStreamsAndReceivers} from '../../../src/internal/streams/getCurrentStreamReceivers';
import {resolveReceiverAccountId} from '../../../src/internal/shared/receiverUtils';
import {buildStreamsMetadata} from '../../../src/internal/streams/buildStreamsMetadata';
import {
  ContinuousDonation,
  prepareContinuousDonation,
} from '../../../src/internal/donations/prepareContinuousDonation';
import {contractsRegistry, OnChainStreamReceiver, TimeUnit} from '../../../src';
import {validateAndFormatStreamReceivers} from '../../../src/internal/shared/validateAndFormatStreamReceivers';
import {randomBigintUntilUnique} from '../../../src/internal/shared/randomBigintUntilUnique';
import {
  decodeStreamConfig,
  encodeStreamConfig,
  parseStreamRate,
} from '../../../src/internal/shared/streamRateUtils';
import {buildTx} from '../../../src/internal/shared/buildTx';
import {addressDriverAbi} from '../../../src/internal/abis/addressDriverAbi';
import {
  encodeMetadataKeyValue,
  USER_METADATA_KEY,
} from '../../../src/internal/shared/encodeMetadataKeyValue';
import {convertToCallerCall} from '../../../src/internal/shared/convertToCallerCall';
import {callerAbi} from '../../../src/internal/abis/callerAbi';
import {generateRandomAddress, generateRandomBigInt} from '../../testUtils';

vi.mock('../../../src/internal/streams/getCurrentStreamReceivers');
vi.mock('../../../src/internal/shared/receiverUtils');
vi.mock('../../../src/internal/streams/buildStreamsMetadata');
vi.mock('../../../src/internal/shared/randomBigintUntilUnique');
vi.mock('../../../src/internal/shared/buildTx');

describe('prepareContinuousDonation', () => {
  let mockWriteAdapter: WriteBlockchainAdapter;
  let mockIpfsUploaderFn: IpfsMetadataUploaderFn<Metadata>;
  let mockGraphqlClient: DripsGraphQLClient;

  const mockChainId = 1;
  const mockIpfsHash = 'QmTestHash123';
  const mockErc20 = generateRandomAddress();
  const mockSignerAddress = generateRandomAddress();
  const mockSignerAccountId = generateRandomBigInt();
  const mockReceiverAccountId = generateRandomBigInt();

  beforeEach(() => {
    vi.resetAllMocks();

    mockWriteAdapter = {
      getChainId: vi.fn().mockResolvedValue(mockChainId),
      getAddress: vi.fn().mockResolvedValue(mockSignerAddress),
    } as unknown as WriteBlockchainAdapter;

    mockIpfsUploaderFn = vi.fn().mockResolvedValue(mockIpfsHash);

    mockGraphqlClient = {} as unknown as DripsGraphQLClient;

    vi.mocked(buildTx).mockReturnValue({
      to: mockSignerAddress,
      data: '0x',
      value: 0n,
      abiFunctionName: 'mockFunction',
    } as PreparedTx);

    // It's called twice in the implementation...
    vi.mocked(resolveReceiverAccountId)
      .mockResolvedValueOnce(mockSignerAccountId) // First call for sender.
      .mockResolvedValueOnce(mockReceiverAccountId); // Second call for receiver.
  });

  it('should build the expected setStreams transaction', async () => {
    // Arrange
    const donation: ContinuousDonation = {
      erc20: mockErc20,
      amount: '1', // 1 token per time unit
      timeUnit: TimeUnit.DAY,
      tokenDecimals: 18,
      receiver: {
        type: 'address',
        address: generateRandomAddress(),
      },
      name: 'Test Donation Stream',
      startAt: new Date(),
      durationSeconds: 864000n, // 10 days in seconds
      topUpAmount: '10', // 10 tokens to top up
    };

    const mockCurrentReceiver: OnChainStreamReceiver = {
      accountId: generateRandomBigInt(),
      config: encodeStreamConfig({
        dripId: generateRandomBigInt(),
        amountPerSec: 1n,
        start: 0n,
        duration: 0n,
      }),
    };

    vi.mocked(getCurrentStreamsAndReceivers).mockResolvedValue({
      currentReceivers: [mockCurrentReceiver],
      currentStreams: [],
    });

    const newStreamDripId = generateRandomBigInt();
    vi.mocked(randomBigintUntilUnique).mockReturnValue(newStreamDripId);

    const expectedNewReceivers: OnChainStreamReceiver[] =
      validateAndFormatStreamReceivers([
        mockCurrentReceiver,
        {
          config: encodeStreamConfig({
            dripId: newStreamDripId,
            amountPerSec: parseStreamRate(
              donation.amount,
              donation.timeUnit,
              donation.tokenDecimals,
            ),
            start: BigInt(donation.startAt?.getTime() ?? 0) / 1000n, // Convert to seconds.
            duration: donation.durationSeconds ?? 0n,
          }),
          accountId: mockReceiverAccountId,
        },
      ]);

    // Act
    await prepareContinuousDonation(
      mockWriteAdapter,
      mockIpfsUploaderFn,
      donation,
      mockGraphqlClient,
    );

    // Assert

    expect(buildTx).nthCalledWith(1, {
      // First call is for `setStreams`
      abi: addressDriverAbi,
      functionName: 'setStreams',
      contract: contractsRegistry[mockChainId].addressDriver.address,
      args: [
        mockErc20,
        validateAndFormatStreamReceivers([mockCurrentReceiver]),
        parseUnits(donation.topUpAmount ?? '0', donation.tokenDecimals),
        expectedNewReceivers,
        0,
        0,
        mockSignerAddress,
      ],
    });

    expect(randomBigintUntilUnique).toHaveBeenCalledWith(
      [mockCurrentReceiver].map(r => decodeStreamConfig(r.config).dripId),
      4,
    );
  });

  it('should build the expected emitAccountMetadata transaction', async () => {
    // Arrange
    const donation: ContinuousDonation = {
      erc20: mockErc20,
      amount: '1', // 1 token per time unit
      timeUnit: TimeUnit.DAY,
      tokenDecimals: 18,
      receiver: {
        type: 'address',
        address: generateRandomAddress(),
      },
      name: 'Test Donation Stream',
      startAt: new Date(),
      durationSeconds: 864000n, // 10 days in seconds
      topUpAmount: '10', // 10 tokens to top up
    };

    const mockStream = {} as unknown as Awaited<
      ReturnType<typeof getCurrentStreamsAndReceivers>
    >['currentStreams'][number];
    vi.mocked(getCurrentStreamsAndReceivers).mockResolvedValue({
      currentReceivers: [],
      currentStreams: [mockStream],
    });

    vi.mocked(randomBigintUntilUnique).mockReturnValue(generateRandomBigInt());

    const newStreamDripId = generateRandomBigInt();
    vi.mocked(randomBigintUntilUnique).mockReturnValue(newStreamDripId);

    const mockMetadata = {} as unknown as StreamsMetadata;
    vi.mocked(buildStreamsMetadata).mockResolvedValue(mockMetadata);

    // Act
    await prepareContinuousDonation(
      mockWriteAdapter,
      mockIpfsUploaderFn,
      donation,
      mockGraphqlClient,
    );

    // Assert
    expect(buildTx).nthCalledWith(2, {
      // Second call is for `emitAccountMetadata`
      abi: addressDriverAbi,
      functionName: 'emitAccountMetadata',
      contract: contractsRegistry[mockChainId].addressDriver.address,
      args: [
        [encodeMetadataKeyValue({key: USER_METADATA_KEY, value: mockIpfsHash})],
      ],
    });

    expect(buildStreamsMetadata).toHaveBeenCalledWith(
      mockWriteAdapter,
      mockSignerAccountId,
      [mockStream],
      {
        ...donation,
        dripId: newStreamDripId,
      },
    );

    expect(mockIpfsUploaderFn).toHaveBeenCalledWith(mockMetadata);
  });

  it('should build the expected callBatched transaction', async () => {
    // Arrange
    const donation: ContinuousDonation = {
      erc20: mockErc20,
      amount: '1', // 1 token per time unit
      timeUnit: TimeUnit.DAY,
      tokenDecimals: 18,
      receiver: {
        type: 'address',
        address: generateRandomAddress(),
      },
      name: 'Test Donation Stream',
      startAt: new Date(),
      durationSeconds: 864000n, // 10 days in seconds
      topUpAmount: '10', // 10 tokens to top up
      batchedTxOverrides: {gasLimit: 100000n},
    };

    vi.mocked(getCurrentStreamsAndReceivers).mockResolvedValue({
      currentReceivers: [],
      currentStreams: [],
    });

    vi.mocked(randomBigintUntilUnique).mockReturnValue(generateRandomBigInt());

    const mockSetStreamsTx = {} as unknown as PreparedTx;
    const mockEmitAccountMetadataTx = {} as unknown as PreparedTx;
    vi.mocked(buildTx)
      .mockReturnValueOnce(mockSetStreamsTx)
      .mockReturnValueOnce(mockEmitAccountMetadataTx);

    // Act
    await prepareContinuousDonation(
      mockWriteAdapter,
      mockIpfsUploaderFn,
      donation,
      mockGraphqlClient,
    );

    // Assert
    expect(buildTx).nthCalledWith(3, {
      // Third call is for `callBatched`
      abi: callerAbi,
      functionName: 'callBatched',
      contract: contractsRegistry[mockChainId].caller.address,
      args: [
        [mockSetStreamsTx, mockEmitAccountMetadataTx].map(convertToCallerCall),
      ],
      batchedTxOverrides: donation.batchedTxOverrides,
    });
  });

  it('should throw error for unsupported chain', async () => {
    // Arrange
    const unsupportedChainId = 999999;
    const mockWriteAdapterUnsupported = {
      getChainId: vi.fn().mockResolvedValue(unsupportedChainId),
      getAddress: vi.fn().mockResolvedValue(mockSignerAddress),
    } as unknown as WriteBlockchainAdapter;

    const donation: ContinuousDonation = {
      erc20: mockErc20,
      amount: '1',
      timeUnit: TimeUnit.DAY,
      tokenDecimals: 18,
      receiver: {
        type: 'address',
        address: generateRandomAddress(),
      },
    };

    // Act & Assert
    await expect(
      prepareContinuousDonation(
        mockWriteAdapterUnsupported,
        mockIpfsUploaderFn,
        donation,
        mockGraphqlClient,
      ),
    ).rejects.toThrow();
  });

  it('should work with minimal donation object (no optional parameters)', async () => {
    // Arrange
    const donation: ContinuousDonation = {
      erc20: mockErc20,
      amount: '1',
      timeUnit: TimeUnit.DAY,
      tokenDecimals: 18,
      receiver: {
        type: 'address',
        address: generateRandomAddress(),
      },
      // No optional parameters: name, startAt, durationSeconds, topUpAmount
    };

    vi.mocked(getCurrentStreamsAndReceivers).mockResolvedValue({
      currentReceivers: [],
      currentStreams: [],
    });

    const newStreamDripId = generateRandomBigInt();
    vi.mocked(randomBigintUntilUnique).mockReturnValue(newStreamDripId);

    const mockMetadata = {} as unknown as StreamsMetadata;
    vi.mocked(buildStreamsMetadata).mockResolvedValue(mockMetadata);

    const expectedNewReceivers = validateAndFormatStreamReceivers([
      {
        config: encodeStreamConfig({
          dripId: newStreamDripId,
          amountPerSec: parseStreamRate(
            donation.amount,
            donation.timeUnit,
            donation.tokenDecimals,
          ),
          start: 0n, // No startAt provided, defaults to 0
          duration: 0n, // No durationSeconds provided, defaults to 0
        }),
        accountId: mockReceiverAccountId,
      },
    ]);

    // Act
    const result = await prepareContinuousDonation(
      mockWriteAdapter,
      mockIpfsUploaderFn,
      donation,
      mockGraphqlClient,
    );

    // Assert
    expect(result).toBeDefined();
    expect(result.preparedTx).toBeDefined();
    expect(result.ipfsHash).toBe(mockIpfsHash);
    expect(result.metadata).toBe(mockMetadata);

    expect(buildTx).nthCalledWith(1, {
      abi: addressDriverAbi,
      functionName: 'setStreams',
      contract: contractsRegistry[mockChainId].addressDriver.address,
      args: [
        mockErc20,
        [], // No current receivers
        parseUnits('0', donation.tokenDecimals), // Default topUpAmount
        expectedNewReceivers,
        0,
        0,
        mockSignerAddress,
      ],
    });
  });

  it('should return correct result object structure', async () => {
    // Arrange
    const donation: ContinuousDonation = {
      erc20: mockErc20,
      amount: '50',
      timeUnit: TimeUnit.DAY,
      tokenDecimals: 18,
      receiver: {
        type: 'address',
        address: generateRandomAddress(),
      },
      name: 'Test Return Object',
      topUpAmount: '5',
    };

    vi.mocked(getCurrentStreamsAndReceivers).mockResolvedValue({
      currentReceivers: [],
      currentStreams: [],
    });

    const newStreamDripId = generateRandomBigInt();
    vi.mocked(randomBigintUntilUnique).mockReturnValue(newStreamDripId);

    const mockMetadata = {
      description: 'Test metadata',
      streams: [],
    } as unknown as StreamsMetadata;
    vi.mocked(buildStreamsMetadata).mockResolvedValue(mockMetadata);

    const mockPreparedTx = {
      to: mockSignerAddress,
      data: '0x123abc',
      value: 100n,
      abiFunctionName: 'callBatched',
    } as PreparedTx;
    vi.mocked(buildTx).mockReturnValue(mockPreparedTx);

    // Act
    const result = await prepareContinuousDonation(
      mockWriteAdapter,
      mockIpfsUploaderFn,
      donation,
      mockGraphqlClient,
    );

    // Assert
    expect(result).toEqual({
      preparedTx: mockPreparedTx,
      ipfsHash: mockIpfsHash,
      metadata: mockMetadata,
    });
  });
});
