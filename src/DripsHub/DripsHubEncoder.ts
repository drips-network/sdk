/* eslint-disable no-dupe-class-members */
import type {
	DripsHistoryStruct,
	DripsHubInterface,
	DripsReceiverStruct,
	SplitsReceiverStruct,
	UserMetadataStruct
} from 'contracts/DripsHub';
import type { PromiseOrValue } from 'contracts/common';
import type { BigNumberish, BytesLike } from 'ethers';
import type { Interface } from 'ethers/lib/utils';
import { DripsHub__factory } from '../../contracts';

type FuncName = Parameters<DripsHubInterface['getFunction']>[0];

interface IDripsHubEncoder extends Pick<DripsHubInterface, 'encodeFunctionData'> {}

export default class DripsHubEncoder implements IDripsHubEncoder {
	#iface: DripsHubInterface;

	public constructor() {
		this.#iface = DripsHub__factory.createInterface();
	}
	encodeFunctionData(functionFragment: 'AMT_PER_SEC_EXTRA_DECIMALS', values?: undefined): string;
	encodeFunctionData(functionFragment: 'AMT_PER_SEC_MULTIPLIER', values?: undefined): string;
	encodeFunctionData(functionFragment: 'DRIVER_ID_OFFSET', values?: undefined): string;
	encodeFunctionData(functionFragment: 'MAX_DRIPS_RECEIVERS', values?: undefined): string;
	encodeFunctionData(functionFragment: 'MAX_SPLITS_RECEIVERS', values?: undefined): string;
	encodeFunctionData(functionFragment: 'MAX_TOTAL_BALANCE', values?: undefined): string;
	encodeFunctionData(functionFragment: 'TOTAL_SPLITS_WEIGHT', values?: undefined): string;
	encodeFunctionData(functionFragment: 'admin', values?: undefined): string;
	encodeFunctionData(functionFragment: 'allPausers', values?: undefined): string;
	encodeFunctionData(
		functionFragment: 'balanceAt',
		values: [PromiseOrValue<BigNumberish>, PromiseOrValue<string>, DripsReceiverStruct[], PromiseOrValue<BigNumberish>]
	): string;
	encodeFunctionData(functionFragment: 'changeAdmin', values: [PromiseOrValue<string>]): string;
	encodeFunctionData(
		functionFragment: 'collect',
		values: [PromiseOrValue<BigNumberish>, PromiseOrValue<string>]
	): string;
	encodeFunctionData(
		functionFragment: 'collectable',
		values: [PromiseOrValue<BigNumberish>, PromiseOrValue<string>]
	): string;
	encodeFunctionData(functionFragment: 'cycleSecs', values?: undefined): string;
	encodeFunctionData(
		functionFragment: 'dripsState',
		values: [PromiseOrValue<BigNumberish>, PromiseOrValue<string>]
	): string;
	encodeFunctionData(functionFragment: 'driverAddress', values: [PromiseOrValue<BigNumberish>]): string;
	encodeFunctionData(
		functionFragment: 'emitUserMetadata',
		values: [PromiseOrValue<BigNumberish>, UserMetadataStruct[]]
	): string;
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
	encodeFunctionData(functionFragment: 'hashDrips', values: [DripsReceiverStruct[]]): string;
	encodeFunctionData(
		functionFragment: 'hashDripsHistory',
		values: [
			PromiseOrValue<BytesLike>,
			PromiseOrValue<BytesLike>,
			PromiseOrValue<BigNumberish>,
			PromiseOrValue<BigNumberish>
		]
	): string;
	encodeFunctionData(functionFragment: 'hashSplits', values: [SplitsReceiverStruct[]]): string;
	encodeFunctionData(functionFragment: 'isPauser', values: [PromiseOrValue<string>]): string;
	encodeFunctionData(functionFragment: 'nextDriverId', values?: undefined): string;
	encodeFunctionData(functionFragment: 'pause', values?: undefined): string;
	encodeFunctionData(functionFragment: 'paused', values?: undefined): string;
	encodeFunctionData(functionFragment: 'proxiableUUID', values?: undefined): string;
	encodeFunctionData(
		functionFragment: 'receivableDripsCycles',
		values: [PromiseOrValue<BigNumberish>, PromiseOrValue<string>]
	): string;
	encodeFunctionData(
		functionFragment: 'receiveDrips',
		values: [PromiseOrValue<BigNumberish>, PromiseOrValue<string>, PromiseOrValue<BigNumberish>]
	): string;
	encodeFunctionData(
		functionFragment: 'receiveDripsResult',
		values: [PromiseOrValue<BigNumberish>, PromiseOrValue<string>, PromiseOrValue<BigNumberish>]
	): string;
	encodeFunctionData(functionFragment: 'registerDriver', values: [PromiseOrValue<string>]): string;
	encodeFunctionData(functionFragment: 'revokePauser', values: [PromiseOrValue<string>]): string;
	encodeFunctionData(
		functionFragment: 'setDrips',
		values: [
			PromiseOrValue<BigNumberish>,
			PromiseOrValue<string>,
			DripsReceiverStruct[],
			PromiseOrValue<BigNumberish>,
			DripsReceiverStruct[],
			PromiseOrValue<BigNumberish>,
			PromiseOrValue<BigNumberish>
		]
	): string;
	encodeFunctionData(
		functionFragment: 'setSplits',
		values: [PromiseOrValue<BigNumberish>, SplitsReceiverStruct[]]
	): string;
	encodeFunctionData(
		functionFragment: 'split',
		values: [PromiseOrValue<BigNumberish>, PromiseOrValue<string>, SplitsReceiverStruct[]]
	): string;
	encodeFunctionData(
		functionFragment: 'splitResult',
		values: [PromiseOrValue<BigNumberish>, SplitsReceiverStruct[], PromiseOrValue<BigNumberish>]
	): string;
	encodeFunctionData(functionFragment: 'splitsHash', values: [PromiseOrValue<BigNumberish>]): string;
	encodeFunctionData(
		functionFragment: 'splittable',
		values: [PromiseOrValue<BigNumberish>, PromiseOrValue<string>]
	): string;
	encodeFunctionData(
		functionFragment: 'squeezeDrips',
		values: [
			PromiseOrValue<BigNumberish>,
			PromiseOrValue<string>,
			PromiseOrValue<BigNumberish>,
			PromiseOrValue<BytesLike>,
			DripsHistoryStruct[]
		]
	): string;
	encodeFunctionData(
		functionFragment: 'squeezeDripsResult',
		values: [
			PromiseOrValue<BigNumberish>,
			PromiseOrValue<string>,
			PromiseOrValue<BigNumberish>,
			PromiseOrValue<BytesLike>,
			DripsHistoryStruct[]
		]
	): string;
	encodeFunctionData(functionFragment: 'totalBalance', values: [PromiseOrValue<string>]): string;
	encodeFunctionData(functionFragment: 'unpause', values?: undefined): string;
	encodeFunctionData(
		functionFragment: 'updateDriverAddress',
		values: [PromiseOrValue<BigNumberish>, PromiseOrValue<string>]
	): string;
	encodeFunctionData(functionFragment: 'upgradeTo', values: [PromiseOrValue<string>]): string;
	encodeFunctionData(
		functionFragment: 'upgradeToAndCall',
		values: [PromiseOrValue<string>, PromiseOrValue<BytesLike>]
	): string;
	encodeFunctionData(functionFragment: FuncName, values?: readonly any[] | undefined): string {
		return (this.#iface as Interface).encodeFunctionData(functionFragment, values);
	}
}
