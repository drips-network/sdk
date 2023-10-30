/* eslint-disable no-dupe-class-members */
import type { Provider } from '@ethersproject/providers';
import type { BigNumberish, ContractTransaction, Signer } from 'ethers';
import { constants, BigNumber } from 'ethers';
import type { StreamReceiverStruct, SplitsReceiverStruct, AccountMetadata } from '../common/types';
import type { NFTDriver } from '../../contracts';
import { NFTDriver__factory, IERC20__factory } from '../../contracts';
import { DripsErrors } from '../common/DripsError';
import {
	validateAddress,
	validateClientProvider,
	validateClientSigner,
	validateEmitAccountMetadataInput,
	validateSetStreamsInput,
	validateSplitsReceivers
} from '../common/validators';
import Utils from '../utils';
import { isNullOrUndefined, nameOf } from '../common/internals';
import dripsConstants from '../constants';
import type { INFTDriverTxFactory } from './NFTDriverTxFactory';
import NFTDriverTxFactory from './NFTDriverTxFactory';

/**
 * A client for managing Drips accounts identified by NFTs.
 * @see {@link https://github.com/radicle-dev/drips-contracts/blob/master/src/NFTDriver.sol NFTDriver} contract.
 */
export default class NFTDriverClient {
	#signer!: Signer;
	#driver!: NFTDriver;
	#provider!: Provider;
	#driverAddress!: string;
	#txFactory!: INFTDriverTxFactory;

	/** Returns the client's `provider`. */
	public get provider(): Provider {
		return this.#provider;
	}

	/** Returns the client's `signer`. */
	public get signer(): Signer {
		return this.#signer;
	}

	/** Returns the `NFTDriver` contract address to which the client is connected. */
	public get driverAddress(): string {
		return this.#driverAddress;
	}

	private constructor() {}

	/**
	 * Creates a new immutable `NFTDriverClient` instance.
	 * @param provider The network provider. It cannot be changed after creation.
	 *
	 * The `provider` must be connected to one of the following supported networks:
	 * - 'mainnet': chain ID `1`
	 * - 'goerli': chain ID `5`
	 * - 'polygon-mumbai': chain ID `80001`
	 * @param signer The singer used to sign transactions. It cannot be changed after creation.
	 *
	 * **Important**: If the `signer` is _not_ connected to a provider it will try to connect to the `provider`, else it will use the `signer.provider`.
	 * @param customDriverAddress Overrides the `NFTDriver` contract address.
	 * If it's `undefined` (default value), the address will be automatically selected based on the `provider`'s network.
	 * @returns A `Promise` which resolves to the new client instance.
	 * @throws {@link DripsErrors.initializationError} if the client initialization fails.
	 */
	public static async create(
		provider: Provider,
		signer: Signer,
		customDriverAddress?: string
	): Promise<NFTDriverClient>;
	public static async create(
		provider: Provider,
		signer: Signer,
		customDriverAddress?: string,
		txFactory?: INFTDriverTxFactory
	): Promise<NFTDriverClient>;
	public static async create(
		provider: Provider,
		signer: Signer,
		customDriverAddress?: string,
		txFactory?: INFTDriverTxFactory
	): Promise<NFTDriverClient> {
		await validateClientProvider(provider, Utils.Network.SUPPORTED_CHAINS);

		if (!signer.provider) {
			// eslint-disable-next-line no-param-reassign
			signer = signer.connect(provider);
		}

		await validateClientSigner(signer, Utils.Network.SUPPORTED_CHAINS);

		const network = await provider.getNetwork();
		const driverAddress = customDriverAddress ?? Utils.Network.configs[network.chainId].NFT_DRIVER;

		const client = new NFTDriverClient();

		client.#signer = signer;
		client.#provider = provider;
		client.#driverAddress = driverAddress;
		client.#driver = NFTDriver__factory.connect(driverAddress, signer);
		client.#txFactory = txFactory || (await NFTDriverTxFactory.create(signer, customDriverAddress));

		return client;
	}

	/**
	 * Returns the remaining number of tokens the `NFTDriver` contract is allowed to spend on behalf of the client's `signer` for the given ERC20 token.
	 * @param tokenAddress The ERC20 token address.
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

		const signerAddress = await this.#signer.getAddress();

		const allowance = await signerAsErc20Contract.allowance(signerAddress, this.#driverAddress);

		return allowance.toBigInt();
	}

	/**
	 * Sets the maximum allowance value for the `NFTDriver` contract over the client's `signer` tokens for the given ERC20 token.
	 * @param tokenAddress The ERC20 token address.
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
	 * Calculates the ID of the token minted with salt.
	 * @param minter The minter address of the token.
	 * @param salt The salt used for minting the token (64bit).
	 * @returns The token ID. It's equal to the user ID controlled by it.
	 * @throws if the `minter` address is not valid.
	 */
	public async calcTokenIdWithSalt(minter: string, salt: bigint): Promise<string> {
		validateAddress(minter);

		const accountId = await this.#driver.calcTokenIdWithSalt(minter, salt);

		return accountId.toString();
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
	 * @param transferToAddress The address to transfer the minted token to.
	 * @param associatedApp
	 * The name/ID of the app that is associated with the new account.
	 * If provided, the following user metadata entry will be appended to the `accountMetadata` list:
	 * - key: "associatedApp"
	 * - value: `associatedApp`.
	 * @param accountMetadata The list of user metadata. Note that a metadata `key` needs to be 32bytes.
	 *
	 * @returns A `Promise` which resolves to minted token ID. It's equal to the user ID controlled by it.
	 * @throws {@link DripsErrors.argumentMissingError} if the `transferToAddress` is missing.
	 * @throws {@link DripsErrors.addressError} if the `transferToAddress` is not valid.
	 * @throws {@link DripsErrors.txEventNotFound} if the expected transaction event is not found.
	 */
	public async createAccount(
		transferToAddress: string,
		associatedApp?: string,
		accountMetadata: AccountMetadata[] = []
	): Promise<string> {
		validateAddress(transferToAddress);
		validateEmitAccountMetadataInput(accountMetadata);

		if (associatedApp) {
			accountMetadata.push({ key: dripsConstants.ASSOCIATED_APP_KEY, value: associatedApp });
		}

		const accountMetadataAsBytes = accountMetadata.map((m) => Utils.Metadata.createFromStrings(m.key, m.value));

		const txResponse = await this.#driver.mint(transferToAddress, accountMetadataAsBytes);

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
	 * @param transferToAddress The address to transfer the minted token to.
	 * @param associatedApp
	 * The name/ID of the app that is associated with the new account.
	 * If provided, the following user metadata entry will be appended to the `accountMetadata` list:
	 * - key: "associatedApp"
	 * - value: `associatedApp`.
	 * @param accountMetadata The list of user metadata. Note that a metadata `key` needs to be 32bytes.
	 *
	 * @returns A `Promise` which resolves to minted token ID. It's equal to the user ID controlled by it.
	 * @throws {@link DripsErrors.argumentMissingError} if the `transferToAddress` is missing.
	 * @throws {@link DripsErrors.txEventNotFound} if the expected transaction event is not found.
	 * @throws {@link DripsErrors.addressError} if the `transferToAddress` is not valid.
	 */
	public async safeCreateAccount(
		transferToAddress: string,
		associatedApp?: string,
		accountMetadata: AccountMetadata[] = []
	): Promise<string> {
		validateAddress(transferToAddress);
		validateEmitAccountMetadataInput(accountMetadata);

		if (associatedApp) {
			accountMetadata.push({ key: dripsConstants.ASSOCIATED_APP_KEY, value: associatedApp });
		}

		const accountMetadataAsBytes = accountMetadata.map((m) => Utils.Metadata.createFromStrings(m.key, m.value));

		const txResponse = await this.#driver.safeMint(transferToAddress, accountMetadataAsBytes);

		return this.#getTokenIdFromTxResponse(txResponse);
	}

	/**
	 * Creates a new Drips account.
	 *
	 * It will _safely_ mint a new NFT controlling a new Drips account and transfer its ownership to an address.
	 * The token ID is deterministically derived from the caller's address and the salt.
	 * Each caller can use each salt only once, to mint a single token.
	 * It also emits user metadata for the new token.
	 *
	 * **Important**:
	 * In Drips, an account "is" a **user ID** at the protocol level.
	 * The minted NFT's ID (token ID) and the user ID controlled by it are always equal.
	 *
	 * This means that **anywhere in the SDK, a method expects a user ID parameter, and a token ID is a valid argument**.
	 * @param salt The salt to use for the deterministic token ID derivation.
	 * @param transferToAddress The address to transfer the minted token to.
	 * @param associatedApp
	 * The name/ID of the app that is associated with the new account.
	 * If provided, the following user metadata entry will be appended to the `accountMetadata` list:
	 * - key: "associatedApp"
	 * - value: `associatedApp`.
	 * @param accountMetadata The list of user metadata. Note that a metadata `key` needs to be 32bytes.
	 *
	 * @returns A `Promise` which resolves to minted token ID. It's equal to the user ID controlled by it.
	 * @throws {@link DripsErrors.argumentMissingError} if the `transferToAddress` is missing.
	 * @throws {@link DripsErrors.txEventNotFound} if the expected transaction event is not found.
	 * @throws {@link DripsErrors.addressError} if the `transferToAddress` is not valid.
	 */
	public async safeCreateAccountWithSalt(
		salt: number,
		transferToAddress: string,
		associatedApp?: string,
		accountMetadata: AccountMetadata[] = []
	): Promise<string> {
		validateAddress(transferToAddress);
		validateEmitAccountMetadataInput(accountMetadata);

		if (associatedApp) {
			accountMetadata.push({ key: dripsConstants.ASSOCIATED_APP_KEY, value: associatedApp });
		}

		const accountMetadataAsBytes = accountMetadata.map((m) => Utils.Metadata.createFromStrings(m.key, m.value));

		const txResponse = await this.#driver.safeMintWithSalt(salt, transferToAddress, accountMetadataAsBytes);

		return this.#getTokenIdFromTxResponse(txResponse);
	}

	/**
	 * Collects the received and already split funds and transfers them from the `Drips` contract to an address.
	 *
	 * The caller (client's `signer`) must be the owner of the `tokenId` or be approved to use it.
	 * @param tokenId The ID of the token representing the collecting account.
	 * @param tokenAddress The ERC20 token address.
	 *
	 * It must preserve amounts, so if some amount of tokens is transferred to
	 * an address, then later the same amount must be transferrable from that address.
	 * Tokens which rebase the holders' balances, collect taxes on transfers,
	 * or impose any restrictions on holding or transferring tokens are not supported.
	 * If you use such tokens in the protocol, they can get stuck or lost.
	 * @param transferToAddress The address to send collected funds to.
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

		const tx = await this.#txFactory.collect(tokenId, tokenAddress, transferToAddress);

		return this.#signer.sendTransaction(tx);
	}

	/**
	 * Gives funds to the receiver.
	 * The receiver can collect them immediately.
	 *
	 * The caller (client's `signer`) must be the owner of the `tokenId` or be approved to use it.
	 * @param tokenId The ID of the token representing the giving account.
	 * @param receiverAccountId The receiver user ID.
	 * @param tokenAddress The ERC20 token address.
	 *
	 * It must preserve amounts, so if some amount of tokens is transferred to
	 * an address, then later the same amount must be transferrable from that address.
	 * Tokens which rebase the holders' balances, collect taxes on transfers,
	 * or impose any restrictions on holding or transferring tokens are not supported.
	 * If you use such tokens in the protocol, they can get stuck or lost.
	 * @param amount The amount to give (in the smallest unit, e.g., Wei). It must be greater than `0`.
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {@link DripsErrors.argumentMissingError} if any of the required parameters is missing.
	 * @throws {@link DripsErrors.addressError} if the `tokenAddress` is not valid.
	 * @throws {@link DripsErrors.argumentError} if the `amount` is less than or equal to `0`.
	 */
	public async give(
		tokenId: string,
		receiverAccountId: string,
		tokenAddress: string,
		amount: BigNumberish
	): Promise<ContractTransaction> {
		if (isNullOrUndefined(tokenId)) {
			throw DripsErrors.argumentMissingError(
				`Could not give: '${nameOf({ tokenId })}' is missing.`,
				nameOf({ tokenId })
			);
		}

		if (isNullOrUndefined(receiverAccountId)) {
			throw DripsErrors.argumentMissingError(
				`Could not give: '${nameOf({ receiverAccountId })}' is missing.`,
				nameOf({ receiverAccountId })
			);
		}

		if (!amount || BigNumber.from(amount).lte(0)) {
			throw DripsErrors.argumentError(
				`Could not give: '${nameOf({ amount })}' must be greater than 0.`,
				nameOf({ amount }),
				amount
			);
		}

		validateAddress(tokenAddress);

		const tx = await this.#txFactory.give(tokenId, receiverAccountId, tokenAddress, amount);

		return this.#signer.sendTransaction(tx);
	}

	/**
	 * Sets a Drips configuration for the given account.
	 *
	 * It will transfer funds from the client's `signer` wallet to the `Drips` contract to fulfill the change of the drips balance.
	 *
	 * The caller (client's `signer`) must be the owner of the `tokenId` or be approved to use it.
	 * @param tokenId The ID of the token representing the configured account.
	 * @param tokenAddress The ERC20 token address.
	 *
	 * It must preserve amounts, so if some amount of tokens is transferred to
	 * an address, then later the same amount must be transferrable from that address.
	 * Tokens which rebase the holders' balances, collect taxes on transfers,
	 * or impose any restrictions on holding or transferring tokens are not supported.
	 * If you use such tokens in the protocol, they can get stuck or lost.
	 * @param currentReceivers The drips receivers that were set in the last drips update.
	 * Pass an empty array if this is the first update.
	 *
	 * **Tip**: you might want to use `DripsSubgraphClient.getCurrentStreamsReceivers` to easily retrieve the list of current receivers.
	 * @param newReceivers The new drips receivers (max `100`).
	 * Duplicate receivers are not allowed and will only be processed once.
	 * Pass an empty array  if you want to clear all receivers.
	 * @param transferToAddress The address to send funds to in case of decreasing balance.
	 * @param balanceDelta The drips balance change to be applied:
	 * - Positive to add funds to the drips balance.
	 * - Negative to remove funds from the drips balance.
	 * - `0` to leave drips balance as is (default value).
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {@link DripsErrors.argumentMissingError} if any of the required parameters is missing.
	 * @throws {@link DripsErrors.addressError} if `tokenAddress` or `transferToAddress` is not valid.
	 * @throws {@link DripsErrors.argumentError} if `currentReceivers`' or `newReceivers`' count exceeds the max allowed drips receivers.
	 * @throws {@link DripsErrors.streamsReceiverError} if any of the `currentReceivers` or the `newReceivers` is not valid.
	 * @throws {@link DripsErrors.streamConfigError} if any of the receivers' configuration is not valid.
	 * @throws {@link DripsErrors.streamConfigError} if any of the receivers' configuration is not valid.
	 */
	public async setStreams(
		tokenId: string,
		tokenAddress: string,
		currentReceivers: StreamReceiverStruct[],
		newReceivers: StreamReceiverStruct[],
		transferToAddress: string,
		balanceDelta: BigNumberish = 0
	): Promise<ContractTransaction> {
		if (isNullOrUndefined(tokenId)) {
			throw DripsErrors.argumentMissingError(
				`Could not set drips: '${nameOf({ tokenId })}' is missing.`,
				nameOf({ tokenId })
			);
		}
		validateSetStreamsInput(
			tokenAddress,
			currentReceivers?.map((r) => ({
				accountId: r.accountId.toString(),
				config: Utils.StreamConfiguration.fromUint256(BigNumber.from(r.config).toBigInt())
			})),
			newReceivers?.map((r) => ({
				accountId: r.accountId.toString(),
				config: Utils.StreamConfiguration.fromUint256(BigNumber.from(r.config).toBigInt())
			})),
			transferToAddress,
			balanceDelta
		);

		const tx = await this.#txFactory.setStreams(
			tokenId,
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
	 * Sets the account's Splits configuration.
	 *
	 * The caller (client's `signer`) must be the owner of the `tokenId` or be approved to use it.
	 * @param tokenId The ID of the token representing the configured account.
	 * @param receivers The splits receivers (max `200`).
	 * Each splits receiver will be getting `weight / TOTAL_SPLITS_WEIGHT` share of the funds.
	 * Duplicate receivers are not allowed and will only be processed once.
	 * Pass an empty array if you want to clear all receivers.
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {@link DripsErrors.argumentMissingError} if `receivers` are missing.
	 * @throws {@link DripsErrors.argumentError} if `receivers`' count exceeds the max allowed splits receivers.
	 * @throws {@link DripsErrors.splitsReceiverError} if any of the `receivers` is not valid.
	 */
	public async setSplits(tokenId: string, receivers: SplitsReceiverStruct[]): Promise<ContractTransaction> {
		if (isNullOrUndefined(tokenId)) {
			throw DripsErrors.argumentMissingError(
				`Could not set splits: '${nameOf({ tokenId })}' is missing.`,
				nameOf({ tokenId })
			);
		}

		validateSplitsReceivers(receivers);

		const tx = await this.#txFactory.setSplits(tokenId, receivers);

		return this.#signer.sendTransaction(tx);
	}

	/**
	 * Emits the account's metadata.
	 * The key and the value are _not_ standardized by the protocol, it's up to the caller to establish and follow conventions to ensure compatibility with the consumers.
	 *
	 * The caller (client's `signer`) must be the owner of the `tokenId` or be approved to use it.
	 * @param tokenId The ID of the token representing the emitting account.
	 * @param accountMetadata The list of user metadata. Note that a metadata `key` needs to be 32bytes.
	 *
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {@link DripsErrors.argumentError} if any of the metadata entries is not valid.
	 */
	public async emitAccountMetadata(tokenId: string, accountMetadata: AccountMetadata[]): Promise<ContractTransaction> {
		if (!tokenId) {
			throw DripsErrors.argumentError(`Could not emit user metadata: '${nameOf({ tokenId })}' is missing.`);
		}

		validateEmitAccountMetadataInput(accountMetadata);

		const accountMetadataAsBytes = accountMetadata.map((m) => Utils.Metadata.createFromStrings(m.key, m.value));

		const tx = await this.#txFactory.emitAccountMetadata(tokenId, accountMetadataAsBytes);

		return this.#signer.sendTransaction(tx);
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
