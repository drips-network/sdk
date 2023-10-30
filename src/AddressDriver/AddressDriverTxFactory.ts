/* eslint-disable no-dupe-class-members */
import type {
	AddressDriver,
	StreamReceiverStruct,
	SplitsReceiverStruct,
	AccountMetadataStruct
} from 'contracts/AddressDriver';
import type { PromiseOrValue } from 'contracts/common';
import type { PopulatedTransaction, BigNumberish, Overrides, Signer } from 'ethers';
import { formatStreamReceivers, formatSplitReceivers, safeDripsTx } from '../common/internals';
import { AddressDriver__factory } from '../../contracts/factories';
import { validateClientSigner } from '../common/validators';
import Utils from '../utils';

export interface IAddressDriverTxFactory
	extends Pick<
		AddressDriver['populateTransaction'],
		'collect' | 'give' | 'setSplits' | 'setStreams' | 'emitAccountMetadata'
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

	/**
	 * Creates a new immutable `AddressDriverTxFactory` instance.
	 *
	 * @param signer The signer that will be used to sign the generated transactions.
	 *
	 * The `singer` must be connected to a provider.
	 *
	 * The supported networks are:
	 * - 'mainnet': chain ID `1`
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

		const driverAddress = customDriverAddress || Utils.Network.configs[chainId].ADDRESS_DRIVER;

		const client = new AddressDriverTxFactory();
		client.#signer = signer;
		client.#driverAddress = driverAddress;
		client.#driver = AddressDriver__factory.connect(driverAddress, signer);

		return client;
	}

	public async collect(
		erc20: PromiseOrValue<string>,
		transferTo: PromiseOrValue<string>,
		overrides: Overrides & { from?: PromiseOrValue<string> } = {}
	): Promise<PopulatedTransaction> {
		return safeDripsTx(await this.#driver.populateTransaction.collect(erc20, transferTo, overrides));
	}

	public async give(
		receiver: PromiseOrValue<BigNumberish>,
		erc20: PromiseOrValue<string>,
		amt: PromiseOrValue<BigNumberish>,
		overrides: Overrides & { from?: PromiseOrValue<string> } = {}
	): Promise<PopulatedTransaction> {
		return safeDripsTx(await this.#driver.populateTransaction.give(receiver, erc20, amt, overrides));
	}

	public async setSplits(
		receivers: SplitsReceiverStruct[],
		overrides: Overrides & { from?: PromiseOrValue<string> } = {}
	): Promise<PopulatedTransaction> {
		return safeDripsTx(await this.#driver.populateTransaction.setSplits(formatSplitReceivers(receivers), overrides));
	}

	public async setStreams(
		erc20: PromiseOrValue<string>,
		currReceivers: StreamReceiverStruct[],
		balanceDelta: PromiseOrValue<BigNumberish>,
		newReceivers: StreamReceiverStruct[],
		maxEndHint1: PromiseOrValue<BigNumberish>,
		maxEndHint2: PromiseOrValue<BigNumberish>,
		transferTo: PromiseOrValue<string>,
		overrides: Overrides & { from?: PromiseOrValue<string> } = {}
	): Promise<PopulatedTransaction> {
		if (!overrides.gasLimit) {
			const gasEstimation = await this.#driver.estimateGas.setStreams(
				erc20,
				formatStreamReceivers(currReceivers),
				balanceDelta,
				formatStreamReceivers(newReceivers),
				maxEndHint1,
				maxEndHint2,
				transferTo,
				overrides
			);

			const gasLimit = Math.ceil(gasEstimation.toNumber() * 1.2);
			// eslint-disable-next-line no-param-reassign
			overrides = { ...overrides, gasLimit };
		}

		return safeDripsTx(
			await this.#driver.populateTransaction.setStreams(
				erc20,
				formatStreamReceivers(currReceivers),
				balanceDelta,
				formatStreamReceivers(newReceivers),
				maxEndHint1,
				maxEndHint2,
				transferTo,
				overrides
			)
		);
	}

	public async emitAccountMetadata(
		accountMetadata: AccountMetadataStruct[],
		overrides: Overrides & { from?: PromiseOrValue<string> } = {}
	): Promise<PopulatedTransaction> {
		return safeDripsTx(await this.#driver.populateTransaction.emitAccountMetadata(accountMetadata, overrides));
	}
}
