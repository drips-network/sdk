import type { DripsReceiverStruct, SplitsReceiverStruct } from 'contracts/AddressApp';
import type { BigNumberish } from 'ethers';
import { BigNumber, ethers } from 'ethers';
import { chainIdToNetworkPropertiesMap, validators } from './common';
import { DripsErrors } from './DripsError';
import DripsReceiverConfig from './DripsReceiverConfig';
import type { DripsConfiguration, DripsReceiver, NetworkProperties, Split, UserAssetConfig } from './types';

// TODO: Public util.
/**
 * Maps from `Drip` to `DripsReceiverStruct`.
 * @param  {Drip[]} dripsEntries The drip entries.
 * @returns The mapped drip receiver structs.
 */
const mapDripsReceiverDtosToStructs = (dripsReceivers: DripsReceiver[]): DripsReceiverStruct[] => {
	const structs: DripsReceiverStruct[] = dripsReceivers?.map((d) => ({
		config: new DripsReceiverConfig(d.config.amountPerSec, d.config.duration, d.config.start).asUint256,
		userId: d.receiverUserId
	}));

	return structs;
};

/**
 * Returns the The ERC20 token address for the specified asset ID.
 * @param  {string} assetId The asset ID to use.
 * @returns The ERC20 token address.
 */
const getTokenAddressFromAssetId = (assetId: BigNumberish): string =>
	ethers.utils.getAddress(BigNumber.from(assetId).toHexString());

const mapUserAssetConfigToDto = (userAssetConfig: UserAssetConfig): DripsConfiguration => {
	const dripsReceivers = userAssetConfig.dripsEntries?.map((drip) => {
		// Return config as an object instead of as a BigNumberish.

		// Create a new config from the uint256 value returned from the subgraph.
		const configToReturn = DripsReceiverConfig.fromUint256(drip.config);

		// Make sure the received and the new config are the same.
		if (!BigNumber.from(configToReturn.asUint256).eq(drip.config)) {
			throw new Error('Cannot map results from subgraph query: configs do not match.');
		}

		return {
			receiverUserId: drip.receiverUserId,
			config: {
				start: configToReturn.start.toString(),
				duration: configToReturn.duration.toString(),
				asUint256: configToReturn.asUint256.toString(),
				amountPerSec: configToReturn.amountPerSec.toString()
			}
		};
	});

	return {
		...userAssetConfig,
		tokenAddress: getTokenAddressFromAssetId(userAssetConfig.assetId),
		dripsReceivers
	};
};

const mapUserAssetConfigToDtos = (userAssetConfigs: UserAssetConfig[]): DripsConfiguration[] =>
	userAssetConfigs.map((config) => mapUserAssetConfigToDto(config));

/**
 * Maps from `Split` to `SplitReceiverStruct`.
 * @param  {Drip[]} splitEntries The split entries.
 * @returns The mapped split receiver structs.
 */
const mapSplitsDtosToStructs = (splits: Split[]): SplitsReceiverStruct[] => {
	const structs: SplitsReceiverStruct[] = splits?.map((s) => ({
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
const constructUserAssetConfigId = (userId: BigNumberish, assetId: BigNumberish): string => {
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
	mappers: {
		mapSplitsDtosToStructs,
		mapUserAssetConfigToDto,
		mapUserAssetConfigToDtos,
		mapDripsReceiverDtosToStructs
	},
	getNetworkProperties,
	getAssetIdFromAddress,
	destructUserAssetConfigId,
	constructUserAssetConfigId,
	getTokenAddressFromAssetId
};

export default utils;
