import type { Network } from '@ethersproject/networks';
import type { Provider } from '@ethersproject/providers';
import type { BigNumber, BigNumberish } from 'ethers';
import type { DripsReceiverStruct, SplitsReceiverStruct } from '../contracts/DripsHubLogic';
import type { DripsHubLogic as DripsHubContract } from '../contracts';
import { DripsHubLogic__factory } from '../contracts';
import type { NetworkProperties } from './types';
import { chainIdToNetworkPropertiesMap, guardAgainstInvalidAddress, supportedChainIds } from './common';
import { DripsErrors } from './DripsError';

/**
 * A readonly client for interacting with the {@link https://github.com/radicle-dev/drips-contracts/blob/master/src/DripsHub.sol DripsHub} smart contract.
 */
export default class DripsHubClient {
	#dripsHubContract!: DripsHubContract;

	#network!: Network;
	/**
	 * The network the client is connected to.
	 *
	 * The network _is_ the `provider`'s network.
	 */
	public get network() {
		return this.#network;
	}

	#provider!: Provider;
	/**
	 * The client's provider.
	 *
	 */
	public get provider() {
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
	 * Creates a new `DripsHubClient` instance.
	 * @param  {JsonRpcProvider} provider The provider.
	 *
	 * The provider can connect to the following supported networks:
	 * - 'mainnet': chain ID 1
	 * - 'rinkeby': chain ID 4
	 * - 'goerli': chain ID 5
	 * - 'matic': chain ID 137
	 * - 'mumbai': chain ID 80001
	 * @returns A Promise which resolves to the new `DripsHubClient` instance.
	 * @throws {@link DripsErrors.invalidArgument} if the `provider` has a "falsy" value, or the provider is connected to an unsupported chain.
	 */
	public static async create(provider: Provider): Promise<DripsHubClient> {
		// Validate provider.
		if (!provider) {
			throw DripsErrors.invalidArgument(
				'Could not create a new DripsHubClient: the provider was missing but is required.',
				'create()'
			);
		}

		// Validate network.
		const network = await provider.getNetwork();
		const networkProperties = chainIdToNetworkPropertiesMap[network.chainId];
		if (!networkProperties?.CONTRACT_DRIPS_HUB) {
			throw DripsErrors.unsupportedNetwork(
				`Could not create a new DripsHubClient: the provider is connected to an unsupported chain (chain ID: ${
					network.chainId
				})'. Supported chain IDs are: '${supportedChainIds.toString()}'.`,
				'create()'
			);
		}

		// Safely create a new client instance.
		const dripsHub = new DripsHubClient();
		dripsHub.#network = network;
		dripsHub.#provider = provider;
		dripsHub.#networkProperties = networkProperties;
		dripsHub.#dripsHubContract = DripsHubLogic__factory.connect(networkProperties.CONTRACT_DRIPS_HUB, provider);

		return dripsHub;
	}

	public toJsonString(): string {
		// https://stackoverflow.com/questions/40080473/using-json-stringify-in-conjunction-with-typescript-getter-setter

		const obj = {
			network: this.#network,
			provider: this.#provider,
			networkProperties: this.#networkProperties
		};

		return JSON.stringify(obj);
	}

	/**
	 * Returns the amount of received funds that are available for collection for a user.
	 * @param  {BigNumberish} userId The user ID.
	 * @param  {string} erc20TokenAddress The ERC20 token address to use.
	 * @param  {SplitsReceiverStruct[]} currentReceivers The users's current splits receivers.
	 * @returns A Promise which resolves to an object with the following properties:
	 * - `collectedAmt` - The collected amount.
	 * - `splitAmt` - The amount split to the user's splits receivers.
	 * @throws {@link DripsErrors.invalidAddress} if `erc20TokenAddress` address is not valid.
	 */
	public getCollectableAll(
		userId: BigNumberish,
		erc20TokenAddress: string,
		currentReceivers: SplitsReceiverStruct[]
	): Promise<
		[BigNumber, BigNumber] & {
			collectedAmt: BigNumber;
			splitAmt: BigNumber;
		}
	> {
		guardAgainstInvalidAddress(erc20TokenAddress);

		return this.#dripsHubContract.collectableAll(userId, erc20TokenAddress, currentReceivers);
	}

	/**
	 * Returns the user's received, but not split yet, funds.
	 * @param  {BigNumberish} userId The user ID.
	 * @param  {string} erc20TokenAddress The ERC20 token address to use.
	 * @returns A Promise which resolves to the amount received but not split yet.
	 * @throws {@link DripsErrors.invalidAddress} if `erc20TokenAddress` address is not valid.
	 */
	public getSplittable(userId: BigNumberish, erc20TokenAddress: string): Promise<BigNumber> {
		guardAgainstInvalidAddress(erc20TokenAddress);

		return this.#dripsHubContract.splittable(userId, erc20TokenAddress);
	}

	/**
	 * Returns the user's received funds that are already split and ready to be collected.
	 * @param  {BigNumberish} userId The user ID.
	 * @param  {string} erc20TokenAddress The ERC20 token address to use.
	 * @returns A Promise which resolves to the collectable amount.
	 * @throws {@link DripsErrors.invalidAddress} if `erc20TokenAddress` address is not valid.
	 */
	public getCollectable(userId: BigNumberish, erc20TokenAddress: string): Promise<BigNumber> {
		guardAgainstInvalidAddress(erc20TokenAddress);

		return this.#dripsHubContract.collectable(userId, erc20TokenAddress);
	}

	/**
	 * Returns the current user's drips state.
	 * @param  {BigNumberish} userId The user ID.
	 * @param  {string} erc20TokenAddress The ERC20 token address to use.
	 * @returns A Promise which resolves to an object with the following properties:
	 * - `dripsHash` - The current drips receivers list hash.
	 * - `updateTime` - The time when drips have been configured for the last time.
	 * - `balance` - The balance when drips have been configured for the last time.
	 * - `defaultEnd` - The end time of drips without a duration.
	 * @throws {@link DripsErrors.invalidAddress} if `erc20TokenAddress` address is not valid.
	 */
	public getDripsState(
		userId: BigNumberish,
		erc20TokenAddress: string
	): Promise<
		[string, number, BigNumber, number] & {
			dripsHash: string;
			updateTime: number;
			balance: BigNumber;
			defaultEnd: number;
		}
	> {
		guardAgainstInvalidAddress(erc20TokenAddress);

		return this.#dripsHubContract.dripsState(userId, erc20TokenAddress);
	}

	/**
	 * Returns the user's drips balance at a given timestamp.
	 * @param  {BigNumberish} userId The user ID.
	 * @param  {string} erc20TokenAddress The ERC20 token address to use.
	 * @param  {DripsReceiverStruct[]} receivers The users's current drips receivers.
	 * @param  {BigNumberish} timestamp The timestamp for which the balance should be calculated. It can't be lower than the timestamp of the last call to `setDrips`.
	 * If it's bigger than `block.timestamp`, then it's a prediction assuming that `setDrips` won't be called before `timestamp`.
	 * @returns A Promise which resolves to the user balance on `timestamp`.
	 * @throws {@link DripsErrors.invalidAddress} if `erc20TokenAddress` address is not valid.
	 */
	public getBalanceAt(
		userId: BigNumberish,
		erc20TokenAddress: string,
		receivers: DripsReceiverStruct[],
		timestamp: BigNumberish
	) {
		guardAgainstInvalidAddress(erc20TokenAddress);

		return this.#dripsHubContract.balanceAt(userId, erc20TokenAddress, receivers, timestamp);
	}
}
