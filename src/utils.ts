import type { BigNumberish } from 'ethers';
import { BigNumber, ethers } from 'ethers';
import { DripsErrors } from './common/DripsError';
import type { NetworkConfig, CycleInfo, DripsReceiverConfig } from './common/types';
import { validateAddress, validateDripsReceiverConfig } from './common/validators';

namespace Utils {
	export namespace Network {
		export const configs: Record<number, NetworkConfig> = {
			5: {
				CYCLE_SECS: '604800', // 1 week.
				NETWORK_NAME: 'goerli',
				CONTRACT_CALLER: '0xe88077030a7dAB7cb61C67FAAcF6F112D6C64D52',
				CONTRACT_DRIPS_HUB: '0xC5B2942Ca76D76D5e6A36b2202CD5569BdB47dF0',
				CONTRACT_DRIPS_HUB_LOGIC: '0x4d5132D92414c4cCEb6f79A425259Fc242Ccd7Ee',
				CONTRACT_ADDRESS_DRIVER_ID: '0',
				CONTRACT_ADDRESS_DRIVER: '0x84Ab3a89ec8b7dFd6a035002A605913D539334Ea',
				CONTRACT_ADDRESS_DRIVER_LOGIC: '0x8b032715125647187b8b6d10c19a6Afc4da404Bc',
				CONTRACT_NFT_DRIVER_ID: '1',
				CONTRACT_NFT_DRIVER: '0x9FBB99F57505B93bC929637423A0Fe751EEDE99f',
				CONTRACT_NFT_DRIVER_LOGIC: '0x60D9e46275E93D1e82bA99B84472307664194eC4',
				CONTRACT_IMMUTABLE_SPLITS_DRIVER: '0xad30c0A013C9198D43215003A429b4B633bF1FC9',
				CONTRACT_IMMUTABLE_SPLITS_DRIVER_ID: '2',
				CONTRACT_IMMUTABLE_SPLITS_DRIVER_LOGIC: '0xf8340804c26CE70e1F0C9a2e422fE881Ca4E3EAe',
				// TODO: Update the Subgraph URL after hosted service is shut down.
				SUBGRAPH_URL: 'https://api.thegraph.com/subgraphs/name/gh0stwheel/drips-v02-on-goerli'
			}
		};

		export const SUPPORTED_CHAINS: readonly number[] = Object.freeze(
			Object.keys(configs).map((chainId) => parseInt(chainId, 10))
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
					`Could not get cycle info: chain ID '${chainId}' is not supported. Supported chain IDs are: ${Network.SUPPORTED_CHAINS.toString()}.`,
					chainId
				);
			}

			const cycleDurationSecs = BigInt(Network.configs[chainId].CYCLE_SECS);

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
		 * Returns the ERC20 token address for the given asset.
		 * @param  {BigNumberish} assetId The asset ID.
		 * @returns The ERC20 token address.
		 */
		export const getAddressFromId = (assetId: BigNumberish): string =>
			ethers.utils.getAddress(BigNumber.from(assetId).toHexString());

		/**
		 * Returns the asset ID for the given ERC20 token.
		 * @param  {string} tokenAddress The ERC20 token address.
		 * @returns The asset ID.
		 * @throws {@link DripsErrors.addressError} if the `tokenAddress` address is not valid.
		 */
		export const getIdFromAddress = (tokenAddress: string): bigint => {
			validateAddress(tokenAddress);

			return BigNumber.from(tokenAddress).toBigInt();
		};
	}

	export namespace DripsReceiverConfiguration {
		/**
		 * Converts a drips receiver configuration object to a `uint256`.
		 * @param  {DripsReceiverConfigDto} dripsReceiverConfig The drips receiver configuration object.
		 * @returns The drips receiver configuration as a `uint256`.
		 * @throws {@link DripsErrors.argumentMissingError} if the `dripsReceiverConfig` is missing.
		 * @throws {@link DripsErrors.dripsReceiverConfigError} if the `dripsReceiverConfig` is not valid.
		 */
		export const toUint256 = (dripsReceiverConfig: DripsReceiverConfig): bigint => {
			validateDripsReceiverConfig(dripsReceiverConfig);

			const { dripId, start, duration, amountPerSec } = dripsReceiverConfig;

			let config = BigNumber.from(dripId);
			config = config.shl(160);
			config = config.or(amountPerSec);
			config = config.shl(32);
			config = config.or(start);
			config = config.shl(32);
			config = config.or(duration);

			return config.toBigInt();
		};

		/**
		 * Converts a `uint256` that represent a drips receiver configuration to an object.
		 * @param  {BigNumberish} dripsReceiverConfig The drips receiver configuration as`uint256`.
		 * @returns The drips receiver configuration object.
		 * @throws {@link DripsErrors.argumentMissingError} if the `dripsReceiverConfig` is missing.
		 * @throws {@link DripsErrors.argumentError} if the `dripsReceiverConfig` is not valid.
		 */
		export const fromUint256 = (dripsReceiverConfig: BigNumberish): DripsReceiverConfig => {
			const configAsBn = BigNumber.from(dripsReceiverConfig);

			const dripId = configAsBn.shr(160 + 32 + 32);
			const amountPerSec = configAsBn.shr(32 + 32).and(BigNumber.from(1).shl(160).sub(1));
			const start = configAsBn.shr(32).and(BigNumber.from(1).shl(32).sub(1));
			const duration = configAsBn.and(BigNumber.from(1).shl(32).sub(1));

			const config = {
				dripId: dripId.toBigInt(),
				amountPerSec: amountPerSec.toBigInt(),
				duration: duration.toBigInt(),
				start: start.toBigInt()
			};

			validateDripsReceiverConfig(config);

			return config;
		};
	}
}

export default Utils;
