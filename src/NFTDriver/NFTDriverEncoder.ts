/* eslint-disable no-dupe-class-members */
import type {
	NFTDriverInterface,
	DripsReceiverStruct,
	SplitsReceiverStruct,
	UserMetadataStruct
} from 'contracts/NFTDriver';
import type { PromiseOrValue } from 'contracts/common';
import type { BigNumberish, BytesLike } from 'ethers';
import type { Interface } from 'ethers/lib/utils';
import { NFTDriver__factory } from '../../contracts';

type FuncName = Parameters<NFTDriverInterface['getFunction']>[0];

interface INFTDriverEncoder extends Pick<NFTDriverInterface, 'encodeFunctionData'> {}

export default class NFTDriverEncoder implements INFTDriverEncoder {
	#iface: NFTDriverInterface;

	public constructor() {
		this.#iface = NFTDriver__factory.createInterface();
	}

	encodeFunctionData(functionFragment: 'admin', values?: undefined): string;
	encodeFunctionData(functionFragment: 'allPausers', values?: undefined): string;
	encodeFunctionData(
		functionFragment: 'approve',
		values: [PromiseOrValue<string>, PromiseOrValue<BigNumberish>]
	): string;
	encodeFunctionData(functionFragment: 'balanceOf', values: [PromiseOrValue<string>]): string;
	encodeFunctionData(functionFragment: 'burn', values: [PromiseOrValue<BigNumberish>]): string;
	encodeFunctionData(functionFragment: 'changeAdmin', values: [PromiseOrValue<string>]): string;
	encodeFunctionData(
		functionFragment: 'collect',
		values: [PromiseOrValue<BigNumberish>, PromiseOrValue<string>, PromiseOrValue<string>]
	): string;
	encodeFunctionData(functionFragment: 'dripsHub', values?: undefined): string;
	encodeFunctionData(functionFragment: 'driverId', values?: undefined): string;
	encodeFunctionData(
		functionFragment: 'emitUserMetadata',
		values: [PromiseOrValue<BigNumberish>, UserMetadataStruct[]]
	): string;
	encodeFunctionData(functionFragment: 'getApproved', values: [PromiseOrValue<BigNumberish>]): string;
	encodeFunctionData(
		functionFragment: 'give',
		values: [
			PromiseOrValue<BigNumberish>,
			PromiseOrValue<BigNumberish>,
			PromiseOrValue<string>,
			PromiseOrValue<BigNumberish>
		]
	): string;
	encodeFunctionData(functionFragment: 'grantPauser', values: [PromiseOrValue<string>]): string;
	encodeFunctionData(
		functionFragment: 'isApprovedForAll',
		values: [PromiseOrValue<string>, PromiseOrValue<string>]
	): string;
	encodeFunctionData(functionFragment: 'isPauser', values: [PromiseOrValue<string>]): string;
	encodeFunctionData(functionFragment: 'isTrustedForwarder', values: [PromiseOrValue<string>]): string;
	encodeFunctionData(functionFragment: 'mint', values: [PromiseOrValue<string>, UserMetadataStruct[]]): string;
	encodeFunctionData(functionFragment: 'name', values?: undefined): string;
	encodeFunctionData(functionFragment: 'nextTokenId', values?: undefined): string;
	encodeFunctionData(functionFragment: 'ownerOf', values: [PromiseOrValue<BigNumberish>]): string;
	encodeFunctionData(functionFragment: 'pause', values?: undefined): string;
	encodeFunctionData(functionFragment: 'paused', values?: undefined): string;
	encodeFunctionData(functionFragment: 'proxiableUUID', values?: undefined): string;
	encodeFunctionData(functionFragment: 'revokePauser', values: [PromiseOrValue<string>]): string;
	encodeFunctionData(functionFragment: 'safeMint', values: [PromiseOrValue<string>, UserMetadataStruct[]]): string;
	encodeFunctionData(
		functionFragment: 'safeTransferFrom(address,address,uint256)',
		values: [PromiseOrValue<string>, PromiseOrValue<string>, PromiseOrValue<BigNumberish>]
	): string;
	encodeFunctionData(
		functionFragment: 'safeTransferFrom(address,address,uint256,bytes)',
		values: [PromiseOrValue<string>, PromiseOrValue<string>, PromiseOrValue<BigNumberish>, PromiseOrValue<BytesLike>]
	): string;
	encodeFunctionData(
		functionFragment: 'setApprovalForAll',
		values: [PromiseOrValue<string>, PromiseOrValue<boolean>]
	): string;
	encodeFunctionData(
		functionFragment: 'setDrips',
		values: [
			PromiseOrValue<BigNumberish>,
			PromiseOrValue<string>,
			DripsReceiverStruct[],
			PromiseOrValue<BigNumberish>,
			DripsReceiverStruct[],
			PromiseOrValue<BigNumberish>,
			PromiseOrValue<BigNumberish>,
			PromiseOrValue<string>
		]
	): string;
	encodeFunctionData(
		functionFragment: 'setSplits',
		values: [PromiseOrValue<BigNumberish>, SplitsReceiverStruct[]]
	): string;
	encodeFunctionData(functionFragment: 'supportsInterface', values: [PromiseOrValue<BytesLike>]): string;
	encodeFunctionData(functionFragment: 'symbol', values?: undefined): string;
	encodeFunctionData(functionFragment: 'tokenURI', values: [PromiseOrValue<BigNumberish>]): string;
	encodeFunctionData(
		functionFragment: 'transferFrom',
		values: [PromiseOrValue<string>, PromiseOrValue<string>, PromiseOrValue<BigNumberish>]
	): string;
	encodeFunctionData(functionFragment: 'unpause', values?: undefined): string;
	encodeFunctionData(functionFragment: 'upgradeTo', values: [PromiseOrValue<string>]): string;
	encodeFunctionData(
		functionFragment: 'upgradeToAndCall',
		values: [PromiseOrValue<string>, PromiseOrValue<BytesLike>]
	): string;
	encodeFunctionData(functionFragment: FuncName, values?: readonly any[] | undefined): string {
		return (this.#iface as Interface).encodeFunctionData(functionFragment, values);
	}
}
