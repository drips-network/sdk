import { utils } from 'ethers';
import { DripsErrors } from './DripsError';

export type NetworkProperties = {
	readonly name: string;
	readonly CONTRACT_DRIPS_HUB: string;
	readonly CONTRACT_ADDRESS_APP: string;
};

export const chainIdToNetworkPropertiesMap: Record<number, NetworkProperties> = {
	1: {
		name: 'mainnet',
		CONTRACT_DRIPS_HUB: '',
		CONTRACT_ADDRESS_APP: ''
	},
	4: {
		name: 'rinkeby',
		CONTRACT_DRIPS_HUB: '',
		CONTRACT_ADDRESS_APP: ''
	},
	5: {
		name: 'goerli',
		CONTRACT_DRIPS_HUB: '',
		CONTRACT_ADDRESS_APP: ''
	},
	137: {
		name: 'matic',
		CONTRACT_DRIPS_HUB: '',
		CONTRACT_ADDRESS_APP: ''
	},
	80001: {
		name: 'mumbai',
		CONTRACT_DRIPS_HUB: '',
		CONTRACT_ADDRESS_APP: ''
	}
};

export const supportedChains: readonly number[] = Object.freeze(
	Object.keys(chainIdToNetworkPropertiesMap).map((chainId) => parseInt(chainId, 10))
);

export const guardAgainstInvalidAddress = (address: string) => {
	if (!utils.isAddress(address)) {
		throw DripsErrors.invalidAddress(`Address '${address}' is not valid.`);
	}
};

// All ERC20 tokens implement the same (IERC20) interface.
// This library needs only a subset of this interface, the `approve` and `allowance` functions.
export const erc20Abi = [
	{
		inputs: [
			{
				name: '_spender',
				type: 'address'
			},
			{
				name: '_value',
				type: 'uint256'
			}
		],
		name: 'approve',
		outputs: [
			{
				name: 'success',
				type: 'bool'
			}
		],
		payable: false,
		type: 'function'
	},
	{
		constant: true,
		inputs: [
			{
				name: '_owner',
				type: 'address'
			},
			{
				name: '_spender',
				type: 'address'
			}
		],
		name: 'allowance',
		outputs: [
			{
				name: 'remaining',
				type: 'uint256'
			}
		],
		payable: false,
		type: 'function'
	}
];
