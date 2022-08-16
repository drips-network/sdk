/* eslint-disable no-nested-ternary */

import type { Network } from '@ethersproject/networks';
import type { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import type { BigNumberish, ContractTransaction } from 'ethers';
import { BigNumber, constants } from 'ethers';
import type { DripsReceiverStruct, SplitsReceiverStruct } from '../contracts/AddressApp';
import type { AddressApp as AddressAppContract } from '../contracts';
import { AddressApp__factory } from '../contracts';
import type { DripsReceiver, NetworkProperties } from './types';
import {
	guardAgainstInvalidSplitsReceiver,
	guardAgainstInvalidDripsReceiver,
	createErc20Contract,
	chainIdToNetworkPropertiesMap,
	guardAgainstInvalidAddress,
	supportedChainIds
} from './common';
import { DripsErrors } from './DripsError';
import DripsHubClient from './DripsHubClient';

/**
 * A client for interacting with the {@link https://github.com/radicle-dev/drips-contracts/blob/master/src/AddressApp.sol AddressApp} smart contract.
 */
export default class AddressAppClient {
	#addressAppContract!: AddressAppContract;

	#signer!: JsonRpcSigner;
	/**
	 * The client's signer.
	 *
	 * The signer is the "user" the client acts on behalf of and _is_ the `provider`'s signer.
	 */
	public get signer(): JsonRpcSigner {
		return this.#signer;
	}

	#dripsHub!: DripsHubClient;
	/**
	 * A {@link DripsHubClient} that is connected to the *same* `provider` as the client.
	 */
	public get dripsHub(): DripsHubClient {
		return this.#dripsHub;
	}

	#network!: Network;
	/**
	 * The network the client is connected to.
	 *
	 * The network _is_ the `provider`'s network.
	 */
	public get network() {
		return this.#network;
	}

	#provider!: JsonRpcProvider;
	/**
	 * The client's provider.
	 *
	 */
	public get provider(): JsonRpcProvider {
		return this.#provider;
	}

	#networkProperties!: NetworkProperties;
	/**
	 * Network metadata (network name, contract addresses, etc.).
	 */
	public get networkProperties() {
		return this.#networkProperties;
	}

	private constructor() {}

	/**
	 * Creates a new `AddressAppClient` instance.
	 * @param  {JsonRpcProvider} provider The provider.
	 *
	 * The provider needs to have a signer associated with it that will be used to sign transactions.
	 *
	 *  **This signer will be the "user" the new instance will act on behalf of**.
	 *
	 * The provider can connect to the following supported networks:
	 * - 'goerli': chain ID 5
	 * @returns A Promise which resolves to the new `AddressAppClient` instance.
	 * @throws {@link DripsErrors.invalidArgument} if the `provider` has a "falsy" value, or the provider is connected to an unsupported chain.
	 * @throws {@link DripsErrors.invalidAddress} if the `provider`'s signer address is not valid.
	 */
	public static async create(provider: JsonRpcProvider): Promise<AddressAppClient> {
		// Validate provider.
		if (!provider) {
			throw DripsErrors.invalidArgument(
				'Could not create a new AddressAppClient: the provider was missing but is required.',
				'create()'
			);
		}

		// Validate signer.
		const signer = provider.getSigner();
		const signerAddress = await signer?.getAddress();
		if (!signerAddress) {
			throw DripsErrors.invalidArgument(
				"Could not create a new AddressAppClient: the provider's signer was missing but is required.",
				'create()'
			);
		}
		guardAgainstInvalidAddress(signerAddress);

		// Validate network.
		const network = await provider.getNetwork();
		const networkProperties = chainIdToNetworkPropertiesMap[network?.chainId];
		if (!networkProperties?.CONTRACT_ADDRESS_APP) {
			throw DripsErrors.unsupportedNetwork(
				`Could not create a new AddressAppClient: the provider is connected to an unsupported chain (chain ID: ${
					network?.chainId
				}). Supported chain IDs are: ${supportedChainIds.toString()}.`,
				'create()'
			);
		}

		// Safely create a new client instance.
		const addressApp = new AddressAppClient();
		addressApp.#signer = signer;
		addressApp.#network = network;
		addressApp.#provider = provider;
		addressApp.#networkProperties = networkProperties;
		addressApp.#dripsHub = await DripsHubClient.create(provider);
		addressApp.#addressAppContract = AddressApp__factory.connect(networkProperties.CONTRACT_ADDRESS_APP, signer);

		return addressApp;
	}

	public toJsonString(): string {
		// https://stackoverflow.com/questions/40080473/using-json-stringify-in-conjunction-with-typescript-getter-setter

		return JSON.stringify({
			signer: JSON.stringify(this.#signer),
			network: JSON.stringify(this.#network),
			provider: JSON.stringify(this.#provider),
			networkProperties: JSON.stringify(this.#networkProperties)
		});
	}

	/**
	 * Sets to the maximum value, for the specified ERC20 token, the allowance of the `AddressApp` smart contract over the client's signer tokens.
	 * @param  {string} erc20TokenAddress The ERC20 token address to use.
	 * @returns A Promise which resolves to the contract transaction.
	 * @throws {@link DripsErrors.invalidAddress} if `erc20TokenAddress` address is not valid.
	 */
	public approve(erc20TokenAddress: string): Promise<ContractTransaction> {
		guardAgainstInvalidAddress(erc20TokenAddress);

		const signerAsErc20Contract = createErc20Contract(erc20TokenAddress, this.#signer);

		return signerAsErc20Contract.approve(this.#networkProperties.CONTRACT_ADDRESS_APP, constants.MaxUint256);
	}

	/**
	 * Returns the remaining number of the specified ERC20 tokens that the `AddressApp` smart contract will be allowed to spend on behalf of the client's signer.
	 * @param  {string} erc20TokenAddress The ERC20 token address to use.
	 * @returns A Promise which resolves to the remaining number of tokens the smart contract is allowed to spend on behalf of the signer.
	 * @throws {@link DripsErrors.invalidAddress} if `erc20TokenAddress` address is not valid.
	 */
	public async getAllowance(erc20TokenAddress: string): Promise<BigNumber> {
		guardAgainstInvalidAddress(erc20TokenAddress);

		const signerAsErc20Contract = createErc20Contract(erc20TokenAddress, this.#signer);
		const signerAddress = await this.#signer.getAddress();

		return signerAsErc20Contract.allowance(signerAddress, this.#networkProperties.CONTRACT_ADDRESS_APP);
	}

	/**
	 * Returns the client's signer user ID.
	 * @returns A Promise which resolves to the user ID.
	 */
	public async getUserId(): Promise<string> {
		const signerAddress = await this.#signer.getAddress();

		const userId = await this.#addressAppContract.calcUserId(signerAddress);

		// Return the user ID in base-10, as stored on the contract.
		return userId.toString();
	}

	/**
	 * Returns the user ID for the specified address.
	 * @param  {string} userAddress The user address.
	 * @returns A Promise which resolves to the user ID.
	 * @throws {@link DripsErrors.invalidAddress} if `userAddress` address is not valid.
	 */
	public async getUserIdForAddress(userAddress: string): Promise<string> {
		guardAgainstInvalidAddress(userAddress);

		const userId = await this.#addressAppContract.calcUserId(userAddress);

		// Return the user ID in base-10, as stored on the contract.
		return userId.toString();
	}

	/**
	 * Collects the received and already split funds for the client's signer, and transfers them out of the smart contract to that signer.
	 * @param  {string} erc20TokenAddress The ERC20 token address to use.
	 * @returns A Promise which resolves to the contract transaction.
	 * @throws {@link DripsErrors.invalidAddress} if `erc20TokenAddress` address is not valid.
	 */
	public async collect(erc20TokenAddress: string): Promise<ContractTransaction> {
		guardAgainstInvalidAddress(erc20TokenAddress);

		const signerAddress = await this.#signer.getAddress();

		return this.#addressAppContract.collect(signerAddress, erc20TokenAddress);
	}

	/**
	 * Collects the received and already split funds for the specified user, and transfers them out of the smart contract to that user.
	 * @param  {string} userAddress The user address.
	 * @param  {string} erc20TokenAddress The ERC20 token address to use.
	 * @returns A Promise which resolves to the contract transaction.
	 * @throws {@link DripsErrors.invalidAddress} if `erc20TokenAddress` address is not valid.
	 */
	public collectForAddress(userAddress: string, erc20TokenAddress: string): Promise<ContractTransaction> {
		guardAgainstInvalidAddress(userAddress, erc20TokenAddress);

		return this.#addressAppContract.collect(userAddress, erc20TokenAddress);
	}

	/**
	 * Collects all received funds available for the client't signer  and transfers them out of the smart contract to that signer.
	 * @param  {string} erc20TokenAddress The ERC20 token address to use.
	 * @param  {SplitsReceiverStruct[]} currentReceivers The signer's current splits receivers.
	 * @returns A Promise which resolves to the contract transaction.
	 * @throws {@link DripsErrors.invalidAddress} if `erc20TokenAddress` address is not valid.
	 */
	public async collectAll(
		erc20TokenAddress: string,
		currentReceivers: SplitsReceiverStruct[]
	): Promise<ContractTransaction> {
		guardAgainstInvalidAddress(erc20TokenAddress);

		const signerAddress = await this.#signer.getAddress();

		return this.#addressAppContract.collectAll(signerAddress, erc20TokenAddress, currentReceivers);
	}

	/**
	 * Collects all received funds available for the specified user and transfers them out of the smart contract to that user.
	 * @param  {string} userAddress The user address.
	 * @param  {string} erc20TokenAddress The ERC20 token address to use.
	 * @param  {SplitsReceiverStruct[]} currentReceivers The user's current splits receivers.
	 * @returns A Promise which resolves to the contract transaction.
	 * @throws {@link DripsErrors.invalidAddress} if `erc20TokenAddress` address is not valid.
	 */
	public collectAllForAddress(
		userAddress: string,
		erc20TokenAddress: string,
		currentReceivers: SplitsReceiverStruct[]
	): Promise<ContractTransaction> {
		guardAgainstInvalidAddress(userAddress, erc20TokenAddress);

		return this.#addressAppContract.collectAll(userAddress, erc20TokenAddress, currentReceivers);
	}

	/**
	 * Gives funds from the client's signer to the receiver.
	 * The receiver can collect them immediately.
	 * @param  {BigNumberish} receiverId The receiver user ID.
	 * @param  {string} erc20TokenAddress The ERC20 token address to use.
	 * @param  {BigNumberish} amount The amount to give.
	 * @returns A Promise which resolves to the contract transaction.
	 * @throws {@link DripsErrors.invalidAddress} if `erc20TokenAddress` address is not valid.
	 */
	public give(receiverId: BigNumberish, erc20TokenAddress: string, amount: BigNumberish): Promise<ContractTransaction> {
		guardAgainstInvalidAddress(erc20TokenAddress);

		return this.#addressAppContract.give(receiverId, erc20TokenAddress, amount);
	}

	/**
	 * Sets the client's signer splits configuration.
	 * @param  {SplitsReceiverStruct[]} receivers The new signer's splits receivers.
	 *
	 * Each splits receiver will be getting `weight / 1.000.000` share of the funds collected by that signer.
	 * @returns A Promise which resolves to the contract transaction.
	 * @throws {@link DripsErrors.invalidSplitsReceiver} if any of the new receivers is not valid.
	 */
	public setSplits(receivers: SplitsReceiverStruct[]): Promise<ContractTransaction> {
		guardAgainstInvalidSplitsReceiver(...receivers);

		// Splits receivers must be sorted by user ID, deduplicated and without 0 weights.
		// There is no need to check for 0 weights. At this point, a validation has already been performed.

		const uniqueReceivers = receivers.reduce((unique: SplitsReceiverStruct[], o) => {
			if (!unique.some((obj: SplitsReceiverStruct) => obj.userId === o.userId && obj.weight === o.weight)) {
				unique.push(o);
			}
			return unique;
		}, []);

		const formattedReceivers = uniqueReceivers.sort((a, b) =>
			// Sort by user ID.
			BigNumber.from(a.userId).gt(BigNumber.from(b.userId))
				? 1
				: BigNumber.from(a.userId).lt(BigNumber.from(b.userId))
				? -1
				: 0
		);

		return this.#addressAppContract.setSplits(formattedReceivers);
	}

	/**
	 * Sets the client's signer drips configuration.
	 * @param  {string} erc20TokenAddress The ERC20 token address to use.
	 * @param  {DripsReceiverStruct[]} currentReceivers The signer's drips receivers that were set in the last drips configuration update. If this is the first update, pass an empty array. The default value is an empty array.
	 * @param  {BigNumberish} balanceDelta The drips balance change to be applied. Positive to add funds to the drips balance, negative to remove them. The default value is 0.
	 * @param  {DripsReceiver[]} newReceivers The new signer's drips receivers.
	 *
	 * Any "falsy" `config.start` or `config.duration` property, for any receiver, will be set to 0. This means "use the timestamp when drips are configured" and " drip until the balance runs out", respectively. See also {@link DripsReceiver}.
	 *
	 * Duplicate receivers are not allowed. Any duplicate entry will be removed. The default value is an empty array.
	 * @returns A Promise which resolves to the contract transaction.
	 * @throws {@link DripsErrors.invalidDripsReceiver} if any of the new receivers is not valid.
	 */
	public setDrips(
		erc20TokenAddress: string,
		currentReceivers: DripsReceiverStruct[],
		balanceDelta: BigNumberish,
		newReceivers: DripsReceiver[]
	): Promise<ContractTransaction> {
		guardAgainstInvalidAddress(erc20TokenAddress);
		guardAgainstInvalidDripsReceiver(...newReceivers);

		return this.#addressAppContract.setDrips(
			erc20TokenAddress,
			currentReceivers || [],
			balanceDelta || 0,
			this._getFormattedReceivers(newReceivers) || []
		);
	}

	private _getFormattedReceivers(newReceivers: DripsReceiver[]): DripsReceiverStruct[] {
		// Drips receivers must be sorted by user ID and config, deduplicated and without 0 amtPerSecs.
		// There is no need to check for 0 amtPerSecs. At this point, a validation has already been performed.

		const uniqueReceivers = newReceivers.reduce((unique: DripsReceiver[], o) => {
			if (
				!unique.some(
					(obj: DripsReceiver) =>
						obj.userId === o.userId &&
						obj.config.amountPerSec === o.config.amountPerSec &&
						obj.config.duration === o.config.duration &&
						obj.config.start === o.config.start
				)
			) {
				unique.push(o);
			}
			return unique;
		}, []);

		const receivers = uniqueReceivers
			// Encode config to a uint192.
			.map((r) => ({
				userId: r.userId,
				config: r.config.asUint256
			}))
			// Sort by user ID.
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

		return receivers;
	}
}
