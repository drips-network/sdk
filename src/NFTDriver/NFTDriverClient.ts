import type { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import type { BigNumberish, ContractTransaction } from 'ethers';
import { ethers, constants, BigNumber } from 'ethers';
import type { DripsReceiverStruct, SplitsReceiverStruct } from 'contracts/NFTDriver';
import type { NFTDriver } from '../../contracts';
import { IERC20__factory, NFTDriver__factory } from '../../contracts';
import { DripsErrors } from '../common/DripsError';
import {
	validateAddress,
	validateClientProvider,
	validateDripsReceivers,
	validateSplitsReceivers
} from '../common/validators';
import Utils from '../utils';
import { formatDripsReceivers, formatSplitReceivers, isNullOrUndefined, nameOf } from '../common/internals';
/**
 * A client for managing Drips for a user identified by an NFT.
 *
 * Anybody can mint a new token and create a new identity.
 * Only the current holder of the token can control its `userId`.
 *
 * The `tokenId` and the `userId` controlled by it are always equal.
 * @see {@link https://github.com/radicle-dev/drips-contracts/blob/master/src/NFTDriver.sol NFTDriver} smart contract.
 */
export default class NFTDriverClient {
	#driver!: NFTDriver;
	#signer!: JsonRpcSigner;
	#signerAddress!: string;
	#driverAddress!: string;
	#provider!: JsonRpcProvider;

	/** Returns the `NFTDriverClient`'s `provider`. */
	public get provider(): JsonRpcProvider {
		return this.#provider;
	}

	/** Returns the `NFTDriver`'s address to which the `NFTDriverClient` is connected. */
	public get driverAddress(): string {
		return this.#driverAddress;
	}

	private constructor() {}

	// TODO: Update the supported chains documentation comments.
	/**
	 * Creates a new immutable `NFTDriverClient` instance.
	 * @param  {JsonRpcProvider} provider The network provider.
	 *
	 * The `provider` must have a `signer` associated with it.
	 *
	 * **This signer must be the owner of the NFT (or someone that is approved to use it) that controls the `userId`s the new `NFTDriverClient` will manage and cannot be changed after creation**.
	 *
	 * The supported networks are:
	 * - 'goerli': chain ID `5`
	 * @param  {string|undefined} customDriverAddress Overrides the `NFTDriver`'s address.
	 * If it's `undefined` (default value), the address will be automatically selected based on the `provider`'s network.
	 * @returns A `Promise` which resolves to the new `NFTDriverClient` instance.
	 * @throws {@link DripsErrors.argumentMissingError} if the `provider` is missing.
	 * @throws {@link DripsErrors.addressError} if the `provider.signer`'s address is not valid.
	 * @throws {@link DripsErrors.argumentError} if the `provider.signer` is missing.
	 * @throws {@link DripsErrors.unsupportedNetworkError} if the `provider` is connected to an unsupported network.
	 */
	public static async create(
		provider: JsonRpcProvider,
		customDriverAddress: string | undefined = undefined
	): Promise<NFTDriverClient> {
		await validateClientProvider(provider, Utils.Network.SUPPORTED_CHAINS);

		const signer = provider.getSigner();
		const network = await provider.getNetwork();
		const driverAddress = customDriverAddress ?? Utils.Network.configs[network.chainId].CONTRACT_NFT_DRIVER;

		const client = new NFTDriverClient();

		client.#signer = signer;
		client.#provider = provider;
		client.#driverAddress = driverAddress;
		client.#signerAddress = await signer.getAddress();
		client.#driver = NFTDriver__factory.connect(driverAddress, signer);

		return client;
	}

	/**
	 * Returns the remaining number of tokens the `NFTDriver` smart contract is allowed to spend on behalf of the user for the given ERC20 token.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @returns A `Promise` which resolves to the remaining number of tokens.
	 * @throws {@link DripsErrors.addressError} if the `tokenAddress` is not valid.
	 */
	public async getAllowance(tokenAddress: string): Promise<bigint> {
		validateAddress(tokenAddress);

		const signerAsErc20Contract = IERC20__factory.connect(tokenAddress, this.#signer);

		const allowance = await signerAsErc20Contract.allowance(this.#signerAddress, this.#driverAddress);

		return allowance.toBigInt();
	}

	/**
	 * Sets the maximum allowance value for the `NFTDriver` smart contract over the user's tokens for the given ERC20 token.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {@link DripsErrors.addressError} if the `tokenAddress` is not valid.
	 */
	public approve(tokenAddress: string): Promise<ContractTransaction> {
		validateAddress(tokenAddress);

		const signerAsErc20Contract = IERC20__factory.connect(tokenAddress, this.#signer);

		return signerAsErc20Contract.approve(this.#driverAddress, constants.MaxUint256);
	}

	/**
	 * Mints a new token controlling a new user ID and transfers it to an address.
	 * Usage of this method is discouraged, use `safeMint` whenever possible.
	 * @param  {string} transferToAddress The address to transfer the minted token to.
	 * @returns A `Promise` which resolves to the minted token ID. It's equal to the user ID controlled by it.
	 * @throws {@link DripsErrors.argumentMissingError} if the `transferToAddress` is missing.
	 * @throws {@link DripsErrors.addressError} if the `transferToAddress` is not valid.
	 */
	public async mint(transferToAddress: string): Promise<string> {
		if (!transferToAddress) {
			throw DripsErrors.argumentMissingError(
				`Could not mint: '${nameOf({ transferToAddress })}' is missing.`,
				nameOf({ transferToAddress })
			);
		}

		validateAddress(transferToAddress);

		const txResponse = await this.#driver.mint(transferToAddress);

		const txReceipt = await txResponse.wait();
		const [transferEvent] = txReceipt.events!;
		const { tokenId } = transferEvent.args!;

		return BigInt(tokenId).toString();
	}

	/**
	 * Mints a new token controlling a new user ID and safely transfers it to an address.
	 * @param  {string} transferToAddress The address to transfer the minted token to.
	 * @returns A `Promise` which resolves to the minted token ID. It's equal to the user ID controlled by it.
	 * @throws {@link DripsErrors.argumentMissingError} if the `transferToAddress` is missing.
	 * @throws {@link DripsErrors.addressError} if the `transferToAddress` is not valid.
	 */
	public async safeMint(transferToAddress: string): Promise<string> {
		if (!transferToAddress) {
			throw DripsErrors.argumentMissingError(
				`Could not (safely) mint: '${nameOf({ transferToAddress })}' is missing.`,
				nameOf({ transferToAddress })
			);
		}

		validateAddress(transferToAddress);

		const txResponse = await this.#driver.safeMint(transferToAddress);

		const txReceipt = await txResponse.wait();
		const [transferEvent] = txReceipt.events!;
		const { tokenId } = transferEvent.args!;

		return BigInt(tokenId).toString();
	}

	// TODO: Add squeezing support.

	/**
	 * Collects the received and already split funds and transfers them from the `DripsHub` smart contract to an address.
	 * @param  {string} tokenId The ID of the token representing the collecting user ID.
	 * The token ID is equal to the user ID controlled by it.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @param  {string} transferToAddress The address to send collected funds to.
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {@link DripsErrors.argumentMissingError} if the `tokenId` is missing.
	 * @throws {@link DripsErrors.addressError} if `tokenAddress` or `transferToAddress` is not valid.
	 */
	public async collect(tokenId: string, tokenAddress: string, transferToAddress: string): Promise<ContractTransaction> {
		if (isNullOrUndefined(tokenId)) {
			throw DripsErrors.argumentMissingError(
				`Could not collect '${nameOf({ tokenId })}' is missing.`,
				nameOf({ tokenId })
			);
		}

		validateAddress(tokenAddress);
		validateAddress(transferToAddress);

		return this.#driver.collect(tokenId, tokenAddress, transferToAddress);
	}

	/**
	 * Gives funds to the receiver.
	 * The receiver can collect them immediately.
	 * Transfers funds from the user's wallet to the `DripsHub` smart contract.
	 * @param  {string} tokenId The ID of the token representing the giving user.
	 * The token ID is equal to the user ID controlled by it.
	 * @param  {string} receiverUserId The receiver user ID.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @param  {BigNumberish} amount The amount to give (in the smallest unit, e.g., Wei). It must be greater than `0`.
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {@link DripsErrors.argumentMissingError} if any of the required parameters is missing.
	 * @throws {@link DripsErrors.addressError} if the `tokenAddress` is not valid.
	 * @throws {@link DripsErrors.argumentError} if the `amount` is less than or equal to `0`.
	 */
	public give(
		tokenId: string,
		receiverUserId: string,
		tokenAddress: string,
		amount: BigNumberish
	): Promise<ContractTransaction> {
		if (isNullOrUndefined(tokenId)) {
			throw DripsErrors.argumentMissingError(
				`Could not give: '${nameOf({ tokenId })}' is missing.`,
				nameOf({ tokenId })
			);
		}

		if (isNullOrUndefined(receiverUserId)) {
			throw DripsErrors.argumentMissingError(
				`Could not give: '${nameOf({ receiverUserId })}' is missing.`,
				nameOf({ receiverUserId })
			);
		}

		if (!amount || amount < 0) {
			throw DripsErrors.argumentError(
				`Could not give: '${nameOf({ amount })}' must be greater than 0.`,
				nameOf({ amount }),
				amount
			);
		}

		validateAddress(tokenAddress);

		return this.#driver.give(tokenId, receiverUserId, tokenAddress, amount);
	}

	/**
	 * Sets a drips configuration.
	 * Transfers funds from the user's wallet to the `DripsHub` smart contract to fulfill the change of the drips balance.
	 * @param  {string} tokenId The ID of the token representing the configured user ID.
	 * The token ID is equal to the user ID controlled by it.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @param  {DripsReceiverStruct[]} currentReceivers The drips receivers that were set in the last drips update.
	 * Pass an empty array if this is the first update.
	 * @param  {DripsReceiverStruct[]} newReceivers The new drips receivers (max `100`).
	 * Duplicate receivers are not allowed and will only be processed once.
	 * Pass an empty array  if you want to clear all receivers.
	 * @param  {string} transferToAddress The address to send funds to in case of decreasing balance.
	 * @param  {BigNumberish} balanceDelta The drips balance change to be applied:
	 * - Positive to add funds to the drips balance.
	 * - Negative to remove funds from the drips balance.
	 * - `0` to leave drips balance as is (default value).
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {@link DripsErrors.argumentMissingError} if any of the required parameters is missing.
	 * @throws {@link DripsErrors.addressError} if `tokenAddress` or `transferToAddress` is not valid.
	 * @throws {@link DripsErrors.argumentError} if `currentReceivers`' or `newReceivers`' count exceeds the max allowed drips receivers.
	 * @throws {@link DripsErrors.dripsReceiverError} if any of the `currentReceivers` or the `newReceivers` is not valid.
	 * @throws {@link DripsErrors.dripsReceiverConfigError} if any of the receivers' configuration is not valid.
	 * @throws {@link DripsErrors.dripsReceiverConfigError} if any of the receivers' configuration is not valid.
	 */
	public setDrips(
		tokenId: string,
		tokenAddress: string,
		currentReceivers: DripsReceiverStruct[],
		newReceivers: DripsReceiverStruct[],
		transferToAddress: string,
		balanceDelta: BigNumberish = 0
	): Promise<ContractTransaction> {
		if (isNullOrUndefined(tokenId)) {
			throw DripsErrors.argumentMissingError(
				`Could not set drips: '${nameOf({ tokenId })}' is missing.`,
				nameOf({ tokenId })
			);
		}

		validateAddress(tokenAddress);

		validateDripsReceivers(
			currentReceivers.map((r) => ({
				userId: r.userId.toString(),
				config: Utils.DripsReceiverConfiguration.fromUint256(BigNumber.from(r.config).toBigInt())
			}))
		);

		validateDripsReceivers(
			newReceivers.map((r) => ({
				userId: r.userId.toString(),
				config: Utils.DripsReceiverConfiguration.fromUint256(BigNumber.from(r.config).toBigInt())
			}))
		);

		if (!transferToAddress) {
			throw DripsErrors.argumentMissingError(
				`Could not set drips: '${nameOf({ transferToAddress })}' is missing.`,
				nameOf({ transferToAddress })
			);
		}

		return this.#driver.setDrips(
			tokenId,
			tokenAddress,
			formatDripsReceivers(currentReceivers),
			balanceDelta,
			formatDripsReceivers(newReceivers),
			transferToAddress
		);
	}

	/**
	 * Sets the splits configuration.
	 * @param  {string} tokenId The ID of the token representing the configured user ID.
	 * The token ID is equal to the user ID controlled by it.
	 * @param  {SplitsReceiverStruct[]} receivers The splits receivers (max `200`).
	 * Each splits receiver will be getting `weight / TOTAL_SPLITS_WEIGHT` share of the funds.
	 * Duplicate receivers are not allowed and will only be processed once.
	 * Pass an empty array if you want to clear all receivers.
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {@link DripsErrors.argumentMissingError} if `receivers` are missing.
	 * @throws {@link DripsErrors.argumentError} if `receivers`' count exceeds the max allowed splits receivers.
	 * @throws {@link DripsErrors.splitsReceiverError} if any of the `receivers` is not valid.
	 */
	public setSplits(tokenId: string, receivers: SplitsReceiverStruct[]): Promise<ContractTransaction> {
		if (isNullOrUndefined(tokenId)) {
			throw DripsErrors.argumentMissingError(
				`Could not set splits: '${nameOf({ tokenId })}' is missing.`,
				nameOf({ tokenId })
			);
		}

		validateSplitsReceivers(receivers);

		return this.#driver.setSplits(tokenId, formatSplitReceivers(receivers));
	}

	/**
	 * Emits the user's metadata.
	 * The key and the value are _not_ standardized by the protocol, it's up to the user to establish and follow conventions to ensure compatibility with the consumers.
	 * @param  {string} tokenId The ID of the token representing the collecting user ID. The token ID is equal to the user ID controlled by it.
	 * @param  {BigNumberish} key The metadata key.
	 * @param  {string} value The metadata value.
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {@link DripsErrors.argumentMissingError} if any of the required parameters is missing.
	 */
	public emitUserMetadata(tokenId: string, key: BigNumberish, value: string): Promise<ContractTransaction> {
		if (isNullOrUndefined(tokenId)) {
			throw DripsErrors.argumentMissingError(
				`Could not set emit user metadata: '${nameOf({ tokenId })}' is missing.`,
				nameOf({ tokenId })
			);
		}

		if (isNullOrUndefined(key)) {
			throw DripsErrors.argumentMissingError(
				`Could not set emit user metadata: '${nameOf({ key })}' is missing.`,
				nameOf({ key })
			);
		}

		if (!value) {
			throw DripsErrors.argumentMissingError(
				`Could not set emit user metadata: '${nameOf({ value })}' is missing.`,
				nameOf({ value })
			);
		}

		return this.#driver.emitUserMetadata(tokenId, key, ethers.utils.hexlify(ethers.utils.toUtf8Bytes(value)));
	}
}
