import type { DripsReceiverStruct, SplitsReceiverStruct } from 'contracts/AddressApp';
import { BigNumber } from 'ethers';
import { chainIdToNetworkPropertiesMap, validators } from './common';
import { DripsErrors } from './DripsError';
import type { DripsEntry, NetworkProperties, SplitEntry } from './types';

/**
 * Maps from `DripsEntry` to `DripsReceiverStruct`.
 * @param  {DripsEntry[]} dripsEntries The drip entries.
 * @returns The mapped drip receiver structs.
 */
const mapDripEntriesToStructs = (dripsEntries: DripsEntry[]): DripsReceiverStruct[] => {
	const structs: DripsReceiverStruct[] = dripsEntries.map((d) => ({
		config: d.config,
		userId: d.receiverUserId
	}));

	return structs;
};

/**
 * Maps from `SplitEntry` to `SplitReceiverStruct`.
 * @param  {DripsEntry[]} splitEntries The split entries.
 * @returns The mapped split receiver structs.
 */
const mapSplitEntriesToStructs = (splitEntries: SplitEntry[]): SplitsReceiverStruct[] => {
	const structs: SplitsReceiverStruct[] = splitEntries.map((s) => ({
		userId: s.receiverUserId,
		weight: s.weight
	}));

	return structs;
};

/**
 * Returns the asset ID for the specified ERC20 token.
 * @param  {string} erc20TokenAddress The ERC20 token address.
 * @throws {@link DripsErrors.invalidAddress} if `erc20TokenAddress` address is not valid.
 * @returns The asset ID.
 */
const getAssetIdFromAddress = (erc20TokenAddress: string): string => {
	validators.validateAddress(erc20TokenAddress);

	return BigNumber.from(erc20TokenAddress).toString();
};

/**
 * Returns the The ERC20 token address for the specified asset ID.
 * @param  {string} assetId The asset ID to use.
 * @returns The ERC20 token address.
 */
const getTokenAddressFromAssetId = (assetId: string): string => BigNumber.from(assetId).toHexString();

/**
 * Extracts the `userId` and the `assetId` from the specified user asset configuration ID.
 *
 * Note: a user asset configuration ID is a string in the format of '[user ID]-[asset ID]'.
 * @param  {string} configId The user asset configuration ID.
 * @throws {@link DripsErrors.invalidArgument} if the `configId` has a "falsy" value or does not have the expected format.
 * @returns An object with the following properties:
 * - User ID
 * - Asset ID
 */
const destructUserAssetConfigId = (
	configId: string
): {
	userId: string;
	assetId: string;
} => {
	if (!configId || !configId.includes('-')) {
		throw DripsErrors.invalidArgument(
			`Could not destruct user asset configuration ID: '${configId}' is not a valid user asset configuration ID.`,
			'utils.destructUserAssetConfigId()'
		);
	}

	return {
		userId: configId.split('-')[0],
		assetId: configId.split('-')[1]
	};
};

/**
 * Creates a user asset configuration ID from the specified arguments.
 * @param  {string} userId The user ID.
 * @param  {string} assetId The asset ID.
 * @returns The user asset configuration ID.
 */
const constructUserAssetConfigId = (userId: string, assetId: string): string => {
	if (!userId || !assetId) {
		throw DripsErrors.invalidArgument(
			`Could not create user asset configuration ID: Both the user ID and the ERC20 token address are required.`,
			'utils.constructUserAssetConfigId()'
		);
	}

	return `${userId}-${assetId}`;
};

/**
 * Returns the {@link NetworkProperties} for the specified network name.
 * @param  {string} networkName The network name.
 * @returns NetworkProperties
 */
const getNetworkProperties = (networkName: string): NetworkProperties | undefined => {
	const values = Object.values(chainIdToNetworkPropertiesMap);
	return values.find((v) => v.NAME === networkName.toLowerCase());
};

const utils = {
	getNetworkProperties,
	getAssetIdFromAddress,
	mapDripEntriesToStructs,
	mapSplitEntriesToStructs,
	destructUserAssetConfigId,
	constructUserAssetConfigId,
	getTokenAddressFromAssetId
};

export default utils;
