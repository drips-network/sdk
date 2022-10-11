import type { Network } from '@ethersproject/networks';
import type { Provider } from '@ethersproject/providers';
import type { DripsMetadata, ReceivableDrips, SqueezableDrips } from 'src/common/types';
import type { BytesLike, ContractTransaction } from 'ethers';
import { BigNumber } from 'ethers';
import type { DripsHistoryStruct, DripsReceiverStruct } from 'contracts/DripsHub';
import { isNullOrUndefined, nameOf, validateAddress, validateDripsReceivers } from '../common/internals';
import Utils from '../utils';
import type { DripsHub } from '../../contracts';
import { DripsHub__factory } from '../../contracts';
import { DripsErrors } from '../common/DripsError';
import type { DripsHubClientConstants, DripsState } from './types';

/**
 * A client for interacting with the read-only {@link https://github.com/radicle-dev/drips-contracts/blob/master/src/DripsHub.sol DripsHub} API.
 */
export default class DripsHubClient {
	#dripsHubContract!: DripsHub;

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

	#dripsMetadata!: DripsMetadata;
	/** Returns the `DripsHubClient`'s `network` {@link DripsMetadata}. */
	public get dripsMetadata() {
		return this.#dripsMetadata;
	}

	#constants!: DripsHubClientConstants;
	/** Returns the protocol constants. */
	public get constants() {
		return this.#constants;
	}

	private constructor() {}

	// TODO: Update the supported chains documentation comments.
	/**
	 * Creates a new immutable `DripsHubClient` instance.
	 * @param  {JsonRpcProvider} provider
	 * The provider can connect to the following supported networks:
	 * - 'goerli': chain ID 5
	 * @returns A `Promise` which resolves to the new `DripsHubClient` instance.
	 * @throws {DripsErrors.argumentMissingError} if the `provider` is missing.
	 * @throws {DripsErrors.unsupportedNetworkError} if the `provider` is connected to an unsupported network.
	 */
	public static async create(provider: Provider): Promise<DripsHubClient> {
		if (!provider) {
			throw DripsErrors.argumentMissingError(
				"Could not create a new 'DripsHubClient': the 'provider' is missing.",
				nameOf({ provider })
			);
		}

		const network = await provider.getNetwork();
		if (!Utils.Network.isSupportedChain(network?.chainId)) {
			throw DripsErrors.unsupportedNetworkError(
				`Could not create a new 'DripsHubClient': the provider is connected to an unsupported network (name: '${
					network?.name
				}', chain ID: ${network?.chainId}). Supported chains are: ${Utils.Network.SUPPORTED_CHAINS.toString()}.`,
				network?.chainId
			);
		}
		const dripsMetadata = Utils.Network.dripsMetadata[network.chainId];

		const dripsHub = new DripsHubClient();

		dripsHub.#network = network;
		dripsHub.#provider = provider;
		dripsHub.#dripsMetadata = dripsMetadata;
		dripsHub.#dripsHubContract = DripsHub__factory.connect(dripsMetadata.CONTRACT_DRIPS_HUB, provider);
		dripsHub.#constants = await dripsHub.#getConstants();

		return dripsHub;
	}

	/**
	 * Returns the cycle length in seconds.
	 * @returns A `Promise` which resolves to the cycle seconds.
	 */
	public getCycleSecs(): Promise<number> {
		return this.#dripsHubContract.cycleSecs();
	}

	/**
	 * Returns the total amount currently stored in `DripsHub` for the given token.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @returns A `Promise` which resolves to the total balance.
	 * @throws {DripsErrors.addressError} if the `tokenAddress` address is not valid.
	 */
	public async getTotalBalanceForToken(tokenAddress: string): Promise<bigint> {
		validateAddress(tokenAddress);

		const totalBalance = await this.#dripsHubContract.totalBalance(tokenAddress);

		return totalBalance.toBigInt();
	}

	/**
	 * Returns the cycles count from which drips can be collected.
	 * This function can be used to detect if there are too many cycles to analyze in a single transaction.
	 * @param  {bigint} userId The user ID.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @returns A `Promise` which resolves to the cycles count.
	 * @throws {DripsErrors.addressError} if the `tokenAddress` address is not valid.
	 * @throws {DripsErrors.argumentMissingError} if the `userId` is missing.
	 */
	public getReceivableDripsCyclesCount(userId: bigint, tokenAddress: string): Promise<number> {
		validateAddress(tokenAddress);

		if (isNullOrUndefined(userId)) {
			throw DripsErrors.argumentMissingError(
				`Could not get receivable drips cycles: '${nameOf({ userId })}' is missing.`,
				nameOf({ userId })
			);
		}

		return this.#dripsHubContract.receivableDripsCycles(userId, tokenAddress);
	}

	/**
	 * Calculates the receivable drips.
	 * @param  {bigint} userId The user ID.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @param  {bigint} maxCycles The maximum number of received drips cycles. Must be greater than `0`.
	 * If too low, receiving will be cheap, but may not cover many cycles.
	 * If too high, receiving may become too expensive to fit in a single transaction.
	 * @returns A `Promise` which resolves to the {@link ReceivableDrips}.
	 * @throws {DripsErrors.addressError} if the `tokenAddress` address is not valid.
	 * @throws {DripsErrors.argumentMissingError} if the `userId` or the `maxCycles` is missing.
	 */
	public async getReceivableDrips(userId: bigint, tokenAddress: string, maxCycles: bigint): Promise<ReceivableDrips> {
		validateAddress(tokenAddress);

		if (isNullOrUndefined(userId)) {
			throw DripsErrors.argumentMissingError(
				`Could not get receivable drips cycles: '${nameOf({ userId })}' is missing.`,
				nameOf({ userId })
			);
		}

		if (!maxCycles) {
			throw DripsErrors.argumentMissingError(
				`Could not get receivable drips cycles: '${nameOf({ maxCycles })}' is missing.`,
				nameOf({ maxCycles })
			);
		}

		const receivableDrips = await this.#dripsHubContract.receivableDrips(userId, tokenAddress, maxCycles);

		return {
			receivableAmt: receivableDrips.receivableAmt.toBigInt(),
			receivableCycles: receivableDrips.receivableCycles
		};
	}

	/**
	 * Receives drips.
	 * @param  {bigint} userId The user ID.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @param  {bigint} maxCycles The maximum number of received drips cycles. Must be greater than `0`.
	 * If too low, receiving will be cheap, but may not cover many cycles.
	 * If too high, receiving may become too expensive to fit in a single transaction.
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {DripsErrors.addressError} if the `tokenAddress` address is not valid.
	 * @throws {DripsErrors.argumentMissingError} if the `userId` or the `maxCycles` is missing.
	 */
	public receiveDrips(userId: bigint, tokenAddress: string, maxCycles: bigint): Promise<ContractTransaction> {
		validateAddress(tokenAddress);

		if (isNullOrUndefined(userId)) {
			throw DripsErrors.argumentMissingError(
				`Could not get receivable drips cycles: '${nameOf({ userId })}' is missing.`,
				nameOf({ userId })
			);
		}

		if (!maxCycles) {
			throw DripsErrors.argumentMissingError(
				`Could not get receivable drips cycles: '${nameOf({ maxCycles })}' is missing.`,
				nameOf({ maxCycles })
			);
		}

		return this.#dripsHubContract.receiveDrips(userId, tokenAddress, maxCycles);
	}

	/**
	 * Calculates the squeezable drips.
	 * @param  {bigint} userId The ID of the user receiving drips to squeeze funds for.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @param  {bigint} senderId The ID of the user sending drips to squeeze funds from.
	 * @param  {BytesLike} historyHash The sender's history hash which was valid right before
	 * they set up the sequence of configurations described by `dripsHistory`.
	 * @param  {DripsHistoryStruct[]} dripsHistory The sequence of the sender's drips configurations.
	 * @returns A `Promise` which resolves to the {@link SqueezableDrips}.
	 * @throws {DripsErrors.addressError} if the `tokenAddress` address is not valid.
	 * @throws {DripsErrors.argumentMissingError} if any of the required parameters is missing.
	 */
	public async getSqueezableDrips(
		userId: bigint,
		tokenAddress: string,
		senderId: bigint,
		historyHash: BytesLike,
		dripsHistory: DripsHistoryStruct[]
	): Promise<SqueezableDrips> {
		validateAddress(tokenAddress);

		if (isNullOrUndefined(userId)) {
			throw DripsErrors.argumentMissingError(
				`Could not get squeezable drips: '${nameOf({ userId })}' is missing.`,
				nameOf({ userId })
			);
		}

		if (isNullOrUndefined(senderId)) {
			throw DripsErrors.argumentMissingError(
				`Could not get squeezable drips: '${nameOf({ senderId })}' is missing.`,
				nameOf({ senderId })
			);
		}

		if (isNullOrUndefined(historyHash)) {
			throw DripsErrors.argumentMissingError(
				`Could not get squeezable drips: '${nameOf({ historyHash })}' is missing.`,
				nameOf({ historyHash })
			);
		}

		if (isNullOrUndefined(dripsHistory)) {
			throw DripsErrors.argumentMissingError(
				`Could not get squeezable drips: '${nameOf({ dripsHistory })}' is missing.`,
				nameOf({ dripsHistory })
			);
		}

		const squeezableDrips = await this.#dripsHubContract.squeezableDrips(
			userId,
			tokenAddress,
			senderId,
			historyHash,
			dripsHistory
		);

		return {
			amt: squeezableDrips.amt.toBigInt(),
			nextSqueezed: squeezableDrips.nextSqueezed
		};
	}

	/**
	 * Returns the next timestamp for which the user can squeeze drips from the sender.
	 * @param  {bigint} userId The ID of the user receiving drips to squeeze funds for.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @param  {bigint} senderId The ID of the user sending drips to squeeze funds from.
	 * @returns A `Promise` which resolves to the next timestamp that can be squeezed.
	 * @throws {DripsErrors.addressError} if the `tokenAddress` address is not valid.
	 * @throws {DripsErrors.argumentMissingError} if any of the required parameters is missing.
	 */
	public getNextSqueezedDrips(userId: bigint, tokenAddress: string, senderId: bigint): Promise<number> {
		validateAddress(tokenAddress);

		if (isNullOrUndefined(userId)) {
			throw DripsErrors.argumentMissingError(
				`Could not get next squeezable drips timestamp: '${nameOf({ userId })}' is missing.`,
				nameOf({ userId })
			);
		}

		if (isNullOrUndefined(senderId)) {
			throw DripsErrors.argumentMissingError(
				`Could not get next squeezable drips timestamp: '${nameOf({ senderId })}' is missing.`,
				nameOf({ senderId })
			);
		}

		return this.#dripsHubContract.nextSqueezedDrips(userId, tokenAddress, senderId);
	}

	/**
	 * Returns user's received but not split yet funds.
	 * @param  {bigint} userId The ID of the user receiving drips to squeeze funds for.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @returns Promise
	 * @throws {DripsErrors.addressError} if the `tokenAddress` address is not valid.
	 * @throws {DripsErrors.argumentMissingError} if the `userId` is missing.
	 */
	public async getSplittable(userId: bigint, tokenAddress: string): Promise<bigint> {
		validateAddress(tokenAddress);

		if (isNullOrUndefined(userId)) {
			throw DripsErrors.argumentMissingError(
				`Could not get splittable: '${nameOf({ userId })}' is missing.`,
				nameOf({ userId })
			);
		}

		const splittable = await this.#dripsHubContract.splittable(userId, tokenAddress);

		return splittable.toBigInt();
	}

	/**
	 * Returns the user's received funds that are already split and ready to be collected.
	 * @param  {bigint} userId The user ID.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @returns A Promise which resolves to the collectable amount.
	 * @throws {DripsErrors.addressError} if the `tokenAddress` is not valid.
	 * @throws {DripsErrors.argumentMissingError} if the `userId` is missing.
	 */
	public async getCollectable(userId: bigint, tokenAddress: string): Promise<bigint> {
		validateAddress(tokenAddress);

		if (isNullOrUndefined(userId)) {
			throw DripsErrors.argumentMissingError(
				`Could not get collectable: '${nameOf({ userId })}' is missing.`,
				nameOf({ userId })
			);
		}

		const collectable = await this.#dripsHubContract.collectable(userId, tokenAddress);

		return collectable.toBigInt();
	}

	/**
	 * Returns the user's drips state.
	 * @param  {bigint} userId The user ID.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @returns A Promise which resolves to the {@link DripsState}.
	 * @throws {DripsErrors.addressError} if the `tokenAddress` is not valid.
	 * @throws {DripsErrors.argumentMissingError} if the `userId` is missing.
	 */
	public getDripsState(userId: bigint, tokenAddress: string): Promise<DripsState> {
		validateAddress(tokenAddress);

		if (isNullOrUndefined(userId)) {
			throw DripsErrors.argumentMissingError(
				`Could not get drips state: '${nameOf({ userId })}' is missing.`,
				nameOf({ userId })
			);
		}

		return this.#dripsHubContract.dripsState(userId, tokenAddress);
	}

	/**
	 * Returns the user's drips balance at a given timestamp.
	 * @param  {bigint} userId The user ID.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @param  {DripsReceiverStruct[]} receivers The users's current drips receivers.
	 * @param  {bigint} timestamp The timestamp for which the balance should be calculated. It can't be lower than the timestamp of the last call to `setDrips`.
	 * If it's bigger than `block.timestamp`, then it's a prediction assuming that `setDrips` won't be called before `timestamp`.
	 * @returns A Promise which resolves to the user balance on `timestamp`.
	 * @throws {DripsErrors.argumentMissingError} if any of the required parameters is missing.
	 * @throws {DripsErrors.addressError} if the `tokenAddress` is not valid.
	 * @throws {DripsErrors.argumentError} if `receivers`' count exceeds the max allowed drips receivers.
	 * @throws {DripsErrors.dripsReceiverError} if any of the the `receivers` is not valid.	 */
	public getBalanceAt(userId: bigint, tokenAddress: string, receivers: DripsReceiverStruct[], timestamp: bigint) {
		validateAddress(tokenAddress);
		validateDripsReceivers(
			receivers.map((r) => ({
				userId: r.userId.toString(),
				config: Utils.DripsReceiverConfiguration.fromUint256(BigNumber.from(r.config).toBigInt())
			}))
		);

		if (isNullOrUndefined(userId)) {
			throw DripsErrors.argumentMissingError(
				`Could not get balance: '${nameOf({ userId })}' is missing.`,
				nameOf({ userId })
			);
		}

		if (isNullOrUndefined(timestamp)) {
			throw DripsErrors.argumentMissingError(
				`Could not get balance: '${nameOf({ timestamp })}' is missing.`,
				nameOf({ timestamp })
			);
		}

		return this.#dripsHubContract.balanceAt(userId, tokenAddress, receivers, timestamp);
	}

	async #getConstants(): Promise<DripsHubClientConstants> {
		const MAX_TOTAL_BALANCE = await this.#dripsHubContract.MAX_TOTAL_BALANCE();
		const TOTAL_SPLITS_WEIGHT = await this.#dripsHubContract.TOTAL_SPLITS_WEIGHT();
		const MAX_DRIPS_RECEIVERS = await this.#dripsHubContract.MAX_DRIPS_RECEIVERS();
		const MAX_SPLITS_RECEIVERS = await this.#dripsHubContract.MAX_SPLITS_RECEIVERS();
		const AMT_PER_SEC_MULTIPLIER = await this.#dripsHubContract.AMT_PER_SEC_MULTIPLIER();
		const AMT_PER_SEC_EXTRA_DECIMALS = await this.#dripsHubContract.AMT_PER_SEC_EXTRA_DECIMALS();

		return {
			MAX_TOTAL_BALANCE,
			TOTAL_SPLITS_WEIGHT,
			MAX_DRIPS_RECEIVERS,
			MAX_SPLITS_RECEIVERS,
			AMT_PER_SEC_MULTIPLIER,
			AMT_PER_SEC_EXTRA_DECIMALS
		};
	}
}
