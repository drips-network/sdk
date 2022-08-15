import type { DripsReceiverStruct } from 'contracts/AddressApp';
import { BigNumber } from 'ethers';
import { guardAgainstInvalidAddress } from './common';
import { DripsErrors } from './DripsError';
import type { DripsEntry } from './types';

/**
 * Maps from `DripsEntry` to `DripsReceiverStruct`.
 * @param  {DripsEntry[]} ...dripsEntries The drip entries.
 * @returns The mapped drip receiver structs.
 */
const mapDripEntriesToStructs = (...dripsEntries: DripsEntry[]): DripsReceiverStruct[] => {
	const structs: DripsReceiverStruct[] =
		dripsEntries?.map((d) => ({
			config: d.config,
			userId: d.receiverUserId
		})) || [];

	return structs;
};

/**
 * Extracts the `userId` and the `assetId` from the specified user asset configuration ID.
 *
 * Note: a user asset configuration ID is a string with in the format of '[user ID]-[asset ID]'.
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
			destructUserAssetConfigId
		);
	}
	return {
		userId: configId.split('-')[0],
		assetId: configId.split('-')[1]
	};
};

/**
 * Returns the asset ID for the specified ERC20 token.
 * @param  {string} erc20TokenAddress The ERC20 token address to use.
 * @throws {@link DripsErrors.invalidAddress} if `erc20TokenAddress` address is not valid.
 * @returns The asset ID.
 */
const getAssetIdFromAddress = (erc20TokenAddress: string): string => {
	guardAgainstInvalidAddress(erc20TokenAddress);

	return BigNumber.from(erc20TokenAddress).toString();
};

/**
 * Returns the The ERC20 token address for the specified asset ID.
 * @param  {string} assetId The asset ID to use.
 * @returns The ERC20 token address.
 */
const getTokenAddressFromAssetId = (assetId: string): string => BigNumber.from(assetId).toHexString();

const utils = {
	getAssetIdFromAddress,
	mapDripEntriesToStructs,
	destructUserAssetConfigId,
	getTokenAddressFromAssetId
};

export default utils;
