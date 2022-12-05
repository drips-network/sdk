import type { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import type { BigNumberish, BytesLike, ContractTransaction } from 'ethers';
import { ethers, constants, BigNumber } from 'ethers';
import type { DripsReceiverStruct, SplitsReceiverStruct, UserMetadataStruct } from '../common/types';
import type { NFTDriver } from '../../contracts';
import { IERC20__factory, NFTDriver__factory } from '../../contracts';
import { DripsErrors } from '../common/DripsError';
import {
	validateAddress,
	validateClientProvider,
	validateDripsReceivers,
	validateEmitUserMetadataInput,
	validateSplitsReceivers
} from '../common/validators';
import Utils from '../utils';
import { formatDripsReceivers, formatSplitReceivers, isNullOrUndefined, nameOf } from '../common/internals';
import dripsConstants from '../constants';
/**
 * A client for managing Drips accounts identified by NFTs.
 * @see {@link https://github.com/radicle-dev/drips-contracts/blob/master/src/NFTDriver.sol NFTDriver} contract.
 */
export default class NFTDriverClient {
	#driver!: NFTDriver;
	#signer!: JsonRpcSigner;
	#signerAddress!: string;
	#driverAddress!: string;
	#provider!: JsonRpcProvider;

	/** Returns the client's `provider`. */
	public get provider(): JsonRpcProvider {
		return this.#provider;
	}

	/**
	 * Returns the client's `signer`.
	 *
	 * The `signer` is the `provider`'s signer.
	 */
	public get signer(): JsonRpcSigner {
		return this.#signer;
	}

	/** Returns the `NFTDriver` contract address to which the client is connected. */
	public get driverAddress(): string {
		return this.#driverAddress;
	}

	private constructor() {}

	// TODO: Update the supported chains documentation comments.
	/**
	 * Creates a new immutable `NFTDriverClient` instance.
	 * @param  {JsonRpcProvider} provider The network provider.
	 *
	 * The `provider` must have a `signer` associated with it, and cannot be changed after creation.
	 *
	 * The supported networks are:
	 * - 'goerli': chain ID `5`
	 * @param  {string|undefined} customDriverAddress Overrides the `NFTDriver` contract address.
	 * If it's `undefined` (default value), the address will be automatically selected based on the `provider`'s network.
	 * @returns A `Promise` which resolves to the new client instance.
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
	 * Returns the remaining number of tokens the `NFTDriver` contract is allowed to spend on behalf of the client's `signer` for the given ERC20 token.
	 * @param  {string} tokenAddress The ERC20 token address.
	 *
	 * It must preserve amounts, so if some amount of tokens is transferred to
	 * an address, then later the same amount must be transferrable from that address.
	 * Tokens which rebase the holders' balances, collect taxes on transfers,
	 * or impose any restrictions on holding or transferring tokens are not supported.
	 * If you use such tokens in the protocol, they can get stuck or lost.
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
	 * Sets the maximum allowance value for the `NFTDriver` contract over the client's `signer` tokens for the given ERC20 token.
	 * @param  {string} tokenAddress The ERC20 token address.
	 *
	 * It must preserve amounts, so if some amount of tokens is transferred to
	 * an address, then later the same amount must be transferrable from that address.
	 * Tokens which rebase the holders' balances, collect taxes on transfers,
	 * or impose any restrictions on holding or transferring tokens are not supported.
	 * If you use such tokens in the protocol, they can get stuck or lost.
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {@link DripsErrors.addressError} if the `tokenAddress` is not valid.
	 */
	public approve(tokenAddress: string): Promise<ContractTransaction> {
		validateAddress(tokenAddress);

		const signerAsErc20Contract = IERC20__factory.connect(tokenAddress, this.#signer);

		return signerAsErc20Contract.approve(this.#driverAddress, constants.MaxUint256);
	}

	/**
	 *
	 * **Usage of this method is discouraged**; use {@link safeCreateAccount} whenever possible.
	 *
	 * Creates a new Drips account.
	 *
	 * It will mint a new NFT controlling a new Drips account and transfer its ownership to an address.
	 * It also emits user metadata for the new token.
	 *
	 * **Important**:
	 * In Drips, an account "is" a **user ID** at the protocol level.
	 * The minted NFT's ID (token ID) and the user ID controlled by it are always equal.
	 *
	 * This means that **anywhere in the SDK, a method expects a user ID parameter, and a token ID is a valid argument**.
	 * @param  {string} transferToAddress The address to transfer the minted token to.
	 * @param  {BytesLike} associatedApp
	 * The name/ID of the app that is associated with the new account.
	 * If provided, the following user metadata entry will be appended to the `userMetadata` list:
	 * - key: "associatedApp"
	 * - value: `associatedApp`.
	 * @param  {UserMetadataStruct[]} userMetadata The list of user metadata. Note that a metadata `key` needs to be 32bytes.
	 *
	 * **Tip**: you might want to use `Utils.UserMetadata.createFromStrings` to easily create metadata instances from `string` inputs.
	 * @returns A `Promise` which resolves to minted token ID. It's equal to the user ID controlled by it.
	 * @throws {@link DripsErrors.argumentMissingError} if the `transferToAddress` is missing.
	 * @throws {@link DripsErrors.addressError} if the `transferToAddress` is not valid.
	 */
	public async createAccount(
		transferToAddress: string,
		associatedApp?: BytesLike,
		userMetadata: UserMetadataStruct[] = []
	): Promise<string> {
		validateAddress(transferToAddress);
		validateEmitUserMetadataInput(userMetadata);

		if (associatedApp) {
			if (!ethers.utils.isBytesLike(associatedApp)) {
				throw DripsErrors.argumentError(
					`Could not collect '${nameOf({ associatedApp })}' is not a valid BytesLike object.`,
					nameOf({ associatedApp }),
					associatedApp
				);
			}

			userMetadata.push({ key: dripsConstants.ASSOCIATED_APP_KEY_BYTES, value: associatedApp });
		}

		const txResponse = await this.#driver.mint(transferToAddress, userMetadata);

		return this.#getTokenIdFromTxResponse(txResponse);
	}

	/**
	 * Creates a new Drips account.
	 *
	 * It will _safely_ mint a new NFT controlling a new Drips account and transfer its ownership to an address.
	 * It also emits user metadata for the new token.
	 *
	 * **Important**:
	 * In Drips, an account "is" a **user ID** at the protocol level.
	 * The minted NFT's ID (token ID) and the user ID controlled by it are always equal.
	 *
	 * This means that **anywhere in the SDK, a method expects a user ID parameter, and a token ID is a valid argument**.
	 * @param  {string} transferToAddress The address to transfer the minted token to.
	 * @param  {BytesLike} associatedApp
	 * The name/ID of the app that is associated with the new account.
	 * If provided, the following user metadata entry will be appended to the `userMetadata` list:
	 * - key: "associatedApp"
	 * - value: `associatedApp`.
	 * @param  {UserMetadataStruct[]} userMetadata The list of user metadata. Note that a metadata `key` needs to be 32bytes.
	 *
	 * **Tip**: you might want to use `Utils.UserMetadata.createFromStrings` to easily create metadata instances from `string` inputs.
	 * @returns A `Promise` which resolves to minted token ID. It's equal to the user ID controlled by it.
	 * @throws {@link DripsErrors.argumentMissingError} if the `transferToAddress` is missing.
	 * @throws {@link DripsErrors.addressError} if the `transferToAddress` is not valid.
	 */
	public async safeCreateAccount(
		transferToAddress: string,
		associatedApp?: BytesLike,
		userMetadata: UserMetadataStruct[] = []
	): Promise<string> {
		validateAddress(transferToAddress);
		validateEmitUserMetadataInput(userMetadata);

		if (associatedApp) {
			if (!ethers.utils.isBytesLike(associatedApp)) {
				throw DripsErrors.argumentError(
					`Could not collect '${nameOf({ associatedApp })}' is not a valid BytesLike object.`,
					nameOf({ associatedApp }),
					associatedApp
				);
			}

			userMetadata.push({ key: dripsConstants.ASSOCIATED_APP_KEY_BYTES, value: associatedApp });
		}

		const txResponse = await this.#driver.safeMint(transferToAddress, userMetadata);

		return this.#getTokenIdFromTxResponse(txResponse);
	}

	/**
	 * Collects the received and already split funds and transfers them from the `DripsHub` contract to an address.
	 *
	 * The caller (client's `signer`) must be the owner of the `tokenId` or be approved to use it.
	 * @param  {string} tokenId The ID of the token representing the collecting account.
	 * @param  {string} tokenAddress The ERC20 token address.
	 *
	 * It must preserve amounts, so if some amount of tokens is transferred to
	 * an address, then later the same amount must be transferrable from that address.
	 * Tokens which rebase the holders' balances, collect taxes on transfers,
	 * or impose any restrictions on holding or transferring tokens are not supported.
	 * If you use such tokens in the protocol, they can get stuck or lost.
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
	 *
	 * The caller (client's `signer`) must be the owner of the `tokenId` or be approved to use it.
	 * @param  {string} tokenId The ID of the token representing the giving account.
	 * @param  {string} receiverUserId The receiver user ID:
	 * - For the `NFTDriver` it's equal to the token ID.
	 * - For the `AddressDriver` it's equal to the receiver's Ethereum address.
	 * @param  {string} tokenAddress The ERC20 token address.
	 *
	 * It must preserve amounts, so if some amount of tokens is transferred to
	 * an address, then later the same amount must be transferrable from that address.
	 * Tokens which rebase the holders' balances, collect taxes on transfers,
	 * or impose any restrictions on holding or transferring tokens are not supported.
	 * If you use such tokens in the protocol, they can get stuck or lost.
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
	 * Sets a Drips configuration for the given account.
	 *
	 * It will transfer funds from the client's `signer` wallet to the `DripsHub` contract to fulfill the change of the drips balance.
	 *
	 * The caller (client's `signer`) must be the owner of the `tokenId` or be approved to use it.
	 * @param  {string} tokenId The ID of the token representing the configured account.
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
			0,
			0,
			transferToAddress
		);
	}

	/**
	 * Sets the account's Splits configuration.
	 *
	 * The caller (client's `signer`) must be the owner of the `tokenId` or be approved to use it.
	 * @param  {string} tokenId The ID of the token representing the configured account.
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
	 * Emits the account's metadata.
	 * The key and the value are _not_ standardized by the protocol, it's up to the caller to establish and follow conventions to ensure compatibility with the consumers.
	 *
	 * The caller (client's `signer`) must be the owner of the `tokenId` or be approved to use it.
	 * @param  {string} tokenId The ID of the token representing the emitting account.
	 * @param  {UserMetadataStruct[]} userMetadata The list of user metadata. Note that a metadata `key` needs to be 32bytes.
	 *
	 * **Tip**: you might want to use `Utils.UserMetadata.createFromStrings` to easily create metadata instances from `string` inputs.
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {@link DripsErrors.argumentError} if any of the metadata entries is not valid.
	 */
	public emitUserMetadata(tokenId: string, userMetadata: UserMetadataStruct[]): Promise<ContractTransaction> {
		if (isNullOrUndefined(tokenId)) {
			throw DripsErrors.argumentMissingError(
				`Could not emit user metadata: '${nameOf({ tokenId })}' is missing.`,
				nameOf({ tokenId })
			);
		}

		validateEmitUserMetadataInput(userMetadata);

		return this.#driver.emitUserMetadata(tokenId, userMetadata);
	}

	async #getTokenIdFromTxResponse(txResponse: ContractTransaction) {
		const txReceipt = await txResponse.wait();

		const transferEventName = 'transfer';

		const transferEvent = txReceipt.events?.filter((e) => e.event?.toLowerCase() === transferEventName)[0];

		if (!transferEvent) {
			throw DripsErrors.txEventNotFound(
				`Could not retrieve the minted token ID while creating a new account: '${transferEventName}' event was not found in the transaction receipt.` +
					'\n' +
					`Note that the account might be created through. To debug, inspect the owner's accounts to see if there's a new token ID included.` +
					'\n' +
					`txReceipt: ${JSON.stringify(txReceipt)}`,
				transferEventName,
				txReceipt
			);
		}

		const { tokenId } = transferEvent.args!;

		return BigInt(tokenId).toString();
	}
}
