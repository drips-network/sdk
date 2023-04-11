/* eslint-disable no-dupe-class-members */
import type { GitDriver, DripsReceiverStruct, SplitsReceiverStruct, UserMetadataStruct } from 'contracts/GitDriver';
import type { PromiseOrValue } from 'contracts/common';
import type { PopulatedTransaction, BigNumberish, Overrides, Signer } from 'ethers';
import { formatDripsReceivers, formatSplitReceivers, safeDripsTx } from '../common/internals';
import { GitDriver__factory } from '../../contracts/factories';
import { validateClientSigner } from '../common/validators';
import Utils from '../utils';

export interface IGitDriverTxFactory
	extends Pick<GitDriver['populateTransaction'], 'collect' | 'give' | 'setSplits' | 'setDrips' | 'emitUserMetadata'> {}

/**
 * A factory for creating `GitDriver` contract transactions.
 */
export default class GitDriverTxFactory implements IGitDriverTxFactory {
	#signer!: Signer;
	#driver!: GitDriver;
	#driverAddress!: string;

	public get driverAddress(): string {
		return this.#driverAddress;
	}

	public get signer(): Signer | undefined {
		return this.#signer;
	}

	// TODO: update supported networks.
	/**
	 * Creates a new immutable `GitDriverTxFactory` instance.
	 *
	 * @param signer The signer that will be used to sign the generated transactions.
	 *
	 * The `singer` must be connected to a provider.
	 *
	 * The supported networks are:
	 * - 'goerli': chain ID `5`
	 * @param customDriverAddress Overrides the `GitDriver` contract address.
	 * If it's `undefined` (default value), the address will be automatically selected based on the `signer.provider`'s network.
	 * @returns A `Promise` which resolves to the new client instance.
	 * @throws {@link DripsErrors.initializationError} if the initialization fails.
	 */
	public static async create(signer: Signer, customDriverAddress?: string): Promise<GitDriverTxFactory> {
		await validateClientSigner(signer, Utils.Network.SUPPORTED_CHAINS);

		const { chainId } = await signer.provider!.getNetwork(); // If the validation passed we know that the signer is connected to a provider.

		const driverAddress = customDriverAddress || Utils.Network.configs[chainId].GIT_DRIVER;

		const client = new GitDriverTxFactory();
		client.#signer = signer;
		client.#driverAddress = driverAddress;
		client.#driver = GitDriver__factory.connect(driverAddress, signer);

		return client;
	}

	async collect(
		projectId: PromiseOrValue<BigNumberish>,
		erc20: PromiseOrValue<string>,
		transferTo: PromiseOrValue<string>,
		overrides: Overrides & { from?: PromiseOrValue<string> } = {}
	): Promise<PopulatedTransaction> {
		return safeDripsTx(await this.#driver.populateTransaction.collect(projectId, erc20, transferTo, overrides));
	}
	async give(
		projectId: PromiseOrValue<BigNumberish>,
		receiver: PromiseOrValue<BigNumberish>,
		erc20: PromiseOrValue<string>,
		amt: PromiseOrValue<BigNumberish>,
		overrides: Overrides & { from?: PromiseOrValue<string> } = {}
	): Promise<PopulatedTransaction> {
		return safeDripsTx(await this.#driver.populateTransaction.give(projectId, receiver, erc20, amt, overrides));
	}
	async setSplits(
		projectId: PromiseOrValue<BigNumberish>,
		receivers: SplitsReceiverStruct[],
		overrides: Overrides & { from?: PromiseOrValue<string> } = {}
	): Promise<PopulatedTransaction> {
		return safeDripsTx(
			await this.#driver.populateTransaction.setSplits(projectId, formatSplitReceivers(receivers), overrides)
		);
	}
	async setDrips(
		projectId: PromiseOrValue<BigNumberish>,
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
				projectId,
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

		return safeDripsTx(
			await this.#driver.populateTransaction.setDrips(
				projectId,
				erc20,
				formatDripsReceivers(currReceivers),
				balanceDelta,
				formatDripsReceivers(newReceivers),
				maxEndHint1,
				maxEndHint2,
				transferTo,
				overrides
			)
		);
	}
	async emitUserMetadata(
		projectId: PromiseOrValue<BigNumberish>,
		userMetadata: UserMetadataStruct[],
		overrides: Overrides & { from?: PromiseOrValue<string> } = {}
	): Promise<PopulatedTransaction> {
		return safeDripsTx(await this.#driver.populateTransaction.emitUserMetadata(projectId, userMetadata, overrides));
	}
}
