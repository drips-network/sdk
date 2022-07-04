import type { ContractTransaction, Signer, BigNumber, BigNumberish } from 'ethers';
import { utils, constants } from 'ethers';
import type { DripsReceiverStruct, SplitsReceiverStruct } from 'contracts/DaiDripsHub';
import type { Network, Provider } from '@ethersproject/providers';
import { Result } from 'typescript-functional-extensions';
import type { Dai, DaiDripsHub } from '../contracts';
import type { NetworkProperties } from './NetworkProperties';
import { chainIdToNetworkPropertiesMap, supportedChains } from './NetworkProperties';
import { areValidDripsReceivers, areValidSplitsReceivers } from './validators';
import { Dai__factory } from '../contracts/factories/Dai__factory';
import { DaiDripsHub__factory } from '../contracts/factories/DaiDripsHub__factory';
import type { DripsError } from './dripsErrors';
import { DripsErrors } from './dripsErrors';

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

	public static async create(config: DripsClientConfig): Promise<Result<DripsClient, DripsError>> {
		if (!config.provider) {
			return Result.failure(DripsErrors.invalidConfiguration('Cannot create instance: provider is missing.'));
		}
		if (!config.signer) {
			return Result.failure(DripsErrors.invalidConfiguration('Cannot create instance: signer is missing.'));
		}

		const { provider, signer } = config;

		const signerAddress = await signer.getAddress();
		if (!utils.isAddress(signerAddress)) {
			return Result.failure(
				DripsErrors.invalidAddress(`Cannot create instance: signer address '${signerAddress}' is not valid.`)
			);
		}

		const network = await provider.getNetwork();
		const networkProperties = chainIdToNetworkPropertiesMap[network.chainId];

		if (!networkProperties?.CONTRACT_DAI || !networkProperties?.CONTRACT_DRIPS_HUB) {
			return Result.failure(
				DripsErrors.invalidConfiguration(
					`Cannot create instance: chain ID '${
						network.chainId
					}' is not supported. Supported chain IDs are: '${supportedChains.toString()}'.`
				)
			);
		}

		const dripsClient = new DripsClient();
		dripsClient.#signer = signer;
		dripsClient.#network = network;
		dripsClient.#provider = provider;
		dripsClient.#networkProperties = networkProperties;
		dripsClient.#daiContract = Dai__factory.connect(networkProperties.CONTRACT_DAI, provider);
		dripsClient.#hubContract = DaiDripsHub__factory.connect(networkProperties.CONTRACT_DRIPS_HUB, provider);

		return Result.success(dripsClient);
	}

	public approveDAIContract(): Promise<ContractTransaction> {
		const contractSigner = this.#daiContract.connect(this.signer);

		return contractSigner.approve(this.networkProperties.CONTRACT_DRIPS_HUB, constants.MaxUint256);
	}

	public async updateUserDrips(
		lastUpdate: BigNumberish,
		lastBalance: BigNumberish,
		currentReceivers: DripsReceiverStruct[],
		balanceDelta: BigNumberish,
		newReceivers: DripsReceiverStruct[]
	): Promise<Result<ContractTransaction, DripsError>> {
		if (!areValidDripsReceivers(newReceivers)) {
			return Result.failure(
				DripsErrors.invalidArgument('Cannot update user Drips: receivers are not valid.', newReceivers)
			);
		}

		const contractSigner = this.#hubContract.connect(this.signer);

		const tx = await contractSigner['setDrips(uint64,uint128,(address,uint128)[],int128,(address,uint128)[])'](
			lastUpdate,
			lastBalance,
			currentReceivers,
			balanceDelta,
			newReceivers
		);

		return Result.success(tx);
	}

	public async updateSubAccountDrips(
		subAccountId: BigNumberish,
		lastUpdate: BigNumberish,
		lastBalance: BigNumberish,
		currentReceivers: DripsReceiverStruct[],
		balanceDelta: BigNumberish,
		newReceivers: DripsReceiverStruct[]
	): Promise<Result<ContractTransaction, DripsError>> {
		if (!areValidDripsReceivers(newReceivers)) {
			return Result.failure(
				DripsErrors.invalidArgument('Cannot update user Drips: receivers are not valid.', newReceivers)
			);
		}

		const contractSigner = this.#hubContract.connect(this.signer);

		const tx = await contractSigner['setDrips(uint256,uint64,uint128,(address,uint128)[],int128,(address,uint128)[])'](
			subAccountId,
			lastUpdate,
			lastBalance,
			currentReceivers,
			balanceDelta,
			newReceivers
		);

		return Result.success(tx);
	}

	public async updateUserSplits(
		currentReceivers: SplitsReceiverStruct[],
		newReceivers: SplitsReceiverStruct[]
	): Promise<Result<ContractTransaction, DripsError>> {
		if (!areValidSplitsReceivers(newReceivers)) {
			return Result.failure(
				DripsErrors.invalidArgument('Cannot update user Splits: receivers are not valid', newReceivers)
			);
		}
		const contractSigner = this.#hubContract.connect(this.signer);

		const tx = await contractSigner.setSplits(currentReceivers, newReceivers);

		return Result.success(tx);
	}

	public async giveFromUser(receiver: string, amount: BigNumberish): Promise<Result<ContractTransaction, DripsError>> {
		if (!utils.isAddress(receiver)) {
			return Result.failure(
				DripsErrors.invalidAddress(`Cannot give funds: receiver address '${receiver} is not valid.`)
			);
		}

		const contractSigner = this.#hubContract.connect(this.signer);

		const tx = await contractSigner['give(address,uint128)'](receiver, amount);

		return Result.success(tx);
	}

	public async giveFromAccount(
		account: BigNumberish,
		receiver: string,
		amount: BigNumberish
	): Promise<Result<ContractTransaction, DripsError>> {
		if (!utils.isAddress(receiver)) {
			return Result.failure(
				DripsErrors.invalidAddress(`Cannot give funds: receiver address '${receiver} is not valid.`)
			);
		}

		const contractSigner = this.#hubContract.connect(this.signer);

		const tx = await contractSigner['give(uint256,address,uint128)'](account, receiver, amount);

		return Result.success(tx);
	}

	public async getAllowance(): Promise<BigNumber> {
		const address = await this.signer.getAddress();

		return this.#daiContract.allowance(address, this.networkProperties.CONTRACT_DRIPS_HUB);
	}

	public async getAmountCollectableWithSplits(
		address: string,
		currentSplits: SplitsReceiverStruct[]
	): Promise<
		Result<
			[BigNumber, BigNumber] & {
				collected: BigNumber;
				split: BigNumber;
			},
			DripsError
		>
	> {
		if (!utils.isAddress(address)) {
			return Result.failure(
				DripsErrors.invalidAddress(`Cannot retrieve collectable amount: address '${address}' is not valid.`)
			);
		}

		const tx = await this.#hubContract.collectable(address.toLowerCase(), currentSplits);

		return Result.success(tx);
	}

	public async collect(splits: SplitsReceiverStruct[]): Promise<ContractTransaction> {
		const address = await this.signer.getAddress();

		const contractSigner = this.#hubContract.connect(this.signer);

		return contractSigner.collect(address.toLowerCase(), splits);
	}
}
