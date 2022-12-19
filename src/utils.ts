import type { BigNumberish, BytesLike } from 'ethers';
import { BigNumber, ethers } from 'ethers';
import { DripsErrors } from './common/DripsError';
import type { NetworkConfig, CycleInfo, DripsReceiverConfig, UserMetadataStruct } from './common/types';
import { validateAddress, validateDripsReceiverConfig } from './common/validators';

namespace Utils {
	export namespace UserMetadata {
		/**
		 * Creates a user metadata key in the format the Drips protocol expects from the given `string`.
		 * @param  {string} key The metadata key.
		 * @returns The metadata key as BytesLike.
		 */
		export const keyFromString = (key: string): BytesLike => ethers.utils.formatBytes32String(key);

		/**
		 * Creates a user metadata value in the format the Drips protocol expects from the given `string`.
		 * @param  {string} value The metadata key.
		 * @returns The metadata value as BytesLike.
		 */
		export const valueFromString = (value: string): BytesLike => ethers.utils.hexlify(ethers.utils.toUtf8Bytes(value));

		/**
		 * Creates a user metadata object in the format the Drips protocol expects from the given `string` inputs.
		 *
		 * @param  {string} key The metadata key.
		 * @param  {string} value The metadata value.
		 * @returns The user metadata.
		 */
		export const createFromStrings = (
			key: string,
			value: string
		): {
			key: BytesLike;
			value: BytesLike;
		} => ({
			key: keyFromString(key),
			value: valueFromString(value)
		});

		/**
		 * Parses the properties of the given user metadata as `string`s.
		 * @param  {UserMetadataStruct} userMetadata The user metadata.
		 * @returns An object with the same properties as the `userMetadata` but with `string` properties instead of `BytesLike`.
		 */
		export const parseMetadataAsString = (userMetadata: UserMetadataStruct): { key: string; value: string } => {
			if (!ethers.utils.isBytesLike(userMetadata?.key) || !ethers.utils.isBytesLike(userMetadata?.value)) {
				throw DripsErrors.argumentError(
					`Invalid key-value user metadata pair: key or value is not a valid BytesLike object.`
				);
			}

			return {
				key: ethers.utils.parseBytes32String(userMetadata.key),
				value: ethers.utils.toUtf8String(userMetadata.value)
			};
		};
	}

	export namespace Network {
		export const configs: Record<number, NetworkConfig> = {
			5: {
				CYCLE_SECS: '604800', // 1 week.
				NETWORK_NAME: 'goerli',
				CONTRACT_CALLER: '0x4e31F3538c9BE4Cf1E0911D08290f5DDF4E57747',
				CONTRACT_DRIPS_HUB: '0x9EAd3182f7590a9981236375B33D31D682A5E9CD',
				CONTRACT_DRIPS_HUB_LOGIC: '0x7aAC7813f7167bB8A0BD3393aE84c9D26fC8E5Cd',
				CONTRACT_ADDRESS_DRIVER_ID: '0',
				CONTRACT_ADDRESS_DRIVER: '0x19C957afB73F16010269fdA4a649017a9f613A0f',
				CONTRACT_ADDRESS_DRIVER_LOGIC: '0x80bF441AB345955FfE7F4d0083005a0Cc87eF920',
				CONTRACT_NFT_DRIVER_ID: '1',
				CONTRACT_NFT_DRIVER: '0xBD3E202E5D65B1C506AdEA83fd41c53799c6D565',
				CONTRACT_NFT_DRIVER_LOGIC: '0xD200652Fef8377eB6C7Ed67E7C98D3E6D295f0E2',
				CONTRACT_IMMUTABLE_SPLITS_DRIVER: '0xA94B5a04A511937973F30A14F4dA9f30E8E35EB6',
				CONTRACT_IMMUTABLE_SPLITS_DRIVER_ID: '2',
				CONTRACT_IMMUTABLE_SPLITS_DRIVER_LOGIC: '0x5703E575854201283ecF67B2f4F99BBC4052699E',
				// TODO: Update the Subgraph URL after hosted service is shut down.
				SUBGRAPH_URL: 'https://api.thegraph.com/subgraphs/name/gh0stwheel/drips-v02-on-goerli'
			},
			80001: {
				CYCLE_SECS: '604800', // 1 week.
				NETWORK_NAME: 'polygon-mumbai',
				CONTRACT_CALLER: '0xBD3E202E5D65B1C506AdEA83fd41c53799c6D565',
				CONTRACT_DRIPS_HUB: '0xA94B5a04A511937973F30A14F4dA9f30E8E35EB6',
				CONTRACT_DRIPS_HUB_LOGIC: '0x5703E575854201283ecF67B2f4F99BBC4052699E',
				CONTRACT_ADDRESS_DRIVER_ID: '0',
				CONTRACT_ADDRESS_DRIVER: '0x4D18e63af9fDF2c8382e9198127a24aDA0DD57d9',
				CONTRACT_ADDRESS_DRIVER_LOGIC: '0x22CeCf1CB0935143c1a99Ee7e9Dc57f8Acb5063F',
				CONTRACT_NFT_DRIVER_ID: '1',
				CONTRACT_NFT_DRIVER: '0x68401644F791293AA46DF37D70a6b4F1A7e88Ab7',
				CONTRACT_NFT_DRIVER_LOGIC: '0xa084EB22827a5e9BB49a63AE76f66ac47A607B88',
				CONTRACT_IMMUTABLE_SPLITS_DRIVER: '0xDfB1364ec55cA15E1cc286933776e70252EC1e39',
				CONTRACT_IMMUTABLE_SPLITS_DRIVER_ID: '2',
				CONTRACT_IMMUTABLE_SPLITS_DRIVER_LOGIC: '0x28703A7C5B25b58d6732fA14A62B25aFae189e38',
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
