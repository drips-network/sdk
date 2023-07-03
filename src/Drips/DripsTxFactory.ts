/* eslint-disable no-dupe-class-members */
import type { Provider } from '@ethersproject/providers';
import type { StreamsHistoryStruct, Drips, SplitsReceiverStruct } from 'contracts/Drips';
import type { PromiseOrValue } from 'contracts/common';
import type { PopulatedTransaction, BigNumberish, BytesLike } from 'ethers';
import { safeDripsTx } from '../common/internals';
import { Drips__factory } from '../../contracts/factories';
import { validateClientProvider } from '../common/validators';
import Utils from '../utils';

interface IDripsHubTxFactory
	extends Pick<Drips['populateTransaction'], 'receiveStreams' | 'squeezeStreams' | 'split'> {}

export default class DripsTxFactory implements IDripsHubTxFactory {
	#driver!: Drips;
	#driverAddress!: string;

	public get driverAddress(): string {
		return this.#driverAddress;
	}

	public static async create(provider: Provider, customDriverAddress?: string): Promise<DripsTxFactory> {
		await validateClientProvider(provider, Utils.Network.SUPPORTED_CHAINS);

		const network = await provider.getNetwork();
		const driverAddress = customDriverAddress ?? Utils.Network.configs[network.chainId].ADDRESS_DRIVER;

		const client = new DripsTxFactory();

		client.#driverAddress = driverAddress;

		client.#driver = Drips__factory.connect(driverAddress, provider);

		return client;
	}

	async receiveStreams(
		userId: PromiseOrValue<BigNumberish>,
		erc20: PromiseOrValue<string>,
		maxCycles: PromiseOrValue<BigNumberish>
	): Promise<PopulatedTransaction> {
		return safeDripsTx(await this.#driver.populateTransaction.receiveStreams(userId, erc20, maxCycles));
	}

	async squeezeStreams(
		userId: PromiseOrValue<BigNumberish>,
		erc20: PromiseOrValue<string>,
		senderId: PromiseOrValue<BigNumberish>,
		historyHash: PromiseOrValue<BytesLike>,
		dripsHistory: StreamsHistoryStruct[]
	): Promise<PopulatedTransaction> {
		return safeDripsTx(
			await this.#driver.populateTransaction.squeezeStreams(userId, erc20, senderId, historyHash, dripsHistory)
		);
	}

	async split(
		userId: PromiseOrValue<BigNumberish>,
		erc20: PromiseOrValue<string>,
		currReceivers: SplitsReceiverStruct[]
	): Promise<PopulatedTransaction> {
		return safeDripsTx(await this.#driver.populateTransaction.split(userId, erc20, currReceivers));
	}
}
