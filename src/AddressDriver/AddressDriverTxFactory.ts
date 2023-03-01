/* eslint-disable no-dupe-class-members */
import type { Provider } from '@ethersproject/providers';
import type {
	AddressDriver,
	DripsReceiverStruct,
	SplitsReceiverStruct,
	UserMetadataStruct
} from 'contracts/AddressDriver';
import type { PromiseOrValue } from 'contracts/common';
import type { PopulatedTransaction, BigNumberish } from 'ethers';
import { AddressDriver__factory } from '../../contracts/factories';
import { DripsErrors } from '../common/DripsError';
import { validateClientProvider } from '../common/validators';
import Utils from '../utils';

interface IAddressDriverEncoder
	extends Pick<
		AddressDriver['populateTransaction'],
		'collect' | 'give' | 'setSplits' | 'setDrips' | 'emitUserMetadata'
	> {}

export default class AddressDriverTxFactory implements IAddressDriverEncoder {
	#driver!: AddressDriver;
	#driverAddress!: string;

	public get driverAddress(): string {
		return this.#driverAddress;
	}

	public static async create(provider: Provider, customDriverAddress?: string): Promise<AddressDriverTxFactory> {
		try {
			await validateClientProvider(provider, Utils.Network.SUPPORTED_CHAINS);

			const network = await provider.getNetwork();
			const driverAddress = customDriverAddress ?? Utils.Network.configs[network.chainId].CONTRACT_ADDRESS_DRIVER;

			const client = new AddressDriverTxFactory();

			client.#driverAddress = driverAddress;

			client.#driver = AddressDriver__factory.connect(driverAddress, provider);

			return client;
		} catch (error: any) {
			throw DripsErrors.clientInitializationError(`Could not create 'AddressDriverTxFactory': ${error.message}`);
		}
	}

	collect(erc20: PromiseOrValue<string>, transferTo: PromiseOrValue<string>): Promise<PopulatedTransaction> {
		return this.#driver.populateTransaction.collect(erc20, transferTo);
	}

	give(
		receiver: PromiseOrValue<BigNumberish>,
		erc20: PromiseOrValue<string>,
		amt: PromiseOrValue<BigNumberish>
	): Promise<PopulatedTransaction> {
		return this.#driver.populateTransaction.give(receiver, erc20, amt);
	}

	setSplits(receivers: SplitsReceiverStruct[]): Promise<PopulatedTransaction> {
		return this.#driver.populateTransaction.setSplits(receivers);
	}

	setDrips(
		erc20: PromiseOrValue<string>,
		currReceivers: DripsReceiverStruct[],
		balanceDelta: PromiseOrValue<BigNumberish>,
		newReceivers: DripsReceiverStruct[],
		transferTo: PromiseOrValue<string>
	): Promise<PopulatedTransaction> {
		return this.#driver.populateTransaction.setDrips(
			erc20,
			currReceivers,
			balanceDelta,
			newReceivers,
			0,
			0,
			transferTo
		);
	}

	emitUserMetadata(userMetadata: UserMetadataStruct[]): Promise<PopulatedTransaction> {
		return this.#driver.populateTransaction.emitUserMetadata(userMetadata);
	}
}
