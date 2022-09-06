/* eslint-disable max-classes-per-file */

import type { BigNumberish, BigNumber } from 'ethers';
import { ethers } from 'ethers';
import type { ChainDripsMetadata, SupportedChain, DripsReceiverConfig } from './AddressApp/types';
import {
	toBN,
	validateAddress,
	validateDripsReceiverConfigBN,
	validateDripsReceiverConfigObj
} from './common/internals';

namespace Utils {
	export namespace Assets {
		/**
		 * Returns the ERC20 token address for the specified asset ID.
		 * @param  {string} assetId The asset ID.
		 * @returns The ERC20 token address.
		 */
		export const getAddressFromAssetId = (assetId: BigNumberish): string =>
			ethers.utils.getAddress(toBN(assetId).toHexString());

		/**
		 * Returns the asset ID for the specified ERC20 token address.
		 * @param  {string} erc20TokenAddress The ERC20 token address.
		 * @returns The asset ID.
		 * @throws {@link DripsErrors.addressError} if the `erc20TokenAddress` address is not valid.
		 */
		export const getAssetIdFromAddress = (erc20TokenAddress: string): string => {
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
		 * @returns A `uint256` representing the drips receiver configuration.
		 * @throws {DripsErrors.argumentMissingError} if the `dripsReceiverConfig` is missing.
		 * @throws {DripsErrors.dripsReceiverError} if the `dripsReceiverConfig` is not valid.
		 */
		export const toUint256 = (dripsReceiverConfig: DripsReceiverConfig): BigNumber => {
			validateDripsReceiverConfigObj(dripsReceiverConfig);

			const { start, duration, amountPerSec } = dripsReceiverConfig;

			let config = toBN(amountPerSec);

			config = config.shl(32);
			config = config.or(start);
			config = config.shl(32);
			config = config.or(duration);

			return config;
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
