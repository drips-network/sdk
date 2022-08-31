/* eslint-disable no-nested-ternary */

import type { Network } from '@ethersproject/networks';
import type { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import type { BigNumberish, ContractTransaction } from 'ethers';
import { BigNumber, constants } from 'ethers';
import type { DripsReceiverStruct, SplitsReceiverStruct } from '../contracts/AddressApp';
import type { AddressApp as AddressAppContract } from '../contracts';
import { IERC20__factory, AddressApp__factory } from '../contracts';
import type { NetworkProperties } from './types';
import { validators, supportedChainIds, chainIdToNetworkPropertiesMap } from './common';
import { DripsErrors } from './DripsError';
import DripsHubClient from './DripsHubClient';

/**
 * A client for managing drips for a user identified by an Ethereum address.
 * @see {@link https://github.com/radicle-dev/drips-contracts/blob/master/src/AddressApp.sol AddressApp} smart contract.
 */
export default class AddressAppClient {
	#addressAppContract!: AddressAppContract;

	#signer!: JsonRpcSigner;
	/**
	 * Returns the `AddressAppClient`'s signer.
	 *
	 * This is the user to which the `AddressAppClient` is linked and manages drips.
	 *
	 * The `signer` is the `provider`'s signer.
	 *
	 */
	public get signer(): JsonRpcSigner {
		return this.#signer;
	}

	#dripsHub!: DripsHubClient;
	/**
	 * Returns a {@link DripsHubClient} connected to the same provider as the `AddressAppClient.`
	 */
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
	/**
	 * Returns the `AddressAppClient`'s `provider`.
	 */
	public get provider(): JsonRpcProvider {
		return this.#provider;
	}

	#networkProperties!: NetworkProperties;
	/**
	 * Returns metadata (name, contract addresses, etc.) for the `network` the `AddressAppClient` is connected to.
	 */
	public get networkProperties() {
		return this.#networkProperties;
	}

	private constructor() {}

	/**
	 * Creates a new immutable `AddressAppClient` instance.
	 * @param  {JsonRpcProvider} provider The provider must have a `signer` associated with it.
	 * **This signer will be the _sole_ "user" to which the new instance will be linked for managing their drips and cannot be changed after creation**.
	 *
	 * The provider can connect to the following supported networks:
	 * - 'goerli': chain ID 5
	 * @returns A Promise which resolves to the new `AddressAppClient` instance.
	 * @throws {@link DripsErrors.invalidArgument} if the `provider` is missing or is connected to an unsupported chain, or if the `provider`'s singer is missing.
	 * @throws {@link DripsErrors.invalidAddress} if the `provider`'s signer address is not valid.
	 */
	public static async create(provider: JsonRpcProvider): Promise<AddressAppClient> {
		if (!provider) {
			throw DripsErrors.invalidArgument(
				'Could not create a new AddressAppClient: the provider was missing but is required.',
				'AddressAppClient.create()'
			);
		}

		const signer = provider.getSigner();
		const signerAddress = await signer?.getAddress();
		if (!signerAddress) {
			throw DripsErrors.invalidArgument(
				"Could not create a new AddressAppClient: the provider's signer was missing but is required.",
				'AddressAppClient.create()'
			);
		}
		validators.validateAddress(signerAddress);

		const network = await provider.getNetwork();
		const networkProperties = chainIdToNetworkPropertiesMap[network?.chainId];
		if (!networkProperties?.CONTRACT_ADDRESS_APP) {
			throw DripsErrors.unsupportedNetwork(
				`Could not create a new AddressAppClient: the provider is connected to an unsupported chain (chain ID: ${
					network?.chainId
				}). Supported chain IDs are: ${supportedChainIds.toString()}.`,
				'AddressAppClient.create()'
			);
		}

		const addressApp = new AddressAppClient();
		addressApp.#signer = signer;
		addressApp.#network = network;
		addressApp.#provider = provider;
		addressApp.#networkProperties = networkProperties;
		addressApp.#dripsHub = await DripsHubClient.create(provider);
		addressApp.#addressAppContract = AddressApp__factory.connect(networkProperties.CONTRACT_ADDRESS_APP, signer);

		return addressApp;
	}

	/**
	 * Sets the maximum allowance value for the `AddressApp` smart contract over the `signer`'s tokens for the specified ERC20 token.
	 * @param  {string} erc20TokenAddress The ERC20 token address.
	 * @returns A Promise which resolves to the contract transaction.
	 * @throws {@link DripsErrors.invalidAddress} if the `erc20TokenAddress` address is not valid.
	 */
	public approve(erc20TokenAddress: string): Promise<ContractTransaction> {
		validators.validateAddress(erc20TokenAddress);

		const signerAsErc20Contract = IERC20__factory.connect(erc20TokenAddress, this.#signer);

		return signerAsErc20Contract.approve(this.#networkProperties.CONTRACT_ADDRESS_APP, constants.MaxUint256);
	}

	/**
	 * Returns the remaining number of tokens the `AddressApp` smart contract is allowed to spend on behalf of the `signer` for the specified ERC20 token.
	 * @param  {string} erc20TokenAddress The ERC20 token address.
	 * @returns A Promise which resolves to the remaining number of tokens.
	 * @throws {@link DripsErrors.invalidAddress} if the `erc20TokenAddress` address is not valid.
	 */
	public async getAllowance(erc20TokenAddress: string): Promise<BigNumber> {
		validators.validateAddress(erc20TokenAddress);

		const signerAsErc20Contract = IERC20__factory.connect(erc20TokenAddress, this.#signer);
		const signerAddress = await this.#signer.getAddress();

		return signerAsErc20Contract.allowance(signerAddress, this.#networkProperties.CONTRACT_ADDRESS_APP);
	}

	/**
	 * Returns the `signer`'s user ID.
	 *
	 * This is the user ID to which the `AddressAppClient` is linked and manages drips.
	 * @returns A Promise which resolves to the user ID.
	 */
	public async getUserId(): Promise<string> {
		const signerAddress = await this.#signer.getAddress();

		const userId = await this.#addressAppContract.calcUserId(signerAddress);

		return userId.toString();
	}

	/**
	 * Returns the user ID for the specified address.
	 * @param  {string} userAddress The user address.
	 * @returns A Promise which resolves to the user ID.
	 * @throws {@link DripsErrors.invalidAddress} if the `userAddress` address is not valid.
	 */
	public async getUserIdByAddress(userAddress: string): Promise<string> {
		validators.validateAddress(userAddress);

		const userId = await this.#addressAppContract.calcUserId(userAddress);

		return userId.toString();
	}

	/**
	 * Collects the received and already split funds for the `signer` and transfers them from the smart contract to that signer.
	 * @param  {string} erc20TokenAddress The ERC20 token address.
	 * @returns A Promise which resolves to the contract transaction.
	 * @throws {@link DripsErrors.invalidAddress} if the `erc20TokenAddress` address is not valid.
	 */
	public async collect(erc20TokenAddress: string): Promise<ContractTransaction> {
		validators.validateAddress(erc20TokenAddress);

		const signerAddress = await this.#signer.getAddress();

		return this.#addressAppContract.collect(signerAddress, erc20TokenAddress);
	}

	/**
	 * Collects the received and already split funds for the specified user address and transfers them from the smart contract to that user address.
	 * @param  {string} userAddress The user address.
	 * @param  {string} erc20TokenAddress The ERC20 token address.
	 * @returns A Promise which resolves to the contract transaction.
	 * @throws {@link DripsErrors.invalidAddress} if the `erc20TokenAddress` address is not valid.
	 */
	public collectForAddress(userAddress: string, erc20TokenAddress: string): Promise<ContractTransaction> {
		validators.validateAddress(userAddress);
		validators.validateAddress(erc20TokenAddress);

		return this.#addressAppContract.collect(userAddress, erc20TokenAddress);
	}

	/**
	 * Collects all received funds available for the `signer` and transfers them from the smart contract to that signer.
	 * @param  {string} erc20TokenAddress The ERC20 token address.
	 * @param  {SplitsReceiverStruct[]} currentReceivers The `signer`'s current splits receivers.
	 * @returns A Promise which resolves to the contract transaction.
	 * @throws {@link DripsErrors.invalidAddress} if the `erc20TokenAddress` address is not valid.
	 */
	public async collectAll(
		erc20TokenAddress: string,
		currentReceivers: SplitsReceiverStruct[]
	): Promise<ContractTransaction> {
		validators.validateAddress(erc20TokenAddress);

		const signerAddress = await this.#signer.getAddress();

		return this.#addressAppContract.collectAll(signerAddress, erc20TokenAddress, currentReceivers);
	}

	/**
	 * Collects all received funds available for the specified user address and transfers them from the smart contract to that user address.
	 * @param  {string} userAddress The user address.
	 * @param  {string} erc20TokenAddress The ERC20 token address.
	 * @param  {SplitsReceiverStruct[]} currentReceivers The user's current splits receivers.
	 * @returns A Promise which resolves to the contract transaction.
	 * @throws {@link DripsErrors.invalidAddress} if the `erc20TokenAddress` address is not valid.
	 */
	public collectAllForAddress(
		userAddress: string,
		erc20TokenAddress: string,
		currentReceivers: SplitsReceiverStruct[]
	): Promise<ContractTransaction> {
		validators.validateAddress(userAddress);
		validators.validateAddress(erc20TokenAddress);

		return this.#addressAppContract.collectAll(userAddress, erc20TokenAddress, currentReceivers);
	}

	/**
	 * Gives funds from the `signer` to the receiver.
	 * The receiver can collect them immediately.
	 * @param  {BigNumberish} receiverId The receiver user ID.
	 * @param  {string} erc20TokenAddress The ERC20 token address.
	 * @param  {BigNumberish} amount The amount to give.
	 * @returns A Promise which resolves to the contract transaction.
	 * @throws {@link DripsErrors.invalidAddress} if the `erc20TokenAddress` address is not valid.
	 */
	public give(receiverId: BigNumberish, erc20TokenAddress: string, amount: BigNumberish): Promise<ContractTransaction> {
		validators.validateAddress(erc20TokenAddress);

		return this.#addressAppContract.give(receiverId, erc20TokenAddress, amount);
	}

	/**
	 * Sets the `signer`'s splits configuration.
	 * @param  {SplitsReceiverStruct[]} receivers The new splits receivers.
	 * Each splits receiver will be getting `weight / TOTAL_SPLITS_WEIGHT` share of the funds.
	 *
	 * Pass an empty array if you want to clear all receivers from this configuration.
	 * @returns A Promise which resolves to the contract transaction.
	 * @throws {@link DripsErrors.invalidArgument} if any of the new receivers is not valid when updating.
	 */
	public setSplits(receivers: SplitsReceiverStruct[]): Promise<ContractTransaction> {
		if (!receivers.length) {
			return this.#clearSplits();
		}

		return this.#updateSplits(receivers);
	}

	/**
	 * Sets the `signer`'s drips configuration for the specified token.
	 * @param  {string} erc20TokenAddress The ERC20 token address.
	 * @param  {DripsReceiverStruct[]} currentReceivers The drips receivers that were set in the last drips configuration update.
	 *
	 * Pass an empty array if this is the first update.
	 * @param  {BigNumberish} balanceDelta The drips balance change to be applied:
	 * - Positive to add funds to the drips balance.
	 * - Negative to remove funds from the drips balance.
	 * - `0` to leave drips balance as is (default value).
	 * @param  {DripsReceiverStruct[]} newReceivers The new drips receivers.
	 * Duplicate receivers are not allowed and will only be processed once.
	 *
	 * Pass an empty array if you want to clear all receivers from this configuration.
	 * @returns A Promise which resolves to the contract transaction.
	 * @throws {@link DripsErrors.invalidArgument} if any of the new receivers is not valid when updating.
	 */
	public setDrips(
		erc20TokenAddress: string,
		currentReceivers: DripsReceiverStruct[],
		newReceivers: DripsReceiverStruct[],
		balanceDelta: BigNumberish = 0
	): Promise<ContractTransaction> {
		validators.validateAddress(erc20TokenAddress);

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
		// Drips receivers must be sorted by `userId` and `config`, deduplicated and without 0 amtPerSecs.

		validators.validateDripsReceivers(newReceivers);

		const uniqueReceivers = newReceivers.reduce((unique: DripsReceiverStruct[], o) => {
			if (
				!unique.some(
					(obj: DripsReceiverStruct) =>
						obj.userId === o.userId && BigNumber.from(obj.config).eq(BigNumber.from(o.config))
				)
			) {
				unique.push(o);
			}
			return unique;
		}, []);

		const sortedReceivers = uniqueReceivers
			// Sort by userId.
			.sort((a, b) =>
				BigNumber.from(a.userId).gt(BigNumber.from(b.userId))
					? 1
					: BigNumber.from(a.userId).lt(BigNumber.from(b.userId))
					? -1
					: // Sort by config.
					BigNumber.from(a.config).gt(BigNumber.from(b.config))
					? 1
					: BigNumber.from(a.config).lt(BigNumber.from(b.config))
					? -1
					: 0
			);

		return this.#addressAppContract.setDrips(erc20TokenAddress, currentReceivers, balanceDelta, sortedReceivers);
	}

	#clearSplits(): Promise<ContractTransaction> {
		return this.#addressAppContract.setSplits([]);
	}

	#updateSplits(receivers: SplitsReceiverStruct[]): Promise<ContractTransaction> {
		// Splits receivers must be sorted by `userId`, deduplicated and without 0 weights.

		validators.validateSplitsReceivers(receivers);

		const uniqueReceivers = receivers.reduce((unique: SplitsReceiverStruct[], o) => {
			if (!unique.some((obj: SplitsReceiverStruct) => obj.userId === o.userId && obj.weight === o.weight)) {
				unique.push(o);
			}
			return unique;
		}, []);

		const sortedReceivers = uniqueReceivers.sort((a, b) =>
			// Sort by user ID.
			BigNumber.from(a.userId).gt(BigNumber.from(b.userId))
				? 1
				: BigNumber.from(a.userId).lt(BigNumber.from(b.userId))
				? -1
				: 0
		);

		return this.#addressAppContract.setSplits(sortedReceivers);
	}

	// #endregion
}
