/* eslint-disable no-nested-ternary */

import type { Network } from '@ethersproject/networks';
import type { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import type { BigNumberish, ContractTransaction, BigNumber } from 'ethers';
import { constants } from 'ethers';
import type { DripsReceiverStruct, SplitsReceiverStruct } from 'contracts/AddressAppContract';
import Utils from '../utils';
import type { ChainDripsMetadata, SupportedChain } from './types';
import { validateAddress, nameOf, toBN } from '../common/internals';
import { DripsErrors } from '../common/DripsError';
import type { AddressAppContract } from '../../contracts';
import { IERC20Contract__factory, AddressAppContract__factory } from '../../contracts';
import DripsHubClient from '../DripsHub/DripsHubClient';
import { validateDripsReceivers, validateSplitsReceivers } from './addressAppValidators';

/**
 * A client for managing drips for a user identified by an Ethereum address.
 * @see {@link https://github.com/radicle-dev/drips-contracts/blob/master/src/AddressApp.sol AddressApp} smart contract.
 */
export default class AddressAppClient {
	#addressAppContract!: AddressAppContract;

	#signer!: JsonRpcSigner;
	/**
	 * Returns the `AddressAppClient`'s `signer`.
	 *
	 * This is the user to which the `AddressAppClient` is linked and manages drips.
	 *
	 * The `signer` is the `provider`'s signer.
	 *
	 */
	public get signer(): JsonRpcSigner {
		return this.#signer;
	}

	#signerAddress!: string;
	/** Returns the `AddressAppClient`'s `signer` address. */
	public get signerAddress(): string {
		return this.#signerAddress;
	}

	#dripsHub!: DripsHubClient;
	/** Returns a {@link DripsHubClient} connected to the same provider as the `AddressAppClient.` */
	public get dripsHub(): DripsHubClient {
		return this.#dripsHub;
	}

	#network!: Network;
	/**
	 * Returns the network the `AddressAppClient` is connected to.
	 *
	 * The `network` is the `provider`'s network.
	 */
	public get network() {
		return this.#network;
	}

	#provider!: JsonRpcProvider;
	/** Returns the `AddressAppClient`'s `provider`. */
	public get provider(): JsonRpcProvider {
		return this.#provider;
	}

	#chainDripsMetadata!: ChainDripsMetadata;
	/** Returns the `AddressAppClient`'s `network` {@link ChainDripsMetadata}. */
	public get chainDripsMetadata() {
		return this.#chainDripsMetadata;
	}

	private constructor() {}

	// TODO: Update supported chains id docs.
	/**
	 * Creates a new immutable `AddressAppClient` instance.
	 * @param  {JsonRpcProvider} provider The `provider` must have a `signer` associated with it.
	 * **This signer will be the _sole_ "user" to which the new `AddressAppClient` instance will be linked for managing their drips and cannot be changed after creation**.
	 *
	 * The `provider` can connect to the following supported networks:
	 * - 'goerli': chain ID 5
	 * @returns A Promise which resolves to the new `AddressAppClient` instance.
	 * @throws {DripsErrors.argumentMissingError} if the `provider` is missing.
	 * @throws {DripsErrors.argumentError} if the `provider`'s singer is missing.
	 * @throws {DripsErrors.addressError} if the `provider`'s signer address is not valid.
	 * @throws {DripsErrors.unsupportedNetworkError} if the `provider` is connected to an unsupported chain.
	 */
	public static async create(provider: JsonRpcProvider): Promise<AddressAppClient> {
		if (!provider) {
			throw DripsErrors.argumentMissingError(
				"Could not create a new 'AddressAppClient': the provider is missing.",
				nameOf({ provider })
			);
		}

		const signer = provider.getSigner();
		const signerAddress = await signer?.getAddress();
		if (!signerAddress) {
			throw DripsErrors.argumentError(
				"Could not create a new 'AddressAppClient': the provider's signer address is missing.",
				nameOf({ provider }),
				provider
			);
		}
		validateAddress(signerAddress);

		const network = await provider.getNetwork();
		const chainDripsMetadata = Utils.Network.chainDripsMetadata[network?.chainId as SupportedChain];
		if (!chainDripsMetadata?.CONTRACT_ADDRESS_APP) {
			throw DripsErrors.unsupportedNetworkError(
				`Could not create a new 'AddressAppClient': the provider is connected to an unsupported network (name: '${
					network?.name
				}', chain ID: ${network?.chainId}). Supported chains are: ${Utils.Network.SUPPORTED_CHAINS.toString()}.`,
				network?.chainId
			);
		}

		const addressApp = new AddressAppClient();

		addressApp.#signer = signer;
		addressApp.#network = network;
		addressApp.#provider = provider;
		addressApp.#chainDripsMetadata = chainDripsMetadata;
		addressApp.#signerAddress = await signer.getAddress();
		addressApp.#dripsHub = await DripsHubClient.create(provider);
		addressApp.#addressAppContract = AddressAppContract__factory.connect(
			chainDripsMetadata.CONTRACT_ADDRESS_APP,
			signer
		);

		return addressApp;
	}

	/**
	 * Returns the remaining number of tokens the `AddressApp` smart contract is allowed to spend on behalf of the `AddressAppClient`'s `signer` for the specified ERC20 token.
	 * @param  {string} erc20TokenAddress The ERC20 token address.
	 * @returns A Promise which resolves to the remaining number of tokens.
	 * @throws {DripsErrors.addressError} if the `erc20TokenAddress` is not valid.
	 */
	public async getAllowance(erc20TokenAddress: string): Promise<BigNumber> {
		validateAddress(erc20TokenAddress);

		const signerAsErc20Contract = IERC20Contract__factory.connect(erc20TokenAddress, this.#signer);

		return signerAsErc20Contract.allowance(this.#signerAddress, this.#chainDripsMetadata.CONTRACT_ADDRESS_APP);
	}

	/**
	 * Sets the maximum allowance value for the `AddressApp` smart contract over the `AddressAppClient`'s `signer` tokens for the specified ERC20 token.
	 * @param  {string} erc20TokenAddress The ERC20 token address.
	 * @returns A Promise which resolves to the contract transaction.
	 * @throws {DripsErrors.addressError} if the `erc20TokenAddress` is not valid.
	 */
	public approve(erc20TokenAddress: string): Promise<ContractTransaction> {
		validateAddress(erc20TokenAddress);

		const signerAsErc20Contract = IERC20Contract__factory.connect(erc20TokenAddress, this.#signer);

		return signerAsErc20Contract.approve(this.#chainDripsMetadata.CONTRACT_ADDRESS_APP, constants.MaxUint256);
	}

	/**
	 * Returns the `AddressAppClient`'s `signer` user ID.
	 *
	 * This is the user ID to which the `AddressAppClient` is linked and manages drips.
	 * @returns A Promise which resolves to the user ID.
	 */
	public async getUserId(): Promise<string> {
		const userId = await this.#addressAppContract.calcUserId(this.#signerAddress);

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

		const userId = await this.#addressAppContract.calcUserId(userAddress);

		return userId.toString();
	}

	/**
	 * Collects the received and already split funds for the `AddressAppClient`'s `signer` and transfers them from the smart contract to that signer.
	 * @param  {string} erc20TokenAddress The ERC20 token address.
	 * @returns A Promise which resolves to the contract transaction.
	 * @throws {DripsErrors.addressError} if the `erc20TokenAddress` is not valid.
	 */
	public async collect(erc20TokenAddress: string): Promise<ContractTransaction> {
		validateAddress(erc20TokenAddress);

		return this.#addressAppContract.collect(this.#signerAddress, erc20TokenAddress);
	}

	/**
	 * Collects the received and already split funds for a user address and transfers them from the smart contract to that address.
	 * @param  {string} userAddress The user address.
	 * @param  {string} erc20TokenAddress The ERC20 token address.
	 * @returns A Promise which resolves to the contract transaction.
	 * @throws {DripsErrors.addressError} if the `userAddress` or the `erc20TokenAddress` is not valid.
	 */
	public collectForAddress(userAddress: string, erc20TokenAddress: string): Promise<ContractTransaction> {
		validateAddress(userAddress);
		validateAddress(erc20TokenAddress);

		return this.#addressAppContract.collect(userAddress, erc20TokenAddress);
	}

	/**
	 * Collects all received funds available for the `AddressAppClient`'s `signer` and transfers them from the smart contract to that signer.
	 * @param  {string} erc20TokenAddress The ERC20 token address.
	 * @param  {SplitsReceiverStruct[]} currentReceivers The `signer`'s current splits receivers.
	 * @returns A Promise which resolves to the contract transaction.
	 * @throws {DripsErrors.addressError} if the `erc20TokenAddress` is not valid.
	 * @throws {DripsErrors.argumentMissingError} if `currentReceivers` are missing.
	 * @throws {DripsErrors.argumentError} if `currentReceivers`' count exceeds the max allowed drips receivers.
	 * @throws {DripsErrors.splitsReceiverError} if any of the `currentReceivers` is not valid.
	 */
	public async collectAll(
		erc20TokenAddress: string,
		currentReceivers: SplitsReceiverStruct[]
	): Promise<ContractTransaction> {
		validateAddress(erc20TokenAddress);
		validateSplitsReceivers(currentReceivers);

		return this.#addressAppContract.collectAll(this.#signerAddress, erc20TokenAddress, currentReceivers);
	}

	/**
	 * Collects all received funds available for a user address and transfers them from the smart contract to that address.
	 * @param  {string} userAddress The user address.
	 * @param  {string} erc20TokenAddress The ERC20 token address.
	 * @param  {SplitsReceiverStruct[]} currentReceivers The user's current splits receivers.
	 * @returns A Promise which resolves to the contract transaction.
	 * @throws {DripsErrors.addressError} if the `userAddress` or the `erc20TokenAddress` is not valid.
	 * @throws {DripsErrors.argumentMissingError} if `currentReceivers` are missing.
	 * @throws {DripsErrors.argumentError} if `currentReceivers`' count exceeds the max allowed drips receivers.
	 * @throws {DripsErrors.splitsReceiverError} if any of the `currentReceivers` is not valid.
	 */
	public collectAllForAddress(
		userAddress: string,
		erc20TokenAddress: string,
		currentReceivers: SplitsReceiverStruct[]
	): Promise<ContractTransaction> {
		validateAddress(userAddress);
		validateAddress(erc20TokenAddress);
		validateSplitsReceivers(currentReceivers);

		return this.#addressAppContract.collectAll(userAddress, erc20TokenAddress, currentReceivers);
	}

	/**
	 * Gives funds from the `AddressAppClient`'s `signer` to the receiver.
	 * The receiver can collect them immediately.
	 * @param  {BigNumberish} receiverId The receiver user ID.
	 * @param  {string} erc20TokenAddress The ERC20 token address.
	 * @param  {BigNumberish} amount The amount to give.
	 * @returns A Promise which resolves to the contract transaction.
	 * @throws {DripsErrors.argumentMissingError} if the `receiverId` is missing.
	 * @throws {DripsErrors.addressError} if the `erc20TokenAddress` is not valid.
	 */
	public give(receiverId: BigNumberish, erc20TokenAddress: string, amount: BigNumberish): Promise<ContractTransaction> {
		if (!receiverId) {
			throw DripsErrors.argumentMissingError(
				`Could not give: '${nameOf({ receiverId })}' is missing.`,
				nameOf({ receiverId })
			);
		}

		validateAddress(erc20TokenAddress);

		return this.#addressAppContract.give(receiverId, erc20TokenAddress, amount);
	}

	/**
	 * Sets the `AddressAppClient`'s `signer` splits configuration.
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

		if (!receivers.length) {
			return this.#clearSplits();
		}

		return this.#updateSplits(receivers);
	}

	/**
	 * Sets the `AddressAppClient`'s `signer` drips configuration for the specified token.
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
	 * @returns A Promise which resolves to the contract transaction.
	 * @throws {DripsErrors.argumentMissingError} if `currentReceivers` or `newReceivers` are missing.
	 * @throws {DripsErrors.addressError} if the `erc20TokenAddress` is not valid.
	 * @throws {DripsErrors.argumentError} if `currentReceivers`' or `newReceivers`' count exceeds the max allowed drips receivers.
	 * @throws {DripsErrors.dripsReceiverError} if any of the `currentReceivers` or the `newReceivers` are not valid.
	 */
	public setDrips(
		erc20TokenAddress: string,
		currentReceivers: DripsReceiverStruct[],
		newReceivers: DripsReceiverStruct[],
		balanceDelta: BigNumberish = 0
	): Promise<ContractTransaction> {
		if (!newReceivers) {
			throw DripsErrors.argumentMissingError('Drips (new) receivers are missing.', nameOf({ newReceivers }));
		}
		if (!currentReceivers) {
			throw DripsErrors.argumentMissingError('Drips (current) receivers are missing.', nameOf({ currentReceivers }));
		}

		validateAddress(erc20TokenAddress);
		validateDripsReceivers(newReceivers);

		if (!newReceivers.length) {
			return this.#clearDrips(erc20TokenAddress, currentReceivers, balanceDelta);
		}

		return this.#updateDrips(erc20TokenAddress, currentReceivers, balanceDelta, newReceivers);
	}

	// #region Private Methods

	#clearDrips(
		erc20TokenAddress: string,
		currentReceivers: DripsReceiverStruct[],
		balanceDelta: BigNumberish
	): Promise<ContractTransaction> {
		return this.#addressAppContract.setDrips(erc20TokenAddress, currentReceivers, balanceDelta, []);
	}

	#updateDrips(
		erc20TokenAddress: string,
		currentReceivers: DripsReceiverStruct[],
		balanceDelta: BigNumberish,
		newReceivers: DripsReceiverStruct[]
	): Promise<ContractTransaction> {
		// Drips receivers must be sorted by user ID and config, deduplicated, and without amount per second <= 0.

		const uniqueReceivers = newReceivers.reduce((unique: DripsReceiverStruct[], o) => {
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

		return this.#addressAppContract.setDrips(erc20TokenAddress, currentReceivers, balanceDelta, sortedReceivers);
	}

	#clearSplits(): Promise<ContractTransaction> {
		return this.#addressAppContract.setSplits([]);
	}

	#updateSplits(receivers: SplitsReceiverStruct[]): Promise<ContractTransaction> {
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

		return this.#addressAppContract.setSplits(sortedReceivers);
	}

	// #endregion
}
