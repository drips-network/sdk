import type { ContractTransaction, Signer, BigNumber, BigNumberish } from 'ethers';
import { utils, constants } from 'ethers';
import type { DripsReceiverStruct, SplitsReceiverStruct } from 'contracts/DaiDripsHub';
import type { Network, Provider } from '@ethersproject/providers';
import type { Dai, DaiDripsHub } from '../contracts';
import type { NetworkProperties } from './NetworkProperties';
import { chainIdToNetworkPropertiesMap, SUPPORTED_CHAINS } from './NetworkProperties';
import { areValidDripsReceivers, areValidSplitsReceivers } from './validators';
import { Dai__factory } from '../contracts/factories/Dai__factory';
import { DaiDripsHub__factory } from '../contracts/factories/DaiDripsHub__factory';
import { DripsErrors } from './dripsErrors';

export type DripsClientConfig = {
	signer: Signer;
	provider: Provider;
};

export default class DripsClient {
	private readonly _daiContract: Dai;
	private readonly _hubContract: DaiDripsHub;

	readonly signer: Signer;
	readonly network: Network;
	readonly provider: Provider;
	readonly networkProperties: NetworkProperties;

	private constructor(provider: Provider, signer: Signer, network: Network) {
		this.signer = signer;
		this.network = network;
		this.provider = provider;
		this.networkProperties = chainIdToNetworkPropertiesMap[this.network.chainId];

		this._daiContract = Dai__factory.connect(this.networkProperties.CONTRACT_DAI, this.provider);
		this._hubContract = DaiDripsHub__factory.connect(this.networkProperties.CONTRACT_DRIPS_HUB, this.provider);
	}

	static async create(config: DripsClientConfig): Promise<DripsClient> {
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

		if (!(SUPPORTED_CHAINS as readonly number[]).includes(network.chainId)) {
			throw DripsErrors.invalidConfiguration(
				`Cannot create instance: chain ID '${
					network.chainId
				}' is not supported. Supported chain IDs are: '${SUPPORTED_CHAINS.toString()}'.`
			);
		}

		return new DripsClient(provider, signer, network);
	}

	approveDAIContract(): Promise<ContractTransaction> {
		const contractSigner = this._daiContract.connect(this.signer);

		return contractSigner.approve(this.networkProperties.CONTRACT_DRIPS_HUB, constants.MaxUint256);
	}

	updateUserDrips(
		lastUpdate: BigNumberish,
		lastBalance: BigNumberish,
		currentReceivers: DripsReceiverStruct[],
		balanceDelta: BigNumberish,
		newReceivers: DripsReceiverStruct[]
	): Promise<ContractTransaction> {
		// TODO: Change to invalidArgument after merge (https://github.com/radicle-dev/drips-js-sdk/pull/40#issuecomment-1167454932).
		if (!areValidDripsReceivers(newReceivers)) {
			throw DripsErrors.invalidOperation('Cannot update user Drips: receivers are not valid.', newReceivers);
		}

		const contractSigner = this._hubContract.connect(this.signer);

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
		// TODO: Change to invalidArgument after merge (https://github.com/radicle-dev/drips-js-sdk/pull/40#issuecomment-1167454932).
		if (!areValidDripsReceivers(newReceivers)) {
			throw DripsErrors.invalidOperation('Cannot update user Drips: receivers are not valid.', newReceivers);
		}
		const contractSigner = this._hubContract.connect(this.signer);

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
		if (!areValidSplitsReceivers(newReceivers)) {
			// TODO: Change to invalidArgument after merge (https://github.com/radicle-dev/drips-js-sdk/pull/40#issuecomment-1167454932).
			throw DripsErrors.invalidOperation('Cannot update user Splits: receivers are not valid', newReceivers);
		}
		const contractSigner = this._hubContract.connect(this.signer);

		return contractSigner.setSplits(currentReceivers, newReceivers);
	}

	giveFromUser(receiver: string, amount: BigNumberish): Promise<ContractTransaction> {
		if (!utils.isAddress(receiver)) {
			throw DripsErrors.invalidAddress(`Cannot give funds: receiver address '${receiver} is not valid.`);
		}

		const contractSigner = this._hubContract.connect(this.signer);

		return contractSigner['give(address,uint128)'](receiver, amount);
	}

	giveFromAccount(account: BigNumberish, receiver: string, amount: BigNumberish): Promise<ContractTransaction> {
		if (!utils.isAddress(receiver)) {
			throw DripsErrors.invalidAddress(`Cannot give funds: receiver address '${receiver} is not valid.`);
		}

		const contractSigner = this._hubContract.connect(this.signer);

		return contractSigner['give(uint256,address,uint128)'](account, receiver, amount);
	}

	async getAllowance(): Promise<BigNumber> {
		const address = await this.signer.getAddress();

		return this._daiContract.allowance(address, this.networkProperties.CONTRACT_DRIPS_HUB);
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
			throw DripsErrors.invalidAddress(`Cannot retrieve collectable amount: address '${address}' is not valid.`);
		}

		return this._hubContract.collectable(address.toLowerCase(), currentSplits);
	}

	async collect(splits: SplitsReceiverStruct[]): Promise<ContractTransaction> {
		const address = await this.signer.getAddress();

		const contractSigner = this._hubContract.connect(this.signer);

		return contractSigner.collect(address.toLowerCase(), splits);
	}
}
