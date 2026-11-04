import {describe, vi, beforeEach, it, expect} from 'vitest';
import {
  TxResponse,
  WriteBlockchainAdapter,
} from '../../../src/internal/blockchain/BlockchainAdapter';
import {DripsGraphQLClient} from '../../../src/internal/graphql/createGraphQLClient';
import {
  IpfsMetadataUploaderFn,
  Metadata,
} from '../../../src/internal/shared/createPinataIpfsMetadataUploader';
import {
  prepareEditContinuousDonation,
  EditContinuousDonationConfig,
} from '../../../src/internal/donations/prepareEditContinuousDonation';
import {sendEditContinuousDonation} from '../../../src/internal/donations/sendEditContinuousDonation';

vi.mock('../../../src/internal/donations/prepareEditContinuousDonation');

describe('sendEditContinuousDonation', () => {
  let mockWriteAdapter: WriteBlockchainAdapter;
  let mockIpfsUploaderFn: IpfsMetadataUploaderFn<Metadata>;
  let mockGraphqlClient: DripsGraphQLClient;

  const mockTxResponse = {
    hash: '0x123',
    wait: vi.fn(),
  } as unknown as TxResponse;

  const mockConfig: EditContinuousDonationConfig = {
    streamId: '100-0x1234567890123456789012345678901234567890-456',
    name: 'New Name',
  };

  beforeEach(() => {
    vi.resetAllMocks();

    mockWriteAdapter = {
      sendTx: vi.fn().mockResolvedValue(mockTxResponse),
    } as unknown as WriteBlockchainAdapter;

    mockIpfsUploaderFn = vi.fn().mockResolvedValue('QmTest');
    mockGraphqlClient = {} as unknown as DripsGraphQLClient;

    vi.mocked(prepareEditContinuousDonation).mockResolvedValue({
      preparedTx: {to: '0x1', data: '0x', value: 0n} as any,
      ipfsHash: 'QmTest',
      metadata: {} as any,
    });
  });

  it('should call prepareEditContinuousDonation and sendTx', async () => {
    const result = await sendEditContinuousDonation(
      mockWriteAdapter,
      mockIpfsUploaderFn,
      mockConfig,
      mockGraphqlClient,
    );

    expect(prepareEditContinuousDonation).toHaveBeenCalledWith(
      mockWriteAdapter,
      mockIpfsUploaderFn,
      mockConfig,
      mockGraphqlClient,
    );
    expect(mockWriteAdapter.sendTx).toHaveBeenCalledWith({
      to: '0x1',
      data: '0x',
      value: 0n,
    });
    expect(result.txResponse).toBe(mockTxResponse);
    expect(result.ipfsHash).toBe('QmTest');
  });
});
