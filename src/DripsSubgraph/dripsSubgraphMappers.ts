import type { DripsReceiverStruct, SplitsReceiverStruct } from 'contracts/AddressApp';
import { toBN } from '../common/internals';
import Utils from '../utils';
import type { DripsConfiguration, DripsReceiver, Split, UserAssetConfig } from './types';

/**
 * Maps from `Drip` to `DripsReceiverStruct`.
 * @param  {Drip[]} dripsEntries The drip entries.
 * @returns The mapped drip receiver structs.
 */
const mapDripsReceiverDtosToStructs = (dripsReceivers: DripsReceiver[]): DripsReceiverStruct[] => {
	const structs: DripsReceiverStruct[] = dripsReceivers?.map((d) => ({
		config: Utils.DripsReceiverConfiguration.toUint256({
			amountPerSec: d.config.amountPerSec,
			duration: d.config.duration,
			start: d.config.start
		}),
		userId: d.receiverUserId
	}));

	return structs;
};

const mapUserAssetConfigToDto = (userAssetConfig: UserAssetConfig): DripsConfiguration => {
	const dripsReceivers = userAssetConfig.dripsEntries?.map((drip) => {
		// Return config as an object instead of as a BigNumberish.

		// Create a new config from the uint256 value returned from the subgraph.
		const configToReturn = Utils.DripsReceiverConfiguration.fromUint256(drip.config);

		// Make sure the received and the new config are the same.
		if (!toBN(Utils.DripsReceiverConfiguration.toUint256(configToReturn)).eq(drip.config)) {
			throw new Error('Cannot map results from subgraph query: configs do not match.');
		}

		return {
			receiverUserId: drip.receiverUserId,
			config: {
				start: configToReturn.start.toString(),
				duration: configToReturn.duration.toString(),
				asUint256: Utils.DripsReceiverConfiguration.toUint256(configToReturn).toString(),
				amountPerSec: configToReturn.amountPerSec.toString()
			}
		};
	});

	return {
		...userAssetConfig,
		tokenAddress: Utils.Assets.getAddressFromAssetId(userAssetConfig.assetId),
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

const dripsSubgraphMappers = {
	mapDripsReceiverDtosToStructs,
	mapSplitsDtosToStructs,
	mapUserAssetConfigToDto,
	mapUserAssetConfigToDtos
};

export default dripsSubgraphMappers;
