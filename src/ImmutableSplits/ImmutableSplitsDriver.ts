import type { JsonRpcProvider } from '@ethersproject/providers';
import type { SplitsReceiverStruct, UserMetadataStruct } from 'contracts/ImmutableSplitsDriver';
import type { ContractTransaction } from 'ethers';
import type { ImmutableSplitsDriver } from '../../contracts/ImmutableSplitsDriver';
import { nameOf } from '../common/internals';
import { ImmutableSplitsDriver__factory } from '../../contracts/factories/ImmutableSplitsDriver__factory';
import Utils from '../utils';
import { DripsErrors } from '../common/DripsError';
import { validateClientProvider, validateSplitsReceivers } from '../common/validators';

/**
 * A client for creating immutable splits configurations.
 *
 * Anybody can create a new `userId` and configure its splits configuration,
 * but nobody can update its configuration afterwards, it's immutable.
 * @see {@link https://github.com/radicle-dev/drips-contracts/blob/master/src/ImmutableSplitsDriver.sol ImmutableSplitsDriver} smart contract.
 */
export default class ImmutableSplitsDriverClient {
	#driverAddress!: string;
	#provider!: JsonRpcProvider;
	#driver!: ImmutableSplitsDriver;

	/** Returns the `ImmutableSplitsDriverClient`'s `provider`. */
	public get provider(): JsonRpcProvider {
		return this.#provider;
	}

	/** Returns the `ImmutableSplitsDriver`'s address to which the `ImmutableSplitsDriverClient` is connected. */
	public get driverAddress(): string {
		return this.#driverAddress;
	}

	private constructor() {}

	// TODO: Update the supported chains documentation comments.
	/**
	 * Creates a new immutable instance of an `ImmutableSplitsDriverClient`.
	 * @param  {JsonRpcProvider} provider The `provider` must have a `signer` associated with it and can connect to the following supported networks:
	 * - 'goerli': chain ID `5`
	 * @param  {string|undefined} customDriverAddress Overrides the `ImmutableSplitsDriver`'s address.
	 * If it's `undefined` (default value), the address will be automatically selected based on the `provider`'s network.
	 * @returns A `Promise` which resolves to the new `ImmutableSplitsDriverClient` instance.
	 * @throws {@link DripsErrors.argumentMissingError} if the `provider` is missing.
	 * @throws {@link DripsErrors.argumentError} if the `provider.signer` is missing.
	 * @throws {@link DripsErrors.unsupportedNetworkError} if the `provider` is connected to an unsupported network.
	 */
	public static async create(
		provider: JsonRpcProvider,
		customDriverAddress?: string
	): Promise<ImmutableSplitsDriverClient> {
		await validateClientProvider(provider, Utils.Network.SUPPORTED_CHAINS);

		const signer = provider.getSigner();
		const network = await provider.getNetwork();
		const driverAddress =
			customDriverAddress ?? Utils.Network.configs[network.chainId].CONTRACT_IMMUTABLE_SPLITS_DRIVER;

		const client = new ImmutableSplitsDriverClient();

		client.#provider = provider;
		client.#driverAddress = driverAddress;
		client.#driver = ImmutableSplitsDriver__factory.connect(driverAddress, signer);

		return client;
	}

	/**
	 * Creates a new user ID, configures its splits configuration and emits its metadata.
	 * The configuration is immutable and nobody can control the user ID after its creation.
	 * Calling this function is the only way and the only chance to emit metadata for that user.
	 * @param  {SplitsReceiverStruct[]} receivers The splits receivers.
	 * @param  {UserMetadataStruct[]} metadata The list of user metadata to emit for the created user.
	 * The key and the value are _not_ standardized by the protocol, it's up to the user to establish and follow conventions to ensure compatibility with the consumers.
	 * @returns A `Promise` which resolves to the contract transaction.
	 * @throws {@link DripsErrors.argumentMissingError} if the `receivers` are missing.
	 * @throws {@link DripsErrors.splitsReceiverError} if any of the `receivers` is not valid.
	 */
	public async createSplits(
		receivers: SplitsReceiverStruct[],
		metadata: UserMetadataStruct[]
	): Promise<ContractTransaction> {
		validateSplitsReceivers(receivers);

		if (!metadata) {
			throw DripsErrors.argumentMissingError(
				`Could not create immutable splits: '${nameOf({ receivers })}' is missing.`,
				nameOf({ receivers })
			);
		}

		return this.#driver.createSplits(receivers, metadata);
	}
}
