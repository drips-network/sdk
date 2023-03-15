/* eslint-disable no-dupe-class-members */
import type { Provider } from '@ethersproject/providers';
import type { DripsHistoryStruct, DripsHub, SplitsReceiverStruct } from 'contracts/DripsHub';
import type { PromiseOrValue } from 'contracts/common';
import type { PopulatedTransaction, BigNumberish, BytesLike } from 'ethers';
import { DripsHub__factory } from '../../contracts/factories';
import { validateClientProvider } from '../common/validators';
import Utils from '../utils';

interface IDripsHubTxFactory extends Pick<DripsHub['populateTransaction'], 'receiveDrips' | 'squeezeDrips' | 'split'> {}

export default class DripsHubTxFactory implements IDripsHubTxFactory {
	#driver!: DripsHub;
	#driverAddress!: string;

	public get driverAddress(): string {
		return this.#driverAddress;
	}

	public static async create(provider: Provider, customDriverAddress?: string): Promise<DripsHubTxFactory> {
		await validateClientProvider(provider, Utils.Network.SUPPORTED_CHAINS);

		const network = await provider.getNetwork();
		const driverAddress = customDriverAddress ?? Utils.Network.configs[network.chainId].ADDRESS_DRIVER;

		const client = new DripsHubTxFactory();

		client.#driverAddress = driverAddress;

		client.#driver = DripsHub__factory.connect(driverAddress, provider);

		return client;
	}

	receiveDrips(
		userId: PromiseOrValue<BigNumberish>,
		erc20: PromiseOrValue<string>,
		maxCycles: PromiseOrValue<BigNumberish>
	): Promise<PopulatedTransaction> {
		return this.#driver.populateTransaction.receiveDrips(userId, erc20, maxCycles);
	}

	squeezeDrips(
		userId: PromiseOrValue<BigNumberish>,
		erc20: PromiseOrValue<string>,
		senderId: PromiseOrValue<BigNumberish>,
		historyHash: PromiseOrValue<BytesLike>,
		dripsHistory: DripsHistoryStruct[]
	): Promise<PopulatedTransaction> {
		return this.#driver.populateTransaction.squeezeDrips(userId, erc20, senderId, historyHash, dripsHistory);
	}

	split(
		userId: PromiseOrValue<BigNumberish>,
		erc20: PromiseOrValue<string>,
		currReceivers: SplitsReceiverStruct[]
	): Promise<PopulatedTransaction> {
		return this.#driver.populateTransaction.split(userId, erc20, currReceivers);
	}
}
