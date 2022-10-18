import type { JsonRpcProvider, JsonRpcSigner } from '@ethersproject/providers';
import type { Network } from '@ethersproject/networks';
import type { DripsMetadata } from 'src/common/types';
import type { BigNumberish, BytesLike, ContractTransaction } from 'ethers';
import { BigNumber } from 'ethers';
import type { DripsReceiverStruct, SplitsReceiverStruct } from 'contracts/NFTDriver';
import type { NFTDriver as NFTDriverContract } from '../../contracts';
import { DripsErrors } from '../common/DripsError';
import {
	formatDripsReceivers,
	formatSplitReceivers,
	isNullOrUndefined,
	nameOf,
	validateAddress,
	validateDripsReceivers,
	validateSplitsReceivers
} from '../common/internals';
import Utils from '../utils';
import DripsHubClient from '../DripsHub/DripsHubClient';
import { NFTDriver__factory } from '../../contracts';

/**
 * A client for managing Drips for a user identified by an NFT.
 * Anybody can mint a new token and create a new identity.
 * Only the current holder of the token can control its user ID.
 * The token ID and the user ID controlled by it are always equal.
 * @see {@link https://github.com/radicle-dev/drips-contracts/blob/master/src/NFTDriver.sol NFTDriver} smart contract.
 */
export default class NFTDriverClient {
	#nftDriverContract!: NFTDriverContract;

	#signer!: JsonRpcSigner;
	/**
	 * Returns the `NFTDriverClient`'s `signer`.
	 *
	 * This is the owner of the NFT (or someone that is approved to use it) that controls the user to which the `NFTDriverClient` is linked and manages Drips.
	 *
	 * The `signer` is the `provider`'s signer.
	 */
	public get signer(): JsonRpcSigner {
		return this.#signer;
	}

	#signerAddress!: string;
	/** Returns the `NFTDriverClient`'s `signer` address. */
	public get signerAddress(): string {
		return this.#signerAddress;
	}

	#dripsHub!: DripsHubClient;
	/** Returns a {@link DripsHubClient} connected to the same provider as the `NFTDriverClient.` */
	public get dripsHub(): DripsHubClient {
		return this.#dripsHub;
	}

	#network!: Network;
	/**
	 * Returns the network the `NFTDriverClient` is connected to.
	 *
	 * The `network` is the `provider`'s network.
	 */
	public get network() {
		return this.#network;
	}

	#provider!: JsonRpcProvider;
	/** Returns the `NFTDriverClient`'s `provider`. */
	public get provider(): JsonRpcProvider {
		return this.#provider;
	}

	#dripsMetadata!: DripsMetadata;
	/** Returns the `NFTDriverClient`'s `network` {@link DripsMetadata}. */
	public get dripsMetadata() {
		return this.#dripsMetadata;
	}

	private constructor() {}

	// TODO: Update the supported chains documentation comments.
	/**
	 * Creates a new immutable `NFTDriverClient` instance.
	 * @param  {JsonRpcProvider} provider The `provider` must have a `signer` associated with it.
	 * **This signer must be the owner of the NFT (or someone that is approved to use it) that controls the user the new `NFTDriverClient` will manage and cannot be changed after creation**.
	 *
	 * The `provider` can connect to the following supported networks:
	 * - 'goerli': chain ID 5
	 * @returns A `Promise` which resolves to the new `NFTDriverClient` instance.
	 * @throws {DripsErrors.argumentMissingError} if the `provider` is missing.
	 * @throws {DripsErrors.argumentError} if the `provider`'s singer is missing.
	 * @throws {DripsErrors.addressError} if the `provider`'s signer address is not valid.
	 * @throws {DripsErrors.unsupportedNetworkError} if the `provider` is connected to an unsupported network.
	 */
	public static async create(provider: JsonRpcProvider): Promise<NFTDriverClient> {
		if (!provider) {
			throw DripsErrors.argumentMissingError(
				"Could not create a new 'NFTDriverClient': the provider is missing.",
				nameOf({ provider })
			);
		}

		const signer = provider.getSigner();
		const signerAddress = await signer?.getAddress();
		if (!signerAddress) {
			throw DripsErrors.argumentError(
				"Could not create a new 'NFTDriverClient': the provider's signer address is missing.",
				nameOf({ provider }),
				provider
			);
		}
		validateAddress(signerAddress);

		const network = await provider.getNetwork();
		if (!Utils.Network.isSupportedChain(network?.chainId)) {
			throw DripsErrors.unsupportedNetworkError(
				`Could not create a new 'NFTDriverClient': the provider is connected to an unsupported network (name: '${
					network?.name
				}', chain ID: ${network?.chainId}). Supported chains are: ${Utils.Network.SUPPORTED_CHAINS.toString()}.`,
				network?.chainId
			);
		}
		const dripsMetadata = Utils.Network.dripsMetadata[network.chainId];

		const nftDriverClient = new NFTDriverClient();

		nftDriverClient.#signer = signer;
		nftDriverClient.#network = network;
		nftDriverClient.#provider = provider;
		nftDriverClient.#dripsMetadata = dripsMetadata;
		nftDriverClient.#signerAddress = await signer.getAddress();
		nftDriverClient.#dripsHub = await DripsHubClient.create(provider);
		nftDriverClient.#nftDriverContract = NFTDriver__factory.connect(dripsMetadata.CONTRACT_NFT_DRIVER, signer);

		return nftDriverClient;
	}

	/**
	 * Mints a new token controlling a new user ID and transfers it to an address.
	 * Usage of this method is discouraged, use `safeMint` whenever possible.
	 * @param  {string} transferToAddress The address to transfer the minted token to.
	 * @returns A `Promise` which resolves to the minted token ID. It's equal to the user ID controlled by it.
	 * @throws {DripsErrors.argumentMissingError} if the `transferToAddress` is missing.
	 * @throws {DripsErrors.addressError} if the `transferToAddress` is not valid.
	 */
	public async mint(transferToAddress: string): Promise<bigint> {
		if (!transferToAddress) {
			throw DripsErrors.argumentMissingError(
				`Could not mint: '${nameOf({ transferToAddress })}' is missing.`,
				nameOf({ transferToAddress })
			);
		}

		validateAddress(transferToAddress);

		const txResponse = await this.#nftDriverContract.mint(transferToAddress);

		const txReceipt = await txResponse.wait();
		const [transferEvent] = txReceipt.events!;
		const { tokenId } = transferEvent.args!;

		return BigInt(tokenId);
	}

	/**
	 * Mints a new token controlling a new user ID and safely transfers it to an address.
	 * @param  {string} transferToAddress The address to transfer the minted token to.
	 * @returns A `Promise` which resolves to the minted token ID. It's equal to the user ID controlled by it.
	 * @throws {DripsErrors.argumentMissingError} if the `transferToAddress` is missing.
	 * @throws {DripsErrors.addressError} if the `transferToAddress` is not valid.
	 */
	public async safeMint(transferToAddress: string): Promise<bigint> {
		if (!transferToAddress) {
			throw DripsErrors.argumentMissingError(
				`Could not (safely) mint: '${nameOf({ transferToAddress })}' is missing.`,
				nameOf({ transferToAddress })
			);
		}

		validateAddress(transferToAddress);

		const txResponse = await this.#nftDriverContract.safeMint(transferToAddress);

		const txReceipt = await txResponse.wait();
		const [transferEvent] = txReceipt.events!;
		const { tokenId } = transferEvent.args!;

		return BigInt(tokenId);
	}

	// TODO: Add squeezing support.

	/**
	 * Collects the received and already split funds and transfers them from the `DripsHub` smart contract to an address.
	 * @param  {BigNumberish} tokenId The ID of the token representing the collecting user ID.
	 * The token ID is equal to the user ID controlled by it.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @param  {string} transferToAddress The address to send collected funds to.
	 * @returns A `Promise` which resolves to the `ContractTransaction`.
	 * @throws {DripsErrors.argumentMissingError} if the `tokenId` is missing.
	 * @throws {DripsErrors.addressError} if `tokenAddress` or `transferToAddress` is not valid.
	 */
	public async collect(
		tokenId: BigNumberish,
		tokenAddress: string,
		transferToAddress: string
	): Promise<ContractTransaction> {
		if (isNullOrUndefined(tokenId)) {
			throw DripsErrors.argumentMissingError(
				`Could not collect '${nameOf({ tokenId })}' is missing.`,
				nameOf({ tokenId })
			);
		}

		validateAddress(tokenAddress);
		validateAddress(transferToAddress);

		return this.#nftDriverContract.collect(tokenId, tokenAddress, transferToAddress);
	}

	/**
	 * Gives funds to the receiver.
	 * The receiver can collect them immediately.
	 * Transfers funds from the user's wallet to the `DripsHub` smart contract.
	 * @param  {BigNumberish} tokenId The ID of the token representing the collecting user ID.
	 * The token ID is equal to the user ID controlled by it.
	 * @param  {string} receiverUserId The receiver user ID.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @param  {BigNumberish} amount The amount to give (in the smallest unit, e.g. Wei). It must be greater than `0`.
	 * @returns A `Promise` which resolves to the `ContractTransaction`.
	 * @throws {DripsErrors.argumentMissingError} if any of the required parameters is missing.
	 * @throws {DripsErrors.addressError} if the `tokenAddress` is not valid.
	 * @throws {DripsErrors.argumentError} if the `amount` is less than or equal to `0`.
	 */
	public give(
		tokenId: BigNumberish,
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

		return this.#nftDriverContract.give(tokenId, receiverUserId, tokenAddress, amount);
	}

	/**
	 * Sets a drips configuration.
	 * Transfers funds from the user's wallet to the `DripsHub` smart contract to fulfill the change of the drips balance.
	 * @param  {BigNumberish} tokenId The ID of the token representing the collecting user ID.
	 * The token ID is equal to the user ID controlled by it.
	 * @param  {string} tokenAddress The ERC20 token address.
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
	 * @returns A `Promise` which resolves to the `ContractTransaction`.
	 * @throws {DripsErrors.argumentMissingError} if any of the required parameters is missing.
	 * @throws {DripsErrors.addressError} if `tokenAddress` or `transferToAddress` is not valid.
	 * @throws {DripsErrors.argumentError} if `currentReceivers`' or `newReceivers`' count exceeds the max allowed drips receivers.
	 * @throws {DripsErrors.dripsReceiverError} if any of the `currentReceivers` or the `newReceivers` is not valid.
	 * @throws {DripsErrors.dripsReceiverConfigError} if any of the receivers' configuration is not valid.
	 * @throws {DripsErrors.dripsReceiverConfigError} if any of the receivers' configuration is not valid.
	 */
	public setDrips(
		tokenId: BigNumberish,
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

		return this.#nftDriverContract.setDrips(
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
	 * @param  {BigNumberish} tokenId The ID of the token representing the collecting user ID. The token ID is equal to the user ID controlled by it.
	 * @param  {SplitsReceiverStruct[]} receivers The splits receivers (max `200`).
	 * Each splits receiver will be getting `weight / TOTAL_SPLITS_WEIGHT` share of the funds.
	 * Duplicate receivers are not allowed and will only be processed once.
	 * Pass an empty array if you want to clear all receivers.
	 * @returns A `Promise` which resolves to the `ContractTransaction`.
	 * @throws {DripsErrors.argumentMissingError} if `receivers` are missing.
	 * @throws {DripsErrors.argumentError} if `receivers`' count exceeds the max allowed splits receivers.
	 * @throws {DripsErrors.splitsReceiverError} if any of the `receivers` is not valid.
	 */
	public setSplits(tokenId: BigNumberish, receivers: SplitsReceiverStruct[]): Promise<ContractTransaction> {
		if (isNullOrUndefined(tokenId)) {
			throw DripsErrors.argumentMissingError(
				`Could not set splits: '${nameOf({ tokenId })}' is missing.`,
				nameOf({ tokenId })
			);
		}

		validateSplitsReceivers(receivers);

		return this.#nftDriverContract.setSplits(tokenId, formatSplitReceivers(receivers));
	}

	/**
	 * Emits the user's metadata.
	 * The key and the value are _not_ standardized by the protocol, it's up to the user to establish and follow conventions to ensure compatibility with the consumers.
	 * @param  {BigNumberish} tokenId The ID of the token representing the collecting user ID. The token ID is equal to the user ID controlled by it.
	 * @param  {BigNumberish} key The metadata key.
	 * @param  {BytesLike} value The metadata value.
	 * @returns A `Promise` which resolves to the `ContractTransaction`.
	 * @throws {DripsErrors.argumentMissingError} if any of the required parameters is missing.
	 */
	public emitUserMetadata(tokenId: BigNumberish, key: BigNumberish, value: BytesLike): Promise<ContractTransaction> {
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

		return this.#nftDriverContract.emitUserMetadata(tokenId, key, value);
	}
}
