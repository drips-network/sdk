import type { BigNumberish, BytesLike } from 'ethers';
import { BigNumber, ethers } from 'ethers';
import { DripsErrors } from './common/DripsError';
import type { NetworkConfig, CycleInfo, StreamConfig, AccountMetadataStruct } from './common/types';
import { validateAddress, validateStreamConfig } from './common/validators';
import { isNullOrUndefined } from './common/internals';

type Driver = 'address' | 'nft' | 'immutableSplits' | 'repo';

namespace Utils {
	export namespace AccountId {
		export const getDriver = (accountId: string): Driver => {
			if (isNullOrUndefined(accountId)) {
				throw DripsErrors.argumentError(`Could not get bits: accountId is missing.`);
			}

			const accountIdAsBn = ethers.BigNumber.from(accountId);

			if (accountIdAsBn.lt(0) || accountIdAsBn.gt(ethers.constants.MaxUint256)) {
				throw DripsErrors.argumentError(
					`Could not get bits: ${accountId} is not a valid positive number within the range of a uint256.`
				);
			}

			const mask = ethers.BigNumber.from(2).pow(32).sub(1); // 32 bits mask
			const bits = accountIdAsBn.shr(224).and(mask); // shift right to bring the first 32 bits to the end and apply the mask

			switch (bits.toNumber()) {
				case 0:
					return 'address';
				case 1:
					return 'nft';
				case 2:
					return 'immutableSplits';
				case 3:
					return 'repo';
				default:
					throw DripsErrors.argumentError(`Unknown driver for accountId: ${accountId}.`);
			}
		};
	}

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
		 * Parses the `AccountMetadataStruct` and converts the key and value from `BytesLike` to `string` format.
		 *
		 * @param accountMetadata - The `AccountMetadataStruct` containing the key and value in `BytesLike` format.
		 * @returns An `object` containing the key and value as `string`s.
		 */
		export const convertMetadataBytesToString = (
			accountMetadata: AccountMetadataStruct
		): { key: string; value: string } => {
			if (!ethers.utils.isBytesLike(accountMetadata?.key) || !ethers.utils.isBytesLike(accountMetadata?.value)) {
				throw DripsErrors.argumentError(
					`Invalid key-value user metadata pair: key or value is not a valid BytesLike object.`
				);
			}

			return {
				key: ethers.utils.parseBytes32String(accountMetadata.key),
				value: ethers.utils.toUtf8String(accountMetadata.value)
			};
		};
	}

	// TODO: Update the Subgraph URL after hosted service is shut down.
	// TODO: simplify the config to only what's needed for the SDK.
	export namespace Network {
		export const configs: Record<number, NetworkConfig> = {
			// Mainnet
			1: {
				CHAIN: 'mainnet',
				DEPLOYMENT_TIME: '2023-07-13T12:30:27Z',
				COMMIT_HASH: 'afeba55f70a968ded7c0797a4211faa856e28fa0',
				WALLET: '0x823204FFd4fAa09fbf2AAc51A290233e829991a1',
				DETERMINISTIC_DEPLOYER: '0x4e59b44847b379578588920cA78FbF26c0B4956C',
				CREATE3_FACTORY: '0x6aa3d87e99286946161dca02b97c5806fc5ed46f',
				DRIPS_DEPLOYER_SALT: 'DripsDeployer',
				DRIPS_DEPLOYER: '0x0c1Ea3a5434Bf8F135fD0c7258F0f25219fDB27f',
				DRIPS: '0xd0Dd053392db676D57317CD4fe96Fc2cCf42D0b4',
				DRIPS_CYCLE_SECONDS: '604800',
				DRIPS_LOGIC: '0xb0C9B6D67608bE300398d0e4FB0cCa3891E1B33F',
				DRIPS_ADMIN: '0x8dA8f82d2BbDd896822de723F55D6EdF416130ba',
				CALLER: '0x60F25ac5F289Dc7F640f948521d486C964A248e5',
				ADDRESS_DRIVER: '0x1455d9bD6B98f95dd8FEB2b3D60ed825fcef0610',
				ADDRESS_DRIVER_ID: '0',
				ADDRESS_DRIVER_LOGIC: '0x3Ea1e774f98cc4C6359bbCB3238E3e60365Fa5c9',
				ADDRESS_DRIVER_ADMIN: '0x8dA8f82d2BbDd896822de723F55D6EdF416130ba',
				NFT_DRIVER: '0xcf9c49B0962EDb01Cdaa5326299ba85D72405258',
				NFT_DRIVER_ID: '1',
				NFT_DRIVER_LOGIC: '0x3B11537D0d4276Ba9e41FFe04e9034280bd7af50',
				NFT_DRIVER_ADMIN: '0x8dA8f82d2BbDd896822de723F55D6EdF416130ba',
				IMMUTABLE_SPLITS_DRIVER: '0x1212975c0642B07F696080ec1916998441c2b774',
				IMMUTABLE_SPLITS_DRIVER_ID: '2',
				IMMUTABLE_SPLITS_DRIVER_LOGIC: '0x2c338CDf00dFd5A9B3B6b0b78BB95352079AAF71',
				IMMUTABLE_SPLITS_DRIVER_ADMIN: '0x8dA8f82d2BbDd896822de723F55D6EdF416130ba',
				REPO_DRIVER: '0x770023d55D09A9C110694827F1a6B32D5c2b373E',
				REPO_DRIVER_ID: '3',
				REPO_DRIVER_ANYAPI_OPERATOR: '0xa928d4b087AD35C46BA83331d8eEddb83152319b',
				REPO_DRIVER_ANYAPI_JOB_ID: '9af746c7cfbc415c9737b239df9a30ab',
				REPO_DRIVER_ANYAPI_DEFAULT_FEE: '1620000000000000000',
				REPO_DRIVER_LOGIC: '0xfC446dB5E1255e837E95dB90c818C6fEb8e93ab0',
				REPO_DRIVER_ADMIN: '0x8dA8f82d2BbDd896822de723F55D6EdF416130ba',
				SUBGRAPH_URL: 'https://api.thegraph.com/subgraphs/name/drips-network-dev/drips-on-ethereum'
			},
			// Sepolia
			11155111: {
				CHAIN: 'sepolia',
				DEPLOYMENT_TIME: '2023-07-15T10:41:56Z',
				COMMIT_HASH: 'afeba55f70a968ded7c0797a4211faa856e28fa0',
				WALLET: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				DETERMINISTIC_DEPLOYER: '0x4e59b44847b379578588920cA78FbF26c0B4956C',
				CREATE3_FACTORY: '0x6aa3d87e99286946161dca02b97c5806fc5ed46f',
				DRIPS_DEPLOYER_SALT: 'DripsDeployerTest1',
				DRIPS_DEPLOYER: '0xa6030dD9D31FA2333Ee9f7feaCa6FB23c42a1d96',
				DRIPS: '0x74A32a38D945b9527524900429b083547DeB9bF4',
				DRIPS_CYCLE_SECONDS: '604800',
				DRIPS_LOGIC: '0xf103BDDB82B6177e5fE53c50351E33F4f3df955B',
				DRIPS_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				CALLER: '0x09e04Cb8168bd0E8773A79Cc2099f19C46776Fee',
				ADDRESS_DRIVER: '0x70E1E1437AeFe8024B6780C94490662b45C3B567',
				ADDRESS_DRIVER_ID: '0',
				ADDRESS_DRIVER_LOGIC: '0x298F37fFd4B31d216B8954968cEe7EC5273CB891',
				ADDRESS_DRIVER_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				NFT_DRIVER: '0xdC773a04C0D6EFdb80E7dfF961B6a7B063a28B44',
				NFT_DRIVER_ID: '1',
				NFT_DRIVER_LOGIC: '0xa6bD78d98720E2eA4B3E2887be7bA212C3aC5977',
				NFT_DRIVER_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				IMMUTABLE_SPLITS_DRIVER: '0xC3C1955bb50AdA4dC8a55aBC6d4d2a39242685c1',
				IMMUTABLE_SPLITS_DRIVER_ID: '2',
				IMMUTABLE_SPLITS_DRIVER_LOGIC: '0xf5573880ECB9975E1645C8D18ef1A0393c685CC1',
				IMMUTABLE_SPLITS_DRIVER_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				REPO_DRIVER: '0xa71bdf410D48d4AA9aE1517A69D7E1Ef0c179b2B',
				REPO_DRIVER_ID: '3',
				REPO_DRIVER_ANYAPI_OPERATOR: '0x0F9c6BCdE15dfFFD95Cfa8F9167b19B433af1abE',
				REPO_DRIVER_ANYAPI_JOB_ID: '9af746c7cfbc415c9737b239df9a30ab',
				REPO_DRIVER_ANYAPI_DEFAULT_FEE: '150000000000000000',
				REPO_DRIVER_LOGIC: '0x7A9a2a29B8d98922Ea2E70c73B123e36C95d1515',
				REPO_DRIVER_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				SUBGRAPH_URL: 'https://api.studio.thegraph.com/query/47690/drips-v2-on-sepolia/version/latest'
			},
			// Goerli
			5: {
				CHAIN: 'goerli',
				DEPLOYMENT_TIME: '2023-07-15T10:34:39Z',
				COMMIT_HASH: 'afeba55f70a968ded7c0797a4211faa856e28fa0',
				WALLET: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				DETERMINISTIC_DEPLOYER: '0x4e59b44847b379578588920cA78FbF26c0B4956C',
				CREATE3_FACTORY: '0x6aa3d87e99286946161dca02b97c5806fc5ed46f',
				DRIPS_DEPLOYER_SALT: 'DripsDeployerTest1',
				DRIPS_DEPLOYER: '0xa6030dD9D31FA2333Ee9f7feaCa6FB23c42a1d96',
				DRIPS: '0x74A32a38D945b9527524900429b083547DeB9bF4',
				DRIPS_CYCLE_SECONDS: '604800',
				DRIPS_LOGIC: '0xf103BDDB82B6177e5fE53c50351E33F4f3df955B',
				DRIPS_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				CALLER: '0x09e04Cb8168bd0E8773A79Cc2099f19C46776Fee',
				ADDRESS_DRIVER: '0x70E1E1437AeFe8024B6780C94490662b45C3B567',
				ADDRESS_DRIVER_ID: '0',
				ADDRESS_DRIVER_LOGIC: '0x298F37fFd4B31d216B8954968cEe7EC5273CB891',
				ADDRESS_DRIVER_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				NFT_DRIVER: '0xdC773a04C0D6EFdb80E7dfF961B6a7B063a28B44',
				NFT_DRIVER_ID: '1',
				NFT_DRIVER_LOGIC: '0xa6bD78d98720E2eA4B3E2887be7bA212C3aC5977',
				NFT_DRIVER_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				IMMUTABLE_SPLITS_DRIVER: '0xC3C1955bb50AdA4dC8a55aBC6d4d2a39242685c1',
				IMMUTABLE_SPLITS_DRIVER_ID: '2',
				IMMUTABLE_SPLITS_DRIVER_LOGIC: '0xf5573880ECB9975E1645C8D18ef1A0393c685CC1',
				IMMUTABLE_SPLITS_DRIVER_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				REPO_DRIVER: '0xa71bdf410D48d4AA9aE1517A69D7E1Ef0c179b2B',
				REPO_DRIVER_ID: '3',
				REPO_DRIVER_ANYAPI_OPERATOR: '0x7ecFBD6CB2D3927Aa68B5F2f477737172F11190a',
				REPO_DRIVER_ANYAPI_JOB_ID: '9af746c7cfbc415c9737b239df9a30ab',
				REPO_DRIVER_ANYAPI_DEFAULT_FEE: '50000000000000000',
				REPO_DRIVER_LOGIC: '0x7A9a2a29B8d98922Ea2E70c73B123e36C95d1515',
				REPO_DRIVER_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				SUBGRAPH_URL: 'https://api.studio.thegraph.com/query/47690/drips-v2-on-goerli/version/latest'
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

			const cycleDurationSecs = BigInt(Network.configs[chainId].DRIPS_CYCLE_SECONDS);

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

	export namespace StreamConfiguration {
		/**
		 * Converts a drips receiver configuration object to a `uint256`.
		 * @param  {StreamConfigDto} streamConfig The drips receiver configuration object.
		 * @returns The drips receiver configuration as a `uint256`.
		 * @throws {@link DripsErrors.argumentMissingError} if the `streamConfig` is missing.
		 * @throws {@link DripsErrors.streamConfigError} if the `streamConfig` is not valid.
		 */
		export const toUint256 = (streamConfig: StreamConfig): bigint => {
			validateStreamConfig(streamConfig);

			const { dripId, start, duration, amountPerSec } = streamConfig;

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
		 * @param  {BigNumberish} streamConfig The drips receiver configuration as`uint256`.
		 * @returns The drips receiver configuration object.
		 * @throws {@link DripsErrors.argumentMissingError} if the `streamConfig` is missing.
		 * @throws {@link DripsErrors.argumentError} if the `streamConfig` is not valid.
		 */
		export const fromUint256 = (streamConfig: BigNumberish): StreamConfig => {
			const configAsBn = BigNumber.from(streamConfig);

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

			validateStreamConfig(config);

			return config;
		};
	}
}

export default Utils;
