// TODO: document all public API.
import {buildTx} from './internal/shared/buildTx';
import {DEFAULT_GRAPHQL_URL} from './internal/graphql/createGraphQLClient';
import {
  decodeStreamConfig,
  encodeStreamConfig,
} from './internal/shared/streamConfigUtils';
import {MAX_STREAMS_RECEIVERS} from './internal/shared/validateAndFormatStreamReceivers';
import {resolveAddressFromAccountId} from './internal/shared/resolveAddressFromAccountId';
import {resolveDriverName} from './internal/shared/resolveDriverName';
import {encodeMetadataKeyValue} from './internal/shared/encodeMetadataKeyValue';
import {
  MAX_SPLITS_RECEIVERS,
  TOTAL_SPLITS_WEIGHT,
} from './internal/shared/receiverUtils';

export {createDripsSdk} from './sdk/createDripsSdk';

export {createGraphQLClient} from './internal/graphql/createGraphQLClient';
export {createPinataIpfsMetadataUploader} from './internal/shared/createPinataIpfsMetadataUploader';

export {createViemReadAdapter} from './internal/blockchain/adapters/viem/viemAdapters';
export {createViemWriteAdapter} from './internal/blockchain/adapters/viem/viemAdapters';
export {createEthersReadAdapter} from './internal/blockchain/adapters/ethers/ethersAdapters';
export {createEthersWriteAdapter} from './internal/blockchain/adapters/ethers/ethersAdapters';

export {calcDripListId} from './internal/shared/calcDripListId';
export {getDripListById} from './internal/drip-lists/getDripListById';
export {prepareDripListCreation} from './internal/drip-lists/prepareDripListCreation';
export {createDripList} from './internal/drip-lists/createDripList';

export {calcAddressId} from './internal/shared/calcAddressId';

export {calcProjectId} from './internal/projects/calcProjectId';

export {prepareOneTimeDonation} from './internal/donations/prepareOneTimeDonation';
export {sendOneTimeDonation} from './internal/donations/sendOneTimeDonation';
export {prepareContinuousDonation} from './internal/donations/prepareContinuousDonation';
export {sendContinuousDonation} from './internal/donations/sendContinuousDonation';

export const utils = {
  buildTx,
  encodeStreamConfig,
  decodeStreamConfig,
  encodeMetadataKeyValue,
  resolveDriverName,
  resolveAddressFromAccountId,
};

export const dripsConstants = {
  MAX_SPLITS_RECEIVERS,
  TOTAL_SPLITS_WEIGHT,
  DEFAULT_GRAPHQL_URL,
  MAX_STREAMS_RECEIVERS,
};

export {DripList} from './internal/drip-lists/getDripListById';
export {
  PreparedTx,
  ReadBlockchainAdapter,
  TxReceipt,
  TxResponse,
  WriteBlockchainAdapter,
} from './internal/blockchain/BlockchainAdapter';
export {NewDripList} from './internal/drip-lists/prepareDripListCreation';
export {CreateDripListResult} from './internal/drip-lists/createDripList';
export {PrepareDripListCreationResult} from './internal/drip-lists/prepareDripListCreation';
export {
  Metadata,
  DripListMetadata,
  ProjectMetadata,
  SubListMetadata,
  IpfsMetadataUploaderFn,
} from './internal/shared/createPinataIpfsMetadataUploader';
export {DripsGraphQLClient} from './internal/graphql/createGraphQLClient';
export {
  SdkReceiver,
  SdkProjectReceiver,
  SdkDripListReceiver,
  SdkSubListReceiver,
  SdkAddressReceiver,
  SdkEcosystemMainAccountReceiver,
  SdkSplitsReceiver,
  OnChainSplitsReceiver,
  OnChainStreamReceiver,
  MetadataSplitsReceiver,
} from './internal/shared/receiverUtils';
export {Forge, ProjectName} from './internal/projects/calcProjectId';
export {OneTimeDonation} from './internal/donations/prepareOneTimeDonation';
export {StreamConfig} from './internal/shared/streamConfigUtils';
export {ContinuousDonation} from './internal/donations/prepareContinuousDonation';
export {SendContinuousDonationResult} from './internal/donations/sendContinuousDonation';
export {PrepareContinuousDonationResult} from './internal/donations/prepareContinuousDonation';
