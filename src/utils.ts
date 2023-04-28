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
			// Goerli
			5: {
				CHAIN: 'goerli',
				DEPLOYMENT_TIME: '2023-03-14T11:23:53+00:00',
				COMMIT_HASH: '8980ce57a29f797b53b9f30755f6628185b66c57',
				WALLET: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				WALLET_NONCE: '232',
				DEPLOYER: '0xC881Ee954895f1743FEFF7e6014E98BEf988FDc8',
				DRIPS_HUB: '0x86f226e817aEbf5a4a3ebFA293454Df14460f360',
				DRIPS_HUB_CYCLE_SECONDS: '604800',
				DRIPS_HUB_LOGIC: '0xb26378302cd1Bd939C619F7a3fD23F4a646627bD',
				DRIPS_HUB_ADMIN: '0x000000000000000000000000000000000000dEaD',
				CALLER: '0x7545723692a352a3742Bc967610B55a136E91F16',
				ADDRESS_DRIVER: '0x6441C3F2b29c44eDB14F3660C255Aca7bCC40ccE',
				ADDRESS_DRIVER_LOGIC: '0x5C3D4bcFB934ECa7D98fa288E445f1659372FB59',
				ADDRESS_DRIVER_ADMIN: '0x000000000000000000000000000000000000dEaD',
				ADDRESS_DRIVER_ID: '0',
				NFT_DRIVER: '0x53e019FD9DecF907d314dA416BfA816C2CAEeDef',
				NFT_DRIVER_LOGIC: '0x84B81DB7e1543e8b9B3212dca8D845eEC5c2B17D',
				NFT_DRIVER_ADMIN: '0x000000000000000000000000000000000000dEaD',
				NFT_DRIVER_ID: '1',
				IMMUTABLE_SPLITS_DRIVER: '0xBBA6dbC0a8f7a3c58C9b275d8EDb5F7c6319AA25',
				IMMUTABLE_SPLITS_DRIVER_LOGIC: '0x9e30F316D1F9CC07CD17E9DAB41e71f7aD51DBA8',
				IMMUTABLE_SPLITS_DRIVER_ADMIN: '0x000000000000000000000000000000000000dEaD',
				IMMUTABLE_SPLITS_DRIVER_ID: '2',
				REPO_DRIVER_ADMIN: '',
				REPO_DRIVER_ID: '5',
				REPO_DRIVER_LOGIC: '0x2d69D5371200c60d9De486eDf3774D7c298709cF',
				REPO_DRIVER: '0x6a9683d741B2796e58A737849D971dDcc6ecc1CB',
				SUBGRAPH_URL: 'https://api.thegraph.com/subgraphs/name/jtourkos/drips-v2-on-goerli'
			},
			// Mumbai
			80001: {
				CHAIN: 'polygon-mumbai',
				DEPLOYMENT_TIME: '2023-03-14T11:30:31+00:00',
				COMMIT_HASH: '8980ce57a29f797b53b9f30755f6628185b66c57',
				WALLET: '0x341a08926dCa7fa7D135F96E4d76b696e5f6d38d',
				WALLET_NONCE: '268',
				DEPLOYER: '0xBbF3b3e55c127439bd23db86E9910B4B994C68a2',
				DRIPS_HUB: '0x6e335Eb7a4ABcdf17a507F423eF61150e758f85b',
				DRIPS_HUB_CYCLE_SECONDS: '604800',
				DRIPS_HUB_LOGIC: '0xA273651C0f5D7Ba232C8cF3A7E186A3315860182',
				DRIPS_HUB_ADMIN: '0x000000000000000000000000000000000000dEaD',
				CALLER: '0x94e921D64cfEC517028D394B2136d31Cfa863293',
				ADDRESS_DRIVER: '0x2112Bb5FCC299c5ae07E06c23268f104c81fB1E9',
				ADDRESS_DRIVER_LOGIC: '0x11256f2A0d21EAeF2802Bc82a8F0Cd24ef40d3b4',
				ADDRESS_DRIVER_ADMIN: '0x000000000000000000000000000000000000dEaD',
				ADDRESS_DRIVER_ID: '0',
				NFT_DRIVER: '0xf070fc0DB76B1ee70237b71587cf36C37D2EB745',
				NFT_DRIVER_LOGIC: '0x56a978edc17a0B62003CE294B6feE753792545cb',
				NFT_DRIVER_ADMIN: '0x000000000000000000000000000000000000dEaD',
				NFT_DRIVER_ID: '1',
				IMMUTABLE_SPLITS_DRIVER: '0xc6996db7F1772f17Ab99b5919b2e1354d4847535',
				IMMUTABLE_SPLITS_DRIVER_LOGIC: '0xbe06FC324068323c19BD9264D731596706e1eccE',
				IMMUTABLE_SPLITS_DRIVER_ADMIN: '0x000000000000000000000000000000000000dEaD',
				IMMUTABLE_SPLITS_DRIVER_ID: '2',
				REPO_DRIVER: '',
				REPO_DRIVER_LOGIC: '',
				REPO_DRIVER_ADMIN: '',
				REPO_DRIVER_ID: '',
				SUBGRAPH_URL: 'https://api.thegraph.com/subgraphs/name/jtourkos/drips-v2-on-mumbai'
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
