import type { JsonRpcProvider } from '@ethersproject/providers';
import type { CallStruct } from 'contracts/Caller';
import type { ContractTransaction } from 'ethers';
import { nameOf, validateAddress } from '../common/internals';
import { DripsErrors } from '../common/DripsError';
import Utils from '../utils';
import type { Caller as CallerContract } from '../../contracts/Caller';
import { Caller__factory } from '../../contracts/factories';

/**
 * A generic call executor that increases the flexibility of other smart contracts' APIs.
 * @see {@link https://github.com/radicle-dev/drips-contracts/blob/master/src/Caller.sol Caller} smart contract.
 */
export default class CallerClient {
	#callerContract!: CallerContract;

	#provider!: JsonRpcProvider;
	/** Returns the `CallerClient`'s `provider`. */
	public get provider(): JsonRpcProvider {
		return this.#provider;
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
	 * @param  {NetworkConfig} contractAddress Overrides the `Caller` smart contract address.
	 * If it's `undefined` (default value), the address will be automatically selected based on the `provider`'s network.
	 * @returns A `Promise` which resolves to the new `CallerClient` instance.
	 * @throws {DripsErrors.argumentMissingError} if the `provider` is missing.
	 * @throws {DripsErrors.argumentError} if the `provider`'s singer is missing.
	 * @throws {DripsErrors.addressError} if the `provider`'s signer address is not valid.
	 * @throws {DripsErrors.unsupportedNetworkError} if the `provider` is connected to an unsupported network.
	 */
	public static async create(provider: JsonRpcProvider, contractAddress?: string): Promise<CallerClient> {
		if (!provider) {
			throw DripsErrors.argumentMissingError(
				`Could not create a new 'CallerClient': '${nameOf({ provider })}' is missing.`,
				nameOf({ provider })
			);
		}

		const signer = provider.getSigner();
		const signerAddress = await signer?.getAddress();
		if (!signerAddress) {
			throw DripsErrors.argumentError(
				`Could not create a new 'CallerClient': '${nameOf({ signerAddress })}' is missing.`,
				nameOf({ signerAddress }),
				provider
			);
		}
		validateAddress(signerAddress);

		const network = await provider.getNetwork();
		if (!Utils.Network.isSupportedChain(network?.chainId)) {
			throw DripsErrors.unsupportedNetworkError(
				`Could not create a new 'CallerClient': the provider is connected to an unsupported network (name: '${network?.name}', chain ID: ${network?.chainId}). Supported chains are: ${Utils.Network.SUPPORTED_CHAINS}.`,
				network?.chainId
			);
		}

		const callerClient = new CallerClient();

		callerClient.#provider = provider;
		callerClient.#callerContract = Caller__factory.connect(
			contractAddress ?? Utils.Network.configs[network.chainId].CONTRACT_CALLER,
			signer
		);

		return callerClient;
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
		return this.#callerContract.callBatched(calls);
	}
}
