import type { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import type { BigNumberish, ContractTransaction } from 'ethers';
import { ethers, BigNumber } from 'ethers';
import type { DripsHistoryStruct, DripsReceiverStruct, SplitsReceiverStruct } from '../common/types';
import { ensureSignerExists, isNullOrUndefined, nameOf } from '../common/internals';
import {
	validateAddress,
	validateClientProvider,
	validateClientSigner,
	validateDripsReceivers,
	validateReceiveDripsInput,
	validateSplitInput,
	validateSplitsReceivers,
	validateSqueezeDripsInput
} from '../common/validators';
import Utils from '../utils';
import type { DripsHub } from '../../contracts';
import { DripsHub__factory } from '../../contracts';
import { DripsErrors } from '../common/DripsError';
import type { CollectableBalance, DripsState, ReceivableBalance, SplitResult, SplittableBalance } from './types';

/**
 * A client for interacting with the {@link https://github.com/radicle-dev/drips-contracts/blob/master/src/DripsHub.sol DripsHub}.
 */
export default class DripsHubClient {
	#driver!: DripsHub;
	#driverAddress!: string;
	#provider!: JsonRpcProvider;
	#signer: JsonRpcSigner | undefined;

	/** Returns the `DripsHubClient`'s `provider`. */
	public get provider(): JsonRpcProvider {
		return this.#provider;
	}

	/**
	 * Returns the `DripsHubClient`'s `signer`.
	 *
	 * This is the user to which the `DripsHubClient` is linked and manages Drips.
	 *
	 * Note that for read-only client instances created with the {@link createReadonly} method it returns `undefined`.
	 */
	public get signer(): JsonRpcSigner | undefined {
		return this.#signer;
	}

	/** Returns the `DripsHub`'s address to which the `DripsHubClient` is connected. */
	public get driverAddress(): string {
		return this.#driverAddress;
	}

	private constructor() {}

	// TODO: Update the supported chains documentation comments.
	/**
	 * Creates a new immutable `DripsHubClient` instance.
	 * @param  {JsonRpcProvider} signer The signer.
	 *
	 * The `provider` this signer was established from can be connected to one of the following supported networks:
	 * - 'goerli': chain ID `5`
	 * - 'polygon-mumbai': chain ID `80001`
	 * @param  {string|undefined} customDriverAddress Overrides the `DripsHub`'s address.
	 * If it's `undefined` (default value), the address will be automatically selected based on the `provider`'s network.
	 * @returns A `Promise` which resolves to the new `DripsHubClient` instance.
	 * @throws {@link DripsErrors.argumentMissingError} if the `provider` is missing.
	 * @throws {@link DripsErrors.addressError} if the `provider.signer`'s address is not valid.
	 * @throws {@link DripsErrors.argumentError} if the `provider.signer` is missing.
	 * @throws {@link DripsErrors.unsupportedNetworkError} if the `provider` is connected to an unsupported network.
	 */
	public static async create(
		signer: JsonRpcSigner,
		customDriverAddress: string | undefined = undefined
	): Promise<DripsHubClient> {
		await validateClientSigner(signer);

		const { provider } = signer;
		const network = await provider.getNetwork();
		const driverAddress = customDriverAddress ?? Utils.Network.configs[network.chainId].CONTRACT_DRIPS_HUB;

		const client = new DripsHubClient();

		client.#signer = signer;
		client.#provider = provider;
		client.#driverAddress = driverAddress;
		client.#driver = DripsHub__factory.connect(driverAddress, signer);

		return client;
	}

	// TODO: Update the supported chains documentation comments.
	/**
	 * Creates a new immutable `DripsHubClient` instance that allows only **read-only operations** (i.e., any operation that does _not_ require signing).
	 * @param  {JsonRpcProvider} provider The network provider.
	 *
	 * Note that even if the `provider` has a `singer` associated with it, the client will ignore it.
	 * If you want to _sign_ transactions use the {@link create} method instead.
	 *
	 * Supported networks are:
	 * - 'goerli': chain ID `5`
	 * - 'polygon-mumbai': chain ID `80001`
	 * @param  {string|undefined} customDriverAddress Overrides the `DripsHub`'s address.
	 * If it's `undefined` (default value), the address will be automatically selected based on the `provider`'s network.
	 * @returns A `Promise` which resolves to the new `DripsHubClient` instance.
	 * @throws {@link DripsErrors.argumentMissingError} if the `provider` is missing.
	 * @throws {@link DripsErrors.unsupportedNetworkError} if the `provider` is connected to an unsupported network.
	 */
	public static async createReadonly(
		provider: JsonRpcProvider,
		customDriverAddress: string | undefined = undefined
	): Promise<DripsHubClient> {
		await validateClientProvider(provider, Utils.Network.SUPPORTED_CHAINS);

		const network = await provider.getNetwork();
		const driverAddress = customDriverAddress ?? Utils.Network.configs[network.chainId].CONTRACT_DRIPS_HUB;

		const client = new DripsHubClient();

		client.#signer = undefined;
		client.#provider = provider;
		client.#driverAddress = driverAddress;
		client.#driver = DripsHub__factory.connect(driverAddress, provider);

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
	 *
	 * It must preserve amounts, so if some amount of tokens is transferred to
	 * an address, then later the same amount must be transferrable from that address.
	 * Tokens which rebase the holders' balances, collect taxes on transfers,
	 * or impose any restrictions on holding or transferring tokens are not supported.
	 * If you use such tokens in the protocol, they can get stuck or lost.
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
	 *
	 * It must preserve amounts, so if some amount of tokens is transferred to
	 * an address, then later the same amount must be transferrable from that address.
	 * Tokens which rebase the holders' balances, collect taxes on transfers,
	 * or impose any restrictions on holding or transferring tokens are not supported.
	 * If you use such tokens in the protocol, they can get stuck or lost.
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
	 *
	 * It must preserve amounts, so if some amount of tokens is transferred to
	 * an address, then later the same amount must be transferrable from that address.
	 * Tokens which rebase the holders' balances, collect taxes on transfers,
	 * or impose any restrictions on holding or transferring tokens are not supported.
	 * If you use such tokens in the protocol, they can get stuck or lost.
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
			receivableAmount: receivableBalance.toBigInt()
		};
	}

	/**
	 * Receives user's drips.
	 * Calling this function does not collect but makes the funds ready to split and collect.
	 * @param  {string} userId The user ID.
	 * @param  {string} tokenAddress The ERC20 token address.
	 *
	 * It must preserve amounts, so if some amount of tokens is transferred to
	 * an address, then later the same amount must be transferrable from that address.
	 * Tokens which rebase the holders' balances, collect taxes on transfers,
	 * or impose any restrictions on holding or transferring tokens are not supported.
	 * If you use such tokens in the protocol, they can get stuck or lost.
	 * @param  {BigNumberish} maxCycles The maximum number of received drips cycles. Must be greater than `0`.
	 * If too low, receiving will be cheap, but may not cover many cycles.
	 * If too high, receiving may become too expensive to fit in a single transaction.
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {@link DripsErrors.addressError} if the `tokenAddress` address is not valid.
	 * @throws {@link DripsErrors.argumentMissingError} if the `userId` is missing.
	 * @throws {@link DripsErrors.argumentError} if `maxCycles` is not valid.
	 */
	public receiveDrips(userId: string, tokenAddress: string, maxCycles: BigNumberish): Promise<ContractTransaction> {
		ensureSignerExists(this.#signer);
		validateReceiveDripsInput(userId, tokenAddress, maxCycles);

		return this.#driver.receiveDrips(userId, tokenAddress, maxCycles);
	}

	/**
	 * Receives drips from the currently running cycle from a single sender.
	 * It doesn't receive drips from the previous, finished cycles, to do that use `receiveDrips`.
	 * Squeezed funds won't be received in the next calls to `squeezeDrips` or `receiveDrips`.
	 * Only funds dripped before `block.timestamp` can be squeezed.
	 *
	 * **Tip**: you might want to use `DripsSubgraphClient.getArgsForSqueezingAllDrips` to easily populate the arguments for squeezing all Drips up to "now".
	 * @param  {string} userId The ID of the user receiving drips to squeeze funds for.
	 * @param  {string} tokenAddress The ERC20 token address.
	 *
	 * It must preserve amounts, so if some amount of tokens is transferred to
	 * an address, then later the same amount must be transferrable from that address.
	 * Tokens which rebase the holders' balances, collect taxes on transfers,
	 * or impose any restrictions on holding or transferring tokens are not supported.
	 * If you use such tokens in the protocol, they can get stuck or lost.
	 * @param  {BigNumberish} senderId The ID of the user sending drips to squeeze funds from.
	 * @param  {string} historyHash The sender's history hash which was valid right before they set up the sequence of configurations described by `dripsHistory`.
	 * @param  {BigNumberish} dripsHistory The sequence of the sender's drips configurations.
	 * It can start at an arbitrary past configuration, but must describe all the configurations
	 * which have been used since then including the current one, in the chronological order.
	 * Only drips described by `dripsHistory` will be squeezed.
	 * If `dripsHistory` entries have no receivers, they won't be squeezed.
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {DripsErrors.addressError} if the `tokenAddress` address is not valid.
	 * @throws {DripsErrors.argumentMissingError} if any of the required parameters is missing.
	 */
	public squeezeDrips(
		userId: string,
		tokenAddress: string,
		senderId: BigNumberish,
		historyHash: string,
		dripsHistory: DripsHistoryStruct[]
	): Promise<ContractTransaction> {
		validateSqueezeDripsInput(userId, tokenAddress, senderId, historyHash, dripsHistory);

		return this.#driver.squeezeDrips(
			userId,
			tokenAddress,
			senderId,
			ethers.utils.hexlify(ethers.utils.toUtf8Bytes(historyHash)),
			dripsHistory
		);
	}

	/**
	 * Calculates the user's squeezable balance.
	 * Squeezable balance contains the funds that can be received from the currently running cycle from a single sender.
	 * @param  {string} userId The ID of the user receiving drips to squeeze funds for.
	 * @param  {string} tokenAddress The ERC20 token address.
	 *
	 * It must preserve amounts, so if some amount of tokens is transferred to
	 * an address, then later the same amount must be transferrable from that address.
	 * Tokens which rebase the holders' balances, collect taxes on transfers,
	 * or impose any restrictions on holding or transferring tokens are not supported.
	 * If you use such tokens in the protocol, they can get stuck or lost.
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
	 *
	 * It must preserve amounts, so if some amount of tokens is transferred to
	 * an address, then later the same amount must be transferrable from that address.
	 * Tokens which rebase the holders' balances, collect taxes on transfers,
	 * or impose any restrictions on holding or transferring tokens are not supported.
	 * If you use such tokens in the protocol, they can get stuck or lost.
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
	 * Calculates the result of splitting an amount using the user's current splits configuration.
	 * @param  {string} userId The user ID.
	 * @param  {SplitsReceiverStruct[]} currentReceivers The current splits receivers.
	 * @param  {BigNumberish[]} amount The amount being split. It must be greater than `0`.
	 * @returns A `Promise` which resolves to the split result.
	 * @throws {@link DripsErrors.argumentMissingError} if any of the required parameters is missing.
	 * @throws {@link DripsErrors.argumentError} if `amount` or `currentReceivers`' is not valid.
	 * @throws {@link DripsErrors.splitsReceiverError} if any of the `currentReceivers` is not valid.
	 */
	public async getSplitResult(
		userId: string,
		currentReceivers: SplitsReceiverStruct[],
		amount: BigNumberish
	): Promise<SplitResult> {
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

		const { collectableAmt, splitAmt } = await this.#driver.splitResult(userId, currentReceivers, amount);

		return {
			collectableAmount: collectableAmt.toBigInt(),
			splitAmount: splitAmt.toBigInt()
		};
	}

	/**
	 * Splits user's received but not split yet funds among receivers.
	 * @param  {string} userId The user ID.
	 * @param  {string} tokenAddress The ERC20 token address.
	 *
	 * It must preserve amounts, so if some amount of tokens is transferred to
	 * an address, then later the same amount must be transferrable from that address.
	 * Tokens which rebase the holders' balances, collect taxes on transfers,
	 * or impose any restrictions on holding or transferring tokens are not supported.
	 * If you use such tokens in the protocol, they can get stuck or lost.
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
		ensureSignerExists(this.#signer);
		validateSplitInput(userId, tokenAddress, currentReceivers);

		return this.#driver.split(userId, tokenAddress, currentReceivers);
	}

	/**
	 * Returns the user's collectable balance.
	 * Collectable balance contains the user's funds that are already split and ready to be collected.
	 * @param  {string} userId user ID.
	 * @param  {string} tokenAddress The ERC20 token address.
	 *
	 * It must preserve amounts, so if some amount of tokens is transferred to
	 * an address, then later the same amount must be transferrable from that address.
	 * Tokens which rebase the holders' balances, collect taxes on transfers,
	 * or impose any restrictions on holding or transferring tokens are not supported.
	 * If you use such tokens in the protocol, they can get stuck or lost.
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
	 * Returns the user's drips state.
	 * @param  {string} userId The user ID.
	 * @param  {string} tokenAddress The ERC20 token address.
	 *
	 * It must preserve amounts, so if some amount of tokens is transferred to
	 * an address, then later the same amount must be transferrable from that address.
	 * Tokens which rebase the holders' balances, collect taxes on transfers,
	 * or impose any restrictions on holding or transferring tokens are not supported.
	 * If you use such tokens in the protocol, they can get stuck or lost.
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
	 *
	 * It must preserve amounts, so if some amount of tokens is transferred to
	 * an address, then later the same amount must be transferrable from that address.
	 * Tokens which rebase the holders' balances, collect taxes on transfers,
	 * or impose any restrictions on holding or transferring tokens are not supported.
	 * If you use such tokens in the protocol, they can get stuck or lost.
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
}
