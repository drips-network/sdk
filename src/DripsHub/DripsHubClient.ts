import type { Network } from '@ethersproject/networks';
import type { Provider } from '@ethersproject/providers';
import type { ChainDripsMetadata } from 'src/common/types';
import { nameOf, toBN } from '../common/internals';
import Utils from '../utils';
import type { DripsHub } from '../../contracts';
import { DripsHub__factory } from '../../contracts';
import { DripsErrors } from '../common/DripsError';

/**
 * A lower-level client for interacting with the {@link https://github.com/radicle-dev/drips-contracts/blob/master/src/DripsHub.sol DripsHub} smart contract.
 */
export default class DripsHubClient {
	#dripsHubContract!: DripsHub;

	#network!: Network;
	/**
	 * Returns the network the `DripsHubClient` is connected to.
	 *
	 * The `network` is the `provider`'s network.
	 */
	public get network() {
		return this.#network;
	}

	#provider!: Provider;
	/** Returns the `DripsHubClient`'s `provider`. */
	public get provider() {
		return this.#provider;
	}

	#chainDripsMetadata!: ChainDripsMetadata;
	/** Returns the `DripsHubClient`'s `network` {@link ChainDripsMetadata}. */
	public get chainDripsMetadata() {
		return this.#chainDripsMetadata;
	}

	private constructor() {}

	// TODO: Update the supported chains documentation comments.
	/**
	 * Creates a new immutable `DripsHubClient` instance.
	 * @param  {JsonRpcProvider} provider
	 * The provider can connect to the following supported networks:
	 * - 'goerli': chain ID 5
	 * @returns A Promise which resolves to the new `DripsHubClient` instance.
	 * @throws {DripsErrors.argumentMissingError} if the `provider` is missing.
	 * @throws {DripsErrors.unsupportedNetworkError} if the `provider` is connected to an unsupported chain.
	 */
	public static async create(provider: Provider): Promise<DripsHubClient> {
		if (!provider) {
			throw DripsErrors.argumentMissingError(
				"Could not create a new 'DripsHubClient': the 'provider' is missing.",
				nameOf({ provider })
			);
		}

		const network = await provider.getNetwork();
		if (!Utils.Network.isSupportedChain(network?.chainId)) {
			throw DripsErrors.unsupportedNetworkError(
				`Could not create a new 'DripsHubClient': the provider is connected to an unsupported network (name: '${
					network?.name
				}', chain ID: ${network?.chainId}). Supported chains are: ${Utils.Network.SUPPORTED_CHAINS.toString()}.`,
				network?.chainId
			);
		}
		const chainDripsMetadata = Utils.Network.chainDripsMetadata[network.chainId];

		const dripsHub = new DripsHubClient();

		dripsHub.#network = network;
		dripsHub.#provider = provider;
		dripsHub.#chainDripsMetadata = chainDripsMetadata;
		dripsHub.#dripsHubContract = DripsHub__factory.connect(chainDripsMetadata.CONTRACT_DRIPS_HUB, provider);

		return dripsHub;
	}

	public async getCycleInfo(): Promise<{
		cycleDurationSecs: bigint;
		currentCycleSecs: bigint;
		currentCycleStartDate: Date;
		nextCycleStartDate: Date;
	}> {
		const cycleDurationSecs = toBN(await this.#dripsHubContract.cycleSecs()).toBigInt();

		const currentCycleSecs = BigInt(Math.floor(this.#getUnixTime(new Date()))) % cycleDurationSecs;

		const currentCycleStartDate = new Date(new Date().getTime() - Number(currentCycleSecs) * 1000);

		const nextCycleStartDate = new Date(currentCycleStartDate.getTime() + Number(cycleDurationSecs * BigInt(1000)));

		return {
			cycleDurationSecs,
			currentCycleSecs,
			currentCycleStartDate,
			nextCycleStartDate
		};
	}

	#getUnixTime(date: Date): number {
		return date.getTime() / 1000;
	}
}
