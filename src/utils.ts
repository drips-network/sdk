import type { BigNumberish, BytesLike } from 'ethers';
import { BigNumber, ethers } from 'ethers';
import { DripsErrors } from './common/DripsError';
import type { NetworkConfig, CycleInfo, DripsReceiverConfig, UserMetadataStruct } from './common/types';
import { validateAddress, validateDripsReceiverConfig } from './common/validators';

namespace Utils {
	export namespace Metadata {
		/**
		 * Converts a `string` to a `BytesLike` representation.
		 *
		 * @param key - The `string` to be converted.
		 * @returns The converted `BytesLike` representation of the `string`.
		 */
		export const keyFromString = (key: string): BytesLike => ethers.utils.formatBytes32String(key);

		/**
		 * Converts a `string` to a hex-encoded `BytesLike` representation.
		 *
		 * @param value - The `string` to be converted.
		 * @returns The hex-encoded `BytesLike` representation of the `string`.
		 */
		export const valueFromString = (value: string): BytesLike => ethers.utils.hexlify(ethers.utils.toUtf8Bytes(value));

		/**
		 * Creates an object containing the `BytesLike` representations of the provided key and value `string`s.
		 *
		 * @param key - The `string` to be converted to a `BytesLike` key.
		 * @param value - The `string` to be converted to a `BytesLike` value.
		 * @returns An object containing the `BytesLike` representations of the key and value `string`s.
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
		 * Parses the `UserMetadataStruct` and converts the key and value from `BytesLike` to `string` format.
		 *
		 * @param userMetadata - The `UserMetadataStruct` containing the key and value in `BytesLike` format.
		 * @returns An `object` containing the key and value as `string`s.
		 */
		export const convertMetadataBytesToString = (userMetadata: UserMetadataStruct): { key: string; value: string } => {
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

	// TODO: Update the Subgraph URL after hosted service is shut down.
	export namespace Network {
		export const configs: Record<number, NetworkConfig> = {
			// Mainnet
			1: {
				CHAIN: 'mainnet',
				DEPLOYMENT_TIME: '2023-03-16T14:44:43+00:00',
				COMMIT_HASH: 'e19ecb17246eae744e76caef522c117de0ec9aaf',
				WALLET: '0xDdEa8D3444e125478cbaA6a678509DfbACef123f',
				WALLET_NONCE: '0',
				DEPLOYER: '0x804DCBe1bf0E6A742eaFbB12f6e53acd92e3CA5a',
				DRIPS_HUB: '0xd4DE319ed8B07e05FC0b2df16d749229478e494b',
				DRIPS_HUB_CYCLE_SECONDS: '604800',
				DRIPS_HUB_LOGIC: '0x9819a3848c60999C37b20a0639bA11d87609564d',
				DRIPS_HUB_ADMIN: '0x8dA8f82d2BbDd896822de723F55D6EdF416130ba',
				CALLER: '0x00529bCC11F0284ca2Af26878dCE6592bb42D3CA',
				ADDRESS_DRIVER: '0x78df097cA1eC714727aB6c2Bd479Ce1A0f5d58d1',
				ADDRESS_DRIVER_LOGIC: '0x7091Bdf0D952CB2A8480d065d37467eed45D410E',
				ADDRESS_DRIVER_ADMIN: '0x8dA8f82d2BbDd896822de723F55D6EdF416130ba',
				ADDRESS_DRIVER_ID: '0',
				NFT_DRIVER: '0x80039B721387C9Faa2c5910115d68C634eF893C8',
				NFT_DRIVER_LOGIC: '0x93d3486be1A381B03C0BC8696249a00de55683eA',
				NFT_DRIVER_ADMIN: '0x8dA8f82d2BbDd896822de723F55D6EdF416130ba',
				NFT_DRIVER_ID: '1',
				IMMUTABLE_SPLITS_DRIVER: '0x752200A8E70D9D25787E920C18d8Cf9D94301c36',
				IMMUTABLE_SPLITS_DRIVER_LOGIC: '0x5BCeF0D71274b0623F1E5A354F3BADb60Fd4e29C',
				IMMUTABLE_SPLITS_DRIVER_ADMIN: '0x8dA8f82d2BbDd896822de723F55D6EdF416130ba',
				IMMUTABLE_SPLITS_DRIVER_ID: '2',
				REPO_DRIVER: '',
				REPO_DRIVER_LOGIC: '',
				REPO_DRIVER_ADMIN: '',
				REPO_DRIVER_ID: '',
				SUBGRAPH_URL: 'https://api.thegraph.com/subgraphs/name/drips-network-dev/drips-v2-on-ethereum'
			},
			// Sepolia
			11155111: {
				CHAIN: 'sepolia',
				DEPLOYMENT_TIME: '2023-05-30T10:05:12+00:00',
				COMMIT_HASH: '4d238d987b9262821817b804ae806f5ccc5de011',
				WALLET: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				WALLET_NONCE: '1',
				DEPLOYER: '0xc9241Cf4cD7d9569cA044d8202EF1080405Bc6C9',
				DRIPS_HUB: '0xA175154911D9Bf062E11083d7e1AaBA3A929d1E4',
				DRIPS_HUB_CYCLE_SECONDS: '604800',
				DRIPS_HUB_LOGIC: '0x3779e6cB0A34E9Ae6f48900b091e07275682eA0c',
				DRIPS_HUB_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				CALLER: '0xaB1798935dD4ff222C114C87c5A26F508B90d831',
				ADDRESS_DRIVER: '0x270D753B03E97E48898AFd76880FA5390a8fd436',
				ADDRESS_DRIVER_LOGIC: '0x066313ac340a598357272FA4c3Ad528625a7CA62',
				ADDRESS_DRIVER_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				ADDRESS_DRIVER_ID: '0',
				NFT_DRIVER: '0xf9902185636F953D45C5E53CF524879ED8Ff6da9',
				NFT_DRIVER_LOGIC: '0xA6452823D0fa02ECAA5D4bb8C432449eBc0d941c',
				NFT_DRIVER_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				NFT_DRIVER_ID: '1',
				IMMUTABLE_SPLITS_DRIVER: '0xaD834E50931370a47aCA7F386Cd9759f29D6d45b',
				IMMUTABLE_SPLITS_DRIVER_LOGIC: '0x27dCA2639Df5534CE69ac812FCc37bE68A01Ff57',
				IMMUTABLE_SPLITS_DRIVER_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				IMMUTABLE_SPLITS_DRIVER_ID: '2',
				REPO_DRIVER: '0x55222830207c833f9F8a28848D48246A022fdefd',
				REPO_DRIVER_LOGIC: '0xe41043b765656E3eB044D8B23f80AF617E389288',
				REPO_DRIVER_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				REPO_DRIVER_ID: '3',
				REPO_DRIVER_ANYAPI_OPERATOR: '0x0F9c6BCdE15dfFFD95Cfa8F9167b19B433af1abE',
				REPO_DRIVER_ANYAPI_JOB_ID: '9af746c7cfbc415c9737b239df9a30ab',
				REPO_DRIVER_ANYAPI_DEFAULT_FEE: '150000000000000000',
				SUBGRAPH_URL: 'https://api.studio.thegraph.com/query/47690/drips-v2-on-sepolia/v0.0.6'
			} as NetworkConfig
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

			const cycleDurationSecs = BigInt(Network.configs[chainId].DRIPS_HUB_CYCLE_SECONDS);

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
