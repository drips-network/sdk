/* eslint-disable no-nested-ternary */

import type { Network } from '@ethersproject/networks';
import type { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import type { BigNumberish, ContractTransaction, BigNumber } from 'ethers';
import { constants } from 'ethers';
import type { DripsHistoryStruct, DripsReceiverStruct, SplitsReceiverStruct } from 'contracts/AddressDriver';
import type { ChainDripsMetadata } from 'src/common/types';
import DripsHubClient from '../DripsHub/DripsHubClient';
import Utils from '../utils';
import { validateAddress, nameOf, toBN, isNullOrUndefined } from '../common/internals';
import { DripsErrors } from '../common/DripsError';
import type { AddressDriver as AddressDriverContract } from '../../contracts';
import { IERC20__factory, AddressDriver__factory } from '../../contracts';
import { validateDripsReceivers, validateSplitsReceivers } from './addressDriverValidators';

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

	#chainDripsMetadata!: ChainDripsMetadata;
	/** Returns the `AddressDriverClient`'s `network` {@link ChainDripsMetadata}. */
	public get chainDripsMetadata() {
		return this.#chainDripsMetadata;
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
	 * @returns A Promise which resolves to the new `AddressDriverClient` instance.
	 * @throws {DripsErrors.argumentMissingError} if the `provider` is missing.
	 * @throws {DripsErrors.argumentError} if the `provider`'s singer is missing.
	 * @throws {DripsErrors.addressError} if the `provider`'s signer address is not valid.
	 * @throws {DripsErrors.unsupportedNetworkError} if the `provider` is connected to an unsupported chain.
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
		const chainDripsMetadata = Utils.Network.chainDripsMetadata[network.chainId];

		const addressDriverClient = new AddressDriverClient();

		addressDriverClient.#signer = signer;
		addressDriverClient.#network = network;
		addressDriverClient.#provider = provider;
		addressDriverClient.#chainDripsMetadata = chainDripsMetadata;
		addressDriverClient.#signerAddress = await signer.getAddress();
		addressDriverClient.#dripsHub = await DripsHubClient.create(provider);
		addressDriverClient.#addressDriverContract = AddressDriver__factory.connect(
			chainDripsMetadata.CONTRACT_ADDRESS_DRIVER,
			signer
		);

		return addressDriverClient;
	}

	public async getCycleInfo(): Promise<{
		cycleDurationSecs: bigint;
		currentCycleSecs: bigint;
		currentCycleStartDate: Date;
		nextCycleStartDate: Date;
	}> {
		return this.#dripsHub.getCycleInfo();
	}

	/**
	 * Returns the remaining number of tokens the `AddressApp` smart contract is allowed to spend on behalf of the `AddressDriverClient`'s `signer` for the specified ERC20 token.
	 * @param  {string} erc20TokenAddress The ERC20 token address.
	 * @returns A Promise which resolves to the remaining number of tokens.
	 * @throws {DripsErrors.addressError} if the `erc20TokenAddress` is not valid.
	 */
	public async getAllowance(erc20TokenAddress: string): Promise<BigNumber> {
		validateAddress(erc20TokenAddress);

		const signerAsErc20Contract = IERC20__factory.connect(erc20TokenAddress, this.#signer);

		return signerAsErc20Contract.allowance(this.#signerAddress, this.#chainDripsMetadata.CONTRACT_ADDRESS_DRIVER);
	}

	/**
	 * Sets the maximum allowance value for the `AddressApp` smart contract over the `AddressDriverClient`'s `signer` tokens for the specified ERC20 token.
	 * @param  {string} erc20TokenAddress The ERC20 token address.
	 * @returns A Promise which resolves to the contract transaction.
	 * @throws {DripsErrors.addressError} if the `erc20TokenAddress` is not valid.
	 */
	public approve(erc20TokenAddress: string): Promise<ContractTransaction> {
		validateAddress(erc20TokenAddress);

		const signerAsErc20Contract = IERC20__factory.connect(erc20TokenAddress, this.#signer);

		return signerAsErc20Contract.approve(this.#chainDripsMetadata.CONTRACT_ADDRESS_DRIVER, constants.MaxUint256);
	}

	/**
	 * Returns the `AddressDriverClient`'s `signer` user ID.
	 *
	 * This is the user ID to which the `AddressDriverClient` is linked and manages drips.
	 * @returns A Promise which resolves to the user ID.
	 */
	public async getUserId(): Promise<string> {
		const userId = await this.#addressDriverContract.calcUserId(this.#signerAddress);

		return userId.toString();
	}

	/**
	 * Returns the user ID for a specified address.
	 * @param  {string} userAddress The user address.
	 * @returns A Promise which resolves to the user ID.
	 * @throws {DripsErrors.addressError} if the `userAddress` address is not valid.
	 */
	public async getUserIdByAddress(userAddress: string): Promise<string> {
		validateAddress(userAddress);

		const userId = await this.#addressDriverContract.calcUserId(userAddress);

		return userId.toString();
	}

	/**
	 * Collects the received and already split funds for the `AddressDriverClient`'s `signer` and transfers them from the smart contract to an address.
	 * @param  {string} erc20TokenAddress The ERC20 token address.
	 * @param  {string} transferToAddress The address to send collected funds to.
	 * @returns A Promise which resolves to the contract transaction.
	 * @throws {DripsErrors.addressError} if the `erc20TokenAddress` or the `transferToAddress` are not valid.
	 */
	public async collect(erc20TokenAddress: string, transferToAddress: string): Promise<ContractTransaction> {
		validateAddress(erc20TokenAddress);
		validateAddress(transferToAddress);

		return this.#addressDriverContract.collect(erc20TokenAddress, transferToAddress);
	}

	/**
	 * Gives funds from the `AddressDriverClient`'s `signer` to the receiver.
	 * The receiver can collect them immediately.
	 * @param  {BigNumberish} receiverId The receiver user ID.
	 * @param  {string} erc20TokenAddress The ERC20 token address.
	 * @param  {BigNumberish} amount The amount to give (in the smallest unit, e.g. Wei).
	 * @returns A Promise which resolves to the contract transaction.
	 * @throws {DripsErrors.argumentMissingError} if the `receiverId` is missing.
	 * @throws {DripsErrors.addressError} if the `erc20TokenAddress` is not valid.
	 */
	public give(receiverId: BigNumberish, erc20TokenAddress: string, amount: BigNumberish): Promise<ContractTransaction> {
		if (isNullOrUndefined(receiverId)) {
			throw DripsErrors.argumentMissingError(
				`Could not give: '${nameOf({ receiverId })}' is missing.`,
				nameOf({ receiverId })
			);
		}

		validateAddress(erc20TokenAddress);

		return this.#addressDriverContract.give(receiverId, erc20TokenAddress, amount);
	}

	/**
	 * Sets the `AddressDriverClient`'s `signer` splits configuration.
	 * @param  {SplitsReceiverStruct[]} receivers The `signer`'s new splits receivers.
	 * Each splits receiver will be getting `weight / TOTAL_SPLITS_WEIGHT` share of the funds.
	 *
	 * Pass an empty array if you want to clear all receivers from this configuration.
	 * @returns A Promise which resolves to the contract transaction.
	 * @throws {DripsErrors.argumentMissingError} if `receivers` are missing.
	 * @throws {DripsErrors.argumentError} if `receivers`' count exceeds the max allowed drips receivers.
	 * @throws {DripsErrors.splitsReceiverError} if any of the `receivers` is not valid.
	 */
	public setSplits(receivers: SplitsReceiverStruct[]): Promise<ContractTransaction> {
		validateSplitsReceivers(receivers);

		return this.#addressDriverContract.setSplits(this.#formatSplitReceivers(receivers));
	}

	/**
	 * Sets the `AddressDriverClient`'s `signer` drips configuration for the specified token.
	 * @param  {string} erc20TokenAddress The ERC20 token address.
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
	 * @returns A Promise which resolves to the contract transaction.
	 * @throws {DripsErrors.argumentMissingError} if `currentReceivers` or `newReceivers` are missing.
	 * @throws {DripsErrors.addressError} if the `erc20TokenAddress` or the `transferToAddress` are not valid.
	 * @throws {DripsErrors.argumentError} if `currentReceivers`' or `newReceivers`' count exceeds the max allowed drips receivers.
	 * @throws {DripsErrors.dripsReceiverError} if any of the `currentReceivers` or the `newReceivers` are not valid.
	 */
	public setDrips(
		erc20TokenAddress: string,
		currentReceivers: DripsReceiverStruct[],
		newReceivers: DripsReceiverStruct[],
		transferToAddress: string,
		balanceDelta: BigNumberish = 0
	): Promise<ContractTransaction> {
		validateAddress(erc20TokenAddress);
		validateDripsReceivers(newReceivers);
		validateDripsReceivers(currentReceivers);

		return this.#addressDriverContract.setDrips(
			erc20TokenAddress,
			this.#formatDripsReceivers(currentReceivers),
			balanceDelta,
			this.#formatDripsReceivers(newReceivers),
			transferToAddress
		);
	}

	/**
	 * Receives drips from the currently running cycle from a single sender.
	 * It doesn't receive drips from the previous, finished cycles.
	 * @param  {string} erc20TokenAddress The ERC20 token address.
	 * @param  {BigNumberish} senderId The ID of the user sending drips to squeeze funds from.
	 * @param  {string} historyHash The sender's history hash which was valid right before
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
	 * @throws {@link DripsErrors.argumentMissingError} if the `senderId`, or the `historyHash`, or the `dripsHistory` is missing.
	 */
	public squeezeDrips(
		erc20TokenAddress: string,
		senderId: BigNumberish,
		historyHash: string,
		dripsHistory: DripsHistoryStruct[]
	): Promise<ContractTransaction> {
		validateAddress(erc20TokenAddress);

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
				`Could not squeeze drips: '${nameOf({ historyHash })}' is missing.`,
				nameOf({ historyHash })
			);
		}

		return this.#addressDriverContract.squeezeDrips(erc20TokenAddress, senderId, historyHash, dripsHistory);
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
