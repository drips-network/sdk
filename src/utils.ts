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
				CONTRACT_CALLER: '0xa084EB22827a5e9BB49a63AE76f66ac47A607B88',
				CONTRACT_DRIPS_HUB: '0xc59fDC9b74478cE30BFECF8023006b9323078189',
				CONTRACT_DRIPS_HUB_LOGIC: '0x68401644F791293AA46DF37D70a6b4F1A7e88Ab7',
				CONTRACT_ADDRESS_DRIVER_ID: '0',
				CONTRACT_ADDRESS_DRIVER: '0xeD5423aD0ee5b227341911a31C930f81Aa49d434',
				CONTRACT_ADDRESS_DRIVER_LOGIC: '0xDfB1364ec55cA15E1cc286933776e70252EC1e39',
				CONTRACT_NFT_DRIVER_ID: '1',
				CONTRACT_NFT_DRIVER: '0x11728764656A53913Dd47AaFd1a59D5A8d6EE226',
				CONTRACT_NFT_DRIVER_LOGIC: '0x0D28fC3Ca6d5C5d000c987f9067ECabc4fF4AD69',
				CONTRACT_IMMUTABLE_SPLITS_DRIVER: '0x7Ee78abb82aB01C5c7f244f0e3c9a41413f0c6eF',
				CONTRACT_IMMUTABLE_SPLITS_DRIVER_ID: '2',
				CONTRACT_IMMUTABLE_SPLITS_DRIVER_LOGIC: '0x5C8965C850884D5a7E655e3568F591f5f5615f18',
				// TODO: Update the Subgraph URL after hosted service is shut down.
				SUBGRAPH_URL: 'https://api.thegraph.com/subgraphs/name/gh0stwheel/drips-v02-on-goerli'
			},
			80001: {
				CYCLE_SECS: '604800', // 1 week.
				NETWORK_NAME: 'polygon-mumbai',
				CONTRACT_CALLER: '0xd6D78Cf6dcBAf6D3468b0b07A77a8b612d3D75bf',
				CONTRACT_DRIPS_HUB: '0xBb5FFedFa8B93b017652076113c9a759691d4260',
				CONTRACT_DRIPS_HUB_LOGIC: '0x519027b1c61C8d7ac4bdE38DA41D613Ed30F427f',
				CONTRACT_ADDRESS_DRIVER_ID: '0',
				CONTRACT_ADDRESS_DRIVER: '0x2139829c30916B6a03C85f85cD200a8b6F160e5c',
				CONTRACT_ADDRESS_DRIVER_LOGIC: '0xd449804b64A7b11cA07e1442bfb9EEC87C5520d6',
				CONTRACT_NFT_DRIVER_ID: '1',
				CONTRACT_NFT_DRIVER: '0x7A5044c79fE4ed55B8Da240d894558BC203cf248',
				CONTRACT_NFT_DRIVER_LOGIC: '0x6115F78f21D53A19280f2E7D85F117344069F3d5',
				CONTRACT_IMMUTABLE_SPLITS_DRIVER: '0x7e7f39905908931528C8Ec2D049ABB275C3351b4',
				CONTRACT_IMMUTABLE_SPLITS_DRIVER_ID: '2',
				CONTRACT_IMMUTABLE_SPLITS_DRIVER_LOGIC: '0x74392f90aD8bC9E4260B6A0A1661d295e612ECA7',
				// TODO: Update the Subgraph URL after hosted service is shut down.
				SUBGRAPH_URL: 'https://api.thegraph.com/subgraphs/name/gh0stwheel/drips-v2-on-mumbai'
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

			return BigNumber.from(ethers.utils.getAddress(tokenAddress)).toBigInt();
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
