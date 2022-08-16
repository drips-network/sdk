import type { JsonRpcSigner } from '@ethersproject/providers';
import { Contract, utils } from 'ethers';
import type { SplitsReceiverStruct } from '../contracts/AddressApp';
import { DripsErrors } from './DripsError';
import type { DripsReceiver, NetworkProperties } from './types';

const MAX_DRIPS_RECEIVERS = 100;

export const chainIdToNetworkPropertiesMap: Record<number, NetworkProperties> = {
	5: {
		name: 'goerli',
		CONTRACT_DRIPS_HUB: '0x4FaAB6032dd0264a8e2671F56fd30F69362f31Ad',
		CONTRACT_ADDRESS_APP: '0x76F457CD4F60c0a634781bfdB8c5318050633A08',
		CONTRACT_DRIPS_HUB_LOGIC: '0xB79663c5E27C1a2c93aeE2a35b273b0255638267'
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

export const customStringify = (v: any) => {
	// https://stackoverflow.com/questions/11616630/how-can-i-print-a-circular-structure-in-a-json-like-format
	const cache = new Set();
	return JSON.stringify(v, (key, value) => {
		if (typeof value === 'object' && value !== null) {
			if (cache.has(value)) {
				// Circular reference found
				try {
					// If this value does not reference a parent it can be deduped
					return JSON.parse(JSON.stringify(value));
				} catch (err) {
					// discard key if value cannot be deduped
					// eslint-disable-next-line consistent-return
					return;
				}
			}
			// Store value in our set
			cache.add(value);
		}
		return value;
	});
};
