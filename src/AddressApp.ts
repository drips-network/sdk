import type { Network } from '@ethersproject/networks';
import type { JsonRpcProvider } from '@ethersproject/providers';
import type { DripsReceiverStruct, SplitsReceiverStruct } from 'contracts/AddressApp';
import type { BigNumber, BigNumberish, ContractTransaction, Signer } from 'ethers';
import { constants, Contract } from 'ethers';
import type { AddressApp as AddressAppContract } from '../contracts';
import { AddressApp__factory } from '../contracts';
import type { NetworkProperties } from './common';
import { erc20Abi, chainIdToNetworkPropertiesMap, guardAgainstInvalidAddress, supportedChains } from './common';
import { DripsErrors } from './DripsError';
import DripsHub from './DripsHub';

export default class AddressApp {
	#addressAppContract!: AddressAppContract;

	#signer!: Signer;
	public get signer() {
		return this.#signer;
	}

	#dripsHub!: DripsHub;
	public get dripsHub() {
		return this.#dripsHub;
	}

	#network!: Network;
	public get network() {
		return this.#network;
	}

	#provider!: JsonRpcProvider;
	public get provider() {
		return this.#provider;
	}

	#networkProperties!: NetworkProperties;
	public get networkProperties() {
		return this.#networkProperties;
	}

	private constructor() {}

	public static async create(provider: JsonRpcProvider): Promise<AddressApp> {
		if (!provider) {
			throw DripsErrors.invalidArgument(
				'Could not instantiate a new AddressApp: provider-argument was "falsy" but is required.'
			);
		}

		const signer = provider.getSigner();

		const network = await provider.getNetwork();
		const networkProperties = chainIdToNetworkPropertiesMap[network.chainId];
		if (!networkProperties?.CONTRACT_ADDRESS_APP) {
			throw DripsErrors.invalidArgument(
				`Could not instantiate a new AddressApp: provider is connected to unsupported chain (ID: '${
					network.chainId
				})'. Supported chain IDs are: '${supportedChains.toString()}'.`
			);
		}

		const addressApp = new AddressApp();

		addressApp.#network = network;
		addressApp.#provider = provider;
		addressApp.#networkProperties = networkProperties;
		addressApp.#dripsHub = await DripsHub.create(provider);
		addressApp.#signer = signer;
		addressApp.#addressAppContract = AddressApp__factory.connect(networkProperties.CONTRACT_ADDRESS_APP, signer);

		return addressApp;
	}

	public approve(erc20Address: string): Promise<ContractTransaction> {
		guardAgainstInvalidAddress(erc20Address);

		const signerAsErc20Contract = new Contract(erc20Address, erc20Abi, this.provider.getSigner());

		return signerAsErc20Contract.approve(this.#networkProperties.CONTRACT_ADDRESS_APP, constants.MaxUint256);
	}

	public getAllowance(erc20Address: string) {
		guardAgainstInvalidAddress(erc20Address);

		const signerAsErc20Contract = new Contract(erc20Address, erc20Abi, this.provider.getSigner());

		return signerAsErc20Contract.allowance(this.signer, this.#networkProperties.CONTRACT_ADDRESS_APP);
	}

	public getUserIdForAddress(userAddress: string): Promise<BigNumber> {
		guardAgainstInvalidAddress(userAddress);

		return this.#addressAppContract.calcUserId(userAddress);
	}

	public async getUserIdForClientSigner(): Promise<BigNumber> {
		const signerAddress = await this.#signer.getAddress();

		return this.#addressAppContract.calcUserId(signerAddress);
	}

	public collect(userAddress: string, erc20Address: string): Promise<ContractTransaction> {
		guardAgainstInvalidAddress(userAddress);
		guardAgainstInvalidAddress(erc20Address);

		return this.#addressAppContract.collect(userAddress, erc20Address);
	}

	public collectAll(
		userAddress: string,
		erc20Address: string,
		currentReceivers: SplitsReceiverStruct[]
	): Promise<ContractTransaction> {
		guardAgainstInvalidAddress(userAddress);
		guardAgainstInvalidAddress(erc20Address);

		return this.#addressAppContract.collectAll(userAddress, erc20Address, currentReceivers);
	}

	public give(receiverId: BigNumberish, erc20Address: string, amount: BigNumberish): Promise<ContractTransaction> {
		guardAgainstInvalidAddress(erc20Address);

		return this.#addressAppContract.give(receiverId, erc20Address, amount);
	}

	public setDrips(
		erc20Address: string,
		currentReceivers: DripsReceiverStruct[],
		balanceDelta: BigNumberish,
		newReceivers: DripsReceiverStruct[]
	): Promise<ContractTransaction> {
		guardAgainstInvalidAddress(erc20Address);

		return this.#addressAppContract.setDrips(erc20Address, currentReceivers, balanceDelta, newReceivers);
	}

	public setSplits(receivers: SplitsReceiverStruct[]): Promise<ContractTransaction> {
		return this.#addressAppContract.setSplits(receivers);
	}
}
