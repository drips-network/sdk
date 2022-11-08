/* eslint-disable no-await-in-loop */
import type { BigNumberish } from 'ethers';
import { BigNumber } from 'ethers';
import { nameOf } from '../common/internals';
import Utils from '../utils';
import { validateAddress } from '../common/validators';
import { DripsErrors } from '../common/DripsError';
import * as gql from './gql';
import type * as SubgraphTypes from './generated/graphql-types';
import type {
	DripsSetEvent,
	SplitsEntry,
	UserAssetConfig,
	DripsReceiverSeenEvent,
	UserMetadata,
	NftSubAccount
} from './types';
import {
	mapDripsReceiverSeenEventToDto,
	mapDripsSetEventToDto,
	mapSplitEntryToDto,
	mapUserAssetConfigToDto,
	mapUserMetadataEventToDto
} from './mappers';

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
	 * @param  {string|undefined} customApiUrl Overrides the subgraph's `apiUrl`.
	 * If it's `undefined` (default value), the `apiUrl` will be automatically selected based on the `chainId`.
	 * @throws {@link DripsErrors.argumentMissingError} if the `chainId` is missing.
	 * @throws {@link DripsErrors.unsupportedNetworkError} if the `chainId` is not supported.
	 * @returns The new `DripsSubgraphClient` instance.
	 */
	public static create(chainId: number, customApiUrl: string | undefined = undefined): DripsSubgraphClient {
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
		subgraphClient.#apiUrl = customApiUrl ?? Utils.Network.configs[subgraphClient.#chainId].SUBGRAPH_URL;

		return subgraphClient;
	}

	/**
	 * Returns the user's drips configuration for the given asset.
	 * @param  {string} userId The user ID.
	 * @param  {BigNumberish} assetId The asset ID.
	 * @returns A `Promise` which resolves to the user's drips configuration, or `null` if the configuration is not found.
	 * @throws {@link DripsErrors.argumentMissingError} if any of the required parameters is missing.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
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

		type QueryResponse = {
			userAssetConfig: SubgraphTypes.UserAssetConfig;
		};

		const response = await this.query<QueryResponse>(gql.getUserAssetConfigById, {
			configId: `${userId}-${assetId}`
		});

		const userAssetConfig = response?.data?.userAssetConfig;

		return userAssetConfig ? mapUserAssetConfigToDto(userAssetConfig) : null;
	}

	/**
	 * Returns all drips configurations for the given user.
	 * @param  {string} userId The user ID.
	 * @returns A `Promise` which resolves to the user's drips configurations.
	 * @throws {@link DripsErrors.argumentMissingError} if the `userId` is missing.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getAllUserAssetConfigsByUserId(userId: string): Promise<UserAssetConfig[]> {
		if (!userId) {
			throw DripsErrors.argumentMissingError(
				`Could not get user asset config: ${nameOf({ userId })} is missing.`,
				nameOf({ userId })
			);
		}

		type QueryResponse = {
			user: {
				assetConfigs: SubgraphTypes.UserAssetConfig[];
			};
		};

		const response = await this.query<QueryResponse>(gql.getAllUserAssetConfigsByUserId, { userId });

		return response?.data?.user?.assetConfigs?.map(mapUserAssetConfigToDto) || [];
	}

	/**
	 * Returns the user's splits configuration.
	 * @param  {string} userId The user ID.
	 * @returns A `Promise` which resolves to the user's splits configuration.
	 * @throws {@link DripsErrors.argumentMissingError} if the `userId` is missing.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getSplitsConfigByUserId(userId: string): Promise<SplitsEntry[]> {
		if (!userId) {
			throw DripsErrors.argumentMissingError(
				`Could not get user asset config: ${nameOf({ userId })} is missing.`,
				nameOf({ userId })
			);
		}

		type QueryResponse = {
			user: {
				splitsEntries: SubgraphTypes.SplitsEntry[];
			};
		};

		const response = await this.query<QueryResponse>(gql.getSplitsConfigByUserId, { userId });

		return response?.data?.user?.splitsEntries?.map(mapSplitEntryToDto) || [];
	}

	/**
	 * Returns the user's `DripsSetEvent`s.
	 * @param  {string} userId The user ID.
	 * @returns A `Promise` which resolves to the user's `DripsSetEvent`s.
	 * @throws {@link DripsErrors.argumentMissingError} if the `userId` is missing.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getDripsSetEventsByUserId(userId: string): Promise<DripsSetEvent[]> {
		if (!userId) {
			throw DripsErrors.argumentMissingError(
				`Could not get user asset config: ${nameOf({ userId })} is missing.`,
				nameOf({ userId })
			);
		}

		type QueryResponse = {
			dripsSetEvents: SubgraphTypes.DripsSetEvent[];
		};

		const response = await this.query<QueryResponse>(gql.getDripsSetEventsByUserId, { userId });

		return response?.data?.dripsSetEvents?.map(mapDripsSetEventToDto) || [];
	}

	/**
	 * Returns all `DripsReceiverSeen` events for a given receiver.
	 * @param  {string} receiverUserId The receiver's user ID.
	 * @returns A `Promise` which resolves to the receivers's `DripsReceiverSeenEvent`s.
	 * @throws {@link DripsErrors.argumentMissingError} if the `receiverUserId` is missing.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getDripsReceiverSeenEventsByReceiverId(receiverUserId: string): Promise<DripsReceiverSeenEvent[]> {
		if (!receiverUserId) {
			throw DripsErrors.argumentMissingError(
				`Could not get streaming users: ${nameOf({ receiverUserId })} is missing.`,
				nameOf({ receiverUserId })
			);
		}

		type QueryResponse = {
			dripsReceiverSeenEvents: SubgraphTypes.DripsReceiverSeenEvent[];
		};

		const response = await this.query<QueryResponse>(gql.getDripsReceiverSeenEventsByReceiverId, { receiverUserId });
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
	 * @throws {@link DripsErrors.argumentMissingError} if the `receiverUserId` is missing.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
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
	 * @param  {BigNumberish} key The metadata key.
	 * @returns A `Promise` which resolves to the user's metadata.
	 * @throws {@link DripsErrors.argumentMissingError} if the `userId` is missing.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getMetadataHistory(userId: string, key?: BigNumberish): Promise<UserMetadata[]> {
		if (!userId) {
			throw DripsErrors.argumentMissingError(
				`Could not get user metadata: ${nameOf({ userId })} is missing.`,
				nameOf({ userId })
			);
		}

		type QueryResponse = {
			userMetadataEvents: SubgraphTypes.UserMetadataEvent[];
		};

		let response: { data: QueryResponse };

		if (key) {
			response = await this.query<QueryResponse>(gql.getMetadataHistoryByUserAndKey, {
				userId,
				key: `${BigNumber.from(key)}`
			});
		} else {
			response = await this.query<QueryResponse>(gql.getMetadataHistoryByUser, { userId });
		}

		const userMetadataEvents = response?.data?.userMetadataEvents;

		return userMetadataEvents ? userMetadataEvents.map(mapUserMetadataEventToDto) : [];
	}

	/**
	 * Returns the latest metadata update for the given `userId`-`key` pair.
	 * @param  {string} userId The user ID.
	 * @param  {string} key The metadata key.
	 * @returns A `Promise` which resolves to the user's metadata, or `null` if not found.
	 * @throws {@link DripsErrors.argumentMissingError} if any of the required parameter is missing.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getLatestUserMetadata(userId: string, key: BigNumberish): Promise<UserMetadata | null> {
		if (!userId || !key) {
			throw DripsErrors.argumentMissingError(
				`Could not get user metadata: '${nameOf({ userId })}' and '${nameOf({ key })}' are required.`,
				userId ? nameOf({ userId }) : nameOf({ key })
			);
		}

		type QueryResponse = {
			userMetadataByKey: SubgraphTypes.UserMetadataEvent;
		};

		const response = await this.query<QueryResponse>(gql.getLatestUserMetadata, {
			id: `${userId}-${BigNumber.from(key)}`
		});

		const userMetadataEvent = response?.data?.userMetadataByKey;

		return userMetadataEvent ? mapUserMetadataEventToDto(userMetadataEvent) : null;
	}

	/**
	 * Returns all NFT sub accounts for a given owner.
	 * @param  {string} ownerAddress The owner's address.
	 * @returns A `Promise` which resolves to the owner's NFT sub accounts.
	 * @throws {@link DripsErrors.addressError} if the `ownerAddress` is not valid.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getNftSubAccountsByOwner(ownerAddress: string): Promise<NftSubAccount[]> {
		validateAddress(ownerAddress);

		type QueryResponse = {
			nftsubAccounts: SubgraphTypes.NftSubAccount[];
		};

		const response = await this.query<QueryResponse>(gql.getNftSubAccountsByOwner, { ownerAddress });

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
