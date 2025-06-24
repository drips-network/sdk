import {Address, Hash} from 'viem';
import {callerAbi} from '../abis/callerAbi';
import {nftDriverAbi} from '../abis/nftDriverAbi';
import {buildDripListMetadata} from '../metadata/buildDripListMetadata';
import {buildTx} from '../shared/buildTx';
import {calculateRandomSalt} from './calculateRandomSalt';
import {convertToCallerCall} from '../shared/convertToCallerCall';
import {
  IpfsMetadataUploaderFn,
  DripListMetadata,
} from '../metadata/createPinataIpfsMetadataUploader';
import {validateAndFormatSplitsReceivers} from '../shared/validateAndFormatSplitsReceivers';
import {contractsRegistry} from '../config/contractsRegistry';
import {
  PreparedTx,
  BatchedTxOverrides,
  WriteBlockchainAdapter,
} from '../blockchain/BlockchainAdapter';
import {requireSupportedChain, requireWriteAccess} from '../shared/assertions';
import {
  encodeMetadataKeyValue,
  USER_METADATA_KEY,
} from '../metadata/encodeMetadataKeyValue';
import {
  mapToOnChainSplitsReceiver,
  SdkSplitsReceiver,
} from '../shared/receiverUtils';
import {calcDripListId} from '../shared/calcDripListId';

export type NewDripList = {
  readonly isVisible: boolean;
  readonly receivers: ReadonlyArray<SdkSplitsReceiver>;
  readonly salt?: bigint;
  readonly name?: string;
  readonly description?: string;
  /** Optional address to transfer the drip list to. If not provided, the minter's address will be used. */
  readonly transferTo?: Address;
  readonly batchedTxOverrides?: BatchedTxOverrides;
};

export type PrepareDripListCreationResult = {
  readonly salt: bigint;
  readonly ipfsHash: Hash;
  readonly dripListId: bigint;
  readonly preparedTx: PreparedTx;
  readonly metadata: DripListMetadata;
};

export async function prepareDripListCreation(
  adapter: WriteBlockchainAdapter,
  ipfsMetadataUploaderFn: IpfsMetadataUploaderFn<DripListMetadata>,
  dripList: NewDripList,
): Promise<PrepareDripListCreationResult> {
  const chainId = await adapter.getChainId();
  requireSupportedChain(chainId);
  requireWriteAccess(adapter, prepareDripListCreation.name);

  const {
    name,
    isVisible,
    receivers,
    transferTo,
    description,
    batchedTxOverrides,
    salt: maybeSalt,
  } = dripList;

  const salt = maybeSalt ?? calculateRandomSalt();
  const {nftDriver, caller} = contractsRegistry[chainId];
  const minter = await adapter.getAddress();

  const dripListId = await calcDripListId(adapter, {
    salt,
    minter,
  });

  const metadata = await buildDripListMetadata(adapter, {
    name,
    isVisible,
    receivers,
    dripListId,
    description,
  });
  const ipfsHash = await ipfsMetadataUploaderFn(metadata);

  const mintTx = buildTx({
    contract: nftDriver.address,
    abi: nftDriverAbi,
    functionName: 'safeMintWithSalt',
    args: [
      salt,
      transferTo || minter,
      [encodeMetadataKeyValue({key: USER_METADATA_KEY, value: ipfsHash})],
    ],
  });

  const onChainReceivers = await Promise.all(
    receivers.map(r => mapToOnChainSplitsReceiver(adapter, r)),
  );
  const formattedReceivers = validateAndFormatSplitsReceivers(onChainReceivers);

  const setSplitsTx = buildTx({
    abi: nftDriverAbi,
    contract: nftDriver.address,
    functionName: 'setSplits',
    args: [dripListId, formattedReceivers],
  });

  const preparedTx = buildTx({
    abi: callerAbi,
    contract: caller.address,
    functionName: 'callBatched',
    args: [[mintTx, setSplitsTx].map(convertToCallerCall)],
    batchedTxOverrides,
  });

  return {preparedTx, metadata, ipfsHash, salt, dripListId};
}
