import type { BigNumberish, BytesLike } from 'ethers';
import { BigNumber, ethers } from 'ethers';
import { DripsErrors } from './common/DripsError';
import type { NetworkConfig, CycleInfo, DripsReceiverConfig, UserMetadataStruct } from './common/types';
import { validateAddress, validateDripsReceiverConfig } from './common/validators';
import { isNullOrUndefined } from './common/internals';

type Driver = 'address' | 'nft' | 'immutableSplits' | 'repo';

namespace Utils {
	export namespace UserId {
		export const getDriver = (userId: string): Driver => {
			if (isNullOrUndefined(userId)) {
				throw DripsErrors.argumentError(`Could not get bits: userId is missing.`);
			}

			const userIdAsBn = ethers.BigNumber.from(userId);

			if (userIdAsBn.lt(0) || userIdAsBn.gt(ethers.constants.MaxUint256)) {
				throw DripsErrors.argumentError(
					`Could not get bits: ${userId} is not a valid positive number within the range of a uint256.`
				);
			}

			const mask = ethers.BigNumber.from(2).pow(32).sub(1); // 32 bits mask
			const bits = userIdAsBn.shr(224).and(mask); // shift right to bring the first 32 bits to the end and apply the mask

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
					throw DripsErrors.argumentError(`Unknown driver for userId: ${userId}.`);
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
				DEPLOYMENT_TIME: '2023-06-27T09:57:27+00:00',
				COMMIT_HASH: 'f4d5319fb64f64edb4e5d525ab6b70361d290674',
				WALLET: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				DRIPS_DEPLOYER: '0xA8c871d38319633A0925dA7255ED0CF4F11263B7',
				DRIPS_DEPLOYER_SALT: 'DripsDeployer2',
				DRIPS: '0xD4CFf14F12E9D68a9B8115A9756e1c0D89eD509b',
				DRIPS_CYCLE_SECONDS: '604800',
				DRIPS_LOGIC: '0xd77e271e12712B0a0448389Cf966E80eDbAf9094',
				DRIPS_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				CALLER: '0x127B01a2C9504c2FA782730fB0D1D715142Fe1c6',
				ADDRESS_DRIVER: '0x743AD726c690Da433EFAfc6e50712c5e5ED0C319',
				ADDRESS_DRIVER_ID: '0',
				ADDRESS_DRIVER_LOGIC: '0x6951F2C92de618209Af4f5D23735a0A7B1B5C477',
				ADDRESS_DRIVER_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				NFT_DRIVER: '0xAAA18360c164f6F93B2e651c4b4768F614e9ba2C',
				NFT_DRIVER_ID: '1',
				NFT_DRIVER_LOGIC: '0xAB45Dd7dc30F3F9dbC93d40D5802548e58fc649C',
				NFT_DRIVER_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				IMMUTABLE_SPLITS_DRIVER: '0x562a04589Bc34925459091aE5727339907BBD56f',
				IMMUTABLE_SPLITS_DRIVER_ID: '2',
				IMMUTABLE_SPLITS_DRIVER_LOGIC: '0x7Be11c44e3f86c44133Ad18a2D0bf85402EA9864',
				IMMUTABLE_SPLITS_DRIVER_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				REPO_DRIVER: '0x6F96B7eaa517b0f78e3844DE23d9Eb357785b437',
				REPO_DRIVER_ID: '3',
				REPO_DRIVER_ANYAPI_OPERATOR: '0x0F9c6BCdE15dfFFD95Cfa8F9167b19B433af1abE',
				REPO_DRIVER_ANYAPI_JOB_ID: '9af746c7cfbc415c9737b239df9a30ab',
				REPO_DRIVER_ANYAPI_DEFAULT_FEE: '150000000000000000',
				REPO_DRIVER_LOGIC: '0xf6BFe643eE4bD90233fF781fD5b9499b35DF6760',
				REPO_DRIVER_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				SUBGRAPH_URL: 'https://api.thegraph.com/subgraphs/name/drips-network-dev/drips-v2-on-ethereum'
			},
			// Sepolia
			11155111: {
				CHAIN: 'sepolia',
				DEPLOYMENT_TIME: '2023-06-27T09:57:27+00:00',
				COMMIT_HASH: 'f4d5319fb64f64edb4e5d525ab6b70361d290674',
				WALLET: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				DRIPS_DEPLOYER: '0xA8c871d38319633A0925dA7255ED0CF4F11263B7',
				DRIPS_DEPLOYER_SALT: 'DripsDeployer2',
				DRIPS: '0xD4CFf14F12E9D68a9B8115A9756e1c0D89eD509b',
				DRIPS_CYCLE_SECONDS: '604800',
				DRIPS_LOGIC: '0xd77e271e12712B0a0448389Cf966E80eDbAf9094',
				DRIPS_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				CALLER: '0x127B01a2C9504c2FA782730fB0D1D715142Fe1c6',
				ADDRESS_DRIVER: '0x743AD726c690Da433EFAfc6e50712c5e5ED0C319',
				ADDRESS_DRIVER_ID: '0',
				ADDRESS_DRIVER_LOGIC: '0x6951F2C92de618209Af4f5D23735a0A7B1B5C477',
				ADDRESS_DRIVER_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				NFT_DRIVER: '0xAAA18360c164f6F93B2e651c4b4768F614e9ba2C',
				NFT_DRIVER_ID: '1',
				NFT_DRIVER_LOGIC: '0xAB45Dd7dc30F3F9dbC93d40D5802548e58fc649C',
				NFT_DRIVER_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				IMMUTABLE_SPLITS_DRIVER: '0x562a04589Bc34925459091aE5727339907BBD56f',
				IMMUTABLE_SPLITS_DRIVER_ID: '2',
				IMMUTABLE_SPLITS_DRIVER_LOGIC: '0x7Be11c44e3f86c44133Ad18a2D0bf85402EA9864',
				IMMUTABLE_SPLITS_DRIVER_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				REPO_DRIVER: '0x6F96B7eaa517b0f78e3844DE23d9Eb357785b437',
				REPO_DRIVER_ID: '3',
				REPO_DRIVER_ANYAPI_OPERATOR: '0x0F9c6BCdE15dfFFD95Cfa8F9167b19B433af1abE',
				REPO_DRIVER_ANYAPI_JOB_ID: '9af746c7cfbc415c9737b239df9a30ab',
				REPO_DRIVER_ANYAPI_DEFAULT_FEE: '150000000000000000',
				REPO_DRIVER_LOGIC: '0xf6BFe643eE4bD90233fF781fD5b9499b35DF6760',
				REPO_DRIVER_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				SUBGRAPH_URL: 'https://api.studio.thegraph.com/query/47690/drips-v2-on-sepolia/v0.0.6'
			},
			// Goerli
			5: {
				CHAIN: 'goerli',
				DEPLOYMENT_TIME: '2023-06-28T13:26:07+00:00',
				COMMIT_HASH: 'f4d5319fb64f64edb4e5d525ab6b70361d290674',
				WALLET: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				DRIPS_DEPLOYER: '0x8bc64A7EcBe2487F7fC30f44C826919051273e7D',
				DRIPS_DEPLOYER_SALT: 'DripsDeployer8',
				DRIPS: '0x0dc2dBb97F5d742D7B1c55fa3ADb8BEFC5Bf2D4D',
				DRIPS_CYCLE_SECONDS: '604800',
				DRIPS_LOGIC: '0x2aC9E7202cA36201eFcbCAf4BF97423729Ab2693',
				DRIPS_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				CALLER: '0xD7aF685e65E25432f5B8489515fdD57B0C6B4AeF',
				ADDRESS_DRIVER: '0xF7B91E713c65110BeF32B77DAcC06917511bFcE7',
				ADDRESS_DRIVER_ID: '0',
				ADDRESS_DRIVER_LOGIC: '0x822D19dE1eB6Fb9c38DcB7B84381ebec4c1797F2',
				ADDRESS_DRIVER_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				NFT_DRIVER: '0x918B12110ecB62FC52D330A266EBA56D1458Bb3e',
				NFT_DRIVER_ID: '1',
				NFT_DRIVER_LOGIC: '0x46B93F576D76092000399aD6c652F2d1C74c9c46',
				NFT_DRIVER_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				IMMUTABLE_SPLITS_DRIVER: '0xa396fE9E701dB34eE6B2CF72Fb3D969b3B3f5e5B',
				IMMUTABLE_SPLITS_DRIVER_ID: '2',
				IMMUTABLE_SPLITS_DRIVER_LOGIC: '0x8049F51Bf8db51c7ce0aC674099CAD6343A4081d',
				IMMUTABLE_SPLITS_DRIVER_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				REPO_DRIVER: '0xB943D836706Ce70553ED75ab9Fcd921328009f0C',
				REPO_DRIVER_ID: '3',
				REPO_DRIVER_ANYAPI_OPERATOR: '0x7ecFBD6CB2D3927Aa68B5F2f477737172F11190a',
				REPO_DRIVER_ANYAPI_JOB_ID: '9af746c7cfbc415c9737b239df9a30ab',
				REPO_DRIVER_ANYAPI_DEFAULT_FEE: '50000000000000000',
				REPO_DRIVER_LOGIC: '0x600D54395F107B460b52179Ccb53d988DC53e238',
				REPO_DRIVER_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				SUBGRAPH_URL: 'https://api.studio.thegraph.com/query/47690/drips-v2-on-sepolia/v0.0.6'
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
