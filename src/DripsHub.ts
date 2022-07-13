import type { Network } from '@ethersproject/networks';
import type { Provider } from '@ethersproject/providers';
import type { DripsReceiverStruct, SplitsReceiverStruct } from 'contracts/AddressApp';
import type { BigNumber, BigNumberish } from 'ethers';
import type { DripsHub as DripsHubContract } from '../contracts';
import { DripsHub__factory } from '../contracts';
import type { NetworkProperties } from './common';
import { chainIdToNetworkPropertiesMap, guardAgainstInvalidAddress, supportedChains } from './common';
import { DripsErrors } from './DripsError';

export default class DripsHub {
	#dripsHubContract!: DripsHubContract;

	#network!: Network;
	public get network() {
		return this.#network;
	}

	#provider!: Provider;
	public get provider() {
		return this.#provider;
	}

	#networkProperties!: NetworkProperties;
	public get networkProperties() {
		return this.#networkProperties;
	}

	private constructor() {}

	public static async create(provider: Provider): Promise<DripsHub> {
		if (!provider) {
			throw DripsErrors.invalidArgument(
				'Could not instantiate a new DripsHub: provider-argument was "falsy" but is required.'
			);
		}

		const network = await provider.getNetwork();
		const networkProperties = chainIdToNetworkPropertiesMap[network.chainId];
		if (!networkProperties?.CONTRACT_DRIPS_HUB) {
			throw DripsErrors.invalidArgument(
				`Could not instantiate a new AddressApp: provider is connected to unsupported chain (ID: '${
					network.chainId
				})'. Supported chain IDs are: '${supportedChains.toString()}'.`
			);
		}

		const dripsHub = new DripsHub();

		dripsHub.#network = network;
		dripsHub.#provider = provider;
		dripsHub.#networkProperties = networkProperties;
		dripsHub.#dripsHubContract = DripsHub__factory.connect(networkProperties.CONTRACT_ADDRESS_APP, provider);

		return dripsHub;
	}

	public collectableAll(
		userId: BigNumberish,
		erc20Address: string,
		currentReceivers: SplitsReceiverStruct[]
	): Promise<
		[BigNumber, BigNumber] & {
			collectedAmt: BigNumber;
			splitAmt: BigNumber;
		}
	> {
		guardAgainstInvalidAddress(erc20Address);

		return this.#dripsHubContract.collectableAll(userId, erc20Address, currentReceivers);
	}

	public splittable(userId: BigNumberish, erc20Address: string): Promise<BigNumber> {
		guardAgainstInvalidAddress(erc20Address);

		return this.#dripsHubContract.splittable(userId, erc20Address);
	}

	public collectable(userId: BigNumberish, erc20Address: string): Promise<BigNumber> {
		guardAgainstInvalidAddress(erc20Address);

		return this.#dripsHubContract.collectable(userId, erc20Address);
	}

	public dripsState(
		userId: BigNumberish,
		erc20Address: string
	): Promise<
		[string, number, BigNumber, number] & {
			dripsHash: string;
			updateTime: number;
			balance: BigNumber;
			defaultEnd: number;
		}
	> {
		guardAgainstInvalidAddress(erc20Address);

		return this.#dripsHubContract.dripsState(userId, erc20Address);
	}

	public balanceAt(
		userId: BigNumberish,
		erc20Address: string,
		receivers: DripsReceiverStruct[],
		timestamp: BigNumberish
	) {
		guardAgainstInvalidAddress(erc20Address);

		return this.#dripsHubContract.balanceAt(userId, erc20Address, receivers, timestamp);
	}
}
