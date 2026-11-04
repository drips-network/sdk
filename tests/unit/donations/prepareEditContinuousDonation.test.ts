import {describe, vi, beforeEach, it, expect} from 'vitest';
import {Address} from 'viem';
import {
  PreparedTx,
  WriteBlockchainAdapter,
} from '../../../src/internal/blockchain/BlockchainAdapter';
import {DripsGraphQLClient} from '../../../src/internal/graphql/createGraphQLClient';
import {
  IpfsMetadataUploaderFn,
  Metadata,
} from '../../../src/internal/shared/createPinataIpfsMetadataUploader';
import {getCurrentStreamsAndReceivers} from '../../../src/internal/streams/getCurrentStreamReceivers';
import {resolveReceiverAccountId} from '../../../src/internal/shared/receiverUtils';
import {buildStreamsMetadata} from '../../../src/internal/streams/buildStreamsMetadata';
import {
  EditContinuousDonationConfig,
  prepareEditContinuousDonation,
} from '../../../src/internal/donations/prepareEditContinuousDonation';
import {contractsRegistry, TimeUnit} from '../../../src';
import {encodeStreamConfig} from '../../../src/internal/shared/streamRateUtils';
import {buildTx} from '../../../src/internal/shared/buildTx';
import {addressDriverAbi} from '../../../src/internal/abis/addressDriverAbi';
import {generateRandomAddress} from '../../testUtils';

vi.mock('../../../src/internal/streams/getCurrentStreamReceivers');
vi.mock('../../../src/internal/shared/receiverUtils');
vi.mock('../../../src/internal/streams/buildStreamsMetadata');
vi.mock('../../../src/internal/shared/buildTx');

describe('prepareEditContinuousDonation', () => {
  let mockWriteAdapter: WriteBlockchainAdapter;
  let mockIpfsUploaderFn: IpfsMetadataUploaderFn<Metadata>;
  let mockGraphqlClient: DripsGraphQLClient;

  const mockChainId = 1;
  const mockIpfsHash = 'QmTestHash123';
  const mockErc20 = generateRandomAddress().toLowerCase() as Address;
  const mockSignerAddress = generateRandomAddress();
  const mockSignerAccountId = 100n;
  const mockReceiverAccountId = 200n;
  const mockDripId = 1234n;
  const mockStreamId = `${mockSignerAccountId}-${mockErc20}-${mockDripId}`;

  const mockStream = {
    id: mockStreamId,
    name: 'Initial Name',
    isPaused: false,
    config: {
      raw: encodeStreamConfig({
        dripId: mockDripId,
        amountPerSec: 1000n,
        start: 1000n,
        duration: 0n,
      }).toString(),
      dripId: mockDripId.toString(),
      amountPerSecond: {
        tokenAddress: mockErc20,
        amount: '1000',
      },
      durationSeconds: 0,
      startDate: new Date(1000000).toISOString(),
    },
    receiver: {
      account: {
        accountId: mockReceiverAccountId.toString(),
      },
    },
  };

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

    vi.mocked(resolveReceiverAccountId).mockResolvedValue(mockSignerAccountId);

    vi.mocked(getCurrentStreamsAndReceivers).mockResolvedValue({
      currentStreams: [mockStream as any],
      currentReceivers: [
        {
          accountId: mockReceiverAccountId,
          config: BigInt(mockStream.config.raw),
        },
      ],
      allStreams: [mockStream as any],
    });
  });

  it('should prepare editing stream name', async () => {
    const config: EditContinuousDonationConfig = {
      streamId: mockStreamId,
      name: 'Updated Name',
    };

    const result = await prepareEditContinuousDonation(
      mockWriteAdapter,
      mockIpfsUploaderFn,
      config,
      mockGraphqlClient,
    );

    expect(result.ipfsHash).toBe(mockIpfsHash);
    expect(mockIpfsUploaderFn).toHaveBeenCalled();
    expect(buildStreamsMetadata).toHaveBeenCalledWith(
      mockWriteAdapter,
      mockSignerAccountId,
      expect.any(Array),
      undefined,
      [
        expect.objectContaining({
          streamId: mockStreamId,
          name: 'Updated Name',
          archived: false,
        }),
      ],
    );
  });

  it('should prepare editing stream rate and call setStreams', async () => {
    const config: EditContinuousDonationConfig = {
      streamId: mockStreamId,
      newRate: {
        amount: '10',
        timeUnit: TimeUnit.DAY,
        tokenDecimals: 18,
      },
    };

    const result = await prepareEditContinuousDonation(
      mockWriteAdapter,
      mockIpfsUploaderFn,
      config,
      mockGraphqlClient,
    );

    const {addressDriver} = contractsRegistry[mockChainId];
    expect(buildTx).toHaveBeenCalledWith(
      expect.objectContaining({
        abi: addressDriverAbi,
        functionName: 'setStreams',
        contract: addressDriver.address,
      }),
    );
    expect(result.ipfsHash).toBe(mockIpfsHash);
  });

  it('should prepare pausing a stream by removing receiver from on-chain setStreams', async () => {
    const config: EditContinuousDonationConfig = {
      streamId: mockStreamId,
      pause: true,
    };

    await prepareEditContinuousDonation(
      mockWriteAdapter,
      mockIpfsUploaderFn,
      config,
      mockGraphqlClient,
    );

    const {addressDriver} = contractsRegistry[mockChainId];
    expect(buildTx).toHaveBeenCalledWith(
      expect.objectContaining({
        abi: addressDriverAbi,
        functionName: 'setStreams',
        contract: addressDriver.address,
        args: [
          mockErc20,
          expect.any(Array),
          0n,
          [], // Empty receivers after pause
          0,
          0,
          mockSignerAddress,
        ],
      }),
    );
    expect(buildStreamsMetadata).toHaveBeenCalledWith(
      mockWriteAdapter,
      mockSignerAccountId,
      expect.any(Array),
      undefined,
      [
        expect.objectContaining({
          streamId: mockStreamId,
          archived: false,
        }),
      ],
    );
  });

  it('should prepare deleting a stream by archiving in metadata and removing on-chain', async () => {
    const config: EditContinuousDonationConfig = {
      streamId: mockStreamId,
      delete: true,
    };

    await prepareEditContinuousDonation(
      mockWriteAdapter,
      mockIpfsUploaderFn,
      config,
      mockGraphqlClient,
    );

    const {addressDriver} = contractsRegistry[mockChainId];
    expect(buildTx).toHaveBeenCalledWith(
      expect.objectContaining({
        abi: addressDriverAbi,
        functionName: 'setStreams',
        contract: addressDriver.address,
        args: [
          mockErc20,
          expect.any(Array),
          0n,
          [], // Empty receivers after deletion
          0,
          0,
          mockSignerAddress,
        ],
      }),
    );
    expect(buildStreamsMetadata).toHaveBeenCalledWith(
      mockWriteAdapter,
      mockSignerAccountId,
      expect.any(Array),
      undefined,
      [
        expect.objectContaining({
          streamId: mockStreamId,
          archived: true,
        }),
      ],
    );
  });

  it('should throw when no edits are provided', async () => {
    await expect(
      prepareEditContinuousDonation(
        mockWriteAdapter,
        mockIpfsUploaderFn,
        {streamId: mockStreamId},
        mockGraphqlClient,
      ),
    ).rejects.toThrow('No edits provided');
  });

  it('should throw when stream is not found', async () => {
    vi.mocked(getCurrentStreamsAndReceivers).mockResolvedValue({
      currentStreams: [],
      currentReceivers: [],
      allStreams: [],
    });

    await expect(
      prepareEditContinuousDonation(
        mockWriteAdapter,
        mockIpfsUploaderFn,
        {streamId: mockStreamId, name: 'New'},
        mockGraphqlClient,
      ),
    ).rejects.toThrow(`Stream with ID ${mockStreamId} not found`);
  });

  it('should throw when pause and unpause are both true', async () => {
    await expect(
      prepareEditContinuousDonation(
        mockWriteAdapter,
        mockIpfsUploaderFn,
        {streamId: mockStreamId, pause: true, unpause: true},
        mockGraphqlClient,
      ),
    ).rejects.toThrow('Cannot pause and unpause');
  });
});
