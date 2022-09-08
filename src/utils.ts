/* eslint-disable max-classes-per-file */

import type { BigNumberish } from 'ethers';
import { ethers } from 'ethers';
import type { ChainDripsMetadata, SupportedChain } from './AddressApp/types';
import {
	toBN,
	validateAddress,
	validateDripsReceiverConfigBN,
	validateDripsReceiverConfigObj
} from './common/internals';
import type { DripsReceiverConfig } from './common/types';

namespace Utils {
	export namespace Asset {
		/**
		 * Returns the ERC20 token address for the specified asset.
		 * @param  {string} assetId The asset ID.
		 * @returns The ERC20 token address.
		 */
		export const getAddressFromId = (assetId: BigNumberish): string =>
			ethers.utils.getAddress(toBN(assetId).toHexString());

		/**
		 * Returns the asset ID for the specified ERC20 token.
		 * @param  {string} erc20TokenAddress The ERC20 token address.
		 * @returns The asset ID.
		 * @throws {@link DripsErrors.addressError} if the `erc20TokenAddress` address is not valid.
		 */
		export const getIdFromAddress = (erc20TokenAddress: string): string => {
			validateAddress(erc20TokenAddress);

			return toBN(erc20TokenAddress).toString();
		};
	}

	export namespace Constants {
		export const MAX_DRIPS_RECEIVERS = 100;
		export const MAX_SPLITS_RECEIVERS = 200;
		export const TOTAL_SPLITS_WEIGHT = 1_000_000;
	}

	export namespace DripsReceiverConfiguration {
		/**
		 * Converts a drips receiver configuration to a `uint256`.
		 * @param  {DripsReceiverConfigDto} dripsReceiverConfig The drips receiver configuration.
		 * @returns The drips receiver configuration as a `uint256` string.
		 * @throws {DripsErrors.argumentMissingError} if the `dripsReceiverConfig` is missing.
		 * @throws {DripsErrors.dripsReceiverError} if the `dripsReceiverConfig` is not valid.
		 */
		export const toUint256String = (dripsReceiverConfig: DripsReceiverConfig): string => {
			validateDripsReceiverConfigObj(dripsReceiverConfig);

			const { start, duration, amountPerSec } = dripsReceiverConfig;

			let config = toBN(amountPerSec);

			config = config.shl(32);
			config = config.or(start);
			config = config.shl(32);
			config = config.or(duration);

			return config.toString();
		};

		/**
		 * Converts a `uint256` that represent a drips receiver configuration to an object.
		 * @param  {BigNumberish} dripsReceiverConfig The drips receiver configuration as`uint256`.
		 * @returns The drips receiver configuration.
		 * @throws {DripsErrors.argumentMissingError} if the `dripsReceiverConfig` is missing.
		 * @throws {DripsErrors.argumentError} if the `dripsReceiverConfig` is less than or equal to `0`.
		 */
		export const fromUint256 = (dripsReceiverConfig: BigNumberish): DripsReceiverConfig => {
			validateDripsReceiverConfigBN(dripsReceiverConfig);

			const configAsBN = toBN(dripsReceiverConfig);

			const amountPerSec = configAsBN.shr(64);
			const duration = configAsBN.and(2 ** 32 - 1);
			const start = configAsBN.shr(32).and(2 ** 32 - 1);

			return {
				amountPerSec,
				duration,
				start
			};
		};
	}

	export namespace Network {
		export const chainDripsMetadata: Record<SupportedChain, ChainDripsMetadata> = {
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

		export const SUPPORTED_CHAINS: readonly number[] = Object.freeze(
			Object.keys(chainDripsMetadata).map((chainId) => parseInt(chainId, 10))
		);
	}
}

export default Utils;

// /**
//  * Maps from `Drip` to `DripsReceiverStruct`.
//  * @param  {Drip[]} dripsReceivers The drip entries.
//  * @returns The mapped drip receiver structs.
//  */
// export const mapDripsReceiverDtosToStructs = (dripsReceivers: DripsReceiver[]): DripsReceiverStruct[] => {
// 	const structs: DripsReceiverStruct[] = dripsReceivers?.map((d) => ({
// 		config: Utils.DripsReceiverConfiguration.toUint256String({
// 			amountPerSec: d.config.amountPerSec,
// 			duration: d.config.duration,
// 			start: d.config.start
// 		}),
// 		userId: d.receiverUserId
// 	}));

// 	return structs;
// };

// /**
//  * Maps from `Drip` to `DripsReceiverStruct`.
//  * @param  {Drip[]} dripsReceivers The drip entries.
//  * @returns The mapped drip receiver structs.
//  */
// export const mapDripsReceiverDtosToStructs = (dripsReceivers: DripsReceiver[]): DripsReceiverStruct[] => {
// 	const structs: DripsReceiverStruct[] = dripsReceivers?.map((d) => ({
// 		config: Utils.DripsReceiverConfiguration.toUint256String({
// 			amountPerSec: d.config.amountPerSec,
// 			duration: d.config.duration,
// 			start: d.config.start
// 		}),
// 		userId: d.receiverUserId
// 	}));

// 	return structs;
// };

// /**
//  * Maps from `Split` to `SplitReceiverStruct`.
//  * @param  {Drip[]} splitEntries The split entries.
//  * @returns The mapped split receiver structs.
//  */
//  export const mapSplitsDtosToStructs = (splits: SplitEntry[]): SplitsReceiverStruct[] => {
// 	const structs: SplitsReceiverStruct[] = splits?.map((s) => ({
// 		userId: s.receiverUserId,
// 		weight: s.weight
// 	}));

// 	return structs;
// };

// export type DripsReceiver = {
// 	readonly receiverUserId: string;
// 	readonly config: DripsReceiverConfig;
// };

// export type DripsConfiguration = {
// 	readonly id: string;
// 	readonly assetId: string;
// 	readonly tokenAddress: string;
// 	readonly balance: BigNumberish;
// 	readonly amountCollected: BigNumberish;
// 	readonly dripsReceivers: DripsReceiver[];
// 	readonly lastUpdatedBlockTimestamp: BigNumberish;
// };

// /** @internal */
// export const toDto = (userAssetConfig: UserAssetConfig): DripsConfiguration => {
// 	if (!userAssetConfig) {
// 		throw DripsErrors.argumentMissingError(
// 			`Could not map user asset configurations to DTO: '${nameOf({ userAssetConfig })}' is missing.`,
// 			nameOf({ userAssetConfig })
// 		);
// 	}

// 	const dripsReceivers = userAssetConfig.dripsEntries?.map((dripEntry) => {
// 		const config = Utils.DripsReceiverConfiguration.fromUint256(dripEntry.config);

// 		return {
// 			receiverUserId: dripEntry.receiverUserId,
// 			config
// 		};
// 	});

// 	return {
// 		...userAssetConfig,
// 		tokenAddress: Utils.Asset.getAddressFromId(userAssetConfig.assetId),
// 		dripsReceivers
// 	};
// };

// /** @internal */
// export const toDtos = (userAssetConfigs: UserAssetConfig[]): DripsConfiguration[] => {
// 	if (!userAssetConfigs) {
// 		throw DripsErrors.argumentMissingError(
// 			`Could not map user asset configurations to DTO: '${nameOf({ userAssetConfigs })}' is missing.`,
// 			nameOf({ userAssetConfigs })
// 		);
// 	}

// 	return userAssetConfigs.map((config) => toDto(config));
// };
