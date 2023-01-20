import type { Provider } from '@ethersproject/providers';
import type { SplitsReceiverStruct, UserMetadata } from 'src/common/types';
import { DripsErrors } from '../common/DripsError';
import type { ImmutableSplitsDriver } from '../../contracts/ImmutableSplitsDriver';
import { ImmutableSplitsDriver__factory } from '../../contracts/factories/ImmutableSplitsDriver__factory';
import Utils from '../utils';
import {
	validateClientProvider,
	validateClientSigner,
	validateEmitUserMetadataInput,
	validateSplitsReceivers
} from '../common/validators';
import { createFromStrings } from '../common/internals';
import { Signer } from 'ethers';

/**
 * A client for creating immutable splits configurations.
 *
 * Anybody can create a new `userId` and configure its splits configuration,
 * but nobody can update its configuration afterwards, it's immutable.
 * @see {@link https://github.com/radicle-dev/drips-contracts/blob/master/src/ImmutableSplitsDriver.sol ImmutableSplitsDriver} contract.
 */
export default class ImmutableSplitsDriverClient {
	#driverAddress!: string;
	#driver!: ImmutableSplitsDriver;

	#provider!: Provider;
	/** Returns the client's `provider`. */
	public get provider(): Provider {
		return this.#provider;
	}

	#signer!: Signer;
	/**
	 * Returns the client's `signer`.
	 *
	 * The `signer` is the `provider`'s signer.
	 */
	public get signer(): Signer {
		return this.#signer;
	}

	/** Returns the `ImmutableSplitsDriver` contract address to which the client is connected. */
	public get driverAddress(): string {
		return this.#driverAddress;
	}

	private constructor() {}

	// TODO: Update the supported chains documentation comments.
	/**
	 * Creates a new immutable `ImmutableSplitsDriverClient` instance.
	 * @param  {Provider} provider The network provider. It cannot be changed after creation.
	 *
	 * The `provider` must be connected to one of the following supported networks:
	 * - 'goerli': chain ID `5`
	 * - 'polygon-mumbai': chain ID `80001`
	 * @param  {Signer} signer The singer used to sign transactions. It cannot be changed after creation.
	 *
	 * **Important**: If the `signer` is _not_ connected to a provider it will try to connect to the `provider`, else it will use the `signer.provider`.
	 * @param  {string|undefined} customDriverAddress Overrides the `NFTDriver` contract address.
	 * If it's `undefined` (default value), the address will be automatically selected based on the `provider`'s network.
	 * @returns A `Promise` which resolves to the new client instance.
	 * @throws {@link DripsErrors.clientInitializationError} if the client initialization fails.
	 */
	public static async create(
		provider: Provider,
		signer: Signer,
		customDriverAddress?: string
	): Promise<ImmutableSplitsDriverClient> {
		try {
			await validateClientProvider(provider, Utils.Network.SUPPORTED_CHAINS);
			await validateClientSigner(signer);

			if (!signer.provider) {
				signer = signer.connect(provider);
			}

			const network = await provider.getNetwork();
			const driverAddress =
				customDriverAddress ?? Utils.Network.configs[network.chainId].CONTRACT_IMMUTABLE_SPLITS_DRIVER;

			const client = new ImmutableSplitsDriverClient();

			client.#signer = signer;
			client.#provider = provider;
			client.#driverAddress = driverAddress;
			client.#driver = ImmutableSplitsDriver__factory.connect(driverAddress, signer);

			return client;
		} catch (error: any) {
			throw DripsErrors.clientInitializationError(`Could not create 'ImmutableSplitsDriverClient': ${error.message}`);
		}
	}

	/**
	 * Creates a new user ID, configures its splits configuration and emits its metadata.
	 * The configuration is immutable and nobody can control the user ID after its creation.
	 * Calling this function is the only way and the only chance to emit metadata for that user.
	 * @param  {SplitsReceiverStruct[]} receivers The splits receivers.
	 * @param  {UserMetadata[]} userMetadata The list of user metadata to emit for the created user. Note that a metadata `key` needs to be 32bytes.
	 *
	 * **Tip**: you might want to use `Utils.UserMetadata.createFromStrings` to easily create metadata instances from `string` inputs.
	 * @returns A `Promise` which resolves to the new user ID.
	 * @throws {@link DripsErrors.argumentMissingError} if the `receivers` are missing.
	 * @throws {@link DripsErrors.splitsReceiverError} if any of the `receivers` is not valid.
	 * @throws {@link DripsErrors.txEventNotFound} if the expected transaction event is not found.
	 */
	public async createSplits(receivers: SplitsReceiverStruct[], userMetadata: UserMetadata[]): Promise<string> {
		validateSplitsReceivers(receivers);
		validateEmitUserMetadataInput(userMetadata);

		const userMetadataAsBytes = userMetadata.map((m) => createFromStrings(m.key, m.value));

		const txResponse = await this.#driver.createSplits(receivers, userMetadataAsBytes);

		const txReceipt = await txResponse.wait();

		const createdSplitsEventName = 'createdsplits';

		const createdSplitsEvent = txReceipt.events?.filter((e) => e.event?.toLowerCase() === createdSplitsEventName)[0];

		if (!createdSplitsEvent) {
			throw DripsErrors.txEventNotFound(
				`Could not retrieve the user ID while creating a new immutable splits configuration: '${createdSplitsEventName}' event was not found in the transaction receipt.` +
					`txReceipt: ${JSON.stringify(txReceipt)}`,
				createdSplitsEventName,
				txReceipt
			);
		}

		const { userId } = createdSplitsEvent.args!;

		return BigInt(userId).toString();
	}
}
