/* eslint-disable no-restricted-syntax */
/* eslint-disable no-constant-condition */
/* eslint-disable no-await-in-loop */
import type { BigNumberish } from 'ethers';
import { ethers } from 'ethers';
import type { Provider } from '@ethersproject/providers';
import DripsClient from '../Drips/DripsClient';
import constants from '../constants';
import { nameOf, formatDripsReceivers } from '../common/internals';
import Utils from '../utils';
import { validateAddress } from '../common/validators';
import { DripsErrors } from '../common/DripsError';
import * as gql from './gql';
import type * as SubgraphTypes from './generated/graphql-types';
import type {
	StreamsSetEvent,
	SplitsEntry,
	UserAssetConfig,
	StreamReceiverSeenEvent,
	UserMetadataEntry,
	NftSubAccount,
	SplitEvent,
	ReceivedStreamsEvent,
	GivenEvent,
	CollectedEvent,
	SqueezedStreamsEvent,
	StreamsSetEventWithFullReceivers
} from './types';
import {
	mapCollectedEventToDto,
	mapStreamReceiverSeenEventToDto,
	mapStreamsSetEventToDto,
	mapGivenEventToDto,
	mapReceivedStreamsEventToDto,
	mapSplitEntryToDto,
	mapSplitEventToDto,
	mapSqueezedDripsToDto,
	mapUserAssetConfigToDto,
	mapUserMetadataEventToDto
} from './mappers';
import type { StreamsHistoryStruct, StreamReceiverStruct, SqueezeArgs } from '../common/types';
import { reconcileDripsSetReceivers } from './utils';
import RepoDriverQueries from './RepoDriverQueries';

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

	#repoDriverQueries!: RepoDriverQueries;
	/** Exposes `RepoDriver` queries. */
	public get repoDriverQueries() {
		return this.#repoDriverQueries;
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
	public static create(chainId: number, customApiUrl?: string): DripsSubgraphClient {
		if (!chainId) {
			throw DripsErrors.argumentMissingError(
				`Could not create a new 'DripsSubgraphClient': ${nameOf({ chainId })} is missing.`,
				nameOf({ chainId })
			);
		}

		if (!Utils.Network.isSupportedChain(chainId)) {
			throw DripsErrors.unsupportedNetworkError(
				`Could not create a new 'DripsSubgraphClient': chain ID '${chainId}' is not supported.`,
				chainId
			);
		}

		const subgraphClient = new DripsSubgraphClient();

		const apiUrl = customApiUrl ?? Utils.Network.configs[chainId].SUBGRAPH_URL;
		subgraphClient.#apiUrl = apiUrl;
		subgraphClient.#chainId = chainId;
		subgraphClient.#repoDriverQueries = RepoDriverQueries.create(apiUrl, subgraphClient.query.bind(subgraphClient));

		return subgraphClient;
	}

	/**
	 * Returns the drips configuration for the given user and asset.
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
	 * Returns a list of drips configurations for the given user.
	 * @param  {string} userId The user ID.
	 * @param  {number} skip The number of database entries to skip. Defaults to `0`.
	 * @param  {number} first The number of database entries to take. Defaults to `100`.
	 * @returns A `Promise` which resolves to the user's drips configurations.
	 * @throws {@link DripsErrors.argumentMissingError} if the `userId` is missing.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getAllUserAssetConfigsByUserId(
		userId: string,
		skip: number = 0,
		first: number = 100
	): Promise<UserAssetConfig[]> {
		if (!userId) {
			throw DripsErrors.argumentMissingError(
				`Could not get user asset configs: ${nameOf({ userId })} is missing.`,
				nameOf({ userId })
			);
		}

		type QueryResponse = {
			user: {
				assetConfigs: SubgraphTypes.UserAssetConfig[];
			};
		};

		const response = await this.query<QueryResponse>(gql.getAllUserAssetConfigsByUserId, { userId, skip, first });

		return response?.data?.user?.assetConfigs?.map(mapUserAssetConfigToDto) || [];
	}

	/**
	 * Returns the splits configuration for the give user.
	 * @param  {string} userId The user ID.
	 * @param  {number} skip The number of database entries to skip. Defaults to `0`.
	 * @param  {number} first The number of database entries to take. Defaults to `100`.
	 * @returns A `Promise` which resolves to the user's splits configuration.
	 * @throws {@link DripsErrors.argumentMissingError} if the `userId` is missing.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getSplitsConfigByUserId(userId: string, skip: number = 0, first: number = 100): Promise<SplitsEntry[]> {
		if (!userId) {
			throw DripsErrors.argumentMissingError(
				`Could not get splits config: ${nameOf({ userId })} is missing.`,
				nameOf({ userId })
			);
		}

		type QueryResponse = {
			user: {
				splitsEntries: SubgraphTypes.SplitsEntry[];
			};
		};

		const response = await this.query<QueryResponse>(gql.getSplitsConfigByUserId, { userId, skip, first });

		return response?.data?.user?.splitsEntries?.map(mapSplitEntryToDto) || [];
	}

	/**
	 * Returns a list of `Split` entries for the given user.
	 * @param  {string} receiverUserId The receiver's user ID.
	 * @param  {number} skip The number of database entries to skip. Defaults to `0`.
	 * @param  {number} first The number of database entries to take. Defaults to `100`.
	 * @returns A `Promise` which resolves to the receivers's `Split` events.
	 * @throws {@link DripsErrors.argumentMissingError} if the `receiverUserId` is missing.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getSplitEntriesByReceiverUserId(
		receiverUserId: string,
		skip: number = 0,
		first: number = 100
	): Promise<SplitsEntry[]> {
		if (!receiverUserId) {
			throw DripsErrors.argumentMissingError(
				`Could not get 'split' events: ${nameOf({ receiverUserId })} is missing.`,
				nameOf({ receiverUserId })
			);
		}

		type QueryResponse = {
			splitsEntries: SubgraphTypes.SplitsEntry[];
		};

		const response = await this.query<QueryResponse>(gql.getSplitEntriesByReceiverUserId, {
			receiverUserId,
			skip,
			first
		});

		return response?.data?.splitsEntries?.map(mapSplitEntryToDto) || [];
	}

	/**
	 * Returns a list of `DripsSet` events for the given user.
	 * @param  {string} userId The user ID.
	 * @param  {number} skip The number of database entries to skip. Defaults to `0`.
	 * @param  {number} first The number of database entries to take. Defaults to `100`.
	 * @returns A `Promise` which resolves to the user's `DripsSet` events.
	 * @throws {@link DripsErrors.argumentMissingError} if the `userId` is missing.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getStreamsSetEventsByUserId(
		userId: string,
		skip: number = 0,
		first: number = 100
	): Promise<StreamsSetEvent[]> {
		if (!userId) {
			throw DripsErrors.argumentMissingError(
				`Could not get 'drip set' events: ${nameOf({ userId })} is missing.`,
				nameOf({ userId })
			);
		}

		type QueryResponse = {
			streamsSetEvents: SubgraphTypes.StreamsSetEvent[];
		};

		const response = await this.query<QueryResponse>(gql.getStreamsSetEventsByUserId, { userId, skip, first });

		return response?.data?.streamsSetEvents?.map(mapStreamsSetEventToDto) || [];
	}

	/**
	 * Returns a list of `DripsReceiverSeen` events for the given receiver.
	 * @param  {string} receiverUserId The receiver's user ID.
	 * @param  {number} skip The number of database entries to skip. Defaults to `0`.
	 * @param  {number} first The number of database entries to take. Defaults to `100`.
	 * @returns A `Promise` which resolves to the receivers's `DripsReceiverSeen` events.
	 * @throws {@link DripsErrors.argumentMissingError} if the `receiverUserId` is missing.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getStreamReceiverSeenEventsByReceiverId(
		receiverUserId: string,
		skip: number = 0,
		first: number = 100
	): Promise<StreamReceiverSeenEvent[]> {
		if (!receiverUserId) {
			throw DripsErrors.argumentMissingError(
				`Could not get streaming users: ${nameOf({ receiverUserId })} is missing.`,
				nameOf({ receiverUserId })
			);
		}

		type QueryResponse = {
			streamReceiverSeenEvents: SubgraphTypes.StreamReceiverSeenEvent[];
		};

		const response = await this.query<QueryResponse>(gql.getStreamReceiverSeenEventsByReceiverId, {
			receiverUserId,
			skip,
			first
		});
		const streamReceiverSeenEvents = response?.data?.streamReceiverSeenEvents;

		if (!streamReceiverSeenEvents?.length) {
			return [];
		}

		return streamReceiverSeenEvents.map(mapStreamReceiverSeenEventToDto);
	}

	/**
	 * Returns the users that stream funds to the given receiver.
	 * @param  {string} receiverUserId The receiver's user ID.
	 * @param  {number} skip The number of database entries to skip. Defaults to `0`.
	 * @param  {number} first The number of database entries to take. Defaults to `100`.
	 * @returns A `Promise` which resolves to the users that stream funds to the given receiver.
	 * @throws {@link DripsErrors.argumentMissingError} if the `receiverUserId` is missing.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getUsersStreamingToUser(
		receiverUserId: string,
		skip: number = 0,
		first: number = 100
	): Promise<bigint[]> {
		if (!receiverUserId) {
			throw DripsErrors.argumentMissingError(
				`Could not get streaming users: ${nameOf({ receiverUserId })} is missing.`,
				nameOf({ receiverUserId })
			);
		}

		const dripReceiverSeenEvents = await this.getStreamReceiverSeenEventsByReceiverId(receiverUserId, skip, first);

		const uniqueSenders = dripReceiverSeenEvents.reduce((unique: bigint[], o: StreamReceiverSeenEvent) => {
			if (!unique.some((id: bigint) => id === o.senderUserId)) {
				unique.push(o.senderUserId);
			}
			return unique;
		}, []);

		return uniqueSenders;
	}

	/**
	 * Returns the history of user metadata updates for the given user.
	 * @param  {string} userId The user ID.
	 * @param  {string} key The metadata key.
	 * @param  {number} skip The number of database entries to skip. Defaults to `0`.
	 * @param  {number} first The number of database entries to take. Defaults to `100`.
	 * @returns A `Promise` which resolves to the user's metadata.
	 * @throws {@link DripsErrors.argumentMissingError} if the `userId` is missing.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getMetadataHistory(
		userId: string,
		key?: string,
		skip: number = 0,
		first: number = 100
	): Promise<UserMetadataEntry[]> {
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
				key: `${Utils.Metadata.keyFromString(key)}`,
				skip,
				first
			});
		} else {
			response = await this.query<QueryResponse>(gql.getMetadataHistoryByUser, { userId, skip, first });
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
	public async getLatestUserMetadata(userId: string, key: string): Promise<UserMetadataEntry | null> {
		if (!userId) {
			throw DripsErrors.argumentError(`Could not get user metadata: '${nameOf({ key })}' is missing.`);
		}

		if (!key) {
			throw DripsErrors.argumentError(`Could not get user metadata: '${nameOf({ key })}' is missing.`);
		}

		type QueryResponse = {
			userMetadataByKey: SubgraphTypes.UserMetadataEvent;
		};

		const response = await this.query<QueryResponse>(gql.getLatestUserMetadata, {
			id: `${userId}-${key}`
		});

		const userMetadataEvent = response?.data?.userMetadataByKey;

		return userMetadataEvent ? mapUserMetadataEventToDto(userMetadataEvent) : null;
	}

	/**
	 * Returns a list of NFT sub accounts for the given owner.
	 * @param  {string} ownerAddress The owner's address.
	 * @param  {number} skip The number of database entries to skip. Defaults to `0`.
	 * @param  {number} first The number of database entries to take. Defaults to `100`.
	 * @returns A `Promise` which resolves to the owner's NFT sub accounts.
	 * @throws {@link DripsErrors.addressError} if the `ownerAddress` is not valid.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getNftSubAccountsByOwner(
		ownerAddress: string,
		skip: number = 0,
		first: number = 100
	): Promise<NftSubAccount[]> {
		validateAddress(ownerAddress);

		type QueryResponse = {
			nftsubAccounts: SubgraphTypes.NftSubAccount[];
		};

		const response = await this.query<QueryResponse>(gql.getNftSubAccountsByOwner, {
			ownerAddress: ethers.utils.getAddress(ownerAddress),
			skip,
			first
		});

		const nftSubAccounts = response?.data?.nftsubAccounts;

		return nftSubAccounts
			? nftSubAccounts.map((s) => ({
					tokenId: s.id,
					ownerAddress: ethers.utils.getAddress(s.ownerAddress)
			  }))
			: [];
	}

	/**
	 * Returns the NFT sub account owner for the given token ID.
	 * @param  {string} tokenId The token ID.
	 * @returns A `Promise` which resolves to the NFT sub account owner, or `null` if not found.
	 * @throws {@link DripsErrors.argumentError} if the `tokenId` is missing.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getNftSubAccountOwnerByTokenId(tokenId: string): Promise<NftSubAccount | null> {
		if (!tokenId) {
			throw DripsErrors.argumentError(`Could not get NFT sub account: tokenId is missing.`);
		}

		type QueryResponse = {
			nftsubAccount: SubgraphTypes.NftSubAccount;
		};

		const response = await this.query<QueryResponse>(gql.getNftSubAccountOwnerByTokenId, { tokenId });

		const nftSubAccount = response?.data?.nftsubAccount;

		return nftSubAccount
			? { tokenId: nftSubAccount.id, ownerAddress: ethers.utils.getAddress(nftSubAccount.ownerAddress) }
			: null;
	}

	/**
	 * Returns a list of token IDs that are associated with the given app.
	 * @param  {string} associatedApp The name/ID of the app to retrieve accounts for.
	 *
	 * **Tip**: you might want to use `Utils.UserMetadata.valueFromString` to create your `associatedApp` argument from a `string`.
	 * @param  {number} skip The number of database entries to skip. Defaults to `0`.
	 * @param  {number} first The number of database entries to take. Defaults to `100`.
	 * @returns A `Promise` which resolves to the account IDs.
	 * @throws {@link DripsErrors.argumentError} if the `associatedApp` is missing.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getNftSubAccountIdsByApp(
		associatedApp: string,
		skip: number = 0,
		first: number = 100
	): Promise<string[]> {
		if (!associatedApp) {
			throw DripsErrors.argumentError(`Could not get user metadata: ${nameOf({ associatedApp })} is missing.`);
		}

		type QueryResponse = {
			userMetadataEvents: SubgraphTypes.UserMetadataEvent[];
		};

		const response = await this.query<QueryResponse>(gql.getMetadataHistoryByKeyAndValue, {
			key: constants.ASSOCIATED_APP_KEY_BYTES,
			value: Utils.Metadata.valueFromString(associatedApp),
			skip,
			first
		});

		const userMetadataEvents = response?.data?.userMetadataEvents;

		const uniqueUserIds = userMetadataEvents?.reduce((unique: string[], o: SubgraphTypes.UserMetadataEvent) => {
			if (!unique.some((id: string) => id === o.userId)) {
				unique.push(o.userId);
			}
			return unique;
		}, []);

		return uniqueUserIds || [];
	}

	/**
	 * Returns a list of `Collected` events for the given user.
	 * @param  {string} userId The user ID.
	 * @param  {number} skip The number of database entries to skip. Defaults to `0`.
	 * @param  {number} first The number of database entries to take. Defaults to `100`.
	 * @returns A `Promise` which resolves to the user's `Collected` events.
	 * @throws {@link DripsErrors.argumentMissingError} if the `userId` is missing.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getCollectedEventsByUserId(
		userId: string,
		skip: number = 0,
		first: number = 100
	): Promise<CollectedEvent[]> {
		if (!userId) {
			throw DripsErrors.argumentMissingError(
				`Could not get 'split' events: ${nameOf({ userId })} is missing.`,
				nameOf({ userId })
			);
		}

		type QueryResponse = {
			collectedEvents: SubgraphTypes.CollectedEvent[];
		};

		const response = await this.query<QueryResponse>(gql.getCollectedEventsByUserId, { userId, skip, first });

		return response?.data?.collectedEvents?.map(mapCollectedEventToDto) || [];
	}

	/**
	 * Returns the user's `SqueezedDrips` events.
	 * @param  {string} userId The user ID.
	 * @param  {number} skip The number of database entries to skip. Defaults to `0`.
	 * @param  {number} first The number of database entries to take. Defaults to `100`.
	 * @returns A `Promise` which resolves to the user's `SqueezedDrips` events.
	 * @throws {@link DripsErrors.argumentMissingError} if the `userId` is missing.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getSqueezedStreamsEventsByUserId(
		userId: string,
		skip: number = 0,
		first: number = 100
	): Promise<SqueezedStreamsEvent[]> {
		if (!userId) {
			throw DripsErrors.argumentError(`Could not get 'squeezed Drips' events: ${nameOf({ userId })} is missing.`);
		}

		type QueryResponse = {
			squeezedDripsEvents: SubgraphTypes.SqueezedStreamsEvent[];
		};

		const response = await this.query<QueryResponse>(gql.getSqueezedStreamsEventsByUserId, { userId, skip, first });

		return response?.data?.squeezedDripsEvents?.map(mapSqueezedDripsToDto) || [];
	}

	/**
	 * Returns a list of `Split` events for the given user.
	 * @param  {string} userId The user ID.
	 * @param  {number} skip The number of database entries to skip. Defaults to `0`.
	 * @param  {number} first The number of database entries to take. Defaults to `100`.
	 * @returns A `Promise` which resolves to the user's `Split` events.
	 * @throws {@link DripsErrors.argumentMissingError} if the `userId` is missing.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getSplitEventsByUserId(userId: string, skip: number = 0, first: number = 100): Promise<SplitEvent[]> {
		if (!userId) {
			throw DripsErrors.argumentMissingError(
				`Could not get 'split' events: ${nameOf({ userId })} is missing.`,
				nameOf({ userId })
			);
		}

		type QueryResponse = {
			splitEvents: SubgraphTypes.SplitEvent[];
		};

		const response = await this.query<QueryResponse>(gql.getSplitEventsByUserId, { userId, skip, first });

		return response?.data?.splitEvents?.map(mapSplitEventToDto) || [];
	}

	/**
	 * Returns a list of `Split` events for the given receiver.
	 * @param  {string} receiverUserId The receiver user ID.
	 * @param  {number} skip The number of database entries to skip. Defaults to `0`.
	 * @param  {number} first The number of database entries to take. Defaults to `100`.
	 * @returns A `Promise` which resolves to the receiver's `Split` events.
	 * @throws {@link DripsErrors.argumentMissingError} if the `receiverUserId` is missing.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getSplitEventsByReceiverUserId(
		receiverUserId: string,
		skip: number = 0,
		first: number = 100
	): Promise<SplitEvent[]> {
		if (!receiverUserId) {
			throw DripsErrors.argumentError(`Could not get 'split' events: ${nameOf({ receiverUserId })} is missing.`);
		}

		type QueryResponse = {
			splitEvents: SubgraphTypes.SplitEvent[];
		};

		const response = await this.query<QueryResponse>(gql.getSplitEventsByReceiverUserId, {
			receiverUserId,
			skip,
			first
		});

		return response?.data?.splitEvents?.map(mapSplitEventToDto) || [];
	}

	/**
	 * Returns a list of `ReceivedDrips` events for the given user.
	 * @param  {string} userId The user ID.
	 * @param  {number} skip The number of database entries to skip. Defaults to `0`.
	 * @param  {number} first The number of database entries to take. Defaults to `100`.
	 * @returns A `Promise` which resolves to the user's `ReceivedDrips` events.
	 * @throws {@link DripsErrors.argumentMissingError} if the `userId` is missing.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getReceivedStreamsEventsByUserId(
		userId: string,
		skip: number = 0,
		first: number = 100
	): Promise<ReceivedStreamsEvent[]> {
		if (!userId) {
			throw DripsErrors.argumentMissingError(
				`Could not get 'received drips' events: ${nameOf({ userId })} is missing.`,
				nameOf({ userId })
			);
		}

		type QueryResponse = {
			receivedDripsEvents: SubgraphTypes.ReceivedStreamsEvent[];
		};

		const response = await this.query<QueryResponse>(gql.getReceivedStreamsEventsByUserId, { userId, skip, first });

		return response?.data?.receivedDripsEvents?.map(mapReceivedStreamsEventToDto) || [];
	}

	/**
	 * Returns a list of `Given` events for the given user.
	 * @param  {string} userId The user ID.
	 * @param  {number} skip The number of database entries to skip. Defaults to `0`.
	 * @param  {number} first The number of database entries to take. Defaults to `100`.
	 * @returns A `Promise` which resolves to the user's `Given` events.
	 * @throws {@link DripsErrors.argumentMissingError} if the `userId` is missing.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getGivenEventsByUserId(userId: string, skip: number = 0, first: number = 100): Promise<GivenEvent[]> {
		if (!userId) {
			throw DripsErrors.argumentMissingError(
				`Could not get 'given' events: ${nameOf({ userId })} is missing.`,
				nameOf({ userId })
			);
		}

		type QueryResponse = {
			givenEvents: SubgraphTypes.GivenEvent[];
		};

		const response = await this.query<QueryResponse>(gql.getGivenEventsByUserId, { userId, skip, first });

		return response?.data?.givenEvents?.map(mapGivenEventToDto) || [];
	}

	/**
	 * Returns a list of `Given` events for the given receiver.
	 * @param  {string} receiverUserId The receiver user ID.
	 * @param  {number} skip The number of database entries to skip. Defaults to `0`.
	 * @param  {number} first The number of database entries to take. Defaults to `100`.
	 * @returns A `Promise` which resolves to the receiver's `Given` events.
	 * @throws {@link DripsErrors.argumentMissingError} if the `receiverId` is missing.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getGivenEventsByReceiverUserId(
		receiverUserId: string,
		skip: number = 0,
		first: number = 100
	): Promise<GivenEvent[]> {
		if (!receiverUserId) {
			throw DripsErrors.argumentError(`Could not get 'given' events: ${nameOf({ receiverUserId })} is missing.`);
		}

		type QueryResponse = {
			givenEvents: SubgraphTypes.GivenEvent[];
		};

		const response = await this.query<QueryResponse>(gql.getGivenEventsByReceiverUserId, {
			receiverUserId,
			skip,
			first
		});

		return response?.data?.givenEvents?.map(mapGivenEventToDto) || [];
	}

	/**
	 * Calculates the arguments for squeezing all Drips up to "now" for the given sender and token.
	 *
	 * **Important**: This method might fail if two Drips updates were performed in a single block.
	 * because the order of the Drips configurations returned by the Subgraph is not guaranteed for such cases.
	 * The transaction will fail in the gas estimation phase, so no gas will be wasted.
	 * @see `DripsClient.squeezeStreams` method for more.
	 * @param  {string} userId The ID of the user receiving drips to squeeze funds for.
	 * @param  {BigNumberish} senderId The ID of the user sending drips to squeeze funds from.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @returns A `Promise` which resolves to the `DripsClient.squeezeStreams` arguments.
	 */
	public async getArgsForSqueezingAllDrips(
		userId: string,
		senderId: string,
		tokenAddress: string
	): Promise<SqueezeArgs> {
		// Get all `DripsSet` events (drips configurations) for the sender.
		const allStreamsSetEvents: StreamsSetEvent[] = [];
		let skip = 0;
		const first = 500;
		while (true) {
			const iterationEvents = await this.getStreamsSetEventsByUserId(senderId, skip, first);

			allStreamsSetEvents.push(...iterationEvents);

			if (!iterationEvents?.length || iterationEvents.length < first) {
				break;
			}

			skip += first;
		}

		const filtered = allStreamsSetEvents
			// Remove any duplicates (limitation of skip-first pagination).
			.reduce((unique: StreamsSetEvent[], o: StreamsSetEvent) => {
				if (!unique.some((ev: StreamsSetEvent) => ev.id === o.id)) {
					unique.push(o);
				}
				return unique;
			}, [])
			// Filter only the events for the token-to-be-squeezed.
			.filter((e) => e.assetId === Utils.Asset.getIdFromAddress(ethers.utils.getAddress(tokenAddress)));

		const squeezableStreamsSetEvents: StreamsSetEventWithFullReceivers[] =
			// Add the `receivers` field to each event.
			reconcileDripsSetReceivers(filtered)
				// Sort by `blockTimestamp` DESC - the first ones will be the most recent.
				.sort((a, b) => Number(b.blockTimestamp) - Number(a.blockTimestamp));

		const streamsSetEventsToSqueeze: StreamsSetEventWithFullReceivers[] = [];

		// Iterate over all events.
		if (squeezableStreamsSetEvents?.length) {
			for (let i = 0; i < squeezableStreamsSetEvents.length; i++) {
				const dripsConfiguration = squeezableStreamsSetEvents[i];

				// Keep the drips configurations of the current cycle.
				const { currentCycleStartDate } = Utils.Cycle.getInfo(this.#chainId);
				const eventTimestamp = new Date(Number(dripsConfiguration.blockTimestamp * BigInt(1000)));
				if (eventTimestamp >= currentCycleStartDate) {
					streamsSetEventsToSqueeze.push(dripsConfiguration);
				}
				// Get the last event of the previous cycle.
				else {
					streamsSetEventsToSqueeze.push(dripsConfiguration);
					break;
				}
			}
		}

		// The last (oldest) event added, provides the hash prior to the DripsHistory (or 0, if there was only one event).
		const historyHash =
			streamsSetEventsToSqueeze[streamsSetEventsToSqueeze.length - 1]?.streamsHistoryHash || ethers.constants.HashZero;

		// Transform the events into `DripsHistory` objects.
		const dripsHistory: StreamsHistoryStruct[] = streamsSetEventsToSqueeze
			?.map((streamsSetEvent) => {
				// By default a configuration should *not* be squeezed.
				let shouldSqueeze = false;

				// Iterate over all event's receivers.
				for (let i = 0; i < streamsSetEvent.currentReceivers.length; i++) {
					const receiver = streamsSetEvent.currentReceivers[i];

					// Mark as squeezable only the events that drip to the `userId`; the others should not be squeezed.
					if (receiver.receiverUserId === userId) {
						shouldSqueeze = true;
						// Break, because drips receivers are unique.
						break;
					}
				}

				const historyItem: StreamsHistoryStruct = {
					streamsHash: shouldSqueeze ? ethers.constants.HashZero : streamsSetEvent.receiversHash, // If it's non-zero, `receivers` must be empty.
					receivers: shouldSqueeze // If it's non-empty, `dripsHash` must be 0.
						? streamsSetEvent.currentReceivers.map((r) => ({
								userId: r.receiverUserId,
								config: r.config
						  }))
						: [],
					updateTime: streamsSetEvent.blockTimestamp,
					maxEnd: streamsSetEvent.maxEnd
				};

				return historyItem;
			})
			// Reverse from DESC to ASC order, as the protocol expects.
			.reverse();

		// Return the parameters required by the `squeezeStreams` methods.
		return { userId, tokenAddress, senderId, historyHash, dripsHistory };
	}

	/**
	 * Returns a list of senders for which drips can _potentially_ be squeezed, for the given receiver.
	 *
	 * The returned senders have set up a configuration that drips to the given `receiver`
	 * but **it's not guaranteed that the sender is still dripping to this sender**.
	 * The sender might be out of funds, for example.
	 * @param  {string} receiverId The receiver's user ID.
	 * @returns A `Promise` which resolves to a `Record` with keys being the sender IDs and values the asset (ERC20 token) IDs.
	 * @throws {DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async filterSqueezableSenders(receiverId: string): Promise<Record<string, string[]>> {
		type ApiResponse = {
			streamReceiverSeenEvents: StreamReceiverSeenEvent[];
		};

		// Get all `DripsReceiverSeen` events for the given receiver.
		const streamReceiverSeenEvents: StreamReceiverSeenEvent[] = [];
		let skip = 0;
		const first = 500;
		while (true) {
			const response = await this.query<ApiResponse>(gql.getStreamReceiverSeenEventsByReceiverId, {
				receiverId,
				skip,
				first
			});
			const iterationEvents = response?.data?.streamReceiverSeenEvents;

			streamReceiverSeenEvents.push(...iterationEvents);

			if (!iterationEvents?.length || iterationEvents.length < first) {
				break;
			}

			skip += first;
		}

		if (!streamReceiverSeenEvents?.length) {
			return {};
		}

		// Remove any duplicates.
		const uniqueEvents = streamReceiverSeenEvents.reduce(
			(unique: StreamReceiverSeenEvent[], o: StreamReceiverSeenEvent) => {
				if (!unique.some((ev: StreamReceiverSeenEvent) => ev.id === o.id)) {
					unique.push(o);
				}
				return unique;
			},
			[]
		);

		const squeezableSenders: Record<string, string[]> = {}; // key: senderId, value: [asset1Id, asset2Id, ...]

		// Iterate over all `DripsReceiverSeen` events.
		for (let i = 0; i < uniqueEvents.length; i++) {
			const { senderUserId, streamsSetEvent } = uniqueEvents[i];

			if (!squeezableSenders[senderUserId.toString()]) {
				squeezableSenders[senderUserId.toString()] = [];
			}

			if (!squeezableSenders[senderUserId.toString()].includes(streamsSetEvent.assetId.toString())) {
				squeezableSenders[senderUserId.toString()].push(streamsSetEvent.assetId.toString());
			}
		}

		return squeezableSenders;
	}

	/**
	 * Returns the current Drips receivers for the given configuration.
	 * @param  {string} userId The user ID.
	 * @param  {string} tokenAddress The ERC20 token address.
	 * @returns A `Promise` which resolves to the user's `Collected` events.
	 * @throws {@link DripsErrors.argumentMissingError} if the current Drips receivers.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getCurrentStreamsReceivers(
		userId: string,
		tokenAddress: string,
		provider: Provider
	): Promise<StreamReceiverStruct[]> {
		let streamsSetEvents: StreamsSetEvent[] = [];
		let skip = 0;
		const first = 500;

		// Get all `DripsSet` events.
		while (true) {
			const iterationStreamsSetEvents = await this.getStreamsSetEventsByUserId(userId, skip, first);

			// Filter by asset.
			const tokenStreamsSetEvents = iterationStreamsSetEvents.filter(
				(e) => e.assetId === Utils.Asset.getIdFromAddress(tokenAddress)
			);

			streamsSetEvents.push(...tokenStreamsSetEvents);

			if (!iterationStreamsSetEvents?.length || iterationStreamsSetEvents.length < first) {
				break;
			}

			skip += first;
		}

		if (!streamsSetEvents?.length) {
			return [];
		}

		// Sort by `blockTimestamp` DESC - the first ones will be the most recent.
		streamsSetEvents = streamsSetEvents.sort((a, b) => Number(b.blockTimestamp) - Number(a.blockTimestamp));

		// Find the most recent event where the hash matches the receiversHash
		let matchingEvent = null;
		for (const e of streamsSetEvents) {
			const hash = await DripsClient.hashStreams(
				e.streamReceiverSeenEvents.map((d) => ({
					config: d.config,
					userId: d.receiverUserId
				})),
				provider
			);
			if (hash === e.receiversHash) {
				matchingEvent = e;
				break;
			}
		}

		if (!matchingEvent) {
			return [];
		}

		// Return the most recent event's receivers formatted as expected by the protocol.
		return formatDripsReceivers(
			matchingEvent.streamReceiverSeenEvents.map((d) => ({
				config: d.config,
				userId: d.receiverUserId
			}))
		);
	}

	/**
	 * Executes the given query against the Drips Subgraph.
	 * @example <caption>Example usage for querying `Split` events.</caption>
		type SplitEvent = {
			id: string;
			amount: bigint;
			assetId: bigint;
			blockTimestamp: bigint;
			receiverId: string;
			userId: string;
		}

 	 	type QueryResponse = {
			splitEvents: SplitEvent[];
		};

		export const getSplitEventsByUserId = `#graphql
			query getSplitEventsByUserId($userId: String!, $skip: Int, $first: Int) {
  			splitEvents(where: {userId: $userId}, skip: $skip, first: $first) {
					id
					userId
					receiverId
					assetId
					amt
					blockTimestamp
				}
			}
		`;

		const userId = "1";
		const skip = 0;
		const first = 100;

		const response = await dripsSubgraphClient.query<QueryResponse>(getSplitEventsByUserId, { userId, skip, first });

		const events = response?.data?.splitEvents?.map(mapSplitEventToDto) || [];

	 * @param  {string} query The GraphQL query.
	 * @param  {unknown} variables The GraphQL query variables.
	 * @returns A `Promise` which resolves to the expected data.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async query<T = unknown>(
		query: string,
		variables: unknown,
		apiUrl: string = this.#apiUrl
	): Promise<{ data: T }> {
		const resp = await fetch(apiUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ query, variables }, (_, value) => (typeof value === 'bigint' ? value.toString() : value))
		});

		if (resp.status >= 200 && resp.status <= 299) {
			const responseContent = (await resp.json()) as { data?: T; errors?: any[] };

			if (responseContent?.errors?.length && responseContent.errors.length > 0) {
				throw DripsErrors.subgraphQueryError(
					`Subgraph query failed (1st error shown): ${JSON.stringify(
						responseContent.errors[0]
					)} \nresponseContent: ${JSON.stringify(responseContent)}`
				);
			}

			return responseContent as { data: T };
		}

		throw DripsErrors.subgraphQueryError(`Subgraph query failed: ${resp.statusText}`);
	}
}
