/* eslint-disable no-constant-condition */
/* eslint-disable no-await-in-loop */
import type { BigNumberish, BytesLike } from 'ethers';
import { ethers, BigNumber } from 'ethers';
import constants from '../constants';
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
	UserMetadataEntry,
	NftSubAccount,
	SplitEvent,
	ReceivedDripsEvent,
	GivenEvent,
	CollectedEvent,
	SqueezedDripsEvent
} from './types';
import {
	mapCollectedEventToDto,
	mapDripsReceiverSeenEventToDto,
	mapDripsSetEventToDto,
	mapGivenEventToDto,
	mapReceivedDripsEventToDto,
	mapSplitEntryToDto,
	mapSplitEventToDto,
	mapSqueezedDripsToDto,
	mapUserAssetConfigToDto,
	mapUserMetadataEventToDto
} from './mappers';
import type { DripsHistoryStruct } from '../common/types';

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

		subgraphClient.#chainId = chainId;
		subgraphClient.#apiUrl = customApiUrl ?? Utils.Network.configs[subgraphClient.#chainId].SUBGRAPH_URL;

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
	public async getDripsSetEventsByUserId(
		userId: string,
		skip: number = 0,
		first: number = 100
	): Promise<DripsSetEvent[]> {
		if (!userId) {
			throw DripsErrors.argumentMissingError(
				`Could not get 'drip set' events: ${nameOf({ userId })} is missing.`,
				nameOf({ userId })
			);
		}

		type QueryResponse = {
			dripsSetEvents: SubgraphTypes.DripsSetEvent[];
		};

		const response = await this.query<QueryResponse>(gql.getDripsSetEventsByUserId, { userId, skip, first });

		return response?.data?.dripsSetEvents?.map(mapDripsSetEventToDto) || [];
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
	public async getDripsReceiverSeenEventsByReceiverId(
		receiverUserId: string,
		skip: number = 0,
		first: number = 100
	): Promise<DripsReceiverSeenEvent[]> {
		if (!receiverUserId) {
			throw DripsErrors.argumentMissingError(
				`Could not get streaming users: ${nameOf({ receiverUserId })} is missing.`,
				nameOf({ receiverUserId })
			);
		}

		type QueryResponse = {
			dripsReceiverSeenEvents: SubgraphTypes.DripsReceiverSeenEvent[];
		};

		const response = await this.query<QueryResponse>(gql.getDripsReceiverSeenEventsByReceiverId, {
			receiverUserId,
			skip,
			first
		});
		const dripsReceiverSeenEvents = response?.data?.dripsReceiverSeenEvents;

		if (!dripsReceiverSeenEvents?.length) {
			return [];
		}

		return dripsReceiverSeenEvents.map(mapDripsReceiverSeenEventToDto);
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

		const dripReceiverSeenEvents = await this.getDripsReceiverSeenEventsByReceiverId(receiverUserId, skip, first);

		const uniqueSenders = dripReceiverSeenEvents.reduce((unique: bigint[], o: DripsReceiverSeenEvent) => {
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
	 * @param  {BytesLike} key The metadata key.
	 * @param  {number} skip The number of database entries to skip. Defaults to `0`.
	 * @param  {number} first The number of database entries to take. Defaults to `100`.
	 * @returns A `Promise` which resolves to the user's metadata.
	 * @throws {@link DripsErrors.argumentMissingError} if the `userId` is missing.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getMetadataHistory(
		userId: string,
		key?: BytesLike,
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
				key: `${BigNumber.from(key)}`,
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
	 * @param  {BytesLike} key The metadata key.
	 * @returns A `Promise` which resolves to the user's metadata, or `null` if not found.
	 * @throws {@link DripsErrors.argumentMissingError} if any of the required parameter is missing.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getLatestUserMetadata(userId: string, key: BytesLike): Promise<UserMetadataEntry | null> {
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

		const response = await this.query<QueryResponse>(gql.getNftSubAccountsByOwner, { ownerAddress, skip, first });

		const nftSubAccounts = response?.data?.nftsubAccounts;

		return nftSubAccounts
			? nftSubAccounts.map((s) => ({
					tokenId: s.id,
					ownerAddress: s.ownerAddress
			  }))
			: [];
	}

	/**
	 * Returns a list of token IDs that are associated with the given app.
	 * @param  {BytesLike} associatedApp The name/ID of the app to retrieve accounts for.
	 *
	 * **Tip**: you might want to use `Utils.UserMetadata.valueFromString` to create your `associatedApp` argument from a `string`.
	 * @param  {string} userId The owner's user ID.
	 * @param  {number} skip The number of database entries to skip. Defaults to `0`.
	 * @param  {number} first The number of database entries to take. Defaults to `100`.
	 * @returns A `Promise` which resolves to the account IDs.
	 * @throws {@link DripsErrors.argumentError} if the `associatedApp` is missing.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getNftSubAccountIds(
		associatedApp: BytesLike,
		userId?: string,
		skip: number = 0,
		first: number = 100
	): Promise<string[]> {
		if (!associatedApp) {
			throw DripsErrors.argumentError(`Could not get user metadata: ${nameOf({ associatedApp })} is missing.`);
		}

		if (!ethers.utils.isBytesLike(associatedApp)) {
			throw DripsErrors.argumentError(
				`Could not get user metadata: ${nameOf({ associatedApp })} is not a valid BytesLike object.`,
				nameOf({ associatedApp }),
				associatedApp
			);
		}

		type QueryResponse = {
			userMetadataEvents: SubgraphTypes.UserMetadataEvent[];
		};

		let response: {
			data: QueryResponse;
		};

		if (userId) {
			response = await this.query<QueryResponse>(gql.getMetadataHistoryByKeyValueAndOwner, {
				key: constants.ASSOCIATED_APP_KEY_BYTES,
				value: associatedApp,
				userId,
				skip,
				first
			});
		} else {
			response = await this.query<QueryResponse>(gql.getMetadataHistoryByKeyAndValue, {
				key: constants.ASSOCIATED_APP_KEY_BYTES,
				value: associatedApp,
				skip,
				first
			});
		}

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
	public async getSqueezedDripsEventsByUserId(
		userId: string,
		skip: number = 0,
		first: number = 100
	): Promise<SqueezedDripsEvent[]> {
		if (!userId) {
			throw DripsErrors.argumentError(`Could not get 'squeezed Drips' events: ${nameOf({ userId })} is missing.`);
		}

		type QueryResponse = {
			squeezedDripsEvents: SubgraphTypes.SqueezedDripsEvent[];
		};

		const response = await this.query<QueryResponse>(gql.getSqueezedDripsEventsByUserId, { userId, skip, first });

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
	 * Returns a list of `ReceivedDrips` events for the given user.
	 * @param  {string} userId The user ID.
	 * @param  {number} skip The number of database entries to skip. Defaults to `0`.
	 * @param  {number} first The number of database entries to take. Defaults to `100`.
	 * @returns A `Promise` which resolves to the user's `ReceivedDrips` events.
	 * @throws {@link DripsErrors.argumentMissingError} if the `userId` is missing.
	 * @throws {@link DripsErrors.subgraphQueryError} if the query fails.
	 */
	public async getReceivedDripsEventsByUserId(
		userId: string,
		skip: number = 0,
		first: number = 100
	): Promise<ReceivedDripsEvent[]> {
		if (!userId) {
			throw DripsErrors.argumentMissingError(
				`Could not get 'received drips' events: ${nameOf({ userId })} is missing.`,
				nameOf({ userId })
			);
		}

		type QueryResponse = {
			receivedDripsEvents: SubgraphTypes.ReceivedDripsEvent[];
		};

		const response = await this.query<QueryResponse>(gql.getReceivedDripsEventsByUserId, { userId, skip, first });

		return response?.data?.receivedDripsEvents?.map(mapReceivedDripsEventToDto) || [];
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
	 * Calculates the arguments for squeezing all Drips up to "now" for the given sender and token.
	 *
	 * **Important**: This method might fail if two Drips updates were performed in a single block.
	 * because the order of the Drips configurations returned by the Subgraph is not guaranteed for such cases.
	 * The transaction will fail in the gas estimation phase, so no gas will be wasted.
	 * @see `DripsHubClient.squeezeDrips` method for more.
	 * @param  {string} userId The ID of the user receiving drips to squeeze funds for.
	 * @param  {BigNumberish} senderId The ID of the user sending drips to squeeze funds from.
	 * @param  {string} tokenAddress The ERC20 token address.
	 *
	 * It must preserve amounts, so if some amount of tokens is transferred to
	 * an address, then later the same amount must be transferrable from that address.
	 * Tokens which rebase the holders' balances, collect taxes on transfers,
	 * or impose any restrictions on holding or transferring tokens are not supported.
	 * If you use such tokens in the protocol, they can get stuck or lost.
	 * @returns A `Promise` which resolves to the `DripsHubClient.squeezeDrips` arguments.
	 */
	public async getArgsForSqueezingAllDrips(
		userId: string,
		senderId: string,
		tokenAddress: string
	): Promise<
		[userId: string, tokenAddress: string, senderId: string, historyHash: string, dripsHistory: DripsHistoryStruct[]]
	> {
		// Get all `DripsSet` events (drips configurations) for the sender.
		const allDripsSetEvents: DripsSetEvent[] = [];
		let skip = 0;
		const first = 500;
		while (true) {
			const iterationEvents = await this.getDripsSetEventsByUserId(senderId, skip, first);

			allDripsSetEvents.push(...iterationEvents);

			if (!iterationEvents?.length || iterationEvents.length < first) {
				break;
			}

			skip += first;
		}

		const squeezableDripsSetEvents = allDripsSetEvents
			// Remove any duplicates (limitation of skip-first pagination).
			.reduce((unique: DripsSetEvent[], o: DripsSetEvent) => {
				if (!unique.some((ev: DripsSetEvent) => ev.id === o.id)) {
					unique.push(o);
				}
				return unique;
			}, [])
			// Filter only the events for the token-to-be-squeezed.
			.filter((e) => e.assetId === Utils.Asset.getIdFromAddress(tokenAddress))
			// Sort by `blockTimestamp` DESC - the first ones will be the most recent.
			.sort((a, b) => Number(b.blockTimestamp) - Number(a.blockTimestamp));

		const dripsSetEventsToSqueeze: DripsSetEvent[] = [];

		// Iterate over all events.
		if (squeezableDripsSetEvents?.length) {
			for (let i = 0; i < squeezableDripsSetEvents.length; i++) {
				const dripsConfiguration = squeezableDripsSetEvents[i];

				// Keep the drips configurations of the current cycle.
				const { currentCycleStartDate } = Utils.Cycle.getInfo(this.#chainId);
				const eventTimestamp = new Date(Number(dripsConfiguration.blockTimestamp));
				if (eventTimestamp >= currentCycleStartDate) {
					dripsSetEventsToSqueeze.push(dripsConfiguration);
				}
				// Get the last event of the previous cycle.
				else {
					dripsSetEventsToSqueeze.push(dripsConfiguration);
					break;
				}
			}
		}

		// The last (oldest) event added, provides the hash prior to the DripsHistory (or 0, if there was only one event).
		const historyHash =
			dripsSetEventsToSqueeze?.length > 1
				? dripsSetEventsToSqueeze[dripsSetEventsToSqueeze.length - 1].dripsHistoryHash
				: ethers.constants.HashZero;

		// Transform the events into `DripsHistory` objects.
		const dripsHistory: DripsHistoryStruct[] = dripsSetEventsToSqueeze
			?.map((dripsSetEvent) => {
				// By default a configuration should *not* be squeezed.
				let shouldSqueeze = false;

				// Iterate over all event's `DripsReceiverSeen` events (receivers).
				for (let i = 0; i < dripsSetEvent.dripsReceiverSeenEvents.length; i++) {
					const receiver = dripsSetEvent.dripsReceiverSeenEvents[i];

					// Mark as squeezable only the events that drip to the `userId`; the others should not be squeezed.
					if (receiver.receiverUserId === userId) {
						shouldSqueeze = true;
						// Break, because drips receivers are unique.
						break;
					}
				}

				const historyItem: DripsHistoryStruct = {
					dripsHash: shouldSqueeze ? ethers.constants.HashZero : dripsSetEvent.receiversHash, // If it's non-zero, `receivers` must be empty.
					receivers: shouldSqueeze // If it's non-empty, `dripsHash` must be 0.
						? dripsSetEvent.dripsReceiverSeenEvents.map((r) => ({
								userId: r.receiverUserId,
								config: r.config
						  }))
						: [],
					updateTime: dripsSetEvent.blockTimestamp,
					maxEnd: dripsSetEvent.maxEnd
				};

				return historyItem;
			})
			// Reverse from DESC to ASC order, as the protocol expects.
			.reverse();

		// Return the parameters required by the `squeezeDrips` methods.
		return [userId, tokenAddress, senderId, historyHash, dripsHistory];
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
			dripsReceiverSeenEvents: DripsReceiverSeenEvent[];
		};

		// Get all `DripsReceiverSeen` events for the given receiver.
		const dripsReceiverSeenEvents: DripsReceiverSeenEvent[] = [];
		let skip = 0;
		const first = 500;
		while (true) {
			const response = await this.query<ApiResponse>(gql.getDripsReceiverSeenEventsByReceiverId, {
				receiverId,
				skip,
				first
			});
			const iterationEvents = response?.data?.dripsReceiverSeenEvents;

			dripsReceiverSeenEvents.push(...iterationEvents);

			if (!iterationEvents?.length || iterationEvents.length < first) {
				break;
			}

			skip += first;
		}

		if (!dripsReceiverSeenEvents?.length) {
			return {};
		}

		// Remove any duplicates.
		const uniqueEvents = dripsReceiverSeenEvents.reduce(
			(unique: DripsReceiverSeenEvent[], o: DripsReceiverSeenEvent) => {
				if (!unique.some((ev: DripsReceiverSeenEvent) => ev.id === o.id)) {
					unique.push(o);
				}
				return unique;
			},
			[]
		);

		const squeezableSenders: Record<string, string[]> = {}; // key: senderId, value: [asset1Id, asset2Id, ...]

		// Iterate over all `DripsReceiverSeen` events.
		for (let i = 0; i < uniqueEvents.length; i++) {
			const { senderUserId, dripsSetEvent } = uniqueEvents[i];

			if (!squeezableSenders[senderUserId.toString()]) {
				squeezableSenders[senderUserId.toString()] = [];
			}

			if (!squeezableSenders[senderUserId.toString()].includes(dripsSetEvent.assetId.toString())) {
				squeezableSenders[senderUserId.toString()].push(dripsSetEvent.assetId.toString());
			}
		}

		return squeezableSenders;
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
			const responseContent = (await resp.json()) as { data?: T; errors?: any[] };

			if (responseContent?.errors?.length && responseContent.errors.length > 0) {
				throw DripsErrors.subgraphQueryError(`Subgraph query failed: ${JSON.stringify(responseContent.errors[0])}`);
			}

			return responseContent as { data: T };
		}

		throw DripsErrors.subgraphQueryError(`Subgraph query failed: ${resp.statusText}`);
	}
}
