import type { Provider } from '@ethersproject/providers';
import type { BigNumberish, ContractTransaction, Signer } from 'ethers';
import { BigNumber } from 'ethers';
import type { StreamsHistoryStruct, StreamReceiverStruct, SplitsReceiverStruct } from '../common/types';
import { ensureSignerExists, formatSplitReceivers, isNullOrUndefined, nameOf } from '../common/internals';
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
import type { Drips } from '../../contracts';
import { Drips__factory } from '../../contracts';
import { DripsErrors } from '../common/DripsError';
import type { CollectableBalance, StreamsState, ReceivableBalance, SplitResult, SplittableBalance } from './types';

/**
 * A client for interacting with the {@link https://github.com/radicle-dev/drips-contracts/blob/master/src/Drips.sol Drips}.
 */
export default class DripsClient {
	#driver!: Drips;
	#contractAddress!: string;
	#provider!: Provider;
	#signer: Signer | undefined;

	/** Returns the `DripsClient`'s `provider`. */
	public get provider(): Provider {
		return this.#provider;
	}

	/**
	 * Returns the `DripsClient`'s `signer`.
	 *
	 * This is the user to which the `DripsClient` is linked and manages Drips.
	 *
	 * Note that for read-only client instances created with the {@link createReadonly} method it returns `undefined`.
	 */
	public get signer(): Signer | undefined {
		return this.#signer;
	}

	/** Returns the `Drips`'s address to which the `DripsClient` is connected. */
	public get contractAddress(): string {
		return this.#contractAddress;
	}

	private constructor() {}

	/**
	 * Creates a new immutable `DripsClient` instance.
	 * @param  {Provider} provider The network provider. It cannot be changed after creation.
	 *
	 * The `provider` must be connected to one of the following supported networks:
	 * - 'mainnet': chain ID `1`
	 * - 'goerli': chain ID `5`
	 * - 'polygon-mumbai': chain ID `80001`
	 * @param  {Provider|undefined} signer The singer used to sign transactions. It cannot be changed after creation.
	 *
	 * **Important**: If the `signer` is _not_ connected to a provider it will try to connect to the `provider`, else it will use the `signer.provider`.
	 * @param  {string|undefined} customDriverAddress Overrides the `NFTDriver` contract address.
	 * If it's `undefined` (default value), the address will be automatically selected based on the `provider`'s network.
	 * @returns A `Promise` which resolves to the new client instance.
	 * @throws {@link DripsErrors.initializationError} if the client initialization fails.
	 */
	public static async create(provider: Provider, signer?: Signer, customDriverAddress?: string): Promise<DripsClient> {
		try {
			await validateClientProvider(provider, Utils.Network.SUPPORTED_CHAINS);

			if (signer) {
				if (!signer.provider) {
					// eslint-disable-next-line no-param-reassign
					signer = signer.connect(provider);
				}

				await validateClientSigner(signer, Utils.Network.SUPPORTED_CHAINS);
			}

			const network = await provider.getNetwork();
			const contractAddress = customDriverAddress ?? Utils.Network.configs[network.chainId].DRIPS;

			const client = new DripsClient();

			client.#signer = signer;
			client.#provider = provider;
			client.#contractAddress = contractAddress;
			client.#driver = Drips__factory.connect(contractAddress, signer ?? provider);
			return client;
		} catch (error: any) {
			throw DripsErrors.initializationError(`Could not create 'DripsClient': ${error.message}`);
		}
	}

	/**
	 * Returns the cycle length in seconds.
	 * @returns A `Promise` which resolves to the cycle seconds.
	 */
	public cycleSecs(): Promise<number> {
		return this.#driver.cycleSecs();
	}

	/**
	 * Calculates the hash of the drips receivers.
	 * @param currentReceivers The drips receivers.
	 * Must be sorted by the receivers' addresses, deduplicated and without 0 `amtPerSecs`.
	 * @param provider The provider.
	 * @returns The hash of the drips receivers.
	 */
	public static async hashStreams(receivers: StreamReceiverStruct[], provider: Provider): Promise<string> {
		const hash = Drips__factory.connect(
			Utils.Network.configs[(await provider.getNetwork()).chainId].DRIPS,
			provider
		).hashStreams(receivers);

		return hash;
	}

	/**
	 * Returns the amount currently stored in `Drips` for the given token.
	 * @param  {string} tokenAddress The ERC20 token address.
	 *
	 * It must preserve amounts, so if some amount of tokens is transferred to
	 * an address, then later the same amount must be transferrable from that address.
	 * Tokens which rebase the holders' balances, collect taxes on transfers,
	 * or impose any restrictions on holding or transferring tokens are not supported.
	 * If you use such tokens in the protocol, they can get stuck or lost.
	 * @returns The balance currently stored in streaming and splitting.
	 * @throws {@link DripsErrors.addressError} if the `tokenAddress` address is not valid.
	 */
	public async getTokenBalance(tokenAddress: string): Promise<{
		streamsBalance: bigint;
		splitsBalance: bigint;
	}> {
		validateAddress(tokenAddress);

		const totalBalance = await this.#driver.balances(tokenAddress);

		return {
			streamsBalance: totalBalance.streamsBalance.toBigInt(),
			splitsBalance: totalBalance.splitsBalance.toBigInt()
		};
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

		return this.#driver.receivableStreamsCycles(userId, tokenAddress);
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

		if (!maxCycles || BigNumber.from(maxCycles).lt(0)) {
			throw DripsErrors.argumentError(
				`Could not get receivable balance: '${nameOf({ maxCycles })}' is missing.`,
				nameOf({ maxCycles }),
				maxCycles
			);
		}

		const receivableBalance = await this.#driver.receiveStreamsResult(userId, tokenAddress, maxCycles);

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
	public receiveStreams(userId: string, tokenAddress: string, maxCycles: BigNumberish): Promise<ContractTransaction> {
		ensureSignerExists(this.#signer);
		validateReceiveDripsInput(userId, tokenAddress, maxCycles);

		return this.#driver.receiveStreams(userId, tokenAddress, maxCycles);
	}

	/**
	 * Receives drips from the currently running cycle from a single sender.
	 * It doesn't receive drips from the previous, finished cycles, to do that use `receiveStreams`.
	 * Squeezed funds won't be received in the next calls to `squeezeStreams` or `receiveStreams`.
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
	public squeezeStreams(
		userId: string,
		tokenAddress: string,
		senderId: BigNumberish,
		historyHash: string,
		dripsHistory: StreamsHistoryStruct[]
	): Promise<ContractTransaction> {
		validateSqueezeDripsInput(userId, tokenAddress, senderId, historyHash, dripsHistory);

		return this.#driver.squeezeStreams(userId, tokenAddress, senderId, historyHash, dripsHistory);
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
	 * @param  {StreamsHistoryStruct[]} dripsHistory The sequence of the sender's drips configurations.
	 * @returns A `Promise` which resolves to the the squeezable balance.
	 * @throws {@link DripsErrors.addressError} if the `tokenAddress` address is not valid.
	 * @throws {@link DripsErrors.argumentMissingError} if any of the required parameters is missing.
	 */
	public async getSqueezableBalance(
		userId: string,
		tokenAddress: string,
		senderId: string,
		historyHash: string,
		dripsHistory: StreamsHistoryStruct[]
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

		const squeezableBalance = await this.#driver.squeezeStreamsResult(
			userId,
			tokenAddress,
			senderId,
			historyHash,
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

		if (!amount || BigNumber.from(amount).lt(0)) {
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

		return this.#driver.split(userId, tokenAddress, formatSplitReceivers(currentReceivers));
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
	 * @returns A Promise which resolves to the {@link StreamsState}.
	 * @throws {@link DripsErrors.addressError} if the `tokenAddress` is not valid.
	 * @throws {@link DripsErrors.argumentMissingError} if the `userId` is missing.
	 */
	public async streamsState(userId: string, tokenAddress: string): Promise<StreamsState> {
		validateAddress(tokenAddress);

		if (isNullOrUndefined(userId)) {
			throw DripsErrors.argumentMissingError(
				`Could not get drips state: '${nameOf({ userId })}' is missing.`,
				nameOf({ userId })
			);
		}

		const { streamsHash, streamsHistoryHash, updateTime, balance, maxEnd } = await this.#driver.streamsState(
			userId,
			tokenAddress
		);

		return {
			streamsHash,
			streamsHistoryHash,
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
	 * @param  {StreamReceiverStruct[]} receivers The users's current drips receivers.
	 * @param  {BigNumberish} timestamp The timestamp for which the balance should be calculated. It can't be lower than the timestamp of the last call to `setStreams`.
	 * If it's bigger than `block.timestamp`, then it's a prediction assuming that `setStreams` won't be called before `timestamp`.
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
		receivers: StreamReceiverStruct[],
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
