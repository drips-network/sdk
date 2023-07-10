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
	export namespace Network {
		export const configs: Record<number, NetworkConfig> = {
			// Mainnet
			1: {
				CHAIN: 'mainnet',
				DEPLOYMENT_TIME: '2023-07-10T12:49:09+00:00',
				COMMIT_HASH: '8f327ad07dee6ef3487a86d29a63b6e5ec0bd0b1',
				WALLET: '0x09fc963A7fdC0Cfe7d01bDDcFe91a18ee9F8D941',
				DETERMINISTIC_DEPLOYER: '0x4e59b44847b379578588920cA78FbF26c0B4956C',
				CREATE3_FACTORY: '0x6aa3d87e99286946161dca02b97c5806fc5ed46f',
				DRIPS_DEPLOYER_SALT: 'DripsDeployer0x823204FFd4fAa09fbf2AAc51A290233e829991a1Test1',
				DRIPS_DEPLOYER: '0xa2f28f58F86522411E54b9B7ed04E4F2BB3140B4',
				DRIPS: '0x157b4bb9Cf784A34F4aBa8e6dC54f67e9bc01653',
				DRIPS_CYCLE_SECONDS: '604800',
				DRIPS_LOGIC: '0x2b3C5708Fc76b261972F32b19B119dEaCBF94880',
				DRIPS_ADMIN: '0x823204FFd4fAa09fbf2AAc51A290233e829991a1',
				CALLER: '0xf480297610550ee8D50715fF58Cdc1b8512ABd6c',
				ADDRESS_DRIVER: '0xd8613a7Ea817b4Ea377fFA906129e755c403C8F5',
				ADDRESS_DRIVER_ID: '0',
				ADDRESS_DRIVER_LOGIC: '0x4F76Fa2Bc679AC91e8ef97586490141f4B603523',
				ADDRESS_DRIVER_ADMIN: '0x823204FFd4fAa09fbf2AAc51A290233e829991a1',
				NFT_DRIVER: '0xB404D5A09F99D6B48b436EbA28c224F4B48Cc9d8',
				NFT_DRIVER_ID: '1',
				NFT_DRIVER_LOGIC: '0x30048e1668125707d8722F6B090e91b319818B29',
				NFT_DRIVER_ADMIN: '0x823204FFd4fAa09fbf2AAc51A290233e829991a1',
				IMMUTABLE_SPLITS_DRIVER: '0xC6A0f06d06e9DC29a7A33EebA16d77131DAB3599',
				IMMUTABLE_SPLITS_DRIVER_ID: '2',
				IMMUTABLE_SPLITS_DRIVER_LOGIC: '0x4436372581B3f33B830D00d6A0C025963405a6E7',
				IMMUTABLE_SPLITS_DRIVER_ADMIN: '0x823204FFd4fAa09fbf2AAc51A290233e829991a1',
				REPO_DRIVER: '0x93c8761e5Fc46763b8006B14EAFF66E9940014D6',
				REPO_DRIVER_ID: '3',
				REPO_DRIVER_ANYAPI_OPERATOR: '0x7ecFBD6CB2D3927Aa68B5F2f477737172F11190a',
				REPO_DRIVER_ANYAPI_JOB_ID: '9af746c7cfbc415c9737b239df9a30ab',
				REPO_DRIVER_ANYAPI_DEFAULT_FEE: '1620000000000000000',
				REPO_DRIVER_LOGIC: '0xea28e286397f2F3467f494eBc2c4EDdA2d88300b',
				REPO_DRIVER_ADMIN: '0x823204FFd4fAa09fbf2AAc51A290233e829991a1',
				SUBGRAPH_URL: 'https://api.thegraph.com/subgraphs/name/drips-network-dev/drips-v2-on-ethereum-pre-prod'
			},
			// Sepolia
			11155111: {
				CHAIN: 'sepolia',
				DEPLOYMENT_TIME: '2023-07-05T11:49:30+00:00',
				COMMIT_HASH: '45726d904f65795b8a975574a515f4ed6b25765a',
				WALLET: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				DETERMINISTIC_DEPLOYER: '0x4e59b44847b379578588920cA78FbF26c0B4956C',
				CREATE3_FACTORY: '0x6aa3d87e99286946161dca02b97c5806fc5ed46f',
				DRIPS_DEPLOYER_SALT: 'DripsDeployer2',
				DRIPS_DEPLOYER: '0xE88B6A5FcF0bbaC548DBa902b44b758ac233cCBf',
				DRIPS: '0x3E9A943C73125187f62c073F0f42b8E17Cce37AF',
				DRIPS_CYCLE_SECONDS: '604800',
				DRIPS_LOGIC: '0x67B32D292b1329eC63914a6C93244A0Eb74A3bDD',
				DRIPS_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				CALLER: '0xD5dBa183dB5fA0fC9A0bf8F26421b8d5E9407f85',
				ADDRESS_DRIVER: '0x7703786826fA6cc4b05dE6660E1e7F0C45a29511',
				ADDRESS_DRIVER_ID: '0',
				ADDRESS_DRIVER_LOGIC: '0xC9c44ecFd3a407fF34f29A944eDA930B4e6FdEBD',
				ADDRESS_DRIVER_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				NFT_DRIVER: '0x5C9D6b1b95Cc17D671fCA26CcdeD99f861631039',
				NFT_DRIVER_ID: '1',
				NFT_DRIVER_LOGIC: '0x79828efeb7a33610A5A51A2Aa7B052FF8510E3FB',
				NFT_DRIVER_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				IMMUTABLE_SPLITS_DRIVER: '0x92DbEc2E7481e35c6AFE6559bB9c07f985Efd530',
				IMMUTABLE_SPLITS_DRIVER_ID: '2',
				IMMUTABLE_SPLITS_DRIVER_LOGIC: '0x0806bEC76cF9C66c4a0ee7eAae20d7198Fb64255',
				IMMUTABLE_SPLITS_DRIVER_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				REPO_DRIVER: '0x3E2887E3E156332BE1439be4b8F50FbB1C607CaC',
				REPO_DRIVER_ID: '3',
				REPO_DRIVER_ANYAPI_OPERATOR: '0x0F9c6BCdE15dfFFD95Cfa8F9167b19B433af1abE',
				REPO_DRIVER_ANYAPI_JOB_ID: '9af746c7cfbc415c9737b239df9a30ab',
				REPO_DRIVER_ANYAPI_DEFAULT_FEE: '150000000000000000',
				REPO_DRIVER_LOGIC: '0xd87bA837c20D90285FA8B02dE7f486C82DdCDe58',
				REPO_DRIVER_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				SUBGRAPH_URL: 'https://api.studio.thegraph.com/query/47690/drips-v2-on-sepolia/version/latest'
			},
			// Goerli
			5: {
				CHAIN: 'goerli',
				DEPLOYMENT_TIME: '2023-07-05T11:07:03+00:00',
				COMMIT_HASH: '45726d904f65795b8a975574a515f4ed6b25765a',
				WALLET: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				DETERMINISTIC_DEPLOYER: '0x4e59b44847b379578588920cA78FbF26c0B4956C',
				CREATE3_FACTORY: '0x6aa3d87e99286946161dca02b97c5806fc5ed46f',
				DRIPS_DEPLOYER_SALT: 'DripsDeployer1',
				DRIPS_DEPLOYER: '0x95c7B066fE5a5aE515f143b931Ad4E0BFbBb7A9D',
				DRIPS: '0x5304DDb08554C45bB7349644C951274cFf7Fd10A',
				DRIPS_CYCLE_SECONDS: '604800',
				DRIPS_LOGIC: '0x0Db1A792B9d140e08B86431Ff00f785A378C01B1',
				DRIPS_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				CALLER: '0xCa43A39950bB62f67AC9FEdaB3f1D33b7071d797',
				ADDRESS_DRIVER: '0xf38892A66654982DD2c528e40211d354CEfB7c5A',
				ADDRESS_DRIVER_ID: '0',
				ADDRESS_DRIVER_LOGIC: '0x55bc5485F7476ba89e7979715A3888C8BB1f0362',
				ADDRESS_DRIVER_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				NFT_DRIVER: '0xCB814605a1e7bB1708D7E6AAA4f4Fd917baAa49f',
				NFT_DRIVER_ID: '1',
				NFT_DRIVER_LOGIC: '0xaD79619E84ddCE6EE7Cd3c795037b50c7105F589',
				NFT_DRIVER_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				IMMUTABLE_SPLITS_DRIVER: '0x9956221470D61fc91C47700705eA6df2d7Eb776b',
				IMMUTABLE_SPLITS_DRIVER_ID: '2',
				IMMUTABLE_SPLITS_DRIVER_LOGIC: '0x31264a05739CE5F5C43D4DfC0840EC6743324cf9',
				IMMUTABLE_SPLITS_DRIVER_ADMIN: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				REPO_DRIVER: '0x654001762Ed1e067980Ad0314F9647F2691BcD97',
				REPO_DRIVER_ID: '3',
				REPO_DRIVER_ANYAPI_OPERATOR: '0x7ecFBD6CB2D3927Aa68B5F2f477737172F11190a',
				REPO_DRIVER_ANYAPI_JOB_ID: '9af746c7cfbc415c9737b239df9a30ab',
				REPO_DRIVER_ANYAPI_DEFAULT_FEE: '50000000000000000',
				REPO_DRIVER_LOGIC: '0xB6Ce29D5575c35E75C91b140deDa3C354199036c',
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
