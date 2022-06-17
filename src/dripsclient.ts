/* eslint-disable max-classes-per-file */

import { utils, constants, ContractTransaction, Signer, BigNumber, BigNumberish } from 'ethers';
import type { DripsReceiverStruct, SplitsReceiverStruct } from 'contracts/DaiDripsHub';
import Web3 from 'web3';
import type { Network, Provider } from '@ethersproject/providers';
import type { Dai, DaiDripsHub } from '../contracts';
import { chainIdToContractsMap, NetworkProperties, SupportedChain, SUPPORTED_CHAINS } from './contracts';
import { transformToEthersProvider, validateDrips, validateSplits } from './utils';
import { Dai__factory } from '../contracts/factories/Dai__factory';
import { DaiDripsHub__factory } from '../contracts/factories/DaiDripsHub__factory';
import { DripsErrors } from './errors';

export type DripsClientConfig = {
	signer: Signer;
	chainId: SupportedChain;
	provider: Provider | Web3;
};

export default class DripsClient {
	readonly signer: Signer;
	readonly network: Network;
	readonly provider: Provider;
	readonly networkProperties: NetworkProperties;

	readonly daiContract: Dai;
	readonly hubContract: DaiDripsHub;

	private constructor(provider: Provider, signer: Signer, network: Network) {
		this.signer = signer;
		this.network = network;
		this.provider = provider;
		this.networkProperties = chainIdToContractsMap[this.network.chainId];

		this.daiContract = Dai__factory.connect(this.networkProperties.CONTRACT_DAI, this.provider);
		this.hubContract = DaiDripsHub__factory.connect(this.networkProperties.CONTRACT_DRIPS_HUB, this.provider);
	}

	static async create(config: DripsClientConfig): Promise<DripsClient> {
		if (!config.chainId) {
			throw DripsErrors.invalidConfiguration(
				`Cannot create instance: chain ID is missing (supported chain IDs are: ${SUPPORTED_CHAINS.toString()}).`,
				config
			);
		}
		if (!SUPPORTED_CHAINS.includes(config.chainId)) {
			throw DripsErrors.invalidConfiguration(
				`Cannot create instance: unsupported chain ID '${
					config.chainId
				}'. Supported chain IDs are: ${SUPPORTED_CHAINS.toString()}.`,
				config
			);
		}
		if (!config.provider) {
			throw DripsErrors.invalidConfiguration('Cannot create instance: provider is missing.');
		}
		if (!config.signer) {
			throw DripsErrors.invalidConfiguration('Cannot create instance: signer is missing.');
		}

		const { signer } = config;
		const signerAddress = await signer.getAddress();

		if (!utils.isAddress(signerAddress)) {
			throw DripsErrors.invalidAddress(
				`Cannot create instance: invalid signer Etherium address '${signerAddress}'.`,
				signerAddress
			);
		}

		const provider = transformToEthersProvider(config.provider);
		const providerNetwork = await provider.getNetwork();

		if (providerNetwork.chainId !== config.chainId) {
			throw DripsErrors.invalidConfiguration(
				`Cannot create instance: chain IDs do not match. The chain ID from the specified provider was '${providerNetwork.chainId}' but it was expected to be '${config.chainId}' - as specified in the configuration.`
			);
		}

		return new DripsClient(provider, signer, providerNetwork);
	}

	approveDAIContract(): Promise<ContractTransaction> {
		const contractSigner = this.daiContract.connect(this.signer);

		return contractSigner.approve(this.networkProperties.CONTRACT_DRIPS_HUB, constants.MaxUint256);
	}

	updateUserDrips(
		lastUpdate: BigNumberish,
		lastBalance: BigNumberish,
		currentReceivers: DripsReceiverStruct[],
		balanceDelta: BigNumberish,
		newReceivers: DripsReceiverStruct[]
	): Promise<ContractTransaction> {
		validateDrips(newReceivers);

		const contractSigner = this.hubContract.connect(this.signer);

		return contractSigner['setDrips(uint64,uint128,(address,uint128)[],int128,(address,uint128)[])'](
			lastUpdate,
			lastBalance,
			currentReceivers,
			balanceDelta,
			newReceivers
		);
	}

	updateSubAccountDrips(
		subAccountId: BigNumberish,
		lastUpdate: BigNumberish,
		lastBalance: BigNumberish,
		currentReceivers: DripsReceiverStruct[],
		balanceDelta: BigNumberish,
		newReceivers: DripsReceiverStruct[]
	): Promise<ContractTransaction> {
		validateDrips(newReceivers);

		const contractSigner = this.hubContract.connect(this.signer);

		return contractSigner['setDrips(uint256,uint64,uint128,(address,uint128)[],int128,(address,uint128)[])'](
			subAccountId,
			lastUpdate,
			lastBalance,
			currentReceivers,
			balanceDelta,
			newReceivers
		);
	}

	updateUserSplits(
		currentReceivers: SplitsReceiverStruct[],
		newReceivers: SplitsReceiverStruct[]
	): Promise<ContractTransaction> {
		validateSplits(newReceivers);

		const contractSigner = this.hubContract.connect(this.signer);

		return contractSigner.setSplits(currentReceivers, newReceivers);
	}

	giveFromUser(receiver: string, amount: BigNumberish): Promise<ContractTransaction> {
		if (!utils.isAddress(receiver)) {
			throw DripsErrors.invalidAddress(`Cannot give funds: invalid Etherium address '${receiver}.`, receiver);
		}

		const contractSigner = this.hubContract.connect(this.signer);

		return contractSigner['give(address,uint128)'](receiver, amount);
	}

	giveFromAccount(account: BigNumberish, receiver: string, amount: BigNumberish): Promise<ContractTransaction> {
		if (!utils.isAddress(receiver)) {
			throw DripsErrors.invalidAddress(`Cannot give funds: invalid Etherium address '${receiver}.`, receiver);
		}

		const contractSigner = this.hubContract.connect(this.signer);

		return contractSigner['give(uint256,address,uint128)'](account, receiver, amount);
	}

	async getAllowance(): Promise<BigNumber> {
		const address = await this.signer!.getAddress();

		return this.daiContract.allowance(address, this.networkProperties.CONTRACT_DRIPS_HUB);
	}

	getAmountCollectableWithSplits(
		address: string,
		currentSplits: SplitsReceiverStruct[]
	): Promise<
		[BigNumber, BigNumber] & {
			collected: BigNumber;
			split: BigNumber;
		}
	> {
		if (!utils.isAddress(address)) {
			throw DripsErrors.invalidAddress(
				`Cannot retrieve collectable amount: invalid Etherium address '${address}'`,
				address
			);
		}

		return this.hubContract.collectable(address.toLowerCase(), currentSplits);
	}

	async collect(splits: SplitsReceiverStruct[]): Promise<ContractTransaction> {
		const address = await this.signer!.getAddress();

		const contractSigner = this.hubContract.connect(this.signer);

		return contractSigner.collect(address.toLowerCase(), splits);
	}
}
