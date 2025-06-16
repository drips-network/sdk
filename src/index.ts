// TODO: document all public API.
import {buildTx} from './internal/utils/buildTx';
import {encodeMetadataKeyValue} from './internal/utils/encodeMetadataKeyValue';
import {DEFAULT_GRAPHQL_URL} from './internal/graphql/createGraphQLClient';
import {MAX_SPLITS_RECEIVERS} from './internal/utils/validateAndFormatSplitsReceivers';

export {createDripsSdk} from './sdk/createDripsSdk';

export {createGraphQLClient} from './internal/graphql/createGraphQLClient';
export {createPinataIpfsUploader} from './internal/metadata/createPinataIpfsUploader';

export {createViemReadAdapter} from './internal/blockchain/adapters/viem/viemAdapters';
export {createViemWriteAdapter} from './internal/blockchain/adapters/viem/viemAdapters';
export {createEthersReadAdapter} from './internal/blockchain/adapters/ethers/ethersAdapters';
export {createEthersWriteAdapter} from './internal/blockchain/adapters/ethers/ethersAdapters';

export {calcDripListId} from './internal/drip-lists/calcDripListId';
export {getDripListById} from './internal/drip-lists/getDripListById';
export {prepareDripListCreationCtx} from './internal/drip-lists/prepareDripListCreationCtx';
export {createDripList} from './internal/drip-lists/createDripList';

export const utils = {
  buildTx,
  encodeMetadataKeyValue,
};

export const dripsConstants = {
  MAX_SPLITS_RECEIVERS,
  DEFAULT_GRAPHQL_URL,
};

export {DripList} from './internal/drip-lists/getDripListById';
export {CreateDripListParams} from './internal/drip-lists/prepareDripListCreationCtx';
export {
  PreparedTx,
  ReadBlockchainAdapter,
  TxReceipt,
  TxResponse,
  WriteBlockchainAdapter,
} from './internal/blockchain/BlockchainAdapter';
export {DripListCreationResult} from './internal/drip-lists/createDripList';
export {DripListCreationContext} from './internal/drip-lists/prepareDripListCreationCtx';
export {
  DripListMetadata,
  Metadata,
  ProjectMetadata,
  SubListMetadata,
  SdkSplitsReceiver,
  IpfsUploaderFn,
} from './internal/metadata/createPinataIpfsUploader';
export {DripsGraphQLClient} from './internal/graphql/createGraphQLClient';
export {OnChainSplitsReceiver} from './internal/utils/validateAndFormatSplitsReceivers';
