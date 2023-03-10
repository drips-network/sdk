/* eslint-disable no-dupe-class-members */
import type {
	AddressDriver,
	DripsReceiverStruct,
	SplitsReceiverStruct,
	UserMetadataStruct
} from 'contracts/AddressDriver';
import type { PromiseOrValue } from 'contracts/common';
import type { PopulatedTransaction, BigNumberish, Overrides, Signer } from 'ethers';
import { formatDripsReceivers } from '../common/internals';
import { AddressDriver__factory } from '../../contracts/factories';
import { validateClientSigner } from '../common/validators';
import Utils from '../utils';

export interface IAddressDriverTxFactory
	extends Pick<
		AddressDriver['populateTransaction'],
		'collect' | 'give' | 'setSplits' | 'setDrips' | 'emitUserMetadata'
	> {}

/**
 * A factory for creating `AddressDriver` contract transactions.
 */
export default class AddressDriverTxFactory implements IAddressDriverTxFactory {
	#signer!: Signer;
	#driver!: AddressDriver;
	#driverAddress!: string;

	public get driverAddress(): string {
		return this.#driverAddress;
	}

	public get signer(): Signer | undefined {
		return this.#signer;
	}

	// TODO: Update the supported chains documentation comments.
	/**
	 * Creates a new immutable `AddressDriverTxFactory` instance.
	 *
	 * @param signer The signer that will be used to sign the generated transactions.
	 *
	 * The `singer` must be connected to a provider.
	 *
	 * The supported networks are:
	 * - 'goerli': chain ID `5`
	 * - 'polygon-mumbai': chain ID `80001`
	 * @param customDriverAddress Overrides the `AddressDriver` contract address.
	 * If it's `undefined` (default value), the address will be automatically selected based on the `signer.provider`'s network.
	 * @returns A `Promise` which resolves to the new client instance.
	 * @throws {@link DripsErrors.initializationError} if the initialization fails.
	 */
	public static async create(signer: Signer, customDriverAddress?: string): Promise<AddressDriverTxFactory> {
		await validateClientSigner(signer, Utils.Network.SUPPORTED_CHAINS);

		const { chainId } = await signer.provider!.getNetwork(); // If the validation passed we know that the signer is connected to a provider.

		const driverAddress = customDriverAddress || Utils.Network.configs[chainId].CONTRACT_ADDRESS_DRIVER;

		const client = new AddressDriverTxFactory();
		client.#signer = signer;
		client.#driverAddress = driverAddress;
		client.#driver = AddressDriver__factory.connect(driverAddress, signer);

		return client;
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

	public async setDrips(
		erc20: PromiseOrValue<string>,
		currReceivers: DripsReceiverStruct[],
		balanceDelta: PromiseOrValue<BigNumberish>,
		newReceivers: DripsReceiverStruct[],
		maxEndHint1: PromiseOrValue<BigNumberish>,
		maxEndHint2: PromiseOrValue<BigNumberish>,
		transferTo: PromiseOrValue<string>,
		overrides: Overrides & { from?: PromiseOrValue<string> } = {}
	): Promise<PopulatedTransaction> {
		if (!overrides.gasLimit) {
			const gasEstimation = await this.#driver.estimateGas.setDrips(
				erc20,
				formatDripsReceivers(currReceivers),
				balanceDelta,
				formatDripsReceivers(newReceivers),
				maxEndHint1,
				maxEndHint2,
				transferTo,
				overrides
			);

			const gasLimit = Math.ceil(gasEstimation.toNumber() * 1.2);
			// eslint-disable-next-line no-param-reassign
			overrides = { ...overrides, gasLimit };
		}

		return this.#driver.populateTransaction.setDrips(
			erc20,
			formatDripsReceivers(currReceivers),
			balanceDelta,
			formatDripsReceivers(newReceivers),
			maxEndHint1,
			maxEndHint2,
			transferTo,
			overrides
		);
	}

	emitUserMetadata(userMetadata: UserMetadataStruct[]): Promise<PopulatedTransaction> {
		return this.#driver.populateTransaction.emitUserMetadata(userMetadata);
	}
}
