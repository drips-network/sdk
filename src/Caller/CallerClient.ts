import type { JsonRpcProvider } from '@ethersproject/providers';
import type { CallStruct } from 'contracts/Caller';
import type { ContractTransaction } from 'ethers';
import { validateClientProvider } from '../common/validators';
import Utils from '../utils';
import type { Caller } from '../../contracts/Caller';
import { Caller__factory } from '../../contracts/factories';

/**
 * A generic call executor that increases the flexibility of other smart contracts' APIs.
 * @see {@link https://github.com/radicle-dev/drips-contracts/blob/master/src/Caller.sol Caller} smart contract.
 */
export default class CallerClient {
	#caller!: Caller;
	#callerAddress!: string;

	#provider!: JsonRpcProvider;
	/** Returns the `CallerClient`'s `provider`. */
	public get provider(): JsonRpcProvider {
		return this.#provider;
	}

	/** Returns the `Caller`'s address to which the `CallerClient` is connected. */
	public get callerAddress(): string {
		return this.#callerAddress;
	}

	private constructor() {}

	// TODO: Update the supported chains documentation comments.
	/**
	 * Creates a new immutable `CallerClient` instance.
	 * @param  {JsonRpcProvider} provider The network provider.
	 *
	 * The `provider` must have a `signer` associated with it.
	 *
	 * The supported networks are:
	 * - `goerli`: chain ID `5`
	 * @param  {string|undefined} customCallerAddress Overrides the `Caller`'s address.
	 * If it's `undefined` (default value), the address will be automatically selected based on the `provider`'s network.
	 * @returns A `Promise` which resolves to the new `CallerClient` instance.
	 * @throws {@link DripsErrors.argumentMissingError} if the `provider` is missing.
	 * @throws {@link DripsErrors.addressError} if the `provider.signer`'s address is not valid.
	 * @throws {@link DripsErrors.argumentError} if the `provider.signer` is missing.
	 * @throws {@link DripsErrors.unsupportedNetworkError} if the `provider` is connected to an unsupported network.
	 */
	public static async create(
		provider: JsonRpcProvider,
		customCallerAddress: string | undefined = undefined
	): Promise<CallerClient> {
		await validateClientProvider(provider, Utils.Network.SUPPORTED_CHAINS);

		const signer = provider.getSigner();
		const network = await provider.getNetwork();
		const callerAddress = customCallerAddress ?? Utils.Network.configs[network.chainId].CONTRACT_CALLER;

		const client = new CallerClient();

		client.#provider = provider;
		client.#callerAddress = callerAddress;
		client.#caller = Caller__factory.connect(callerAddress, signer);

		return client;
	}

	/**
	 * Executes a batch of calls.
	 *
	 * Reverts if any of the calls reverts or any of the called addresses is not a smart contract.
	 *
	 * **Important**:
	 * If the called contract is `Caller`-aware and trusts that instance of `Caller` (e.g., the official Drips Drivers smart contracts)
	 * the `msg.sender` will be set to the address of the wallet which called the `Caller`.
	 * If not, `msg.sender` will be set to the address of the `Caller`.
	 * @param  {CallStruct[]} calls The calls to perform.
	 * @returns A `Promise` which resolves to the contract transaction.
	 */
	public callBatched(calls: CallStruct[]): Promise<ContractTransaction> {
		return this.#caller.callBatched(calls);
	}
}
