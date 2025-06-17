import {Address, Hash} from 'viem';
import {callerAbi} from '../abis/callerAbi';
import {nftDriverAbi} from '../abis/nftDriverAbi';
import {buildDripListMetadata} from '../metadata/buildDripListMetadata';
import {buildTx} from '../shared/buildTx';
import {calculateRandomSalt} from './calculateRandomSalt';
import {convertToCallerCall} from '../shared/convertToCallerCall';
import {
  IpfsUploaderFn,
  DripListMetadata,
} from '../metadata/createPinataIpfsUploader';
import {validateAndFormatSplitsReceivers} from '../shared/validateAndFormatSplitsReceivers';
import {contractsRegistry} from '../config/contractsRegistry';
import {
  PreparedTx,
  TxOverrides,
  WriteBlockchainAdapter,
} from '../blockchain/BlockchainAdapter';
import {calcDripListId} from './calcDripListId';
import {requireSupportedChain, requireWriteAccess} from '../shared/assertions';
import {
  mapToOnChainReceiver,
  SdkSplitsReceiver,
} from '../shared/mapToOnChainReceiver';
import {
  encodeMetadataKeyValue,
  USER_METADATA_KEY,
} from '../metadata/encodeMetadataKeyValue';

export type CreateDripListParams = {
  isVisible: boolean;
  receivers: ReadonlyArray<SdkSplitsReceiver>;
  salt?: bigint;
  name?: string;
  description?: string;
  /** Optional address to transfer the drip list to. If not provided, the minter's address will be used. */
  transferTo?: Address;
  /** Optional overrides for the transaction. Applies to the *batched* transaction, not the individual transactions within it. */
  txOverrides?: TxOverrides;
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
  requireSupportedChain(chainId);
  requireWriteAccess(adapter, prepareDripListCreationCtx.name);

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
  const ipfsHash = await ipfsUploaderFn(metadata);

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
    receivers.map(r => mapToOnChainReceiver(adapter, r)),
  );
  const formattedReceivers =
    await validateAndFormatSplitsReceivers(onChainReceivers);

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
    txOverrides,
  });

  return {preparedTx, ipfsHash, salt, dripListId};
}
