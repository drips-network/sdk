import type { ContractTransaction, Signer, BigNumber, BigNumberish } from 'ethers';
import { utils, constants } from 'ethers';
import type { DripsReceiverStruct, SplitsReceiverStruct } from 'contracts/DaiDripsHub';
import type { Network, Provider } from '@ethersproject/providers';
import type { Dai, DaiDripsHub } from '../contracts';
import type { NetworkProperties } from './NetworkProperties';
import { supportedChains, chainIdToNetworkPropertiesMap } from './NetworkProperties';
import { validateDrips, validateSplits } from './utils';
import { Dai__factory } from '../contracts/factories/Dai__factory';
import { DaiDripsHub__factory } from '../contracts/factories/DaiDripsHub__factory';
import { DripsErrors } from './DripsError';

export type DripsClientConfig = {
	signer: Signer;
	provider: Provider;
};

export default class DripsClient {
	#daiContract!: Dai;
	#hubContract!: DaiDripsHub;

	#network!: Network;
	public get network() {
		return this.#network;
	}

	#signer!: Signer;
	public get signer() {
		return this.#signer;
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

	public static async create(config: DripsClientConfig): Promise<DripsClient> {
		if (!config.provider) {
			throw DripsErrors.invalidConfiguration('Cannot create instance: provider is missing.');
		}
		if (!config.signer) {
			throw DripsErrors.invalidConfiguration('Cannot create instance: signer is missing.');
		}

		const { provider, signer } = config;

		const signerAddress = await signer.getAddress();
		if (!utils.isAddress(signerAddress)) {
			throw DripsErrors.invalidAddress(`Cannot create instance: signer address '${signerAddress}' is not valid.`);
		}

		const network = await provider.getNetwork();
		const networkProperties = chainIdToNetworkPropertiesMap[network.chainId];

		if (!networkProperties?.CONTRACT_DAI || !networkProperties?.CONTRACT_DRIPS_HUB) {
			throw DripsErrors.invalidConfiguration(
				`Cannot create instance: chain ID '${
					network.chainId
				}' is not supported. Supported chain IDs are: '${supportedChains.toString()}'.`
			);
		}

		const dripsClient = new DripsClient();

		dripsClient.#signer = signer;
		dripsClient.#network = network;
		dripsClient.#provider = provider;
		dripsClient.#networkProperties = networkProperties;
		dripsClient.#daiContract = Dai__factory.connect(networkProperties.CONTRACT_DAI, provider);
		dripsClient.#hubContract = DaiDripsHub__factory.connect(networkProperties.CONTRACT_DRIPS_HUB, provider);

		return dripsClient;
	}

	public approveDAIContract(): Promise<ContractTransaction> {
		const contractSigner = this.#daiContract.connect(this.signer);

		return contractSigner.approve(this.networkProperties.CONTRACT_DRIPS_HUB, constants.MaxUint256);
	}

	public updateUserDrips(
		lastUpdate: BigNumberish,
		lastBalance: BigNumberish,
		currentReceivers: DripsReceiverStruct[],
		balanceDelta: BigNumberish,
		newReceivers: DripsReceiverStruct[]
	): Promise<ContractTransaction> {
		validateDrips(newReceivers);

		const contractSigner = this.#hubContract.connect(this.signer);

		return contractSigner['setDrips(uint64,uint128,(address,uint128)[],int128,(address,uint128)[])'](
			lastUpdate,
			lastBalance,
			currentReceivers,
			balanceDelta,
			newReceivers
		);
	}

	public updateSubAccountDrips(
		subAccountId: BigNumberish,
		lastUpdate: BigNumberish,
		lastBalance: BigNumberish,
		currentReceivers: DripsReceiverStruct[],
		balanceDelta: BigNumberish,
		newReceivers: DripsReceiverStruct[]
	): Promise<ContractTransaction> {
		validateDrips(newReceivers);

		const contractSigner = this.#hubContract.connect(this.signer);

		return contractSigner['setDrips(uint256,uint64,uint128,(address,uint128)[],int128,(address,uint128)[])'](
			subAccountId,
			lastUpdate,
			lastBalance,
			currentReceivers,
			balanceDelta,
			newReceivers
		);
	}

	public updateUserSplits(
		currentReceivers: SplitsReceiverStruct[],
		newReceivers: SplitsReceiverStruct[]
	): Promise<ContractTransaction> {
		validateSplits(newReceivers);

		const contractSigner = this.#hubContract.connect(this.signer);

		return contractSigner.setSplits(currentReceivers, newReceivers);
	}

	public giveFromUser(receiver: string, amount: BigNumberish): Promise<ContractTransaction> {
		if (!utils.isAddress(receiver)) {
			throw DripsErrors.invalidAddress(`Cannot give funds: receiver address '${receiver} is not valid.`);
		}

		const contractSigner = this.#hubContract.connect(this.signer);

		return contractSigner['give(address,uint128)'](receiver, amount);
	}

	public giveFromAccount(account: BigNumberish, receiver: string, amount: BigNumberish): Promise<ContractTransaction> {
		if (!utils.isAddress(receiver)) {
			throw DripsErrors.invalidAddress(`Cannot give funds: receiver address '${receiver} is not valid.`);
		}

		const contractSigner = this.#hubContract.connect(this.signer);

		return contractSigner['give(uint256,address,uint128)'](account, receiver, amount);
	}

	public async getAllowance(): Promise<BigNumber> {
		const address = await this.signer.getAddress();

		return this.#daiContract.allowance(address, this.networkProperties.CONTRACT_DRIPS_HUB);
	}

	public getAmountCollectableWithSplits(
		address: string,
		currentSplits: SplitsReceiverStruct[]
	): Promise<
		[BigNumber, BigNumber] & {
			collected: BigNumber;
			split: BigNumber;
		}
	> {
		if (!utils.isAddress(address)) {
			throw DripsErrors.invalidAddress(`Cannot retrieve collectable amount: address '${address}' is not valid.`);
		}

		return this.#hubContract.collectable(address.toLowerCase(), currentSplits);
	}

	public async collect(splits: SplitsReceiverStruct[]): Promise<ContractTransaction> {
		const address = await this.signer.getAddress();

		const contractSigner = this.#hubContract.connect(this.signer);

		return contractSigner.collect(address.toLowerCase(), splits);
	}
}
