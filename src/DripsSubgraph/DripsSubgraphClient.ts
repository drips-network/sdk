/* eslint-disable no-await-in-loop */
import Utils from '../utils';
import { nameOf, validateAddress } from '../common/internals';
import { DripsErrors } from '../common/DripsError';
import * as gql from './gql';
import type {
	DripsSetEvent,
	ApiUserAssetConfig,
	SplitsEntry,
	UserAssetConfig,
	ApiSplitsEntry,
	ApiDripsSetEvent,
	DripsReceiverSeenEvent,
	ApiDripsReceiverSeenEvent,
	ApiUserMetadataEvent,
	UserMetadata,
	NftSubAccount,
	ApiNftSubAccount
} from './types';
import {
	mapDripsReceiverSeenEventToDto,
	mapDripsSetEventToDto,
	mapSplitEntryToDto,
	mapUserAssetConfigToDto,
	mapUserMetadataEventToDto
} from './mappers';
import { BigNumber, BigNumberish } from 'ethers';

/**
 * A client for querying the Drips Subgraph.
 */
export default class DripsSubgraphClient {
	#chainId!: number;
	/** Returns the chain ID the `DripsSubgraphClient` is connected to. */
	public get chainId() {
		return this.#chainId;
	}

	#apiUrl!: string;
	/** Returns the `DripsSubgraphClient`'s API URL. */
	public get apiUrl() {
		return this.#apiUrl;
	}

	private constructor() {}

	/**
	 * Creates a new immutable `DripsSubgraphClient` instance.
	 *
	 * @param  {string} chainId The chain ID.
	 * @throws {DripsErrors.argumentMissingError} if the `chainId` is missing.
	 * @throws {DripsErrors.unsupportedNetworkError} if the `chainId` is not supported.
	 * @returns The new `DripsSubgraphClient` instance.
	 */
	public static create(chainId: number): DripsSubgraphClient {
		if (!chainId) {
			throw DripsErrors.argumentMissingError(
				`Could not create a new 'DripsSubgraphClient' instance: ${nameOf({ chainId })} is missing.`,
				nameOf({ chainId })
			);
		}

		if (!Utils.Network.isSupportedChain(chainId)) {
			throw DripsErrors.unsupportedNetworkError(
				`Could not create a new 'DripsSubgraphClient' instance: chain ID '${chainId}' is not supported.`,
				chainId
			);
		}

		const subgraphClient = new DripsSubgraphClient();

		subgraphClient.#chainId = chainId;
		subgraphClient.#apiUrl = Utils.Network.dripsMetadata[subgraphClient.#chainId].SUBGRAPH_URL;

		return subgraphClient;
	}

	/**
	 * Returns the user's drips configuration for the given asset.
	 * @param  {string} userId The user ID.
	 * @param  {BigNumberish} assetId The asset ID.
	 * @returns A `Promise` which resolves to the user's drips configuration, or `null` if the configuration is not found.
	 * @throws {DripsErrors.argumentMissingError} if any of the required parameters is missing.
	 * @throws {DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getUserAssetConfigById(userId: string, assetId: BigNumberish): Promise<UserAssetConfig | null> {
		if (!userId) {
			throw DripsErrors.argumentMissingError(
				`Could not get user asset config: ${nameOf({ userId })} is missing.`,
				nameOf({ userId })
			);
		}

		if (!assetId) {
			throw DripsErrors.argumentMissingError(
				`Could not get user asset config: ${nameOf({ assetId })} is missing.`,
				nameOf({ assetId })
			);
		}

		type ApiResponse = {
			userAssetConfig: ApiUserAssetConfig;
		};

		const response = await this.query<ApiResponse>(gql.getUserAssetConfigById, {
			configId: `${userId}-${assetId}`
		});

		const userAssetConfig = response?.data?.userAssetConfig;

		return userAssetConfig ? mapUserAssetConfigToDto(userAssetConfig) : null;
	}

	/**
	 * Returns all drips configurations for the given user.
	 * @param  {string} userId The user ID.
	 * @returns A `Promise` which resolves to the user's drips configurations.
	 * @throws {DripsErrors.argumentMissingError} if the `userId` is missing.
	 * @throws {DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getAllUserAssetConfigsByUserId(userId: string): Promise<UserAssetConfig[]> {
		if (!userId) {
			throw DripsErrors.argumentMissingError(
				`Could not get user asset config: ${nameOf({ userId })} is missing.`,
				nameOf({ userId })
			);
		}

		type ApiResponse = {
			user: {
				assetConfigs: ApiUserAssetConfig[];
			};
		};

		const response = await this.query<ApiResponse>(gql.getAllUserAssetConfigsByUserId, { userId });

		return response?.data?.user?.assetConfigs?.map(mapUserAssetConfigToDto) || [];
	}

	/**
	 * Returns the user's splits configuration.
	 * @param  {string} userId The user ID.
	 * @returns A `Promise` which resolves to the user's splits configuration.
	 * @throws {DripsErrors.argumentMissingError} if the `userId` is missing.
	 * @throws {DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getSplitsConfigByUserId(userId: string): Promise<SplitsEntry[]> {
		if (!userId) {
			throw DripsErrors.argumentMissingError(
				`Could not get user asset config: ${nameOf({ userId })} is missing.`,
				nameOf({ userId })
			);
		}

		type ApiResponse = {
			user: {
				splitsEntries: ApiSplitsEntry[];
			};
		};

		const response = await this.query<ApiResponse>(gql.getSplitsConfigByUserId, { userId });

		return response?.data?.user?.splitsEntries?.map(mapSplitEntryToDto) || [];
	}

	/**
	 * Returns the user's `DripsSetEvent`s.
	 * @param  {string} userId The user ID.
	 * @returns A `Promise` which resolves to the user's `DripsSetEvent`s.
	 * @throws {DripsErrors.argumentMissingError} if the `userId` is missing.
	 * @throws {DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getDripsSetEventsByUserId(userId: string): Promise<DripsSetEvent[]> {
		if (!userId) {
			throw DripsErrors.argumentMissingError(
				`Could not get user asset config: ${nameOf({ userId })} is missing.`,
				nameOf({ userId })
			);
		}

		type ApiResponse = {
			dripsSetEvents: ApiDripsSetEvent[];
		};

		const response = await this.query<ApiResponse>(gql.getDripsSetEventsByUserId, { userId });

		return response?.data?.dripsSetEvents?.map(mapDripsSetEventToDto) || [];
	}

	/**
	 * Returns all `DripsReceiverSeen` events for a given receiver.
	 * @param  {string} receiverUserId The receiver's user ID.
	 * @returns A `Promise` which resolves to the receivers's `DripsReceiverSeenEvent`s.
	 * @throws {DripsErrors.argumentMissingError} if the `receiverUserId` is missing.
	 * @throws {DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getDripsReceiverSeenEventsByReceiverId(receiverUserId: string): Promise<DripsReceiverSeenEvent[]> {
		if (!receiverUserId) {
			throw DripsErrors.argumentMissingError(
				`Could not get streaming users: ${nameOf({ receiverUserId })} is missing.`,
				nameOf({ receiverUserId })
			);
		}

		type ApiResponse = {
			dripsReceiverSeenEvents: ApiDripsReceiverSeenEvent[];
		};

		const response = await this.query<ApiResponse>(gql.getDripsReceiverSeenEventsByReceiverId, { receiverUserId });
		const dripsReceiverSeenEvents = response?.data?.dripsReceiverSeenEvents;

		if (!dripsReceiverSeenEvents?.length) {
			return [];
		}

		return dripsReceiverSeenEvents.map(mapDripsReceiverSeenEventToDto);
	}

	/**
	 * Returns the users that stream funds to a given receiver.
	 * @param  {string} receiverUserId The receiver's user ID.
	 * @returns A `Promise` which resolves to the users that stream funds to the given receiver.
	 * @throws {DripsErrors.argumentMissingError} if the `receiverUserId` is missing.
	 * @throws {DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getUsersStreamingToUser(receiverUserId: string): Promise<bigint[]> {
		if (!receiverUserId) {
			throw DripsErrors.argumentMissingError(
				`Could not get streaming users: ${nameOf({ receiverUserId })} is missing.`,
				nameOf({ receiverUserId })
			);
		}

		const dripReceiverSeenEvents = await this.getDripsReceiverSeenEventsByReceiverId(receiverUserId);

		const uniqueSenders = dripReceiverSeenEvents.reduce((unique: bigint[], o: DripsReceiverSeenEvent) => {
			if (!unique.some((id: bigint) => id === o.senderUserId)) {
				unique.push(o.senderUserId);
			}
			return unique;
		}, []);

		return uniqueSenders;
	}

	/**
	 * Returns the history of all user metadata updates for the given user.
	 * @param  {string} userId The user ID.
	 * @returns A `Promise` which resolves to the user's metadata, or `null` if not found.
	 * @throws {DripsErrors.argumentMissingError} if the `userId` is missing.
	 * @throws {DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getUserMetadataByUser(userId: string): Promise<UserMetadata | null> {
		if (!userId) {
			throw DripsErrors.argumentMissingError(
				`Could not get user metadata: ${nameOf({ userId })} is missing.`,
				nameOf({ userId })
			);
		}

		type ApiResponse = {
			userMetadataEvent: ApiUserMetadataEvent | null;
		};

		const response = await this.query<ApiResponse>(gql.getUserMetadataByUser, { userId });

		const userMetadataEvent = response?.data?.userMetadataEvent;

		return userMetadataEvent ? mapUserMetadataEventToDto(userMetadataEvent) : null;
	}

	/**
	 * Returns the latest metadata update for the given `userId`-`key` pair.
	 * @param  {string} userId The user ID.
	 * @param  {string} key The metadata key.
	 * @returns A `Promise` which resolves to the user's metadata.
	 * @throws {DripsErrors.argumentMissingError} if any of the required parameter is missing.
	 * @throws {DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getLatestUserMetadata(userId: string, key: BigNumberish): Promise<UserMetadata[]> {
		if (!userId || !key) {
			throw DripsErrors.argumentMissingError(
				`Could not get user metadata: '${nameOf({ userId })}' and '${nameOf({ key })}' are required.`,
				userId ? nameOf({ userId }) : nameOf({ key })
			);
		}

		type ApiResponse = {
			userMetadataEvents: ApiUserMetadataEvent[];
		};

		const response = await this.query<ApiResponse>(gql.getLatestUserMetadata, {
			key: `${userId}-${BigNumber.from(key)}`
		});

		const userMetadataEvents = response?.data?.userMetadataEvents;

		return userMetadataEvents ? userMetadataEvents.map(mapUserMetadataEventToDto) : [];
	}

	/**
	 * Returns all NFT sub accounts for a given owner.
	 * @param  {string} ownerAddress The owner's address.
	 * @returns A `Promise` which resolves to the owner's NFT sub accounts.
	 * @throws {DripsErrors.addressError} if the `ownerAddress` is not valid.
	 * @throws {DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getNftSubAccountsByOwner(ownerAddress: string): Promise<NftSubAccount[]> {
		validateAddress(ownerAddress);

		type ApiResponse = {
			nftsubAccounts: ApiNftSubAccount[];
		};

		const response = await this.query<ApiResponse>(gql.getNftSubAccountsByOwner, { ownerAddress });

		const nftSubAccounts = response?.data?.nftsubAccounts;

		return nftSubAccounts
			? nftSubAccounts.map((s) => ({
					tokenId: s.id,
					ownerAddress: s.ownerAddress
			  }))
			: [];
	}

	/** @internal */
	public async query<T = unknown>(query: string, variables: unknown): Promise<{ data: T }> {
		const resp = await fetch(this.apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ query, variables }, (_, value) => (typeof value === 'bigint' ? value.toString() : value))
		});

		if (resp.status >= 200 && resp.status <= 299) {
			return (await resp.json()) as { data: T };
		}

		throw DripsErrors.subgraphQueryError(`Subgraph query failed: ${resp.statusText}`);
	}
}
