import type { Network } from '@ethersproject/networks';
import type { Provider } from '@ethersproject/providers';
import type { BigNumber, BigNumberish, BytesLike, ContractTransaction } from 'ethers';
import type { ChainDripsMetadata } from 'src/AddressApp/types';
import { validateDripsReceivers, validateSplitsReceivers } from '../AddressApp/addressAppValidators';
import { nameOf, validateAddress } from '../common/internals';
import Utils from '../utils';
import type { DripsHistoryStruct, DripsReceiverStruct, SplitsReceiverStruct } from '../../contracts/DripsHub';
import type { DripsHub as DripsHubContract } from '../../contracts';
import { DripsHub__factory } from '../../contracts';
import { DripsErrors } from '../common/DripsError';
import type { DripsState } from './types';

/**
 * A lower-level client for interacting with the {@link https://github.com/radicle-dev/drips-contracts/blob/master/src/DripsHub.sol DripsHub} smart contract.
 */
export default class DripsHubClient {
	#dripsHubContract!: DripsHubContract;

	#network!: Network;
	/**
	 * Returns the network the `DripsHubClient` is connected to.
	 *
	 * The `network` is the `provider`'s network.
	 */
	public get network() {
		return this.#network;
	}

	#provider!: Provider;
	/** Returns the `DripsHubClient`'s `provider`. */
	public get provider() {
		return this.#provider;
	}

	#chainDripsMetadata!: ChainDripsMetadata;
	/** Returns the `DripsHubClient`'s `network` {@link ChainDripsMetadata}. */
	public get chainDripsMetadata() {
		return this.#chainDripsMetadata;
	}

	private constructor() {}

	// TODO: Update supported chains id docs.
	/**
	 * Creates a new immutable `DripsHubClient` instance.
	 * @param  {JsonRpcProvider} provider
	 * The provider can connect to the following supported networks:
	 * - 'goerli': chain ID 5
	 * @returns A Promise which resolves to the new `DripsHubClient` instance.
	 * @throws {DripsErrors.argumentMissingError} if the `provider` is missing.
	 * @throws {DripsErrors.unsupportedNetworkError} if the `provider` is connected to an unsupported chain.
	 */
	public static async create(provider: Provider): Promise<DripsHubClient> {
		if (!provider) {
			throw DripsErrors.argumentMissingError(
				"Could not create a new 'DripsHubClient': the 'provider' is missing.",
				nameOf({ provider })
			);
		}

		const network = await provider.getNetwork();
		const chainDripsMetadata = Utils.Network.chainDripsMetadata[network?.chainId];
		if (!chainDripsMetadata?.CONTRACT_DRIPS_HUB) {
			throw DripsErrors.unsupportedNetworkError(
				`Could not create a new 'DripsHubClient': the provider is connected an unsupported network (name: '${
					network?.name
				}', chain ID: ${network?.chainId}). Supported chains are: ${Utils.Network.SUPPORTED_CHAINS.toString()}.`,
				network?.chainId
			);
		}

		const dripsHub = new DripsHubClient();

		dripsHub.#network = network;
		dripsHub.#provider = provider;
		dripsHub.#chainDripsMetadata = chainDripsMetadata;
		dripsHub.#dripsHubContract = DripsHub__factory.connect(chainDripsMetadata.CONTRACT_DRIPS_HUB, provider);

		return dripsHub;
	}

	/**
	 * Returns the amount of received funds that are available for collection for a user.
	 * @param  {BigNumberish} userId The user ID.
	 * @param  {string} erc20TokenAddress The ERC20 token address.
	 * @param  {SplitsReceiverStruct[]} currentReceivers The users's current splits receivers.
	 * @returns A Promise which resolves to an object with the following properties:
	 * - `collectedAmt` - The collected amount.
	 * - `splitAmt` - The amount split to the user's splits receivers.
	 * @throws {DripsErrors.argumentMissingError} if the `userId` or the `currentReceivers` is missing.
	 * @throws {DripsErrors.addressError} if the `erc20TokenAddress` is not valid.
	 * @throws {DripsErrors.argumentError} if `currentReceivers`' count exceeds the max allowed drips receivers.
	 * @throws {DripsErrors.splitsReceiverError} if any of the `currentReceivers` is not valid.	 */
	public getCollectableAll(
		userId: BigNumberish,
		erc20TokenAddress: string,
		currentReceivers: SplitsReceiverStruct[]
	): Promise<{
		collectedAmt: BigNumber;
		splitAmt: BigNumber;
	}> {
		if (!userId) {
			throw DripsErrors.argumentMissingError(
				`Could not get collectable: '${nameOf({ userId })}' is missing.`,
				nameOf({ userId })
			);
		}

		validateAddress(erc20TokenAddress);
		validateSplitsReceivers(currentReceivers);

		return this.#dripsHubContract.collectableAll(userId, erc20TokenAddress, currentReceivers);
	}

	/**
	 * Returns the user's received, but not split yet, funds.
	 * @param  {BigNumberish} userId The user ID.
	 * @param  {string} erc20TokenAddress The ERC20 token address.
	 * @returns A Promise which resolves to the amount received but not split yet.
	 * @throws {DripsErrors.addressError} if the `erc20TokenAddress` is not valid.
	 */
	public getSplittable(userId: BigNumberish, erc20TokenAddress: string): Promise<BigNumber> {
		validateAddress(erc20TokenAddress);

		return this.#dripsHubContract.splittable(userId, erc20TokenAddress);
	}

	/**
	 * Returns the user's received funds that are already split and ready to be collected.
	 * @param  {BigNumberish} userId The user ID.
	 * @param  {string} erc20TokenAddress The ERC20 token address.
	 * @returns A Promise which resolves to the collectable amount.
	 * @throws {DripsErrors.addressError} if the `erc20TokenAddress` is not valid.
	 */
	public getCollectable(userId: BigNumberish, erc20TokenAddress: string): Promise<BigNumber> {
		validateAddress(erc20TokenAddress);

		return this.#dripsHubContract.collectable(userId, erc20TokenAddress);
	}

	/**
	 * Returns the current user's drips state.
	 * @param  {BigNumberish} userId The user ID.
	 * @param  {string} erc20TokenAddress The ERC20 token address.
	 * @returns A Promise which resolves to an object with the following properties:
	 * - `dripsHash` - The current drips receivers list hash.
	 * - `updateTime` - The time when drips have been configured for the last time.
	 * - `balance` - The balance when drips have been configured for the last time.
	 * - `defaultEnd` - The end time of drips without a duration.
	 * @throws {DripsErrors.addressError} if the `erc20TokenAddress` is not valid.
	 */
	public getDripsState(userId: BigNumberish, erc20TokenAddress: string): Promise<DripsState> {
		validateAddress(erc20TokenAddress);

		return this.#dripsHubContract.dripsState(userId, erc20TokenAddress);
	}

	/**
	 * Returns the user's drips balance at a given timestamp.
	 * @param  {BigNumberish} userId The user ID.
	 * @param  {string} erc20TokenAddress The ERC20 token address.
	 * @param  {DripsReceiverStruct[]} receivers The users's current drips receivers.
	 * @param  {BigNumberish} timestamp The timestamp for which the balance should be calculated. It can't be lower than the timestamp of the last call to `setDrips`.
	 * If it's bigger than `block.timestamp`, then it's a prediction assuming that `setDrips` won't be called before `timestamp`.
	 * @returns A Promise which resolves to the user balance on `timestamp`.
	 * @throws {DripsErrors.argumentMissingError} if the `userId` or the `receivers` are missing.
	 * @throws {DripsErrors.addressError} if the `erc20TokenAddress` is not valid.
	 * @throws {DripsErrors.argumentError} if `newReceivers`' count exceeds the max allowed drips receivers.
	 * @throws {DripsErrors.dripsReceiverError} if any of the `currentReceivers` or the `newReceivers` are not valid.	 */
	public getBalanceAt(
		userId: BigNumberish,
		erc20TokenAddress: string,
		receivers: DripsReceiverStruct[],
		timestamp: BigNumberish
	) {
		if (!userId) {
			throw DripsErrors.argumentMissingError(
				`Could not get balance: '${nameOf({ userId })}' is missing.`,
				nameOf({ userId })
			);
		}

		validateAddress(erc20TokenAddress);
		validateDripsReceivers(receivers);

		return this.#dripsHubContract.balanceAt(userId, erc20TokenAddress, receivers, timestamp);
	}

	/**
	 * Calculates the effects of calling {@link squeezeDrips} with the given parameters.
	 * @param  {BigNumberish} userId The ID of the user receiving drips to squeeze funds for.
	 * @param  {string} assetId The asset ID.
	 * @param  {BigNumberish} senderId The ID of the user sending drips to squeeze funds from.
	 * @param  {BytesLike} historyHash The sender's history hash which was valid right before
	 * they set up the sequence of configurations described by `dripsHistory`.
	 * @param  {DripsHistoryStruct[]} dripsHistory The sequence of the sender's drips configurations.
	 * @returns A Promise which resolves to an object with the following properties:
	 * - `amt` - The squeezed amount.
	 * - `nextSqueezed` - The next timestamp that can be squeezed.
	 * @throws {@link DripsErrors.addressError} if the `erc20TokenAddress` address is not valid.
	 */
	public getSqueezableDrips(
		userId: BigNumberish,
		assetId: string,
		senderId: BigNumberish,
		historyHash: BytesLike,
		dripsHistory: DripsHistoryStruct[]
	): Promise<{
		amt: BigNumber;
		nextSqueezed: number;
	}> {
		if (!userId) {
			throw DripsErrors.argumentMissingError(
				`Could not get squeezable drips: '${nameOf({ userId })}' is missing.`,
				nameOf({ userId })
			);
		}

		if (!assetId) {
			throw DripsErrors.argumentMissingError(
				`Could not get squeezable drips: '${nameOf({ assetId })}' is missing.`,
				nameOf({ assetId })
			);
		}

		if (!senderId) {
			throw DripsErrors.argumentMissingError(
				`Could not get squeezable drips: '${nameOf({ senderId })}' is missing.`,
				nameOf({ senderId })
			);
		}

		if (!historyHash) {
			throw DripsErrors.argumentMissingError(
				`Could not get squeezable drips: '${nameOf({ historyHash })}' is missing.`,
				nameOf({ historyHash })
			);
		}

		if (!dripsHistory) {
			throw DripsErrors.argumentMissingError(
				`Could not get squeezable drips: '${nameOf({ dripsHistory })}' is missing.`,
				nameOf({ dripsHistory })
			);
		}

		return this.#dripsHubContract.squeezableDrips(userId, assetId, senderId, historyHash, dripsHistory);
	}

	/**
	 * Receives drips from the currently running cycle from a single sender.
	 * It doesn't receive drips from the previous, finished cycles.
	 * @param  {BigNumberish} userId The ID of the user receiving drips to squeeze funds for.
	 * @param  {string} assetId The asset ID.
	 * @param  {BigNumberish} senderId The ID of the user sending drips to squeeze funds from.
	 * @param  {BytesLike} historyHash The sender's history hash which was valid right before
	 * they set up the sequence of configurations described by `dripsHistory`.
	 * @param  {DripsHistoryStruct[]} dripsHistory The sequence of the sender's drips configurations.
	 * It can start at an arbitrary past configuration, but must describe all the configurations
	 * which have been used since then including the current one, in the chronological order.
	 * **Only drips described by** `dripsHistory` **will be squeezed**.
	 * If `dripsHistory` entries have no receivers, they won't be squeezed.
	 * The next call to `squeezeDrips` will be able to squeeze only funds which
	 * have been dripped after the last timestamp squeezed in this call.
	 * This may cause some funds to be unreceivable until the current cycle ends.
	 * @returns A Promise which resolves to the contract transaction.
	 * @throws {@link DripsErrors.addressError} if the `erc20TokenAddress` address is not valid.
	 */
	public squeezeDrips(
		userId: BigNumberish,
		assetId: string,
		senderId: BigNumberish,
		historyHash: BytesLike,
		dripsHistory: DripsHistoryStruct[]
	): Promise<ContractTransaction> {
		if (!userId) {
			throw DripsErrors.argumentMissingError(
				`Could not squeeze drips: '${nameOf({ userId })}' is missing.`,
				nameOf({ userId })
			);
		}

		if (!assetId) {
			throw DripsErrors.argumentMissingError(
				`Could not squeeze drips: '${nameOf({ assetId })}' is missing.`,
				nameOf({ assetId })
			);
		}

		if (!senderId) {
			throw DripsErrors.argumentMissingError(
				`Could not squeeze drips: '${nameOf({ senderId })}' is missing.`,
				nameOf({ senderId })
			);
		}

		if (!historyHash) {
			throw DripsErrors.argumentMissingError(
				`Could not squeeze drips: '${nameOf({ historyHash })}' is missing.`,
				nameOf({ historyHash })
			);
		}

		if (!dripsHistory) {
			throw DripsErrors.argumentMissingError(
				`Could not squeeze drips: '${nameOf({ dripsHistory })}' is missing.`,
				nameOf({ dripsHistory })
			);
		}

		return this.#dripsHubContract.squeezeDrips(userId, assetId, senderId, historyHash, dripsHistory);
	}
}
