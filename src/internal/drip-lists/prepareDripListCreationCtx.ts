import {Address, Hash} from 'viem';
import {callerAbi} from '../abis/callerAbi';
import {nftDriverAbi} from '../abis/nftDriverAbi';
import {buildDripListMetadata} from '../metadata/buildDripListMetadata';
import {buildTx} from '../utils/buildTx';
import {calculateRandomSalt} from '../utils/calculateRandomSalt';
import {convertToCallerCall} from '../utils/convertToCallerCall';
import {
  SdkSplitsReceiver,
  IpfsUploaderFn,
  DripListMetadata,
} from '../metadata/createPinataIpfsUploader';
import {
  USER_METADATA_KEY,
  encodeMetadataKeyValue,
} from '../utils/encodeMetadataKeyValue';
import {validateAndFormatSplitsReceivers} from '../utils/validateAndFormatSplitsReceivers';
import {contractsRegistry} from '../config/contractsRegistry';
import {
  PreparedTx,
  TxOverrides,
  WriteBlockchainAdapter,
} from '../blockchain/BlockchainAdapter';
import {calcDripListId} from './calcDripListId';
import {requireSupportedChain, requireWriteAccess} from '../utils/assertions';

export type CreateDripListParams = {
  isVisible: boolean;
  receivers: ReadonlyArray<SdkSplitsReceiver>;
  transferTo?: Address; // Optional, if not provided, the minter will be used.
  salt?: bigint;
  name?: string;
  description?: string;
  txOverrides?: TxOverrides; // The `txOverrides` apply only to the batched transaction.
};

export type DripListCreationContext = {
  salt: bigint;
  ipfsHash: Hash;
  dripListId: bigint;
  preparedTx: PreparedTx;
};

export async function prepareDripListCreationCtx(
  adapter: WriteBlockchainAdapter,
  ipfsUploaderFn: IpfsUploaderFn<DripListMetadata>,
  params: CreateDripListParams,
): Promise<DripListCreationContext> {
  const {
    name,
    description,
    isVisible,
    receivers,
    transferTo,
    txOverrides,
    salt: maybeSalt,
  } = params;
  const chainId = await adapter.getChainId();
  requireWriteAccess(adapter, prepareDripListCreationCtx.name);
  requireSupportedChain(chainId);

  const salt = maybeSalt ?? calculateRandomSalt();
  const {nftDriver, caller} = contractsRegistry[chainId];
  const minter = await adapter.getAddress();

  const dripListId = await calcDripListId(adapter, {
    salt,
    minter,
  });

  const ipfsHash = await ipfsUploaderFn(
    buildDripListMetadata({
      name,
      isVisible,
      receivers,
      dripListId,
      description,
    }),
  );

  const mintTxData = buildTx({
    contract: nftDriver.address,
    abi: nftDriverAbi,
    functionName: 'safeMintWithSalt',
    args: [
      salt,
      transferTo || minter,
      [encodeMetadataKeyValue({key: USER_METADATA_KEY, value: ipfsHash})],
    ],
  });

  const setSplitsTxData = buildTx({
    abi: nftDriverAbi,
    contract: nftDriver.address,
    functionName: 'setSplits',
    args: [dripListId, validateAndFormatSplitsReceivers(receivers)],
  });

  const preparedTx = buildTx({
    abi: callerAbi,
    contract: caller.address,
    functionName: 'callBatched',
    args: [[mintTxData, setSplitsTxData].map(convertToCallerCall)],
    txOverrides,
  });

  return {preparedTx, ipfsHash, salt, dripListId};
}
