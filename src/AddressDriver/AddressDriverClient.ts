import type { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import type { BigNumberish, ContractTransaction } from 'ethers';
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
import {
	nameOf,
	isNullOrUndefined,
	formatDripsReceivers,
	formatSplitReceivers,
	ensureSignerExists,
	createFromStrings
} from '../common/internals';

/**
 * A client for managing Drips accounts identified by Ethereum addresses.
 * @see {@link https://github.com/radicle-dev/drips-contracts/blob/master/src/AddressDriver.sol AddressDriver} contract.
 */
export default class AddressDriverClient {
	#driver!: AddressDriver;
	#driverAddress!: string;
	#provider!: JsonRpcProvider;
	#signer: JsonRpcSigner | undefined;

	/** Returns the client's `provider`. */
	public get provider(): JsonRpcProvider {
		return this.#provider;
	}

	/**
	 * Returns the client's `signer`.
	 *
	 * Note that for read-only client instances created with the {@link createReadonly} method it returns `undefined`.
	 */
	public get signer(): JsonRpcSigner | undefined {
		return this.#signer;
	}

	/** Returns the `AddressDriver`'s address to which the `AddressDriverClient` is connected. */
	public get driverAddress(): string {
		return this.#driverAddress;
	}

	private constructor() {}

	// TODO: Update the supported chains documentation comments.
	/**
	 * Creates a new immutable `AddressDriverClient` instance.
	 * @param  {JsonRpcProvider} signer The signer.
	 *
	 * The `signer`'s address will be the Drips account the new instance will manage and cannot be changed after creation.
	 *
	 * **Important**:
	 * In Drips, an account "is" a **user ID** at the protocol level.
	 * The `AddressDriver` contract derives an account's user ID from an Ethereum address. In this case, from the `signer`'s.
	 * For retrieving the client's `signer` user ID call, {@link getUserId}.
	 *
	 * The `provider` this signer was established from can be connected to one of the following supported networks:
	 * - 'goerli': chain ID `5`
	 * - 'polygon-mumbai': chain ID `80001`
	 * @param  {string|undefined} customDriverAddress Overrides the `AddressDriver`'s address.
	 * If it's `undefined` (default value), the address will be automatically selected based on the `provider`'s network.
	 * @returns A `Promise` which resolves to the new `AddressDriverClient` instance.
	 * @throws {@link DripsErrors.argumentMissingError} if the `provider` is missing.
	 * @throws {@link DripsErrors.addressError} if the `provider.signer`'s address is not valid.
	 * @throws {@link DripsErrors.argumentError} if the `provider.signer` is missing.
	 * @throws {@link DripsErrors.unsupportedNetworkError} if the `provider` is connected to an unsupported network.
	 */
	public static async create(
		signer: JsonRpcSigner,
		customDriverAddress: string | undefined = undefined
	): Promise<AddressDriverClient> {
		await validateClientSigner(signer);

		const { provider } = signer;
		const network = await provider.getNetwork();
		const driverAddress = customDriverAddress ?? Utils.Network.configs[network.chainId].CONTRACT_ADDRESS_DRIVER;

		const client = new AddressDriverClient();

		client.#signer = signer;
		client.#provider = provider;
		client.#driverAddress = driverAddress;
		client.#driver = AddressDriver__factory.connect(driverAddress, signer);

		return client;
	}

	// TODO: Update the supported chains documentation comments.
	/**
	 * Creates a new immutable `AddressDriverClient` instance that allows only **read-only operations** (i.e., any operation that does _not_ require signing).
	 * @param  {JsonRpcProvider} provider The network provider.
	 *
	 * Note that even if the `provider` has a `singer` associated with it, the client will ignore it.
	 * If you want to _sign_ transactions use the {@link create} method instead.
	 *
	 * Supported networks are:
	 * - 'goerli': chain ID `5`
	 * - 'polygon-mumbai': chain ID `80001`
	 * @param  {string|undefined} customDriverAddress Overrides the `AddressDriver`'s address.
	 * If it's `undefined` (default value), the address will be automatically selected based on the `provider`'s network.
	 * @returns A `Promise` which resolves to the new `AddressDriverClient` instance.
	 * @throws {@link DripsErrors.argumentMissingError} if the `provider` is missing.
	 * @throws {@link DripsErrors.unsupportedNetworkError} if the `provider` is connected to an unsupported network.
	 */
	public static async createReadonly(
		provider: JsonRpcProvider,
		customDriverAddress: string | undefined = undefined
	): Promise<AddressDriverClient> {
		await validateClientProvider(provider, Utils.Network.SUPPORTED_CHAINS);

		const network = await provider.getNetwork();
		const driverAddress = customDriverAddress ?? Utils.Network.configs[network.chainId].CONTRACT_ADDRESS_DRIVER;

		const client = new AddressDriverClient();

		client.#signer = undefined;
		client.#provider = provider;
		client.#driverAddress = driverAddress;
		client.#driver = AddressDriver__factory.connect(driverAddress, provider);

		return client;
	}

	/**
	 * Returns the remaining number of tokens the `AddressDriver` contract is allowed to spend on behalf of the user for the given ERC20 token.
	 * @param  {string} tokenAddress The ERC20 token address.
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
	 * @param  {string} tokenAddress The ERC20 token address.
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
	 * Returns the user user ID.
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
	 * @param  {string} userAddress The user address.
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
	 * @param  {string} tokenAddress The ERC20 token address.
	 *
	 * It must preserve amounts, so if some amount of tokens is transferred to
	 * an address, then later the same amount must be transferrable from that address.
	 * Tokens which rebase the holders' balances, collect taxes on transfers,
	 * or impose any restrictions on holding or transferring tokens are not supported.
	 * If you use such tokens in the protocol, they can get stuck or lost.
	 * @param  {string} transferToAddress The address to send collected funds to.
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {@link DripsErrors.addressError} if `tokenAddress` or `transferToAddress` is not valid.
	 * @throws {@link DripsErrors.signerMissingError} if the provider's signer is missing.
	 */
	public async collect(tokenAddress: string, transferToAddress: string): Promise<ContractTransaction> {
		ensureSignerExists(this.#signer);
		validateCollectInput(tokenAddress, transferToAddress);

		return this.#driver.collect(tokenAddress, transferToAddress);
	}

	/**
	 * Gives funds to the receiver.
	 * The receiver can collect them immediately.
	 * Transfers funds from the user's wallet to the `DripsHub` contract.
	 * @param  {string} receiverUserId The receiver user ID.
	 * @param  {string} tokenAddress The ERC20 token address.
	 *
	 * It must preserve amounts, so if some amount of tokens is transferred to
	 * an address, then later the same amount must be transferrable from that address.
	 * Tokens which rebase the holders' balances, collect taxes on transfers,
	 * or impose any restrictions on holding or transferring tokens are not supported.
	 * If you use such tokens in the protocol, they can get stuck or lost.
	 * @param  {BigNumberish} amount The amount to give (in the smallest unit, e.g., Wei). It must be greater than `0`.
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {@link DripsErrors.argumentMissingError} if the `receiverUserId` is missing.
	 * @throws {@link DripsErrors.addressError} if the `tokenAddress` is not valid.
	 * @throws {@link DripsErrors.argumentError} if the `amount` is less than or equal to `0`.
	 * @throws {@link DripsErrors.signerMissingError} if the provider's signer is missing.
	 */
	public give(receiverUserId: string, tokenAddress: string, amount: BigNumberish): Promise<ContractTransaction> {
		ensureSignerExists(this.#signer);

		if (isNullOrUndefined(receiverUserId)) {
			throw DripsErrors.argumentMissingError(
				`Could not give: '${nameOf({ receiverUserId })}' is missing.`,
				nameOf({ receiverUserId })
			);
		}

		validateAddress(tokenAddress);

		if (!amount || amount < 0) {
			throw DripsErrors.argumentError(
				`Could not give: '${nameOf({ amount })}' must be greater than 0.`,
				nameOf({ amount }),
				amount
			);
		}

		return this.#driver.give(receiverUserId, tokenAddress, amount);
	}

	/**
	 * Sets the Splits configuration.
	 * @param  {SplitsReceiverStruct[]} receivers The splits receivers (max `200`).
	 * Each splits receiver will be getting `weight / TOTAL_SPLITS_WEIGHT` share of the funds.
	 * Duplicate receivers are not allowed and will only be processed once.
	 * Pass an empty array if you want to clear all receivers.
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {@link DripsErrors.argumentMissingError} if `receivers` are missing.
	 * @throws {@link DripsErrors.argumentError} if `receivers`' count exceeds the max allowed splits receivers.
	 * @throws {@link DripsErrors.splitsReceiverError} if any of the `receivers` is not valid.
	 * @throws {@link DripsErrors.signerMissingError} if the provider's signer is missing.
	 */
	public setSplits(receivers: SplitsReceiverStruct[]): Promise<ContractTransaction> {
		ensureSignerExists(this.#signer);
		validateSplitsReceivers(receivers);

		return this.#driver.setSplits(formatSplitReceivers(receivers));
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
	 * @param  {DripsReceiverStruct[]} currentReceivers The drips receivers that were set in the last drips update.
	 * Pass an empty array if this is the first update.
	 * @param  {DripsReceiverStruct[]} newReceivers The new drips receivers (max `100`).
	 * Duplicate receivers are not allowed and will only be processed once.
	 * Pass an empty array if you want to clear all receivers.
	 * @param  {string} transferToAddress The address to send funds to in case of decreasing balance.
	 * @param  {BigNumberish} balanceDelta The drips balance change to be applied:
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

		const formattedCurrentReceivers = formatDripsReceivers(currentReceivers);
		const formattedNewReceivers = formatDripsReceivers(newReceivers);

		const estimatedGasFees = (
			await this.#driver.estimateGas.setDrips(
				tokenAddress,
				formattedCurrentReceivers,
				balanceDelta,
				formattedNewReceivers,
				0,
				0,
				transferToAddress
			)
		).toNumber();

		const gasLimit = Math.ceil(estimatedGasFees + estimatedGasFees * 0.2);

		return this.#driver.setDrips(
			tokenAddress,
			formattedCurrentReceivers,
			balanceDelta,
			formattedNewReceivers,
			0,
			0,
			transferToAddress,
			{
				gasLimit
			}
		);
	}

	/**
	 * Emits the user's metadata.
	 * The key and the value are _not_ standardized by the protocol, it's up to the user to establish and follow conventions to ensure compatibility with the consumers.
	 * @param  {UserMetadata[]} userMetadata The list of user metadata. Note that a metadata `key` needs to be 32bytes.
	 *
	 * **Tip**: you might want to use `Utils.UserMetadata.createFromStrings` to easily create metadata instances from `string` inputs.
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {@link DripsErrors.argumentError} if any of the metadata entries is not valid.
	 * @throws {@link DripsErrors.signerMissingError} if the provider's signer is missing.
	 */
	public emitUserMetadata(userMetadata: UserMetadata[]): Promise<ContractTransaction> {
		ensureSignerExists(this.#signer);
		validateEmitUserMetadataInput(userMetadata);

		const userMetadataAsBytes = userMetadata.map((m) => createFromStrings(m.key, m.value));

		return this.#driver.emitUserMetadata(userMetadataAsBytes);
	}

	/**
	 * Returns a user's address given a user ID.
	 * @param  {string} userId The user ID.
	 * @returns The user's address.
	 */
	public static getUserAddress = (userId: string): string => {
		const userIdAsBN = BigNumber.from(userId);

		const mask = BigNumber.from(1).shl(160).sub(BigNumber.from(1));
		const userAddress = userIdAsBN.and(mask);

		return ethers.utils.getAddress(userAddress.toHexString());
	};
}
