import type { JsonRpcProvider } from '@ethersproject/providers';
import type { BigNumberish, ContractTransaction } from 'ethers';
import { ethers, BigNumber } from 'ethers';
import type { DripsSetEvent } from 'src/DripsSubgraph/types';
import type { DripsHistoryStruct, DripsReceiverStruct, SplitsReceiverStruct } from '../common/types';
import DripsSubgraphClient from '../DripsSubgraph/DripsSubgraphClient';
import { isNullOrUndefined, nameOf } from '../common/internals';
import {
	validateAddress,
	validateClientProvider,
	validateDripsReceivers,
	validateReceiveDripsInput,
	validateSplitInput,
	validateSplitsReceivers
} from '../common/validators';
import Utils from '../utils';
import type { DripsHub } from '../../contracts';
import { DripsHub__factory } from '../../contracts';
import { DripsErrors } from '../common/DripsError';
import type { AssetId, CollectableBalance, DripsState, ReceivableBalance, SplittableBalance } from './types';

/**
 * A client for interacting with the {@link https://github.com/radicle-dev/drips-contracts/blob/master/src/DripsHub.sol DripsHub}.
 */
export default class DripsHubClient {
	#driver!: DripsHub;
	#driverAddress!: string;
	#provider!: JsonRpcProvider;
	#subgraphClient!: DripsSubgraphClient;

	/** Returns the `DripsHubClient`'s `provider`. */
	public get provider(): JsonRpcProvider {
		return this.#provider;
	}

	/** Returns the `DripsHub`'s address to which the `DripsHubClient` is connected. */
	public get driverAddress(): string {
		return this.#driverAddress;
	}

	private constructor() {}

	// TODO: Update the supported chains documentation comments.
	/**
	 * Creates a new immutable `DripsHubClient` instance.
	 * @param  {JsonRpcProvider} provider The network provider.
	 *
	 * The `provider` must have a `signer` associated with it.
	 *
	 * The supported networks are:
	 * - 'goerli': chain ID `5`
	 * @param  {string|undefined} customDriverAddress Overrides the `DripsHub`'s address.
	 * If it's `undefined` (default value), the address will be automatically selected based on the `provider`'s network.
	 * @returns A `Promise` which resolves to the new `DripsHubClient` instance.
	 * @throws {@link DripsErrors.argumentMissingError} if the `provider` is missing.
	 * @throws {@link DripsErrors.addressError} if the `provider.signer`'s address is not valid.
	 * @throws {@link DripsErrors.argumentError} if the `provider.signer` is missing.
	 * @throws {@link DripsErrors.unsupportedNetworkError} if the `provider` is connected to an unsupported network.
	 */
	public static async create(
		provider: JsonRpcProvider,
		customDriverAddress: string | undefined = undefined
	): Promise<DripsHubClient> {
		await validateClientProvider(provider, Utils.Network.SUPPORTED_CHAINS);

		const signer = provider.getSigner();
		const network = await provider.getNetwork();
		const driverAddress = customDriverAddress ?? Utils.Network.configs[network.chainId].CONTRACT_DRIPS_HUB;

		const client = new DripsHubClient();

		client.#provider = provider;
		client.#driverAddress = driverAddress;
		client.#driver = DripsHub__factory.connect(driverAddress, signer);
		client.#subgraphClient = DripsSubgraphClient.create(network.chainId);

		return client;
	}

	/**
	 * Returns the cycle length in seconds.
	 * @returns A `Promise` which resolves to the cycle seconds.
	 */
	public cycleSecs(): Promise<number> {
		return this.#driver.cycleSecs();
	}

	/**
	 * Returns the total amount currently stored in `DripsHub` for the given token.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @returns A `Promise` which resolves to the balance of the token.
	 * @throws {@link DripsErrors.addressError} if the `tokenAddress` address is not valid.
	 */
	public async getTokenBalance(tokenAddress: string): Promise<bigint> {
		validateAddress(tokenAddress);

		const totalBalance = await this.#driver.totalBalance(tokenAddress);

		return totalBalance.toBigInt();
	}

	/**
	 * Returns the count of cycles from which drips can be collected.
	 * This method can be used to detect if there are too many cycles to analyze in a single transaction.
	 * @param  {string} userId The user ID.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @returns A `Promise` which resolves to the number of receivable cycles.
	 * @throws {@link DripsErrors.addressError} if the `tokenAddress` address is not valid.
	 * @throws {@link DripsErrors.argumentMissingError} if the `userId` is missing.
	 */
	public receivableCyclesCount(userId: string, tokenAddress: string): Promise<number> {
		validateAddress(tokenAddress);

		if (isNullOrUndefined(userId)) {
			throw DripsErrors.argumentMissingError(
				`Could not get receivable cycles count: '${nameOf({ userId })}' is missing.`,
				nameOf({ userId })
			);
		}

		return this.#driver.receivableDripsCycles(userId, tokenAddress);
	}

	/**
	 * Calculates the user's receivable balance for the given token.
	 * Receivable balance contains the funds other users drip to and is updated once every cycle.
	 * @param  {string} userId The user ID.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @param  {BigNumberish} maxCycles The maximum number of received drips cycles. Must be greater than `0`.
	 * If too low, receiving will be cheap, but may not cover many cycles.
	 * If too high, receiving may become too expensive to fit in a single transaction.
	 * @returns A `Promise` which resolves to the receivable balance.
	 * @throws {@link DripsErrors.addressError} if the `tokenAddress` address is not valid.
	 * @throws {@link DripsErrors.argumentMissingError} if the `userId` is missing.
	 * @throws {@link DripsErrors.argumentError} if `maxCycles` is not valid.
	 */
	public async getReceivableBalanceForUser(
		userId: string,
		tokenAddress: string,
		maxCycles: BigNumberish
	): Promise<ReceivableBalance> {
		validateAddress(tokenAddress);

		if (isNullOrUndefined(userId)) {
			throw DripsErrors.argumentMissingError(
				`Could not get receivable balance: '${nameOf({ userId })}' is missing.`,
				nameOf({ userId })
			);
		}

		if (!maxCycles || maxCycles < 0) {
			throw DripsErrors.argumentError(
				`Could not get receivable balance: '${nameOf({ maxCycles })}' is missing.`,
				nameOf({ maxCycles }),
				maxCycles
			);
		}

		const receivableBalance = await this.#driver.receiveDripsResult(userId, tokenAddress, maxCycles);

		return {
			tokenAddress,
			receivableAmount: receivableBalance.receivableAmt.toBigInt(),
			remainingReceivableCycles: receivableBalance.receivableCycles
		};
	}

	/**
	 * Calculates the receivable balance for each user token.
	 * Receivable balance contains the funds other users drip to and is updated once every cycle.
	 * @param  {string} userId The user ID.
	 * @param  {BigNumberish|undefined} maxCycles The maximum number of received drips cycles.
	 * If it's `undefined` (default value), `maxCycles` will be automatically set to the maximum value.
	 * When set, it must be greater than `0`.
	 * If too low, receiving will be cheap, but may not cover many cycles.
	 * If too high, receiving may become too expensive to fit in a single transaction.
	 * @returns A `Promise` which resolves to the receivable balances.
	 * @throws {@link DripsErrors.argumentMissingError} if the `userId` is missing.
	 * @throws {@link DripsErrors.argumentError} if `maxCycles` is not valid.
	 */
	public async getAllReceivableBalancesForUser(
		userId: string,
		maxCycles: number | undefined = 2 ** 32 - 1
	): Promise<ReceivableBalance[]> {
		if (isNullOrUndefined(userId)) {
			throw DripsErrors.argumentMissingError(
				`Could not get receivable balances: '${nameOf({ userId })}' is missing.`,
				nameOf({ userId })
			);
		}

		if (!maxCycles || maxCycles < 0) {
			throw DripsErrors.argumentError(
				`Could not get receivable balances: '${nameOf({ maxCycles })}' is must be greater than 0.`,
				nameOf({ maxCycles }),
				maxCycles
			);
		}

		const assetIds = await this.#getAllAssetIdsForUser(userId);

		const receivableBalances: Promise<ReceivableBalance>[] = [];

		assetIds.forEach((id) => {
			const tokenAddress = Utils.Asset.getAddressFromId(id);

			const receivableBalance = this.getReceivableBalanceForUser(userId, tokenAddress, maxCycles);

			receivableBalances.push(receivableBalance);
		});

		return Promise.all(receivableBalances);
	}

	/**
	 * Receives user's drips.
	 * Calling this function does not collect but makes the funds ready to split and collect.
	 * @param  {string} userId The user ID.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @param  {BigNumberish} maxCycles The maximum number of received drips cycles. Must be greater than `0`.
	 * If too low, receiving will be cheap, but may not cover many cycles.
	 * If too high, receiving may become too expensive to fit in a single transaction.
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {@link DripsErrors.addressError} if the `tokenAddress` address is not valid.
	 * @throws {@link DripsErrors.argumentMissingError} if the `userId` is missing.
	 * @throws {@link DripsErrors.argumentError} if `maxCycles` is not valid.
	 */
	public receiveDrips(userId: string, tokenAddress: string, maxCycles: BigNumberish): Promise<ContractTransaction> {
		validateReceiveDripsInput(userId, tokenAddress, maxCycles);

		return this.#driver.receiveDrips(userId, tokenAddress, maxCycles);
	}

	/**
	 * Calculates the user's squeezable balance.
	 * Squeezable balance contains the funds that can be received from the currently running cycle from a single sender.
	 * @param  {string} userId The ID of the user receiving drips to squeeze funds for.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @param  {string} senderId The ID of the user sending drips to squeeze funds from.
	 * @param  {string} historyHash The sender's history hash which was valid right before
	 * they set up the sequence of configurations described by `dripsHistory`.
	 * @param  {DripsHistoryStruct[]} dripsHistory The sequence of the sender's drips configurations.
	 * @returns A `Promise` which resolves to the the squeezable balance.
	 * @throws {@link DripsErrors.addressError} if the `tokenAddress` address is not valid.
	 * @throws {@link DripsErrors.argumentMissingError} if any of the required parameters is missing.
	 */
	public async getSqueezableBalance(
		userId: string,
		tokenAddress: string,
		senderId: string,
		historyHash: string,
		dripsHistory: DripsHistoryStruct[]
	): Promise<bigint> {
		validateAddress(tokenAddress);

		if (isNullOrUndefined(userId)) {
			throw DripsErrors.argumentMissingError(
				`Could not get squeezable balance: '${nameOf({ userId })}' is missing.`,
				nameOf({ userId })
			);
		}

		if (isNullOrUndefined(senderId)) {
			throw DripsErrors.argumentMissingError(
				`Could not get squeezable balance: '${nameOf({ senderId })}' is missing.`,
				nameOf({ senderId })
			);
		}

		if (isNullOrUndefined(historyHash)) {
			throw DripsErrors.argumentMissingError(
				`Could not get squeezable balance: '${nameOf({ historyHash })}' is missing.`,
				nameOf({ historyHash })
			);
		}

		if (isNullOrUndefined(dripsHistory)) {
			throw DripsErrors.argumentMissingError(
				`Could not get squeezable balance: '${nameOf({ dripsHistory })}' is missing.`,
				nameOf({ dripsHistory })
			);
		}

		const squeezableBalance = await this.#driver.squeezeDripsResult(
			userId,
			tokenAddress,
			senderId,
			ethers.utils.hexlify(ethers.utils.toUtf8Bytes(historyHash)),
			dripsHistory
		);

		return squeezableBalance.toBigInt();
	}

	/**
	 * Returns the user's splittable balance for the given token.
	 * Splittable balance contains the user's received but not split yet funds.
	 * @param  {string} userId user ID.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @returns A `Promise` which resolves to the the splittable balance.
	 * @throws {@link DripsErrors.addressError} if the `tokenAddress` address is not valid.
	 * @throws {@link DripsErrors.argumentMissingError} if the `userId` is missing.
	 */
	public async getSplittableBalanceForUser(userId: string, tokenAddress: string): Promise<SplittableBalance> {
		validateAddress(tokenAddress);

		if (isNullOrUndefined(userId)) {
			throw DripsErrors.argumentMissingError(
				`Could not get splittable balance: '${nameOf({ userId })}' is missing.`,
				nameOf({ userId })
			);
		}

		const splittableBalance = await this.#driver.splittable(userId, tokenAddress);

		return {
			tokenAddress,
			splittableAmount: splittableBalance.toBigInt()
		};
	}

	/**
	 * Calculates the splittable balance for each user token.
	 * Splittable balance contains the user's received but not split yet funds.
	 * @param  {string} userId user ID.
	 * @returns A `Promise` which resolves to the the splittable balances.
	 * @throws {@link DripsErrors.addressError} if the `tokenAddress` address is not valid.
	 * @throws {@link DripsErrors.argumentMissingError} if the `userId` is missing.
	 */
	public async getAllSplittableBalancesForUser(userId: string): Promise<SplittableBalance[]> {
		if (isNullOrUndefined(userId)) {
			throw DripsErrors.argumentMissingError(
				`Could not get splittable balance: '${nameOf({ userId })}' is missing.`,
				nameOf({ userId })
			);
		}

		const assetIds = await this.#getAllAssetIdsForUser(userId);

		const splittableBalances: Promise<SplittableBalance>[] = [];

		assetIds.forEach((id) => {
			const tokenAddress = Utils.Asset.getAddressFromId(id);

			const splittableBalance = this.getSplittableBalanceForUser(userId, tokenAddress);

			splittableBalances.push(splittableBalance);
		});

		return Promise.all(splittableBalances);
	}

	/**
	 * Calculates the result of splitting an amount using the user's current splits configuration.
	 * @param  {string} userId The user ID.
	 * @param  {SplitsReceiverStruct[]} currentReceivers The current splits receivers.
	 * @param  {BigNumberish[]} amount The amount being split. It must be greater than `0`.
	 * @returns A `Promise` which resolves to the the amount left for collection after splitting.
	 * @throws {@link DripsErrors.argumentMissingError} if any of the required parameters is missing.
	 * @throws {@link DripsErrors.argumentError} if `amount` or `currentReceivers`' is not valid.
	 * @throws {@link DripsErrors.splitsReceiverError} if any of the `currentReceivers` is not valid.
	 */
	public async getSplitResult(
		userId: string,
		currentReceivers: SplitsReceiverStruct[],
		amount: BigNumberish
	): Promise<bigint> {
		validateSplitsReceivers(currentReceivers);

		if (isNullOrUndefined(userId)) {
			throw DripsErrors.argumentMissingError(
				`Could not get split result: '${nameOf({ userId })}' is missing.`,
				nameOf({ userId })
			);
		}

		if (!amount || amount < 0) {
			throw DripsErrors.argumentError(
				`Could not get split result: '${nameOf({ amount })}' must be greater than 0.`,
				nameOf({ amount }),
				amount
			);
		}

		const amountLeft = await this.#driver.splitResult(userId, currentReceivers, amount);

		return amountLeft.toBigInt();
	}

	/**
	 * Splits user's received but not split yet funds among receivers.
	 * @param  {string} userId The user ID.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @param  {SplitsReceiverStruct[]} currentReceivers The current splits receivers.
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {@link DripsErrors.addressError} if the `tokenAddress` address is not valid.
	 * @throws {@link DripsErrors.argumentMissingError} if `currentReceivers` are missing.
	 * @throws {@link DripsErrors.argumentError} if `currentReceivers`' count exceeds the max allowed splits receivers.
	 * @throws {@link DripsErrors.splitsReceiverError} if any of the `currentReceivers` is not valid.
	 * @throws {@link DripsErrors.argumentMissingError} if the `userId` is missing.
	 */
	public async split(
		userId: BigNumberish,
		tokenAddress: string,
		currentReceivers: SplitsReceiverStruct[]
	): Promise<ContractTransaction> {
		validateSplitInput(userId, tokenAddress, currentReceivers);

		return this.#driver.split(userId, tokenAddress, currentReceivers);
	}

	/**
	 * Returns the user's collectable balance.
	 * Collectable balance contains the user's funds that are already split and ready to be collected.
	 * @param  {string} userId user ID.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @returns A `Promise` which resolves to the the collectable balance.
	 * @throws {@link DripsErrors.addressError} if the `tokenAddress` address is not valid.
	 * @throws {@link DripsErrors.argumentMissingError} if the `userId` is missing.
	 */
	public async getCollectableBalanceForUser(userId: string, tokenAddress: string): Promise<CollectableBalance> {
		validateAddress(tokenAddress);

		if (isNullOrUndefined(userId)) {
			throw DripsErrors.argumentMissingError(
				`Could not get collectable balance: '${nameOf({ userId })}' is missing.`,
				nameOf({ userId })
			);
		}

		const collectableBalance = await this.#driver.collectable(userId, tokenAddress);

		return {
			tokenAddress,
			collectableAmount: collectableBalance.toBigInt()
		};
	}

	/**
	 * Calculates the collectable balance for each user token.
	 * Collectable balance contains the user's funds that are already split and ready to be collected.
	 * @param  {string} userId The user ID.
	 * @returns A `Promise` which resolves to the collectable balances.
	 * @throws {@link DripsErrors.argumentMissingError} if the `userId` is missing.
	 * @throws {@link DripsErrors.argumentError} if `maxCycles` is not valid.
	 */
	public async getAllCollectableBalancesForUser(userId: string): Promise<CollectableBalance[]> {
		if (isNullOrUndefined(userId)) {
			throw DripsErrors.argumentMissingError(
				`Could not get receivable balances: '${nameOf({ userId })}' is missing.`,
				nameOf({ userId })
			);
		}

		const assetIds = await this.#getAllAssetIdsForUser(userId);

		const collectableBalances: Promise<CollectableBalance>[] = [];

		assetIds.forEach((id) => {
			const tokenAddress = Utils.Asset.getAddressFromId(id);

			const collectableBalance = this.getCollectableBalanceForUser(userId, tokenAddress);

			collectableBalances.push(collectableBalance);
		});

		return Promise.all(collectableBalances);
	}

	/**
	 * Returns the user's drips state.
	 * @param  {string} userId The user ID.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @returns A Promise which resolves to the {@link DripsState}.
	 * @throws {@link DripsErrors.addressError} if the `tokenAddress` is not valid.
	 * @throws {@link DripsErrors.argumentMissingError} if the `userId` is missing.
	 */
	public async dripsState(userId: string, tokenAddress: string): Promise<DripsState> {
		validateAddress(tokenAddress);

		if (isNullOrUndefined(userId)) {
			throw DripsErrors.argumentMissingError(
				`Could not get drips state: '${nameOf({ userId })}' is missing.`,
				nameOf({ userId })
			);
		}

		const { dripsHash, dripsHistoryHash, updateTime, balance, maxEnd } = await this.#driver.dripsState(
			userId,
			tokenAddress
		);

		return {
			dripsHash,
			dripsHistoryHash,
			updateTime,
			balance: balance?.toBigInt(),
			maxEnd
		};
	}

	/**
	 * Returns the user's drips balance at a given timestamp.
	 * Drips balance contains the funds the user can stream to other users.
	 * @param  {string} userId The user ID.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @param  {DripsReceiverStruct[]} receivers The users's current drips receivers.
	 * @param  {BigNumberish} timestamp The timestamp for which the balance should be calculated. It can't be lower than the timestamp of the last call to `setDrips`.
	 * If it's bigger than `block.timestamp`, then it's a prediction assuming that `setDrips` won't be called before `timestamp`.
	 * @returns A Promise which resolves to the user balance on `timestamp`.
	 * @throws {@link DripsErrors.argumentMissingError} if any of the required parameters is missing.
	 * @throws {@link DripsErrors.addressError} if the `tokenAddress` is not valid.
	 * @throws {@link DripsErrors.argumentError} if `receivers`' count exceeds the max allowed drips receivers.
	 * @throws {@link DripsErrors.dripsReceiverError} if any of the the `receivers` is not valid.
	 * @throws {@link DripsErrors.dripsReceiverConfigError} if any of the receivers' configuration is not valid.
	 *
	 */
	public async getDripsBalanceAt(
		userId: string,
		tokenAddress: string,
		receivers: DripsReceiverStruct[],
		timestamp: BigNumberish
	): Promise<bigint> {
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

		const dripsBalance = await this.#driver.balanceAt(userId, tokenAddress, receivers, timestamp);

		return dripsBalance.toBigInt();
	}

	async #getAllAssetIdsForUser(userId: string): Promise<AssetId[]> {
		const dripsSetEvents = await this.#subgraphClient.getDripsSetEventsByUserId(BigNumber.from(userId).toString());

		if (!dripsSetEvents?.length) {
			return [];
		}

		const uniqueTokenEvents = dripsSetEvents.reduce((unique: DripsSetEvent[], ev: DripsSetEvent) => {
			if (!unique.some((obj: DripsSetEvent) => obj.assetId === ev.assetId)) {
				unique.push(ev);
			}
			return unique;
		}, []);

		return uniqueTokenEvents.map((e) => e.assetId);
	}
}
