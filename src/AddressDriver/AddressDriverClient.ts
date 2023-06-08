/* eslint-disable no-dupe-class-members */
import type { Provider } from '@ethersproject/providers';
import type { BigNumberish, ContractTransaction, Signer } from 'ethers';
import { ethers, BigNumber, constants } from 'ethers';
import type { DripsReceiverStruct, SplitsReceiverStruct, UserMetadata } from '../common/types';
import {
	validateAddress,
	validateClientProvider,
	validateClientSigner,
	validateCollectInput,
	validateEmitUserMetadataInput,
	validateSetDripsInput,
	validateSplitsReceivers
} from '../common/validators';
import Utils from '../utils';
import { DripsErrors } from '../common/DripsError';
import type { AddressDriver } from '../../contracts';
import { IERC20__factory, AddressDriver__factory } from '../../contracts';
import { nameOf, isNullOrUndefined, ensureSignerExists } from '../common/internals';
import type { IAddressDriverTxFactory } from './AddressDriverTxFactory';
import AddressDriverTxFactory from './AddressDriverTxFactory';

/**
 * A client for managing Drips accounts identified by Ethereum addresses.
 * @see {@link https://github.com/radicle-dev/drips-contracts/blob/master/src/AddressDriver.sol AddressDriver} contract.
 */
export default class AddressDriverClient {
	#provider!: Provider;
	#driver!: AddressDriver;
	#driverAddress!: string;
	#signer: Signer | undefined;
	#txFactory!: IAddressDriverTxFactory;

	/** Returns the client's `provider`. */
	public get provider(): Provider {
		return this.#provider;
	}

	/**
	 * Returns the client's `signer`.
	 *
	 * Note that for read-only client instances created with the {@link createReadonly} method it returns `undefined`.
	 */
	public get signer(): Signer | undefined {
		return this.#signer;
	}

	/** Returns the `AddressDriver`'s address to which the `AddressDriverClient` is connected. */
	public get driverAddress(): string {
		return this.#driverAddress;
	}

	private constructor() {}

	/**
	 * Creates a new immutable `AddressDriverClient` instance.
	 * @param provider The network provider. It cannot be changed after creation.
	 *
	 * The `provider` must be connected to one of the following supported networks:
	 * - 'mainnet': chain ID `1`
	 * - 'goerli': chain ID `5`
	 * - 'polygon-mumbai': chain ID `80001`
	 * @param signer The singer used to sign transactions. It cannot be changed after creation.
	 *
	 * **Important**: If the `signer` is _not_ connected to a provider it will try to connect to the `provider`, else it will use the `signer.provider`.
	 * @param customDriverAddress Overrides the `AddressDriver` contract address.
	 * If it's `undefined` (default value), the address will be automatically selected based on the `provider`'s network.
	 * @returns A `Promise` which resolves to the new client instance.
	 * @throws {@link DripsErrors.initializationError} if the client initialization fails.
	 */
	public static async create(
		provider: Provider,
		signer?: Signer,
		customDriverAddress?: string
	): Promise<AddressDriverClient>;
	public static async create(
		provider: Provider,
		signer?: Signer,
		customDriverAddress?: string,
		txFactory?: IAddressDriverTxFactory
	): Promise<AddressDriverClient>;
	public static async create(
		provider: Provider,
		signer?: Signer,
		customDriverAddress?: string,
		txFactory?: IAddressDriverTxFactory
	): Promise<AddressDriverClient> {
		await validateClientProvider(provider, Utils.Network.SUPPORTED_CHAINS);

		if (signer) {
			if (!signer.provider) {
				// eslint-disable-next-line no-param-reassign
				signer = signer.connect(provider);
			}

			await validateClientSigner(signer, Utils.Network.SUPPORTED_CHAINS);
		}

		const network = await provider.getNetwork();
		const driverAddress = customDriverAddress ?? Utils.Network.configs[network.chainId].ADDRESS_DRIVER;

		const client = new AddressDriverClient();

		client.#signer = signer;
		client.#provider = provider;
		client.#driverAddress = driverAddress;
		client.#driver = AddressDriver__factory.connect(driverAddress, signer ?? provider);

		if (signer) {
			client.#txFactory = txFactory || (await AddressDriverTxFactory.create(signer, customDriverAddress));
		}

		return client;
	}

	/**
	 * Returns the remaining number of tokens the `AddressDriver` contract is allowed to spend on behalf of the user for the given ERC20 token.
	 * @param tokenAddress The ERC20 token address.
	 *
	 * It must preserve amounts, so if some amount of tokens is transferred to
	 * an address, then later the same amount must be transferrable from that address.
	 * Tokens which rebase the holders' balances, collect taxes on transfers,
	 * or impose any restrictions on holding or transferring tokens are not supported.
	 * If you use such tokens in the protocol, they can get stuck or lost.
	 * @returns A `Promise` which resolves to the remaining number of tokens.
	 * @throws {@link DripsErrors.addressError} if the `tokenAddress` is not valid.
	 * @throws {@link DripsErrors.signerMissingError} if the provider's signer is missing.
	 */
	public async getAllowance(tokenAddress: string): Promise<bigint> {
		ensureSignerExists(this.#signer);
		validateAddress(tokenAddress);

		const signerAsErc20Contract = IERC20__factory.connect(tokenAddress, this.#signer);

		const signerAddress = await this.#signer.getAddress();

		const allowance = await signerAsErc20Contract.allowance(signerAddress, this.#driverAddress);

		return allowance.toBigInt();
	}

	/**
	 * Sets the maximum allowance value for the `AddressDriver` contract over the user's tokens for the given ERC20 token.
	 * @param tokenAddress The ERC20 token address.
	 *
	 * It must preserve amounts, so if some amount of tokens is transferred to
	 * an address, then later the same amount must be transferrable from that address.
	 * Tokens which rebase the holders' balances, collect taxes on transfers,
	 * or impose any restrictions on holding or transferring tokens are not supported.
	 * If you use such tokens in the protocol, they can get stuck or lost.
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {@link DripsErrors.addressError} if the `tokenAddress` is not valid.
	 * @throws {@link DripsErrors.signerMissingError} if the provider's signer is missing.
	 */
	public approve(tokenAddress: string): Promise<ContractTransaction> {
		ensureSignerExists(this.#signer);
		validateAddress(tokenAddress);

		const signerAsErc20Contract = IERC20__factory.connect(tokenAddress, this.#signer);

		return signerAsErc20Contract.approve(this.#driverAddress, constants.MaxUint256);
	}

	/**
	 * Returns the user ID.
	 *
	 * This is the user ID to which the `AddressDriverClient` is linked and manages Drips.
	 * @returns A `Promise` which resolves to the user ID.
	 * @throws {@link DripsErrors.signerMissingError} if the provider's signer is missing.
	 */
	public async getUserId(): Promise<string> {
		ensureSignerExists(this.#signer);

		const signerAddress = await this.#signer.getAddress();

		const userId = await this.#driver.calcUserId(signerAddress);

		return userId.toString();
	}

	/**
	 * Returns the user ID for a given address.
	 * @param userAddress The user address.
	 * @returns A `Promise` which resolves to the user ID.
	 * @throws {@link DripsErrors.addressError} if the `userAddress` address is not valid.
	 */
	public async getUserIdByAddress(userAddress: string): Promise<string> {
		validateAddress(userAddress);

		const userId = await this.#driver.calcUserId(userAddress);

		return userId.toString();
	}

	/**
	 * Collects the received and already split funds and transfers them from the `DripsHub` contract to an address.
	 * @param tokenAddress The ERC20 token address.
	 *
	 * It must preserve amounts, so if some amount of tokens is transferred to
	 * an address, then later the same amount must be transferrable from that address.
	 * Tokens which rebase the holders' balances, collect taxes on transfers,
	 * or impose any restrictions on holding or transferring tokens are not supported.
	 * If you use such tokens in the protocol, they can get stuck or lost.
	 * @param transferToAddress The address to send collected funds to.
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {@link DripsErrors.addressError} if `tokenAddress` or `transferToAddress` is not valid.
	 * @throws {@link DripsErrors.signerMissingError} if the provider's signer is missing.
	 */
	public async collect(tokenAddress: string, transferToAddress: string): Promise<ContractTransaction> {
		ensureSignerExists(this.#signer);
		validateCollectInput(tokenAddress, transferToAddress);

		const tx = await this.#txFactory.collect(tokenAddress, transferToAddress);

		return this.#signer.sendTransaction(tx);
	}

	/**
	 * Gives funds to the receiver.
	 * The receiver can collect them immediately.
	 * Transfers funds from the user's wallet to the `DripsHub` contract.
	 * @param receiverUserId The receiver user ID.
	 * @param tokenAddress The ERC20 token address.
	 *
	 * It must preserve amounts, so if some amount of tokens is transferred to
	 * an address, then later the same amount must be transferrable from that address.
	 * Tokens which rebase the holders' balances, collect taxes on transfers,
	 * or impose any restrictions on holding or transferring tokens are not supported.
	 * If you use such tokens in the protocol, they can get stuck or lost.
	 * @param amount The amount to give (in the smallest unit, e.g., Wei). It must be greater than `0`.
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {@link DripsErrors.argumentMissingError} if the `receiverUserId` is missing.
	 * @throws {@link DripsErrors.addressError} if the `tokenAddress` is not valid.
	 * @throws {@link DripsErrors.argumentError} if the `amount` is less than or equal to `0`.
	 * @throws {@link DripsErrors.signerMissingError} if the provider's signer is missing.
	 */
	public async give(receiverUserId: string, tokenAddress: string, amount: BigNumberish): Promise<ContractTransaction> {
		ensureSignerExists(this.#signer);

		if (isNullOrUndefined(receiverUserId)) {
			throw DripsErrors.argumentMissingError(
				`Could not give: '${nameOf({ receiverUserId })}' is missing.`,
				nameOf({ receiverUserId })
			);
		}

		validateAddress(tokenAddress);

		if (!amount || BigNumber.from(amount).lte(0)) {
			throw DripsErrors.argumentError(
				`Could not give: '${nameOf({ amount })}' must be greater than 0.`,
				nameOf({ amount }),
				amount
			);
		}

		const tx = await this.#txFactory.give(receiverUserId, tokenAddress, amount);

		return this.#signer.sendTransaction(tx);
	}

	/**
	 * Sets the Splits configuration.
	 * @param receivers The splits receivers (max `200`).
	 * Each splits receiver will be getting `weight / TOTAL_SPLITS_WEIGHT` share of the funds.
	 * Duplicate receivers are not allowed and will only be processed once.
	 * Pass an empty array if you want to clear all receivers.
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {@link DripsErrors.argumentMissingError} if `receivers` are missing.
	 * @throws {@link DripsErrors.argumentError} if `receivers`' count exceeds the max allowed splits receivers.
	 * @throws {@link DripsErrors.splitsReceiverError} if any of the `receivers` is not valid.
	 * @throws {@link DripsErrors.signerMissingError} if the provider's signer is missing.
	 */
	public async setSplits(receivers: SplitsReceiverStruct[]): Promise<ContractTransaction> {
		ensureSignerExists(this.#signer);
		validateSplitsReceivers(receivers);

		const tx = await this.#txFactory.setSplits(receivers);

		return this.#signer.sendTransaction(tx);
	}

	/**
	 * Sets a Drips configuration.
	 * Transfers funds from the user's wallet to the `DripsHub` contract to fulfill the change of the drips balance.
	 * @param  {string} tokenAddress The ERC20 token address.
	 *
	 * It must preserve amounts, so if some amount of tokens is transferred to
	 * an address, then later the same amount must be transferrable from that address.
	 * Tokens which rebase the holders' balances, collect taxes on transfers,
	 * or impose any restrictions on holding or transferring tokens are not supported.
	 * If you use such tokens in the protocol, they can get stuck or lost.
	 * @param currentReceivers The drips receivers that were set in the last drips update.
	 * Pass an empty array if this is the first update.
	 *
	 * **Tip**: you might want to use `DripsSubgraphClient.getCurrentDripsReceivers` to easily retrieve the list of current receivers.
	 * @param newReceivers The new drips receivers (max `100`).
	 * Duplicate receivers are not allowed and will only be processed once.
	 * Pass an empty array if you want to clear all receivers.
	 * @param transferToAddress The address to send funds to in case of decreasing balance.
	 * @param balanceDelta The drips balance change to be applied:
	 * - Positive to add funds to the drips balance.
	 * - Negative to remove funds from the drips balance.
	 * - `0` to leave drips balance as is (default value).
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {@link DripsErrors.addressError} if `tokenAddress` or `transferToAddress` is not valid.
	 * @throws {@link DripsErrors.argumentMissingError} if any of the required parameters is missing.
	 * @throws {@link DripsErrors.argumentError} if `currentReceivers`' or `newReceivers`' count exceeds the max allowed drips receivers.
	 * @throws {@link DripsErrors.dripsReceiverError} if any of the `currentReceivers` or the `newReceivers` is not valid.
	 * @throws {@link DripsErrors.dripsReceiverConfigError} if any of the receivers' configuration is not valid.
	 * @throws {@link DripsErrors.signerMissingError} if the provider's signer is missing.
	 */
	public async setDrips(
		tokenAddress: string,
		currentReceivers: DripsReceiverStruct[],
		newReceivers: DripsReceiverStruct[],
		transferToAddress: string,
		balanceDelta: BigNumberish = 0
	): Promise<ContractTransaction> {
		ensureSignerExists(this.#signer);
		validateSetDripsInput(
			tokenAddress,
			currentReceivers?.map((r) => ({
				userId: r.userId.toString(),
				config: Utils.DripsReceiverConfiguration.fromUint256(BigNumber.from(r.config).toBigInt())
			})),
			newReceivers?.map((r) => ({
				userId: r.userId.toString(),
				config: Utils.DripsReceiverConfiguration.fromUint256(BigNumber.from(r.config).toBigInt())
			})),
			transferToAddress,
			balanceDelta
		);

		const tx = await this.#txFactory.setDrips(
			tokenAddress,
			currentReceivers,
			balanceDelta,
			newReceivers,
			0,
			0,
			transferToAddress
		);

		return this.#signer.sendTransaction(tx);
	}

	/**
	 * Emits the user's metadata.
	 * The key and the value are _not_ standardized by the protocol, it's up to the user to establish and follow conventions to ensure compatibility with the consumers.
	 * @param userMetadata The list of user metadata. Note that a metadata `key` needs to be 32bytes.
	 *
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {@link DripsErrors.argumentError} if any of the metadata entries is not valid.
	 * @throws {@link DripsErrors.signerMissingError} if the provider's signer is missing.
	 */
	public async emitUserMetadata(userMetadata: UserMetadata[]): Promise<ContractTransaction> {
		ensureSignerExists(this.#signer);
		validateEmitUserMetadataInput(userMetadata);

		const userMetadataAsBytes = userMetadata.map((m) => Utils.Metadata.createFromStrings(m.key, m.value));

		const tx = await this.#txFactory.emitUserMetadata(userMetadataAsBytes);

		return this.#signer.sendTransaction(tx);
	}

	/**
	 * Returns a user's address given a user ID.
	 * @param userId The user ID.
	 * @returns The user's address.
	 */
	public static getUserAddress = (userId: string): string => {
		if (isNullOrUndefined(userId)) {
			throw DripsErrors.argumentError(`Could not get user address: userId is missing.`);
		}

		const userIdAsBn = ethers.BigNumber.from(userId);

		// if (userIdAsBn.lt(0) || userIdAsBn.gt(ethers.constants.MaxUint256)) {
		// 	throw DripsErrors.argumentError(
		// 		`Could not get user address: ${userId} is not a valid positive number within the range of a uint256.`
		// 	);
		// }

		const mid64BitsMask = ethers.BigNumber.from(2).pow(64).sub(1).shl(160);

		if (!userIdAsBn.and(mid64BitsMask).isZero()) {
			throw DripsErrors.argumentError(
				`Could not get user address: ${userId} is not a valid user ID. The first 64 (after first 32) bits must be 0.`
			);
		}

		const mask = ethers.BigNumber.from(2).pow(160).sub(1);
		const address = userIdAsBn.and(mask).toHexString();

		const paddedAddress = ethers.utils.hexZeroPad(address, 20);

		return ethers.utils.getAddress(paddedAddress);
	};
}
