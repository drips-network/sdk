import type { JsonRpcSigner } from '@ethersproject/providers';
import { Contract, utils } from 'ethers';
import type { SplitsReceiverStruct } from '../contracts/AddressApp';
import { DripsErrors } from './DripsError';
import type { DripsReceiver, NetworkProperties } from './types';

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

export const guardAgainstInvalidAddress = (...addresses: string[]) => {
	addresses.forEach((address) => {
		if (!utils.isAddress(address)) {
			throw DripsErrors.invalidAddress(`Address '${address}' is not valid.`, 'guardAgainstInvalidAddress()');
		}
	});
};

export const guardAgainstInvalidDripsReceiver = (...receivers: DripsReceiver[]) => {
	if (receivers.length > MAX_DRIPS_RECEIVERS) {
		throw DripsErrors.invalidArgument(
			`Invalid drip receivers: drip receivers must be less than ${MAX_DRIPS_RECEIVERS}`,
			'guardAgainstInvalidDripsReceiver()'
		);
	}

	receivers.forEach((receiver) => {
		if (!receiver.userId || !receiver.config?.amountPerSec) {
			throw DripsErrors.invalidDripsReceiver(
				`Drips receiver '${JSON.stringify(
					receiver
				)}' is not valid. A receiver must have a user ID and an amountPerSec > 0.`,
				'guardAgainstInvalidDripsReceiver()'
			);
		}
	});
};

export const guardAgainstInvalidSplitsReceiver = (...receivers: SplitsReceiverStruct[]) => {
	receivers.forEach((receiver) => {
		if (!receiver.userId || !receiver.weight) {
			throw DripsErrors.invalidSplitsReceiver(
				`Splits receiver '${JSON.stringify(
					receiver
				)}' is not valid. A receiver must have a user ID, an amountPerSec > 0`,
				'guardAgainstInvalidSplitsReceiver()'
			);
		}
	});
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
