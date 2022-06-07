import { BigNumberish, providers, Signer, utils, constants } from 'ethers';
import type { DripsReceiverStruct, SplitsReceiverStruct } from 'contracts/DaiDripsHub';
import type { Dai, DaiDripsHub } from '../contracts';
import { getContractsForNetwork } from './contracts';
import { validateDrips, validateSplits } from './utils';
import { Dai__factory } from '../contracts/factories/Dai__factory';
import { DaiDripsHub__factory } from '../contracts/factories/DaiDripsHub__factory';

export default class DripsClient {
	provider: providers.Web3Provider;
	signer: Signer;
	address: string;
	networkId: number;

	contractDetails: any;

	daiContract: Dai;
	hubContract: DaiDripsHub;

	constructor(provider: providers.Web3Provider, networkName: string) {
		this.provider = provider;
		this.contractDetails = getContractsForNetwork(networkName);

		this.daiContract = Dai__factory.connect(this.contractDetails.CONTRACT_DAI, this.provider);
		this.hubContract = DaiDripsHub__factory.connect(this.contractDetails.CONTRACT_DRIPS_HUB, this.provider);
	}

	async connect() {
		try {
			this.signer = this.provider.getSigner();
			const signerAddress = await this.signer.getAddress();
			this.signIn(signerAddress);
			this.networkId = (await this.provider.getNetwork()).chainId;
			return true;
		} catch (e) {
			this.disconnect();
			throw e;
		}
	}

	disconnect() {
		this.signOut();
		this.signer = null;
		this.networkId = null;
	}

	get connected(): boolean {
		return !!this.networkId;
	}

	private signIn(signInAddress: string) {
		this.address = signInAddress.toLowerCase();
	}

	private signOut() {
		this.address = null;
	}

	approveDAIContract() {
		if (!this.signer) throw new Error('DripsClient must be connected before approving DAI');

		const contractSigner = this.daiContract.connect(this.signer);
		return contractSigner.approve(this.contractDetails.CONTRACT_DRIPS_HUB, constants.MaxUint256);
	}

	updateUserDrips(
		lastUpdate: BigNumberish,
		lastBalance: BigNumberish,
		currentReceivers: DripsReceiverStruct[],
		balanceDelta: BigNumberish,
		newReceivers: DripsReceiverStruct[]
	) {
		if (!this.signer) throw new Error('Not connected to wallet');

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
	) {
		if (!this.signer) throw new Error('Not connected to wallet');

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

	updateUserSplits(currentReceivers: SplitsReceiverStruct[], newReceivers: SplitsReceiverStruct[]) {
		if (!this.signer) throw new Error('Not connected to wallet');

		validateSplits(newReceivers);

		const contractSigner = this.hubContract.connect(this.signer);

		return contractSigner.setSplits(currentReceivers, newReceivers);
	}

	giveFromUser(receiver: string, amount: BigNumberish) {
		if (!this.signer) throw new Error('Not connected to wallet');
		if (!utils.isAddress(receiver)) throw new Error(`Invalid recipient: "${receiver}" is not an Ethereum address`);

		const contractSigner = this.hubContract.connect(this.signer);

		return contractSigner['give(address,uint128)'](receiver, amount);
	}

	giveFromAccount(account: BigNumberish, receiver: string, amount: BigNumberish) {
		if (!this.signer) throw new Error('Not connected to wallet');
		if (!utils.isAddress(receiver)) throw new Error(`Invalid recipient: "${receiver}" is not an Ethereum address`);

		const contractSigner = this.hubContract.connect(this.signer);

		return contractSigner['give(uint256,address,uint128)'](account, receiver, amount);
	}

	// check how much DAI the DripsHub is allowed to spend on behalf of the signed-in user
	getAllowance() {
		if (!this.address) throw new Error('Must call connect() before calling getAllowance()');

		return this.daiContract.allowance(this.address, this.contractDetails.CONTRACT_DRIPS_HUB);
	}

	getAmountCollectableWithSplits: DaiDripsHub['collectable'] = (address, currentSplits) => {
		if (!this.provider) throw new Error('Must have a provider defined to query the collectable balance');

		return this.hubContract.collectable(address, currentSplits);
	};
}
