import Utils from '../utils';
import constants from '../constants';
import type { DripsSetEventWithFullReceivers } from './AccountEstimator/types';
import type { Account, AssetConfig, AssetConfigHistoryItem, Stream } from './common/types';
import DripsSetEventService from './DripsSetEventService';

const defaultDependencyFactory = (chainId: number): DripsSetEventService => new DripsSetEventService(chainId);

export default class AccountService {
	#chainId: number;
	#dripsSetEventService: DripsSetEventService;

	get chainId() {
		return this.#chainId;
	}

	public constructor(
		chainId: number,
		dependencyFactory: (chainId: number) => DripsSetEventService = defaultDependencyFactory
	) {
		this.#chainId = chainId;
		this.#dripsSetEventService = dependencyFactory(chainId);
	}

	async fetchAccount(userId: string, chainId: number): Promise<Account> {
		try {
			const dripsSetEvents = await this.#dripsSetEventService.getAllDripsSetEvents(userId);
			if (!userId) {
				throw new Error(`Could fetch account: user ID is required.`);
			}

			if (!chainId) {
				throw new Error(`Could fetch account: chain ID is required.`);
			}

			const dripsSetEventsWithFullReceivers = this.#dripsSetEventService.reconcileDripsSetReceivers(dripsSetEvents);
			const dripsSetEventsByTokenAddress = this.#dripsSetEventService.separateDripsSetEvents(
				dripsSetEventsWithFullReceivers
			);
			const assetConfigs = this.#buildAssetConfigsForUser(userId, dripsSetEventsByTokenAddress) || [];

			return {
				userId,
				assetConfigs
			};
		} catch (error: any) {
			throw new Error(`Could not fetch account: ${error.message}`);
		}
	}

	#buildAssetConfigsForUser(
		userId: string,
		dripsSetEvents: { [tokenAddress: string]: DripsSetEventWithFullReceivers[] }
	): AssetConfig[] {
		return Object.entries(dripsSetEvents).reduce<AssetConfig[]>((acc, [tokenAddress, assetConfigDripsSetEvents]) => {
			if (!(assetConfigDripsSetEvents && assetConfigDripsSetEvents.length > 0)) {
				throw new Error(`Unable to find dripsSet events for asset config with token address ${tokenAddress}`);
			}

			const assetConfigHistoryItems: AssetConfigHistoryItem[] = [];

			assetConfigDripsSetEvents.forEach((dripsSetEvent) => {
				const assetConfigHistoryItemStreams: Stream[] = [];

				dripsSetEvent.currentReceivers.forEach((dripsReceiverSeenEvent) => {
					const dripsConfig = Utils.DripsReceiverConfiguration.fromUint256(dripsReceiverSeenEvent.config);

					const streamId = Utils.Stream.makeStreamId(userId, tokenAddress, dripsConfig.dripId.toString());

					assetConfigHistoryItemStreams.push({
						id: streamId,
						dripsConfig,
						receiverId: dripsReceiverSeenEvent.receiverUserId.toString(),
						senderId: userId
					});
				});

				let runsOutOfFunds: Date | undefined;

				// If `maxEnd` is the largest possible timestamp, all current streams end before balance is depleted.
				if (dripsSetEvent.maxEnd === 2n ** 32n - 1n) {
					runsOutOfFunds = undefined;
				} else if (dripsSetEvent.maxEnd === 0n) {
					runsOutOfFunds = undefined;
				} else {
					runsOutOfFunds = new Date(Number(dripsSetEvent.maxEnd) * 1000);
				}

				assetConfigHistoryItems.push({
					timestamp: new Date(Number(dripsSetEvent.blockTimestamp) * 1000),
					balance: dripsSetEvent.balance * BigInt(constants.AMT_PER_SEC_MULTIPLIER),
					runsOutOfFunds,
					streams: assetConfigHistoryItemStreams,
					historyHash: dripsSetEvent.dripsHistoryHash,
					receiversHash: dripsSetEvent.receiversHash
				});
			});

			const currentStreams = assetConfigHistoryItems[assetConfigHistoryItems.length - 1].streams;

			acc.push({
				tokenAddress,
				streams: currentStreams,
				history: assetConfigHistoryItems
			});

			return acc;
		}, []);
	}
}
