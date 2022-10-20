import type { BigNumberish } from 'ethers';
import { BigNumber, ethers } from 'ethers';
import { DripsErrors } from './common/DripsError';
import { validateAddress, validateDripsReceiverConfig } from './common/internals';
import type { DripsMetadata, CycleInfo, DripsReceiverConfig } from './common/types';

namespace Utils {
	export namespace Network {
		export const dripsMetadata: Record<number, DripsMetadata> = {
			5: {
				NAME: 'goerli',
				CYCLE_SECS: '604800', // 1 week.
				CONTRACT_DRIPS_HUB: '0x4Cf1B4B46840CdCE2198D5404f17A3b967dcDca8',
				CONTRACT_DRIPS_HUB_LOGIC: '0xc904A8De767dddC27026391f853092ACB7DD8291',
				CONTRACT_ADDRESS_DRIVER_ID: '0',
				CONTRACT_ADDRESS_DRIVER: '0x77E51F4c1797231D20941101ff6aF28A4289e4dd',
				CONTRACT_ADDRESS_DRIVER_LOGIC: '0x1c40531Abc65A8c16199E8cb7a940cB22F4Bc394',
				CONTRACT_NFT_DRIVER_ID: '1',
				CONTRACT_NFT_DRIVER: '0xa12A25C4dda78B2e5a110017a8c82a3d30929115',
				CONTRACT_NFT_DRIVER_LOGIC: '0xCdC5dbB9a12F9A7Db25d0480cCcecCe8D9eA2a16',
				CONTRACT_IMMUTABLE_SPLITS_DRIVER: '0x1d953Da768D442c367584c45210012Afc1206eFa',
				CONTRACT_IMMUTABLE_SPLITS_DRIVER_ID: '2',
				CONTRACT_IMMUTABLE_SPLITS_DRIVER_LOGIC: '0xB48428bCa1519d72aF0F148c9B72e6c009a7AD70',
				// TODO: Update the Subgraph URL after hosted service is shut down.
				SUBGRAPH_URL: 'https://api.thegraph.com/subgraphs/name/gh0stwheel/drips-v02-on-goerli'
			}
		};

		export const SUPPORTED_CHAINS: readonly number[] = Object.freeze(
			Object.keys(dripsMetadata).map((chainId) => parseInt(chainId, 10))
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

			const cycleDurationSecs = BigInt(Network.dripsMetadata[chainId].CYCLE_SECS);

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
		 * @throws {DripsErrors.addressError} if the `tokenAddress` address is not valid.
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
		 * @throws {DripsErrors.argumentMissingError} if the `dripsReceiverConfig` is missing.
		 * @throws {DripsErrors.dripsReceiverConfigError} if the `dripsReceiverConfig` is not valid.
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
		 * @throws {DripsErrors.argumentMissingError} if the `dripsReceiverConfig` is missing.
		 * @throws {DripsErrors.argumentError} if the `dripsReceiverConfig` is not valid.
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
