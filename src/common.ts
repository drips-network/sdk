import type { JsonRpcSigner } from '@ethersproject/providers';
import type { DripsReceiverStruct } from 'contracts/DripsHub';
import { Contract, utils } from 'ethers';
import type { SplitsReceiverStruct } from '../contracts/AddressApp';
import { DripsErrors } from './DripsError';
import DripsReceiverConfig from './DripsReceiverConfig';
import type { NetworkProperties } from './types';

const MAX_DRIPS_RECEIVERS = 100;

export const chainIdToNetworkPropertiesMap: Record<number, NetworkProperties> = {
	5: {
		NAME: 'goerli',
		CYCLE_SECS: '604800', // 1 week.
		CONTRACT_DRIPS_HUB: '0x8dA62FE714e5Cd7681ef25A845B7C5C0b9add089',
		CONTRACT_ADDRESS_APP: '0xaB09588616214604eBeaE1488eab8533c956b7da',
		CONTRACT_DRIPS_HUB_LOGIC: '0x6B94233AEdf8Ad4f505088Da81EAc225B691e99C',
		CONTRACT_ADDRESS_APP_LOGIC: '0x10fCa1A8f390b611f8437d43A52691566ffC8246',
		// TODO: Update Subgraph URL after hosted service is gone.
		SUBGRAPH_URL: 'https://api.thegraph.com/subgraphs/name/gh0stwheel/drips-v02-on-goerli'
	}
};

export const supportedChainIds: readonly number[] = Object.freeze(
	Object.keys(chainIdToNetworkPropertiesMap).map((chainId) => parseInt(chainId, 10))
);

const validateAddress = (address: string) => {
	if (!utils.isAddress(address)) {
		throw DripsErrors.invalidAddress(`Address '${address}' is not valid.`, 'common.validateAddress()');
	}
};

const validateDripsReceivers = (receivers: DripsReceiverStruct[]) => {
	if (receivers.length > MAX_DRIPS_RECEIVERS) {
		throw DripsErrors.invalidArgument(
			`Invalid drip receivers: drip receivers must be less than ${MAX_DRIPS_RECEIVERS}`,
			'common.validateDripsReceivers()'
		);
	}

	if (receivers.length) {
		receivers.forEach((receiver) => {
			if (!receiver.userId || !DripsReceiverConfig.fromUint256(receiver.config)) {
				throw DripsErrors.invalidArgument(
					`Drips receiver '${JSON.stringify(
						receiver
					)}' is not valid. A receiver must have a user ID and at least a config with an amountPerSec > 0.`,
					'common.validateDripsReceivers()'
				);
			}
		});
	}
};

const validateSplitsReceivers = (receivers: SplitsReceiverStruct[]) => {
	if (receivers.length) {
		receivers.forEach((receiver) => {
			if (!receiver.userId || !receiver.weight) {
				throw DripsErrors.invalidArgument(
					`Splits receiver '${JSON.stringify(receiver)}' is not valid. A receiver must have a user ID and a weight > 0`,
					'common.validateSplitsReceivers()'
				);
			}
		});
	}
};

export const validators = {
	validateAddress,
	validateDripsReceivers,
	validateSplitsReceivers
};

// All ERC20 tokens implement the same (IERC20) interface.
// The Drips SDK needs only a subset of this interface, the `approve` and `allowance` functions.
export const erc20Abi = [
	{
		inputs: [
			{
				internalType: 'address',
				name: 'owner',
				type: 'address'
			},
			{
				internalType: 'address',
				name: 'spender',
				type: 'address'
			}
		],
		name: 'allowance',
		outputs: [
			{
				internalType: 'uint256',
				name: '',
				type: 'uint256'
			}
		],
		stateMutability: 'view',
		type: 'function'
	},
	{
		inputs: [
			{
				internalType: 'address',
				name: 'spender',
				type: 'address'
			},
			{
				internalType: 'uint256',
				name: 'amount',
				type: 'uint256'
			}
		],
		name: 'approve',
		outputs: [
			{
				internalType: 'bool',
				name: '',
				type: 'bool'
			}
		],
		stateMutability: 'nonpayable',
		type: 'function'
	}
];

export const createErc20Contract = (erc20Address: string, signer: JsonRpcSigner): Contract =>
	new Contract(erc20Address, erc20Abi, signer);
