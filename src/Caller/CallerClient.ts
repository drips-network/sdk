import type { Provider } from '@ethersproject/providers';
import type { ContractTransaction, Signer } from 'ethers';
import type { CallStruct, Caller } from '../../contracts/Caller';
import { validateClientProvider, validateClientSigner } from '../common/validators';
import Utils from '../utils';
import { Caller__factory } from '../../contracts/factories';
import { DripsErrors } from '../common/DripsError';

/**
 * A generic call executor that increases the flexibility of other contracts' APIs.
 * @see {@link https://github.com/radicle-dev/drips-contracts/blob/master/src/Caller.sol Caller} contract.
 */
export default class CallerClient {
	#caller!: Caller;
	#callerAddress!: string;

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

	/** Returns the `Caller` contract address to which the client is connected. */
	public get callerAddress(): string {
		return this.#callerAddress;
	}

	private constructor() {}

	// TODO: Update the supported chains documentation comments.
	/**
	 * Creates a new immutable `CallerClient` instance.
	 * @param  {Provider} provider The network provider. It cannot be changed after creation.
	 *
	 * The `provider` must be connected to one of the following supported networks:
	 * - 'goerli': chain ID `5`
	 * - 'polygon-mumbai': chain ID `80001`
	 * @param  {Signer} signer The singer used to sign transactions. It cannot be changed after creation.
	 *
	 * **Important**: If the `signer` is _not_ connected to a provider it will try to connect to the `provider`, else it will use the `signer.provider`.
	 * @param  {string|undefined} customCallerAddress Overrides the `NFTDriver` contract address.
	 * If it's `undefined` (default value), the address will be automatically selected based on the `provider`'s network.
	 * @returns A `Promise` which resolves to the new client instance.
	 * @throws {@link DripsErrors.clientInitializationError} if the client initialization fails.
	 */
	public static async create(provider: Provider, signer: Signer, customCallerAddress?: string): Promise<CallerClient> {
		try {
			await validateClientProvider(provider, Utils.Network.SUPPORTED_CHAINS);
			await validateClientSigner(signer);

			if (!signer.provider) {
				// eslint-disable-next-line no-param-reassign
				signer = signer.connect(provider);
			}

			const network = await provider.getNetwork();
			const callerAddress = customCallerAddress ?? Utils.Network.configs[network.chainId].CONTRACT_CALLER;

			const client = new CallerClient();

			client.#signer = signer;
			client.#provider = provider;
			client.#callerAddress = callerAddress;
			client.#caller = Caller__factory.connect(callerAddress, signer);

			return client;
		} catch (error: any) {
			throw DripsErrors.clientInitializationError(`Could not create 'CallerClient': ${error.message}`);
		}
	}

	/**
	 * Executes a batch of calls.
	 *
	 * Reverts if any of the calls reverts or any of the called addresses is not a contract.
	 *
	 * **Important**:
	 * If the called contract is `Caller`-aware and trusts that instance of `Caller` (e.g., the official Drips Drivers contracts)
	 * the `msg.sender` will be set to the address of the wallet which called the `Caller`.
	 * If not, `msg.sender` will be set to the address of the `Caller`.
	 * @param  {CallStruct[]} calls The calls to perform.
	 * @returns A `Promise` which resolves to the contract transaction.
	 */
	public callBatched(calls: CallStruct[]): Promise<ContractTransaction> {
		return this.#caller.callBatched(calls);
	}
}
