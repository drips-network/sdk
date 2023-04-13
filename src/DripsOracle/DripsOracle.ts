import type { Provider } from '@ethersproject/providers';
import type { Signer } from 'ethers';
import { DripsErrors } from '../common/DripsError';
import type { DripsOracle as DripsOracleContract } from '../../contracts/DripsOracle';
import { DripsOracle__factory } from '../../contracts/factories/DripsOracle__factory';
import Utils from '../utils';
import { validateClientProvider, validateClientSigner } from '../common/validators';

/**
 * Class for interacting with the `DripsOracle` smart contract.
 */
export default class DripsOracle {
	#driverAddress!: string;
	#driver!: DripsOracleContract;

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

	/** Returns the `DripsOracle` contract address to which the client is connected. */
	public get driverAddress(): string {
		return this.#driverAddress;
	}

	private constructor() {}

	/**
	 * Creates a new immutable `DripsOracle` instance.
	 * @param  {Provider} provider The network provider. It cannot be changed after creation.
	 *
	 * The `provider` must be connected to one of the following supported networks:
	 * - 'mainnet': chain ID `1`
	 * - 'goerli': chain ID `5`
	 * - 'polygon-mumbai': chain ID `80001`
	 * @param  {Signer} signer The singer used to sign transactions. It cannot be changed after creation.
	 *
	 * **Important**: If the `signer` is _not_ connected to a provider it will try to connect to the `provider`, else it will use the `signer.provider`.
	 * @param  {string|undefined} customDriverAddress Overrides the `NFTDriver` contract address.
	 * If it's `undefined` (default value), the address will be automatically selected based on the `provider`'s network.
	 * @returns A `Promise` which resolves to the new client instance.
	 * @throws {@link DripsErrors.initializationError} if the client initialization fails.
	 */
	public static async create(provider: Provider, signer: Signer, customDriverAddress?: string): Promise<DripsOracle> {
		try {
			await validateClientProvider(provider, Utils.Network.SUPPORTED_CHAINS);

			if (!signer.provider) {
				// eslint-disable-next-line no-param-reassign
				signer = signer.connect(provider);
			}

			await validateClientSigner(signer, Utils.Network.SUPPORTED_CHAINS);

			const network = await provider.getNetwork();
			const driverAddress = customDriverAddress ?? Utils.Network.configs[network.chainId].IMMUTABLE_SPLITS_DRIVER;

			const client = new DripsOracle();

			client.#signer = signer;
			client.#provider = provider;
			client.#driverAddress = driverAddress;
			client.#driver = DripsOracle__factory.connect(driverAddress, signer);

			return client;
		} catch (error: any) {
			throw DripsErrors.initializationError(`Could not create 'DripsOracle': ${error.message}`);
		}
	}

	public async g() {
		this.#driver.acceptOwnership();
	}
}
