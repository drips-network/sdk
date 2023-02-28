/* eslint-disable no-dupe-class-members */
import type {
	AddressDriverInterface,
	DripsReceiverStruct,
	SplitsReceiverStruct,
	UserMetadataStruct
} from 'contracts/AddressDriver';
import type { PromiseOrValue } from 'contracts/common';
import type { BigNumberish, BytesLike } from 'ethers';
import type { Interface } from 'ethers/lib/utils';
import { AddressDriver__factory } from '../../contracts';

type FuncName = Parameters<AddressDriverInterface['getFunction']>[0];

interface IAddressDriverEncoder extends Pick<AddressDriverInterface, 'encodeFunctionData'> {}

export default class AddressDriverEncoder implements IAddressDriverEncoder {
	#iface: AddressDriverInterface;

	public constructor() {
		this.#iface = AddressDriver__factory.createInterface();
	}

	encodeFunctionData(functionFragment: 'admin', values?: undefined): string;
	encodeFunctionData(functionFragment: 'allPausers', values?: undefined): string;
	encodeFunctionData(functionFragment: 'calcUserId', values: [PromiseOrValue<string>]): string;
	encodeFunctionData(functionFragment: 'changeAdmin', values: [PromiseOrValue<string>]): string;
	encodeFunctionData(functionFragment: 'collect', values: [PromiseOrValue<string>, PromiseOrValue<string>]): string;
	encodeFunctionData(functionFragment: 'dripsHub', values?: undefined): string;
	encodeFunctionData(functionFragment: 'driverId', values?: undefined): string;
	encodeFunctionData(functionFragment: 'emitUserMetadata', values: [UserMetadataStruct[]]): string;
	encodeFunctionData(
		functionFragment: 'give',
		values: [PromiseOrValue<BigNumberish>, PromiseOrValue<string>, PromiseOrValue<BigNumberish>]
	): string;
	encodeFunctionData(functionFragment: 'grantPauser', values: [PromiseOrValue<string>]): string;
	encodeFunctionData(functionFragment: 'isPauser', values: [PromiseOrValue<string>]): string;
	encodeFunctionData(functionFragment: 'isTrustedForwarder', values: [PromiseOrValue<string>]): string;
	encodeFunctionData(functionFragment: 'pause', values?: undefined): string;
	encodeFunctionData(functionFragment: 'paused', values?: undefined): string;
	encodeFunctionData(functionFragment: 'proxiableUUID', values?: undefined): string;
	encodeFunctionData(functionFragment: 'revokePauser', values: [PromiseOrValue<string>]): string;
	encodeFunctionData(
		functionFragment: 'setDrips',
		values: [
			PromiseOrValue<string>,
			DripsReceiverStruct[],
			PromiseOrValue<BigNumberish>,
			DripsReceiverStruct[],
			PromiseOrValue<BigNumberish>,
			PromiseOrValue<BigNumberish>,
			PromiseOrValue<string>
		]
	): string;
	encodeFunctionData(functionFragment: 'setSplits', values: [SplitsReceiverStruct[]]): string;
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
