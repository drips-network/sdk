/* eslint-disable no-dupe-class-members */
import type { Provider } from '@ethersproject/providers';
import type { BigNumberish, ContractTransaction, Signer } from 'ethers';
import { ethers, BigNumber, constants } from 'ethers';
import type { Address, StreamReceiverStruct, Forge, SplitsReceiverStruct, AccountMetadata } from '../common/types';
import {
	validateAddress,
	validateClientProvider,
	validateClientSigner,
	validateCollectInput,
	validateEmitAccountMetadataInput,
	validateSetStreamsInput,
	validateSplitsReceivers
} from '../common/validators';
import Utils from '../utils';
import { DripsErrors } from '../common/DripsError';
import type { RepoDriver } from '../../contracts';
import { IERC20__factory, RepoDriver__factory } from '../../contracts';
import { isNullOrUndefined, ensureSignerExists } from '../common/internals';
import type { IRepoDriverTxFactory } from './RepoDriverTxFactory';
import RepoDriverTxFactory from './RepoDriverTxFactory';

/**
 * A client for interacting with the `RepoDriver` contract.
 * Each repository stored in one of the supported forges has a deterministic user ID assigned.
 * By default the repositories have no owner and their users cannot be controlled by anybody.
 */
export default class RepoDriverClient {
	#provider!: Provider;
	#driver!: RepoDriver;
	#driverAddress!: string;
	#signer: Signer | undefined;
	#txFactory!: IRepoDriverTxFactory;

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

	/** Returns the `RepoDriver`'s address to which the `RepoDriverClient` is connected. */
	public get driverAddress(): string {
		return this.#driverAddress;
	}

	private constructor() {}

	/**
	 * Creates a new immutable `RepoDriverClient` instance.
	 * @param provider The network provider. It cannot be changed after creation.
	 *
	 * The `provider` must be connected to one of the following supported networks:
	 * - 'mainnet': chain ID `1`
	 * - 'goerli': chain ID `5`
	 * - 'polygon-mumbai': chain ID `80001`
	 * @param signer The singer used to sign transactions. It cannot be changed after creation.
	 *
	 * **Important**: If the `signer` is _not_ connected to a provider it will try to connect to the `provider`, else it will use the `signer.provider`.
	 * @param customDriverAddress Overrides the `RepoDriver` contract address.
	 * If it's `undefined` (default value), the address will be automatically selected based on the `provider`'s network.
	 * @returns A `Promise` which resolves to the new client instance.
	 * @throws {@link DripsErrors.initializationError} if the client initialization fails.
	 */
	public static async create(
		provider: Provider,
		signer?: Signer,
		customDriverAddress?: string
	): Promise<RepoDriverClient>;
	public static async create(
		provider: Provider,
		signer?: Signer,
		customDriverAddress?: string,
		txFactory?: IRepoDriverTxFactory
	): Promise<RepoDriverClient>;
	public static async create(
		provider: Provider,
		signer?: Signer,
		customDriverAddress?: string,
		txFactory?: IRepoDriverTxFactory
	): Promise<RepoDriverClient> {
		await validateClientProvider(provider, Utils.Network.SUPPORTED_CHAINS);

		if (signer) {
			if (!signer.provider) {
				// eslint-disable-next-line no-param-reassign
				signer = signer.connect(provider);
			}

			await validateClientSigner(signer, Utils.Network.SUPPORTED_CHAINS);
		}

		const network = await provider.getNetwork();
		const driverAddress = customDriverAddress ?? Utils.Network.configs[network.chainId].REPO_DRIVER;

		const client = new RepoDriverClient();

		client.#signer = signer;
		client.#provider = provider;
		client.#driverAddress = driverAddress;
		client.#driver = RepoDriver__factory.connect(driverAddress, signer ?? provider);

		if (signer) {
			client.#txFactory = txFactory || (await RepoDriverTxFactory.create(signer, customDriverAddress));
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
	public async getAllowance(tokenAddress: Address): Promise<bigint> {
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
	public approve(tokenAddress: Address): Promise<ContractTransaction> {
		ensureSignerExists(this.#signer);
		validateAddress(tokenAddress);

		const signerAsErc20Contract = IERC20__factory.connect(tokenAddress, this.#signer);

		return signerAsErc20Contract.approve(this.#driverAddress, constants.MaxUint256);
	}

	/**
	 * Returns the user ID.
	 *
	 * Every repo ID is a 224-bit integer constructed by concatenating: `forge (8 bits) | uint216(keccak256(name)) (216 bits)`.
	 *
	 * @param forge The forge where the repository is stored.
	 * @param name The repository name.
	 * @returns The user ID.
	 * @throws DripsErrors.argumentError if the `forge` or `name` is missing.
	 */
	public async getAccountId(forge: Forge, name: string): Promise<string> {
		if (isNullOrUndefined(forge) || !name) {
			throw DripsErrors.argumentError('Could not calculate repo ID: forge or name is missing.');
		}

		const nameAsHexString = ethers.utils.toUtf8Bytes(name);
		const nameAsBytesLike = ethers.utils.arrayify(nameAsHexString);

		const accountId = await this.#driver.calcAccountId(forge, nameAsBytesLike);

		return accountId.toString();
	}

	/**
	 * Returns the user owner.
	 * @param accountId The ID of the user.
	 * @returns The owner of the user or `null` if the user has no owner.
	 * @throws DripsErrors.argumentError if the `accountId` is missing.
	 */
	public async getOwner(accountId: string): Promise<Address | null> {
		if (isNullOrUndefined(accountId)) {
			throw DripsErrors.argumentError('Could get user owner: accountId is missing.');
		}

		const owner = await this.#driver.ownerOf(accountId);

		return owner === constants.AddressZero ? null : owner;
	}

	/**
	 * Triggers a request to update the ownership of the user representing the repository.
	 * The actual update of the owner will be made in a future transaction.
	 * The fee (in Link) that must be paid to the Chainlink operator will be covered by the `RepoDriver`.
	 * If you want to cover the fee yourself, use `onTokenTransfer`.
	 * @see {@link https://github.com/radicle-dev/drips-contracts/blob/master/src/RepoDriver.sol RepoDriver.requestUpdateRepoOwner} for more.
	 * @param forge The forge where the repository is stored.
	 * @param name The repository name.
	 * @returns The contract transaction.
	 * @throws DripsErrors.argumentError if the `forge` or `name` is missing.
	 */
	public async requestOwnerUpdate(forge: Forge, name: string): Promise<ContractTransaction> {
		ensureSignerExists(this.#signer);
		if (isNullOrUndefined(forge) || !name) {
			throw DripsErrors.argumentError('Could not request update repo owner: forge or name is missing.');
		}

		const nameAsBytes = ethers.utils.hexlify(ethers.utils.toUtf8Bytes(name));

		const tx = await this.#txFactory.requestUpdateOwner(forge, nameAsBytes);

		return this.#signer.sendTransaction(tx);
	}

	/**
	 * Collects the received and already split funds and transfers them from the `Drips` contract to an address.
	 * @param tokenAddress The ERC20 token address.
	 *
	 * It must preserve amounts, so if some amount of tokens is transferred to
	 * an address, then later the same amount must be transferrable from that address.
	 * Tokens which rebase the holders' balances, collect taxes on transfers,
	 * or impose any restrictions on holding or transferring tokens are not supported.
	 * If you use such tokens in the protocol, they can get stuck or lost.
	 * @param accountId The ID of the collecting user.
	 * @param tokenAddress The ERC20 token address.
	 * @param transferToAddress The address to send collected funds to.
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {@link DripsErrors.addressError} if `tokenAddress` or `transferToAddress` is not valid.
	 * @throws {@link DripsErrors.signerMissingError} if the provider's signer is missing.
	 */
	public async collect(
		accountId: string,
		tokenAddress: Address,
		transferToAddress: Address
	): Promise<ContractTransaction> {
		if (isNullOrUndefined(accountId)) {
			throw DripsErrors.argumentError('Could not collect: accountId is missing.');
		}
		ensureSignerExists(this.#signer);
		validateCollectInput(tokenAddress, transferToAddress);

		const tx = await this.#txFactory.collect(accountId, tokenAddress, transferToAddress);

		return this.#signer.sendTransaction(tx);
	}

	/**
	 * Gives funds to the receiver.
	 * The receiver can collect them immediately.
	 * Transfers funds from the user's wallet to the `Drips` contract.
	 * @param accountId The ID of the giving user. The caller must be the owner of the user.
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
	 * @throws {@link DripsErrors.argumentMissingError} if the `receiverAccountId` is missing.
	 * @throws {@link DripsErrors.addressError} if the `tokenAddress` is not valid.
	 * @throws DripsErrors.argumentError if the `amount` is less than or equal to `0`.
	 * @throws {@link DripsErrors.signerMissingError} if the provider's signer is missing.
	 */
	public async give(
		accountId: string,
		receiverAccountId: string,
		tokenAddress: Address,
		amount: BigNumberish
	): Promise<ContractTransaction> {
		ensureSignerExists(this.#signer);

		if (isNullOrUndefined(accountId)) {
			throw DripsErrors.argumentError('Could not give: accountId is missing.');
		}

		if (isNullOrUndefined(receiverAccountId)) {
			throw DripsErrors.argumentError(`Could not give: receiverAccountId is missing.`);
		}
		validateAddress(tokenAddress);

		if (!amount || BigNumber.from(amount).lt(0)) {
			throw DripsErrors.argumentError(`Could not give: amount must be greater than 0.`);
		}

		const tx = await this.#txFactory.give(accountId, receiverAccountId, tokenAddress, amount);

		return this.#signer.sendTransaction(tx);
	}

	/**
	 * Sets the Splits configuration.
	 * @param accountId The ID of the configured user. The caller must be the owner of the user.
	 * @param receivers The splits receivers (max `200`).
	 * Each splits receiver will be getting `weight / TOTAL_SPLITS_WEIGHT` share of the funds.
	 * Duplicate receivers are not allowed and will only be processed once.
	 * Pass an empty array if you want to clear all receivers.
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {@link DripsErrors.argumentMissingError} if `receivers` are missing.
	 * @throws DripsErrors.argumentError if `receivers`' count exceeds the max allowed splits receivers.
	 * @throws {@link DripsErrors.splitsReceiverError} if any of the `receivers` is not valid.
	 * @throws {@link DripsErrors.signerMissingError} if the provider's signer is missing.
	 */
	public async setSplits(accountId: string, receivers: SplitsReceiverStruct[]): Promise<ContractTransaction> {
		if (isNullOrUndefined(accountId)) {
			throw DripsErrors.argumentError('Could not setSplits: accountId is missing.');
		}
		ensureSignerExists(this.#signer);
		validateSplitsReceivers(receivers);

		const tx = await this.#txFactory.setSplits(accountId, receivers);

		return this.#signer.sendTransaction(tx);
	}

	/**
	 * Sets a Drips configuration.
	 * Transfers funds from the user's wallet to the `Drips` contract to fulfill the change of the drips balance.
	 * @param accountId The ID of the configured user. The caller must be the owner of the user.
	 *
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
	 * **Tip**: you might want to use `DripsSubgraphClient.getCurrentStreamsReceivers` to easily retrieve the list of current receivers.
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
	 * @throws DripsErrors.argumentError if `currentReceivers`' or `newReceivers`' count exceeds the max allowed drips receivers.
	 * @throws {@link DripsErrors.streamsReceiverError} if any of the `currentReceivers` or the `newReceivers` is not valid.
	 * @throws {@link DripsErrors.streamConfigError} if any of the receivers' configuration is not valid.
	 * @throws {@link DripsErrors.signerMissingError} if the provider's signer is missing.
	 */
	public async setStreams(
		accountId: string,
		tokenAddress: Address,
		currentReceivers: StreamReceiverStruct[],
		newReceivers: StreamReceiverStruct[],
		transferToAddress: Address,
		balanceDelta: BigNumberish = 0
	): Promise<ContractTransaction> {
		if (isNullOrUndefined(accountId)) {
			throw DripsErrors.argumentError('Could not setSplits: accountId is missing.');
		}
		ensureSignerExists(this.#signer);
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
			accountId,
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
	 * @param accountId The ID of the emitting user. The caller must be the owner of the user.
	 * @param accountMetadata The list of user metadata. Note that a metadata `key` needs to be 32bytes.
	 *
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws DripsErrors.argumentError if any of the metadata entries is not valid.
	 * @throws {@link DripsErrors.signerMissingError} if the provider's signer is missing.
	 */
	public async emitAccountMetadata(
		accountId: string,
		accountMetadata: AccountMetadata[]
	): Promise<ContractTransaction> {
		if (isNullOrUndefined(accountId)) {
			throw DripsErrors.argumentError('Could not setSplits: accountId is missing.');
		}
		ensureSignerExists(this.#signer);
		validateEmitAccountMetadataInput(accountMetadata);

		const accountMetadataAsBytes = accountMetadata.map((m) => Utils.Metadata.createFromStrings(m.key, m.value));

		const tx = await this.#txFactory.emitAccountMetadata(accountId, accountMetadataAsBytes);

		return this.#signer.sendTransaction(tx);
	}
}
