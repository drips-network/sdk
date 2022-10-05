import type { BigNumberish } from 'ethers';
import { ethers } from 'ethers';
import { DripsErrors } from './common/DripsError';
import {
	toBN,
	validateAddress,
	validateDripsReceiverConfigBN,
	validateDripsReceiverConfigObj
} from './common/internals';
import type { ChainDripsMetadata, CycleInfo, DripsReceiverConfig } from './common/types';

namespace Utils {
	export namespace Network {
		export const chainDripsMetadata: Record<number, ChainDripsMetadata> = {
			5: {
				NAME: 'goerli',
				CYCLE_SECS: '604800', // 1 week.
				CONTRACT_DRIPS_HUB: '0x31b3905F6774D7Aa4E95a49784C53dD67ACC02cd',
				CONTRACT_ADDRESS_DRIVER: '0x0749Ed6EB9De41F7bF77426d3128580E449744e1',
				CONTRACT_DRIPS_HUB_LOGIC: '0x68CFD1803E7dDDb7432348644E9441b8105172D2',
				CONTRACT_ADDRESS_DRIVER_LOGIC: '0x9176b535C947bB9fDa7b003F8061B665fE8baCa5',
				// TODO: Update the Subgraph URL after hosted service is shut down.
				SUBGRAPH_URL: 'https://api.thegraph.com/subgraphs/name/gh0stwheel/drips-v02-on-goerli'
			}
		};

		export const SUPPORTED_CHAINS: readonly number[] = Object.freeze(
			Object.keys(chainDripsMetadata).map((chainId) => parseInt(chainId, 10))
		);

		export const isSupportedChain = (chainId: number) => {
			if (SUPPORTED_CHAINS.includes(chainId)) {
				return true;
			}

			return false;
		};
	}
	export namespace Cycle {
		const getUnixTime = (date: Date): number => date.getTime() / 1000;

		export const getInfo = (chainId: number): CycleInfo => {
			if (!Network.isSupportedChain(chainId)) {
				throw DripsErrors.unsupportedNetworkError(
					`Could not get cycle info: chain ID '${chainId}' is not supported. Supported chains are: ${Network.SUPPORTED_CHAINS.toString()}.`,
					chainId
				);
			}

			const cycleDurationSecs = toBN(Network.chainDripsMetadata[chainId].CYCLE_SECS).toBigInt();

			const currentCycleSecs = BigInt(Math.floor(getUnixTime(new Date()))) % cycleDurationSecs;

			const currentCycleStartDate = new Date(new Date().getTime() - Number(currentCycleSecs) * 1000);

			const nextCycleStartDate = new Date(currentCycleStartDate.getTime() + Number(cycleDurationSecs * BigInt(1000)));

			return {
				cycleDurationSecs,
				currentCycleSecs,
				currentCycleStartDate,
				nextCycleStartDate
			};
		};
	}

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
		export const AMT_PER_SEC_MULTIPLIER = toBN(10).pow(18);
	}

	export namespace DripsReceiverConfiguration {
		/**
		 * Converts a drips receiver configuration to a `uint256` string.
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
		 * @throws {DripsErrors.argumentError} if the `dripsReceiverConfig` is not valid.
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
}

export default Utils;
