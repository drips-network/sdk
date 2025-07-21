import {Address, Hash} from 'viem';
import {callerAbi} from '../abis/callerAbi';
import {nftDriverAbi} from '../abis/nftDriverAbi';
import {buildDripListMetadata} from './buildDripListMetadata';
import {buildTx} from '../shared/buildTx';
import {calculateRandomSalt} from './calculateRandomSalt';
import {convertToCallerCall} from '../shared/convertToCallerCall';
import {
  IpfsMetadataUploaderFn,
  DripListMetadata,
} from '../shared/createPinataIpfsMetadataUploader';
import {contractsRegistry} from '../config/contractsRegistry';
import {
  PreparedTx,
  BatchedTxOverrides,
  WriteBlockchainAdapter,
} from '../blockchain/BlockchainAdapter';
import {requireSupportedChain} from '../shared/assertions';
import {parseSplitsReceivers, SdkSplitsReceiver} from '../shared/receiverUtils';
import {calcDripListId} from '../shared/calcDripListId';
import {
  encodeMetadataKeyValue,
  USER_METADATA_KEY,
} from '../shared/encodeMetadataKeyValue';

export type NewDripList = {
  /** Indicates whether the Drip List is visible. */
  readonly isVisible: boolean;
  /**
   * The list of receivers.
   *
   * All weights must sum to exactly 1_000_000 (i.e., 100% of the funds to be distributed).
   * An empty list is allowed and means 100% of the funds remain with the account.
   * The list must not contain duplicate receivers.
   */
  readonly receivers: ReadonlyArray<SdkSplitsReceiver>;
  /** Optional salt value for deterministic Drip List ID generation. If not provided, a random salt is used. */
  readonly salt?: bigint;
  /** Optional name for the Drip List. */
  readonly name?: string;
  /** Optional description for the Drip List. */
  readonly description?: string | null;
  /** Optional address to transfer the Drip List to. If not provided, the minter's address will be used. */
  readonly transferTo?: Address;
  /** Optional transaction overrides for the returned `PreparedTx`. */
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

  const {
    name,
    isVisible,
    receivers,
    transferTo,
    description,
    batchedTxOverrides,
    salt: maybeSalt,
  } = dripList;

  const {metadata: metadataSplitsReceivers, onChain: onChainSplitsReceivers} =
    await parseSplitsReceivers(adapter, receivers);

  const salt = maybeSalt ?? calculateRandomSalt();
  const {nftDriver, caller} = contractsRegistry[chainId];
  const minter = await adapter.getAddress();
  const dripListId = await calcDripListId(adapter, {salt, minter});

  const metadata = buildDripListMetadata({
    name,
    isVisible,
    dripListId,
    description,
    receivers: metadataSplitsReceivers,
  });

  const ipfsHash = await ipfsMetadataUploaderFn(metadata);

  const txs: PreparedTx[] = [];

  const mintTx = buildTx({
    contract: nftDriver.address,
    abi: nftDriverAbi,
    functionName: 'safeMintWithSalt',
    args: [
      salt,
      transferTo ?? minter,
      [encodeMetadataKeyValue({key: USER_METADATA_KEY, value: ipfsHash})],
    ],
  });

  txs.push(mintTx);

  if (onChainSplitsReceivers.length > 0) {
    const setSplitsTx = buildTx({
      abi: nftDriverAbi,
      contract: nftDriver.address,
      functionName: 'setSplits',
      args: [dripListId, onChainSplitsReceivers],
    });
    txs.push(setSplitsTx);
  }

  const preparedTx = buildTx({
    abi: callerAbi,
    contract: caller.address,
    functionName: 'callBatched',
    args: [txs.map(convertToCallerCall)],
    batchedTxOverrides,
  });

  return {preparedTx, metadata, ipfsHash, salt, dripListId};
}
