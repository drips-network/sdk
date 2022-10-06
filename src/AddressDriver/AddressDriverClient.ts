/* eslint-disable no-nested-ternary */

import type { Network } from '@ethersproject/networks';
import type { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import type { BigNumberish, ContractTransaction, BigNumber, BytesLike } from 'ethers';
import { ethers, constants } from 'ethers';
import type { DripsHistoryStruct, DripsReceiverStruct, SplitsReceiverStruct } from 'contracts/AddressDriver';
import type { DripsMetadata } from 'src/common/types';
import type { DripsSetEvent } from 'src/DripsSubgraph/types';
import DripsSubgraphClient from '../DripsSubgraph/DripsSubgraphClient';
import DripsHubClient from '../DripsHub/DripsHubClient';
import Utils from '../utils';
import {
	validateAddress,
	nameOf,
	toBN,
	isNullOrUndefined,
	validateDripsReceivers,
	validateSplitsReceivers
} from '../common/internals';
import { DripsErrors } from '../common/DripsError';
import type { AddressDriver as AddressDriverContract } from '../../contracts';
import { IERC20__factory, AddressDriver__factory } from '../../contracts';

/**
 * A client for managing drips and splits for a user identified by an Ethereum address.
 * @see {@link https://github.com/radicle-dev/drips-contracts/blob/master/src/AddressDriver.sol AddressDriver} smart contract.
 */
export default class AddressDriverClient {
	#addressDriverContract!: AddressDriverContract;

	#signer!: JsonRpcSigner;
	/**
	 * Returns the `AddressDriverClient`'s `signer`.
	 *
	 * This is the user to which the `AddressDriverClient` is linked and manages drips.
	 *
	 * The `signer` is the `provider`'s signer.
	 *
	 */
	public get signer(): JsonRpcSigner {
		return this.#signer;
	}

	#signerAddress!: string;
	/** Returns the `AddressDriverClient`'s `signer` address. */
	public get signerAddress(): string {
		return this.#signerAddress;
	}

	#dripsHub!: DripsHubClient;
	/** Returns a {@link DripsHubClient} connected to the same provider as the `AddressDriverClient.` */
	public get dripsHub(): DripsHubClient {
		return this.#dripsHub;
	}

	#subgraph!: DripsSubgraphClient;
	/** Returns a {@link DripsSubgraphClient} connected to the same network as the `AddressDriverClient.` */
	public get subgraph(): DripsSubgraphClient {
		return this.#subgraph;
	}

	#network!: Network;
	/**
	 * Returns the network the `AddressDriverClient` is connected to.
	 *
	 * The `network` is the `provider`'s network.
	 */
	public get network() {
		return this.#network;
	}

	#provider!: JsonRpcProvider;
	/** Returns the `AddressDriverClient`'s `provider`. */
	public get provider(): JsonRpcProvider {
		return this.#provider;
	}

	#dripsMetadata!: DripsMetadata;
	/** Returns the `AddressDriverClient`'s `network` {@link DripsMetadata}. */
	public get dripsMetadata() {
		return this.#dripsMetadata;
	}

	private constructor() {}

	// TODO: Update the supported chains documentation comments.
	/**
	 * Creates a new immutable `AddressDriverClient` instance.
	 * @param  {JsonRpcProvider} provider The `provider` must have a `signer` associated with it.
	 * **This signer will be the _sole_ "user" to which the new `AddressDriverClient` instance will be linked for managing their drips and cannot be changed after creation**.
	 *
	 * The `provider` can connect to the following supported networks:
	 * - 'goerli': chain ID 5
	 * @returns A `Promise` which resolves to the new `AddressDriverClient` instance.
	 * @throws {DripsErrors.argumentMissingError} if the `provider` is missing.
	 * @throws {DripsErrors.argumentError} if the `provider`'s singer is missing.
	 * @throws {DripsErrors.addressError} if the `provider`'s signer address is not valid.
	 * @throws {DripsErrors.unsupportedNetworkError} if the `provider` is connected to an unsupported network.
	 */
	public static async create(provider: JsonRpcProvider): Promise<AddressDriverClient> {
		if (!provider) {
			throw DripsErrors.argumentMissingError(
				"Could not create a new 'AddressDriverClient': the provider is missing.",
				nameOf({ provider })
			);
		}

		const signer = provider.getSigner();
		const signerAddress = await signer?.getAddress();
		if (!signerAddress) {
			throw DripsErrors.argumentError(
				"Could not create a new 'AddressDriverClient': the provider's signer address is missing.",
				nameOf({ provider }),
				provider
			);
		}
		validateAddress(signerAddress);

		const network = await provider.getNetwork();
		if (!Utils.Network.isSupportedChain(network?.chainId)) {
			throw DripsErrors.unsupportedNetworkError(
				`Could not create a new 'AddressDriverClient': the provider is connected to an unsupported network (name: '${
					network?.name
				}', chain ID: ${network?.chainId}). Supported chains are: ${Utils.Network.SUPPORTED_CHAINS.toString()}.`,
				network?.chainId
			);
		}
		const dripsMetadata = Utils.Network.dripsMetadata[network.chainId];

		const addressDriverClient = new AddressDriverClient();

		addressDriverClient.#signer = signer;
		addressDriverClient.#network = network;
		addressDriverClient.#provider = provider;
		addressDriverClient.#dripsMetadata = dripsMetadata;
		addressDriverClient.#signerAddress = await signer.getAddress();
		addressDriverClient.#dripsHub = await DripsHubClient.create(provider);
		addressDriverClient.#subgraph = DripsSubgraphClient.create(network.chainId);
		addressDriverClient.#addressDriverContract = AddressDriver__factory.connect(
			dripsMetadata.CONTRACT_ADDRESS_DRIVER,
			signer
		);

		return addressDriverClient;
	}

	/**
	 * Returns the remaining number of tokens the `AddressDriver` smart contract is allowed to spend on behalf of the `AddressDriverClient`'s `signer` for the given ERC20 token.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @returns A `Promise` which resolves to the remaining number of tokens.
	 * @throws {DripsErrors.addressError} if the `tokenAddress` is not valid.
	 */
	public async getAllowance(tokenAddress: string): Promise<BigNumber> {
		validateAddress(tokenAddress);

		const signerAsErc20Contract = IERC20__factory.connect(tokenAddress, this.#signer);

		return signerAsErc20Contract.allowance(this.#signerAddress, this.#dripsMetadata.CONTRACT_ADDRESS_DRIVER);
	}

	/**
	 * Sets the maximum allowance value for the `AddressDriver` smart contract over the `AddressDriverClient`'s `signer` tokens for the given ERC20 token.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {DripsErrors.addressError} if the `tokenAddress` is not valid.
	 */
	public approve(tokenAddress: string): Promise<ContractTransaction> {
		validateAddress(tokenAddress);

		const signerAsErc20Contract = IERC20__factory.connect(tokenAddress, this.#signer);

		return signerAsErc20Contract.approve(this.#dripsMetadata.CONTRACT_ADDRESS_DRIVER, constants.MaxUint256);
	}

	/**
	 * Returns the `AddressDriverClient`'s `signer` user ID.
	 *
	 * This is the user ID to which the `AddressDriverClient` is linked and manages drips.
	 * @returns A `Promise` which resolves to the user ID.
	 */
	public async getUserId(): Promise<string> {
		const userId = await this.#addressDriverContract.calcUserId(this.#signerAddress);

		return userId.toString();
	}

	/**
	 * Returns the user ID for a given address.
	 * @param  {string} userAddress The user address.
	 * @returns A `Promise` which resolves to the user ID.
	 * @throws {DripsErrors.addressError} if the `userAddress` address is not valid.
	 */
	public async getUserIdByAddress(userAddress: string): Promise<string> {
		validateAddress(userAddress);

		const userId = await this.#addressDriverContract.calcUserId(userAddress);

		return userId.toString();
	}

	/**
	 * Collects the received and already split funds for the `AddressDriverClient`'s `signer` and transfers them from the smart contract to an address.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @param  {string} transferToAddress The address to send collected funds to.
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {DripsErrors.addressError} if the `tokenAddress` or the `transferToAddress` are not valid.
	 */
	public async collect(tokenAddress: string, transferToAddress: string): Promise<ContractTransaction> {
		validateAddress(tokenAddress);
		validateAddress(transferToAddress);

		return this.#addressDriverContract.collect(tokenAddress, transferToAddress);
	}

	/**
	 * Gives funds from the `AddressDriverClient`'s `signer` to the receiver.
	 * The receiver can collect them immediately.
	 * @param  {BigNumberish} receiverId The receiver user ID.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @param  {BigNumberish} amount The amount to give (in the smallest unit, e.g. Wei).
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {DripsErrors.argumentMissingError} if the `receiverId` is missing.
	 * @throws {DripsErrors.addressError} if the `tokenAddress` is not valid.
	 */
	public give(receiverId: BigNumberish, tokenAddress: string, amount: BigNumberish): Promise<ContractTransaction> {
		if (isNullOrUndefined(receiverId)) {
			throw DripsErrors.argumentMissingError(
				`Could not give: '${nameOf({ receiverId })}' is missing.`,
				nameOf({ receiverId })
			);
		}

		validateAddress(tokenAddress);

		return this.#addressDriverContract.give(receiverId, tokenAddress, amount);
	}

	/**
	 * Sets the `AddressDriverClient`'s `signer` splits configuration.
	 * @param  {SplitsReceiverStruct[]} receivers The `signer`'s new splits receivers.
	 * Each splits receiver will be getting `weight / TOTAL_SPLITS_WEIGHT` share of the funds.
	 *
	 * Pass an empty array if you want to clear all receivers from this configuration.
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {DripsErrors.argumentMissingError} if `receivers` are missing.
	 * @throws {DripsErrors.argumentError} if `receivers`' count exceeds the max allowed drips receivers.
	 * @throws {DripsErrors.splitsReceiverError} if any of the `receivers` is not valid.
	 */
	public setSplits(receivers: SplitsReceiverStruct[]): Promise<ContractTransaction> {
		validateSplitsReceivers(receivers);

		return this.#addressDriverContract.setSplits(this.#formatSplitReceivers(receivers));
	}

	/**
	 * Sets the `AddressDriverClient`'s `signer` drips configuration for the given token.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @param  {DripsReceiverStruct[]} currentReceivers The `signer`'s drips receivers that were set in the last drips configuration update.
	 *
	 * Pass an empty array if this is the first update.
	 * @param  {BigNumberish} balanceDelta The `signer`'s drips balance change to be applied:
	 * - Positive to add funds to the drips balance.
	 * - Negative to remove funds from the drips balance.
	 * - `0` to leave drips balance as is (default value).
	 * @param  {DripsReceiverStruct[]} newReceivers The `signer`'s new drips receivers.
	 * Duplicate receivers are not allowed and will only be processed once.
	 *
	 * Pass an empty array if you want to clear all receivers from this configuration.
	 *
	 * @param  {string} transferToAddress The address to send funds to in case of decreasing balance.
	 *
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {DripsErrors.argumentMissingError} if any of the required parameters is missing.
	 * @throws {DripsErrors.addressError} if the `tokenAddress` or the `transferToAddress` are not valid.
	 * @throws {DripsErrors.argumentError} if `currentReceivers`' or `newReceivers`' count exceeds the max allowed drips receivers.
	 * @throws {DripsErrors.dripsReceiverError} if any of the `currentReceivers` or the `newReceivers` are not valid.
	 */
	public setDrips(
		tokenAddress: string,
		currentReceivers: DripsReceiverStruct[],
		newReceivers: DripsReceiverStruct[],
		transferToAddress: string,
		balanceDelta: BigNumberish = 0
	): Promise<ContractTransaction> {
		validateAddress(tokenAddress);
		validateDripsReceivers(
			newReceivers.map((r) => ({ userId: r.userId, config: Utils.DripsReceiverConfiguration.fromUint256(r.config) }))
		);
		validateDripsReceivers(
			currentReceivers.map((r) => ({
				userId: r.userId,
				config: Utils.DripsReceiverConfiguration.fromUint256(r.config)
			}))
		);

		if (isNullOrUndefined(transferToAddress)) {
			throw DripsErrors.argumentMissingError(
				`Could not set drips: '${nameOf({ transferToAddress })}' is missing.`,
				nameOf({ transferToAddress })
			);
		}

		return this.#addressDriverContract.setDrips(
			tokenAddress,
			this.#formatDripsReceivers(currentReceivers),
			balanceDelta,
			this.#formatDripsReceivers(newReceivers),
			transferToAddress
		);
	}

	/**
	 * Receives drips from the currently running cycle from a single sender based on the given history.
	 * It doesn't receive drips from the previous, finished cycles.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @param  {BigNumberish} senderId The ID of the user sending drips to squeeze funds from.
	 * @param  {BigNumberish} historyHash The `sender`'s history hash which was valid right before they set up the sequence of configurations described by `dripsHistory`.
	 * @param  {BigNumberish} dripsHistory The sequence of the sender's drips configurations.
	 * It can start at an arbitrary past configuration, but must describe all the configurations
	 * which have been used since then including the current one, in the chronological order.
	 * Only drips described by `dripsHistory` will be squeezed.
	 * If `dripsHistory` entries have no receivers, they won't be squeezed.
	 * The next call to `squeezeDrips` will be able to squeeze only funds which
	 * have been dripped after the last timestamp squeezed in this call.
	 * This may cause some funds to be unreceivable until the current cycle ends.
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {DripsErrors.addressError} if the `tokenAddress` address is not valid.
	 * @throws {DripsErrors.argumentMissingError} if any of the required parameters is missing.
	 */
	public async squeezeDripsFromHistory(
		tokenAddress: string,
		senderId: BigNumberish,
		historyHash: BytesLike,
		dripsHistory: DripsHistoryStruct[]
	): Promise<ContractTransaction> {
		validateAddress(tokenAddress);

		if (isNullOrUndefined(senderId)) {
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

		return this.#addressDriverContract.squeezeDrips(tokenAddress, senderId, historyHash, dripsHistory);
	}

	/**
	 * Receives all drips from the currently running cycle from a single sender.
	 * It doesn't receive drips from the previous, finished cycles.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @param  {BigNumberish} senderId The ID of the user sending drips to squeeze funds from.
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {DripsErrors.addressError} if the `tokenAddress` address is not valid.
	 * @throws {DripsErrors.argumentMissingError} if the `senderId` is missing.
	 */
	public async squeezeDrips(tokenAddress: string, senderId: BigNumberish): Promise<ContractTransaction> {
		validateAddress(tokenAddress);

		if (isNullOrUndefined(senderId)) {
			throw DripsErrors.argumentMissingError(
				`Could not squeeze drips: '${nameOf({ senderId })}' is missing.`,
				nameOf({ senderId })
			);
		}

		// Get all `DripsSet` events (drips configurations) for the sender.
		const dripsSetEvents = (await this.#subgraph.getDripsSetEventsByUserId(senderId.toString()))
			// Sort by `blockTimestamp` DESC - the first ones will be the most recent ones.
			?.sort((a, b) => Number(b.blockTimestamp) - Number(a.blockTimestamp));

		const dripsToSqueeze: DripsSetEvent[] = [];
		const { currentCycleStartDate } = Utils.Cycle.getInfo(this.network.chainId);
		const userId = await this.getUserId(); // Squeeze funds for the "connected user".

		// Iterate over all events.
		if (dripsSetEvents?.length) {
			for (let i = 0; i < dripsSetEvents.length; i++) {
				const dripsConfiguration = dripsSetEvents[i];

				// Keep the drips configurations of the current cycle.
				const eventTimestamp = new Date(Number(dripsConfiguration.blockTimestamp));
				if (eventTimestamp >= currentCycleStartDate) {
					dripsToSqueeze.push(dripsConfiguration);
				}
				// Get the first event before the current cycle.
				else {
					dripsToSqueeze.push(dripsConfiguration);
					break;
				}
			}
		}

		// The last (oldest) event provides the hash prior to the DripsHistory (or 0, if there was only one event).
		const historyHash =
			dripsToSqueeze?.length > 1
				? dripsToSqueeze[dripsToSqueeze.length - 1].dripsHistoryHash
				: ethers.constants.HashZero;

		// Transform the events into `DripsHistory` objects.
		const dripsHistory: DripsHistoryStruct[] = dripsToSqueeze
			?.map((dripsSetEvent) => {
				// By default a configuration should not be squeezed.
				let shouldSqueeze = false;

				// Check the configurations for the given asset that have receivers, the others should not be squeezed.
				if (
					dripsSetEvent.assetId === Utils.Asset.getIdFromAddress(tokenAddress) &&
					dripsSetEvent.dripsReceiverSeenEvents?.length
				) {
					// Iterate over all event's `DripsReceiverSeen` events (receivers).
					for (let i = 0; i < dripsSetEvent.dripsReceiverSeenEvents.length; i++) {
						const receiver = dripsSetEvent.dripsReceiverSeenEvents[i];

						// Mark as squeezable only the events that drip to the "connected user".
						if (receiver.receiverUserId === userId) {
							shouldSqueeze = true;
							break; // Break, because drips receivers are unique.
						}
					}
				}

				const historyItem: DripsHistoryStruct = {
					dripsHash: shouldSqueeze ? ethers.constants.HashZero : dripsSetEvent.receiversHash, // If it's non-zero, `receivers` must be empty.
					receivers: shouldSqueeze // If it's non-empty, `dripsHash` must be 0.
						? dripsSetEvent.dripsReceiverSeenEvents.map((r) => ({
								userId: r.receiverUserId,
								config: r.config
						  }))
						: [],
					updateTime: dripsSetEvent.blockTimestamp,
					maxEnd: dripsSetEvent.maxEnd
				};

				return historyItem;
			})
			.reverse();

		return this.#addressDriverContract.squeezeDrips(tokenAddress, senderId, historyHash, dripsHistory);
	}

	// #region Private Methods

	#formatDripsReceivers(receivers: DripsReceiverStruct[]) {
		// Drips receivers must be sorted by user ID and config, deduplicated, and without amount per second <= 0.

		const uniqueReceivers = receivers.reduce((unique: DripsReceiverStruct[], o) => {
			if (!unique.some((obj: DripsReceiverStruct) => obj.userId === o.userId && toBN(obj.config).eq(toBN(o.config)))) {
				unique.push(o);
			}
			return unique;
		}, []);

		const sortedReceivers = uniqueReceivers
			// Sort by userId.
			.sort((a, b) =>
				toBN(a.userId).gt(toBN(b.userId))
					? 1
					: toBN(a.userId).lt(toBN(b.userId))
					? -1
					: // Sort by config.
					toBN(a.config).gt(toBN(b.config))
					? 1
					: toBN(a.config).lt(toBN(b.config))
					? -1
					: 0
			);
		return sortedReceivers;
	}

	#formatSplitReceivers(receivers: SplitsReceiverStruct[]): SplitsReceiverStruct[] {
		// Splits receivers must be sorted by user ID, deduplicated, and without weights <= 0.

		const uniqueReceivers = receivers.reduce((unique: SplitsReceiverStruct[], o) => {
			if (!unique.some((obj: SplitsReceiverStruct) => obj.userId === o.userId && obj.weight === o.weight)) {
				unique.push(o);
			}
			return unique;
		}, []);

		const sortedReceivers = uniqueReceivers.sort((a, b) =>
			// Sort by user ID.
			toBN(a.userId).gt(toBN(b.userId)) ? 1 : toBN(a.userId).lt(toBN(b.userId)) ? -1 : 0
		);

		return sortedReceivers;
	}

	// #endregion
}
