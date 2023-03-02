/* eslint-disable no-dupe-class-members */
import type { Provider } from '@ethersproject/providers';
import type { NFTDriver, DripsReceiverStruct, SplitsReceiverStruct, UserMetadataStruct } from 'contracts/NFTDriver';
import type { PromiseOrValue } from 'contracts/common';
import type { PopulatedTransaction, BigNumberish } from 'ethers';
import { NFTDriver__factory } from '../../contracts/factories';
import { validateClientProvider } from '../common/validators';
import Utils from '../utils';

interface INFTDriverTxFactory
	extends Pick<
		NFTDriver['populateTransaction'],
		'safeMint' | 'collect' | 'give' | 'setSplits' | 'setDrips' | 'emitUserMetadata'
	> {}

export default class NFTDriverTxFactory implements INFTDriverTxFactory {
	#driver!: NFTDriver;
	#driverAddress!: string;

	public get driverAddress(): string {
		return this.#driverAddress;
	}

	public static async create(provider: Provider, customDriverAddress?: string): Promise<NFTDriverTxFactory> {
		await validateClientProvider(provider, Utils.Network.SUPPORTED_CHAINS);

		const network = await provider.getNetwork();
		const driverAddress = customDriverAddress ?? Utils.Network.configs[network.chainId].CONTRACT_ADDRESS_DRIVER;

		const client = new NFTDriverTxFactory();

		client.#driverAddress = driverAddress;

		client.#driver = NFTDriver__factory.connect(driverAddress, provider);

		return client;
	}

	safeMint(to: PromiseOrValue<string>, userMetadata: UserMetadataStruct[]): Promise<PopulatedTransaction> {
		return this.#driver.populateTransaction.safeMint(to, userMetadata);
	}

	collect(
		tokenId: PromiseOrValue<BigNumberish>,
		erc20: PromiseOrValue<string>,
		transferTo: PromiseOrValue<string>
	): Promise<PopulatedTransaction> {
		return this.#driver.populateTransaction.collect(tokenId, erc20, transferTo);
	}

	give(
		tokenId: PromiseOrValue<BigNumberish>,
		receiver: PromiseOrValue<BigNumberish>,
		erc20: PromiseOrValue<string>,
		amt: PromiseOrValue<BigNumberish>
	): Promise<PopulatedTransaction> {
		return this.#driver.populateTransaction.give(tokenId, receiver, erc20, amt);
	}

	setSplits(tokenId: PromiseOrValue<BigNumberish>, receivers: SplitsReceiverStruct[]): Promise<PopulatedTransaction> {
		return this.#driver.populateTransaction.setSplits(tokenId, receivers);
	}

	setDrips(
		tokenId: PromiseOrValue<BigNumberish>,
		erc20: PromiseOrValue<string>,
		currReceivers: DripsReceiverStruct[],
		balanceDelta: PromiseOrValue<BigNumberish>,
		newReceivers: DripsReceiverStruct[],
		transferTo: PromiseOrValue<string>
	): Promise<PopulatedTransaction> {
		return this.#driver.populateTransaction.setDrips(
			tokenId,
			erc20,
			currReceivers,
			balanceDelta,
			newReceivers,
			0,
			0,
			transferTo
		);
	}

	emitUserMetadata(
		tokenId: PromiseOrValue<BigNumberish>,
		userMetadata: UserMetadataStruct[]
	): Promise<PopulatedTransaction> {
		return this.#driver.populateTransaction.emitUserMetadata(tokenId, userMetadata);
	}
}
